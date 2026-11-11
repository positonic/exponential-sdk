// Calendar types matching the Exponential API responses.
//
// Events come from Google Calendar / Microsoft Graph, but the OAuth tokens
// live server-side on the user's ConnectedAccount rows — an SDK caller never
// performs an OAuth flow, it just asks the API. A user may connect several
// accounts (two Google + one Microsoft is normal), so anything returning
// events tags each one with the account and calendar it came from.

export type CalendarProviderName = 'google' | 'microsoft';

/**
 * One end of an event. Timed events carry `dateTime` (RFC3339); all-day
 * events carry `date` (YYYY-MM-DD) instead. Exactly one is present.
 */
export interface CalendarEventTime {
  dateTime?: string;
  date?: string;
  timeZone?: string;
}

export interface CalendarEventAttendee {
  email: string;
  displayName?: string;
  /** Provider-specific, e.g. "accepted" | "declined" | "tentative" | "needsAction". */
  responseStatus: string;
}

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: CalendarEventTime;
  end: CalendarEventTime;
  location?: string;
  attendees?: CalendarEventAttendee[];
  htmlLink: string;
  status: string;
}

/**
 * An event from `listEvents`/`today`/`upcoming`, tagged with its origin.
 * The source fields are what make a merged multi-account list readable.
 */
export interface CalendarEventWithSource extends CalendarEvent {
  accountId: string;
  accountEmail: string | null;
  calendarId: string;
  calendarName?: string;
  calendarColor?: string;
  provider: CalendarProviderName;
}

export interface CalendarInfo {
  id: string;
  summary: string;
  description?: string;
  primary: boolean;
  accessRole: string;
  backgroundColor?: string;
  foregroundColor?: string;
}

/** A connected calendar account, with its calendars and current selection. */
export interface CalendarAccount {
  id: string;
  provider: CalendarProviderName;
  email: string | null;
  name: string | null;
  /** Which of `calendars` currently feed the merged event list. */
  selectedCalendarIds: string[];
  calendars: CalendarInfo[];
}

export interface CalendarConnectionStatus {
  isConnected: boolean;
  hasCalendarScope: boolean;
  /** How many accounts for this provider are usably connected. */
  connectedCount: number;
}

export interface CalendarConnectionStatuses {
  google: CalendarConnectionStatus;
  microsoft: CalendarConnectionStatus;
}

export interface CalendarPreferences {
  selectedCalendarIds: string[];
  allCalendars: CalendarInfo[];
  cacheUpdatedAt: Date | null;
}

export interface CreatedCalendarEvent extends CalendarEvent {
  conferenceData?: {
    entryPoints?: Array<{
      uri: string;
      label?: string;
      entryPointType: string;
    }>;
    conferenceId?: string;
  };
  /** Microsoft's equivalent of a Meet link. */
  onlineMeetingUrl?: string;
}
