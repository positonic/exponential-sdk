import { randomUUID } from 'node:crypto';
import type { TrpcClient } from './client.js';
import type {
  CalendarAccount,
  CalendarConnectionStatuses,
  CalendarEventWithSource,
  CalendarInfo,
  CalendarPreferences,
  CalendarProviderName,
  CreatedCalendarEvent,
} from './types/calendar.js';

/** The server clamps `maxResults` to this; exposed so callers can pre-clamp. */
export const CALENDAR_MAX_RESULTS = 100;

/** The server keeps at most this many calendars selected per account. */
export const CALENDAR_MAX_SELECTED = 10;

export interface CalendarListEventsOptions {
  /** Inclusive lower bound. Omitted means "from now" per the provider. */
  from?: Date;
  /** Exclusive upper bound. */
  to?: Date;
  /** 1–100, default 50. Applies per account, before the merge. */
  maxResults?: number;
}

/** Picks which connected account to act on. `accountId` wins when both are set. */
export interface CalendarAccountSelector {
  accountId?: string;
  /** Falls back to the earliest-connected account for this provider. */
  provider?: CalendarProviderName;
}

export interface CalendarSelectCalendarsInput extends CalendarAccountSelector {
  /** At least one. Anything past the first 10 is dropped by the server. */
  calendarIds: string[];
}

export interface CalendarCreateEventInput {
  summary: string;
  description?: string;
  start: Date;
  end: Date;
  /** Attendee email addresses. Invites are sent by the provider. */
  attendees?: string[];
  /** Attach a Google Meet link. Google only — Microsoft ignores it. */
  meet?: boolean;
  /** Defaults to the account's primary calendar. */
  calendarId?: string;
  provider?: CalendarProviderName;
  /**
   * IANA zone the times should display in, e.g. "Europe/Lisbon". Defaults to
   * the host's zone. Times themselves go over the wire as UTC, so this only
   * affects how the provider renders them.
   */
  timeZone?: string;
}

function hostTimeZone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
}

/**
 * Connected calendars (Google + Microsoft).
 *
 * Reads go through the server's merged multi-calendar view, so `today`,
 * `upcoming` and `listEvents` all return the same source-tagged shape across
 * every connected account rather than a single provider's slice.
 *
 * Connecting and re-authorizing an account is a browser OAuth flow in the web
 * app; this API covers everything after that.
 */
export class CalendarApi {
  constructor(private client: TrpcClient) {}

  /** Merged, start-time-sorted events from every connected account. */
  async listEvents(options: CalendarListEventsOptions = {}): Promise<CalendarEventWithSource[]> {
    return (await this.client.calendar.getEventsMultiCalendar.query({
      timeMin: options.from,
      timeMax: options.to,
      maxResults: options.maxResults,
    })) as CalendarEventWithSource[];
  }

  /**
   * Everything on today's date, in the host's local timezone — including
   * all-day events and meetings that started before now.
   */
  async today(options: { maxResults?: number } = {}): Promise<CalendarEventWithSource[]> {
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    const to = new Date(from);
    to.setHours(23, 59, 59, 999);
    return this.listEvents({ from, to, maxResults: options.maxResults });
  }

  /** Events from now until `days` days ahead (default 7). */
  async upcoming(
    options: { days?: number; maxResults?: number } = {},
  ): Promise<CalendarEventWithSource[]> {
    const from = new Date();
    const to = new Date(from.getTime() + (options.days ?? 7) * 24 * 60 * 60 * 1000);
    return this.listEvents({ from, to, maxResults: options.maxResults });
  }

  /** Connected accounts, each with its calendars and current selection. */
  async accounts(): Promise<CalendarAccount[]> {
    const result = (await this.client.calendar.getCalendarAccounts.query()) as {
      accounts: CalendarAccount[];
    };
    return result.accounts;
  }

  /** Per-provider connection state, including accounts needing re-auth. */
  async connectionStatuses(): Promise<CalendarConnectionStatuses> {
    return (await this.client.calendar.getAllConnectionStatuses.query()) as CalendarConnectionStatuses;
  }

  /** Every calendar on one account, straight from the provider (uncached). */
  async listCalendars(selector: CalendarAccountSelector = {}): Promise<CalendarInfo[]> {
    return (await this.client.calendar.listCalendars.query(selector)) as CalendarInfo[];
  }

  /** One account's selected calendars plus its cached calendar list. */
  async getPreferences(selector: CalendarAccountSelector = {}): Promise<CalendarPreferences> {
    return (await this.client.calendar.getCalendarPreferences.query(
      selector,
    )) as CalendarPreferences;
  }

  /**
   * Replace which calendars on an account feed the merged event list.
   * This is a replace, not a merge — pass the full set you want.
   */
  async selectCalendars(
    input: CalendarSelectCalendarsInput,
  ): Promise<{ success: boolean; selectedCalendarIds: string[] }> {
    return (await this.client.calendar.updateSelectedCalendars.mutate(input)) as {
      success: boolean;
      selectedCalendarIds: string[];
    };
  }

  /** Re-fetch an account's calendar list from the provider and re-cache it. */
  async syncCalendars(
    selector: CalendarAccountSelector = {},
  ): Promise<{ success: boolean; calendars: CalendarInfo[] }> {
    return (await this.client.calendar.syncCalendarList.mutate(selector)) as {
      success: boolean;
      calendars: CalendarInfo[];
    };
  }

  async createEvent(input: CalendarCreateEventInput): Promise<CreatedCalendarEvent> {
    const timeZone = input.timeZone ?? hostTimeZone();
    return (await this.client.calendar.createEvent.mutate({
      summary: input.summary,
      description: input.description,
      // RFC3339 UTC — unambiguous regardless of host offset. `timeZone` only
      // tells the provider which zone to render the event in.
      start: { dateTime: input.start.toISOString(), timeZone },
      end: { dateTime: input.end.toISOString(), timeZone },
      attendees: input.attendees?.map((email) => ({ email })),
      conferenceData: input.meet
        ? {
            createRequest: {
              requestId: randomUUID(),
              conferenceSolutionKey: { type: 'hangoutsMeet' as const },
            },
          }
        : undefined,
      calendarId: input.calendarId,
      provider: input.provider,
    })) as CreatedCalendarEvent;
  }

  /**
   * Remove a calendar connection. Deletes the stored tokens and calendar
   * preferences; it never touches the user's ability to sign in with that
   * account. Reconnecting means redoing the OAuth flow in the web app.
   */
  async disconnect(
    selector: CalendarAccountSelector = {},
  ): Promise<{ success: boolean; message: string }> {
    return (await this.client.calendar.disconnect.mutate(selector)) as {
      success: boolean;
      message: string;
    };
  }
}
