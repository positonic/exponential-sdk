import type { TrpcClient } from './client.js';

export type TimeEntryStatus = 'PROPOSED' | 'CONFIRMED';

/**
 * Where an entry came from. `plugin` is the legacy stamp of the in-app Timer
 * and calendar grids; new writes use the other three. `claude-desktop` is
 * Proposed time from the Daily worklog, `agent-run` is Agent-run time (an
 * agent working with no human turns, kept off the owner's attention totals).
 */
export type TimeEntrySource = 'plugin' | 'manual' | 'claude-desktop' | 'agent-run';

export interface TimeEntry {
  id: string;
  /** Whose time it is. Under an agent key this is the agent's OWNER (ADR-0061). */
  userId: string;
  actionId: string;
  workspaceId: string | null;
  startedAt: Date;
  endedAt: Date | null;
  source: string;
  status: TimeEntryStatus;
  /** Idempotency key, e.g. `claude-session:<sessionId>#<segmentIndex>`. */
  sourceRef: string | null;
  note: string | null;
  /** The external agent that wrote the row; null for human-made entries. */
  createdByAgentId: string | null;
  action: {
    id: string;
    name: string;
    projectId: string | null;
    workspaceId: string | null;
  };
}

export interface TimeLogInput {
  actionId: string;
  startedAt: Date;
  endedAt: Date;
  /** Defaults to `manual` server-side. */
  source?: Exclude<TimeEntrySource, 'plugin'>;
  /**
   * Ignored under an agent key: agent-written entries are always PROPOSED.
   * A human's entry defaults to CONFIRMED.
   */
  status?: TimeEntryStatus;
  /**
   * With a `sourceRef` the write is idempotent per owner: a re-run updates a
   * PROPOSED entry in place and leaves a CONFIRMED one alone.
   */
  sourceRef?: string;
  /** One line shown in the day view and list row (max 1000 chars). */
  note?: string;
}

/**
 * `created` / `updated` — proposed pieces were written; `left` — a CONFIRMED
 * row already carries this ref and was not touched; `merged` — manual time
 * on the same Action covers it, so the manual entries were annotated instead
 * (V2, manual wins); `dropped` — manual time on other Actions covered every
 * minute, nothing written.
 */
export type TimeLogOutcome = 'created' | 'updated' | 'left' | 'merged' | 'dropped';

export interface TimeLogResult {
  /** The first written piece, or the untouched CONFIRMED row; null for merged/dropped. */
  entry: TimeEntry | null;
  outcome: TimeLogOutcome;
  /** Every piece written — several when manual time on another Action split the proposal. */
  pieces?: TimeEntry[];
  /** Manual entry ids whose note now carries the conversation reference. */
  mergedInto?: string[];
}

export interface TimeConfirmDayResult {
  /** Proposed entries flipped to CONFIRMED. */
  confirmed: number;
}

export interface TimeLogBatchResult {
  index: number;
  success: boolean;
  sourceRef?: string;
  /** Null when the outcome is `merged` or `dropped`. */
  entry?: TimeEntry | null;
  outcome?: TimeLogOutcome;
  pieces?: TimeEntry[];
  mergedInto?: string[];
  error?: string;
}

function startOfLocalDay(date: Date | string): Date {
  const d =
    typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)
      ? new Date(`${date}T00:00:00`)
      : new Date(date);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Invalid date: "${String(date)}". Use YYYY-MM-DD or an ISO timestamp.`);
  }
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Time entries — the Daily worklog's write path (ADR-0061).
 *
 * The thing to know: an entry always belongs to the person whose time it
 * was. Called with an external-agent key, {@link log} writes an entry OWNED
 * by the agent's owner, records the agent as author and forces it to
 * `PROPOSED`; it shows on the owner's `/time` with a "proposed" chip and
 * stays out of `Action.timeSpentMins` until the owner confirms the day.
 * Manual time is never altered by these calls.
 */
export class TimeApi {
  constructor(private client: TrpcClient) {}

  /**
   * Log one completed entry with explicit bounds. Never starts, stops or
   * alters the running Timer. With `sourceRef` the call is an upsert keyed
   * on (owner, sourceRef); without it every call creates a row.
   */
  async log(input: TimeLogInput): Promise<TimeLogResult> {
    if (input.sourceRef) {
      return (await this.client.timeEntry.upsertBySourceRef.mutate({
        ...input,
        sourceRef: input.sourceRef,
      })) as TimeLogResult;
    }
    const entry = (await this.client.timeEntry.create.mutate(input)) as TimeEntry;
    return { entry, outcome: 'created', pieces: [entry], mergedInto: [] };
  }

  /**
   * Log many entries, one call each and in order, so a failure names the
   * entry it belonged to instead of rejecting the whole batch. `defaults`
   * fill any field an entry leaves out.
   */
  async logBatch(
    entries: Partial<TimeLogInput>[],
    defaults: Partial<TimeLogInput> = {},
  ): Promise<TimeLogBatchResult[]> {
    const results: TimeLogBatchResult[] = [];
    for (const [index, item] of entries.entries()) {
      const merged = { ...defaults, ...item };
      const sourceRef = merged.sourceRef;
      try {
        if (!merged.actionId) throw new Error('actionId is required');
        if (!merged.startedAt || !merged.endedAt) {
          throw new Error('startedAt and endedAt are required');
        }
        const result = await this.log(merged as TimeLogInput);
        results.push({ index, success: true, sourceRef, ...result });
      } catch (error) {
        results.push({
          index,
          success: false,
          sourceRef,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    return results;
  }

  /**
   * Confirm a day: every PROPOSED entry of yours that starts on that local
   * calendar day becomes CONFIRMED and the Actions' spent time moves. Human
   * only — the server refuses agent keys, so run this with personal
   * credentials. A day with nothing proposed returns `{ confirmed: 0 }`.
   */
  async confirmDay(date: Date | string, workspaceId?: string): Promise<TimeConfirmDayResult> {
    return (await this.client.timeEntry.confirmDay.mutate({
      date: startOfLocalDay(date),
      workspaceId,
    })) as TimeConfirmDayResult;
  }

  /**
   * The caller's entries that touch one calendar day (local time), oldest
   * first, each with its `status`. Pass `YYYY-MM-DD` or a Date.
   */
  async list(date: Date | string, workspaceId?: string): Promise<TimeEntry[]> {
    const startDate = startOfLocalDay(date);
    const endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
    return (await this.client.timeEntry.listByDateRange.query({
      startDate,
      endDate,
      workspaceId,
    })) as TimeEntry[];
  }
}
