import { describe, it, expect, vi } from 'vitest';
import { CalendarApi } from './calendar.js';
import type { TrpcClient } from './client.js';

function makeClient() {
  const getEventsMultiCalendar = vi.fn().mockResolvedValue([]);
  const getCalendarAccounts = vi.fn().mockResolvedValue({ accounts: [{ id: 'acc1' }] });
  const getAllConnectionStatuses = vi.fn().mockResolvedValue({});
  const listCalendars = vi.fn().mockResolvedValue([]);
  const getCalendarPreferences = vi.fn().mockResolvedValue({});
  const updateSelectedCalendars = vi.fn().mockResolvedValue({ success: true });
  const syncCalendarList = vi.fn().mockResolvedValue({ success: true, calendars: [] });
  const createEvent = vi.fn().mockResolvedValue({ id: 'evt1' });
  const disconnect = vi.fn().mockResolvedValue({ success: true });

  const client = {
    calendar: {
      getEventsMultiCalendar: { query: getEventsMultiCalendar },
      getCalendarAccounts: { query: getCalendarAccounts },
      getAllConnectionStatuses: { query: getAllConnectionStatuses },
      listCalendars: { query: listCalendars },
      getCalendarPreferences: { query: getCalendarPreferences },
      updateSelectedCalendars: { mutate: updateSelectedCalendars },
      syncCalendarList: { mutate: syncCalendarList },
      createEvent: { mutate: createEvent },
      disconnect: { mutate: disconnect },
    },
  } as unknown as TrpcClient;

  return {
    api: new CalendarApi(client),
    getEventsMultiCalendar,
    getCalendarAccounts,
    updateSelectedCalendars,
    createEvent,
  };
}

describe('CalendarApi reads', () => {
  it('today spans the local calendar day', async () => {
    const { api, getEventsMultiCalendar } = makeClient();
    await api.today();
    const { timeMin, timeMax } = getEventsMultiCalendar.mock.calls[0]![0];
    expect(timeMin.getHours()).toBe(0);
    expect(timeMin.getMinutes()).toBe(0);
    expect(timeMax.getHours()).toBe(23);
    expect(timeMax.getMinutes()).toBe(59);
    expect(timeMin.getDate()).toBe(timeMax.getDate());
  });

  it('upcoming defaults to seven days ahead of now', async () => {
    const { api, getEventsMultiCalendar } = makeClient();
    await api.upcoming();
    const { timeMin, timeMax } = getEventsMultiCalendar.mock.calls[0]![0];
    expect(timeMax.getTime() - timeMin.getTime()).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it('upcoming honours an explicit day count', async () => {
    const { api, getEventsMultiCalendar } = makeClient();
    await api.upcoming({ days: 2 });
    const { timeMin, timeMax } = getEventsMultiCalendar.mock.calls[0]![0];
    expect(timeMax.getTime() - timeMin.getTime()).toBe(2 * 24 * 60 * 60 * 1000);
  });

  it('accounts unwraps the server envelope', async () => {
    const { api } = makeClient();
    await expect(api.accounts()).resolves.toEqual([{ id: 'acc1' }]);
  });
});

describe('CalendarApi.createEvent', () => {
  it('sends times as RFC3339 UTC with a display timezone', async () => {
    const { api, createEvent } = makeClient();
    const start = new Date('2026-08-07T12:00:00Z');
    const end = new Date('2026-08-07T13:00:00Z');

    await api.createEvent({ summary: 'Review', start, end, timeZone: 'Europe/Lisbon' });

    const payload = createEvent.mock.calls[0]![0];
    expect(payload.start).toEqual({
      dateTime: '2026-08-07T12:00:00.000Z',
      timeZone: 'Europe/Lisbon',
    });
    expect(payload.end.dateTime).toBe('2026-08-07T13:00:00.000Z');
    expect(payload.summary).toBe('Review');
  });

  it('expands attendee emails into the provider shape', async () => {
    const { api, createEvent } = makeClient();
    await api.createEvent({
      summary: 'Sync',
      start: new Date('2026-08-07T12:00:00Z'),
      end: new Date('2026-08-07T12:30:00Z'),
      attendees: ['a@example.test', 'b@example.test'],
    });
    expect(createEvent.mock.calls[0]![0].attendees).toEqual([
      { email: 'a@example.test' },
      { email: 'b@example.test' },
    ]);
  });

  it('only asks for a Meet link when requested, with a unique request id', async () => {
    const { api, createEvent } = makeClient();
    const base = {
      summary: 'Sync',
      start: new Date('2026-08-07T12:00:00Z'),
      end: new Date('2026-08-07T12:30:00Z'),
    };

    await api.createEvent(base);
    expect(createEvent.mock.calls[0]![0].conferenceData).toBeUndefined();

    await api.createEvent({ ...base, meet: true });
    await api.createEvent({ ...base, meet: true });
    const first = createEvent.mock.calls[1]![0].conferenceData;
    const second = createEvent.mock.calls[2]![0].conferenceData;
    expect(first.createRequest.conferenceSolutionKey.type).toBe('hangoutsMeet');
    // Google dedupes conference creation by requestId — reusing one across
    // events would silently return the first event's link.
    expect(first.createRequest.requestId).not.toBe(second.createRequest.requestId);
  });

  it('omits attendees entirely when none are given', async () => {
    const { api, createEvent } = makeClient();
    await api.createEvent({
      summary: 'Solo',
      start: new Date('2026-08-07T12:00:00Z'),
      end: new Date('2026-08-07T12:30:00Z'),
    });
    expect(createEvent.mock.calls[0]![0].attendees).toBeUndefined();
  });
});

describe('CalendarApi.selectCalendars', () => {
  it('passes the selector and ids straight through', async () => {
    const { api, updateSelectedCalendars } = makeClient();
    await api.selectCalendars({ calendarIds: ['a', 'b'], accountId: 'acc1' });
    expect(updateSelectedCalendars).toHaveBeenCalledWith({
      calendarIds: ['a', 'b'],
      accountId: 'acc1',
    });
  });
});
