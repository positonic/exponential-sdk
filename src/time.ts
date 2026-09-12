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
 * `created` — a new row; `updated` — an existing PROPOSED row was replaced;
 * `left` — the row is CONFIRMED and was not touched.
 */
export type TimeLogOutcome = 'created' | 'updated' | 'left';

export interface TimeLogResult {
  entry: TimeEntry;
  outcome: TimeLogOutcome;
}

export interface TimeLogBatchResult {
  index: number;
  success: boolean;
  sourceRef?: string;
  entry?: TimeEntry;
  outcome?: TimeLogOutcome;
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
    return { entry, outcome: 'created' };
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
