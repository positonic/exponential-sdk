import type { TrpcClient } from './client.js';
import type { Action, KanbanStatus, Priority } from './types/action.js';

export interface ActionsListOptions {
  projectId?: string;
  status?: KanbanStatus;
  assigneeId?: string;
}

export interface ActionsKanbanOptions {
  projectId?: string;
  status?: KanbanStatus;
  assigneeId?: string;
}

export type ActionStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'DELETED' | 'DRAFT';

export interface ActionCreateInput {
  name: string;
  description?: string;
  projectId?: string;
  workspaceId?: string;
  dueDate?: Date;
  scheduledStart?: Date;
  scheduledEnd?: Date;
  duration?: number;
  priority?: Priority;
  status?: ActionStatus;
  epicId?: string;
  effortEstimate?: number;
  blockedByIds?: string[];
}

export interface ActionUpdateInput {
  id: string;
  name?: string;
  description?: string;
  projectId?: string;
  workspaceId?: string | null;
  dueDate?: Date | null;
  scheduledStart?: Date | null;
  scheduledEnd?: Date | null;
  duration?: number | null;
  priority?: Priority;
  status?: ActionStatus;
  kanbanStatus?: KanbanStatus;
  epicId?: string | null;
  effortEstimate?: number | null;
  blockedByIds?: string[];
}

export interface ActionUpsertBySourceInput {
  /** Convention for the Daily worklog: `claude-session`. */
  sourceType: string;
  /** The conversation id — re-running with the same pair updates, never duplicates. */
  sourceId: string;
  name: string;
  workspaceId: string;
  description?: string;
  /** Must live in `workspaceId`, or the call is NOT_FOUND. */
  projectId?: string | null;
  /** Must belong to a product in `workspaceId`, or the call is NOT_FOUND. */
  ticketId?: string | null;
}

export interface ActionUpsertBySourceResult {
  action: Action & {
    ticket?: { id: string; number: number; shortId: string | null; productId: string } | null;
  };
  outcome: 'created' | 'updated';
}

/** One action as returned inside a {@link TodaysActions} group. */
export interface TodaysActionRow {
  id: string;
  name: string;
  status: string;
  scheduledStart: Date | null;
  dueDate: Date | null;
  projectName: string | null;
  workspaceName: string | null;
}

export interface TodaysActionsGroup {
  /** Total in this group — may exceed `actions.length`, which is capped at 50. */
  count: number;
  actions: TodaysActionRow[];
}

export interface TodaysActions {
  overdue: TodaysActionsGroup;
  today: TodaysActionsGroup;
  inbox: TodaysActionsGroup;
}

export interface OverdueTriageRow extends Omit<TodaysActionRow, 'status' | 'workspaceName'> {
  priority: string | null;
  daysOverdue: number;
}

export interface OverdueCohort {
  /** The exact instant every member is stamped with. */
  stampedAt: Date;
  daysOverdue: number;
  count: number;
  projectNames: string[];
  actionIds: string[];
  actions: OverdueTriageRow[];
}

export interface OverdueTriage {
  totalOverdue: number;
  /** How many of `totalOverdue` sit inside a cohort. */
  cohortCount: number;
  cohorts: OverdueCohort[];
  /** Individually-dated overdue actions — real debt, worth reading one by one. */
  loose: OverdueTriageRow[];
}

export class ActionsApi {
  constructor(private client: TrpcClient) {}

  async list(options: ActionsListOptions = {}): Promise<Action[]> {
    const { projectId, status, assigneeId } = options;
    let actions: Action[];

    if (projectId) {
      actions = await this.client.action.getProjectActions.query({
        projectId,
        assigneeId,
      }) as Action[];
    } else if (status) {
      actions = await this.client.action.getKanbanActions.query({
        kanbanStatus: status,
        assigneeId,
      }) as Action[];
    } else {
      actions = await this.client.action.getAll.query({
        assigneeId,
      }) as Action[];
    }

    // Match CLI behavior: hide completed/cancelled unless status specified
    if (!status) {
      actions = actions.filter(action =>
        action.status !== 'COMPLETED' &&
        action.status !== 'CANCELLED' &&
        action.kanbanStatus !== 'DONE' &&
        action.kanbanStatus !== 'CANCELLED'
      );
    }

    return actions;
  }

  /**
   * Actions whose `dueDate` falls today.
   *
   * Note this is a **narrow** slice: it excludes overdue actions, and excludes
   * anything scheduled for today that carries no due date. If you want "what
   * is on my plate", use {@link getTodaysActions} instead — this method will
   * happily report a quiet day on top of a large overdue pile.
   */
  async getToday(workspaceId?: string): Promise<Action[]> {
    return await this.client.action.getToday.query({
      workspaceId,
    }) as Action[];
  }

  /**
   * What is actually on the user's plate: the `/today` page's own partition,
   * pre-split into `overdue` / `today` / `inbox`.
   *
   * Prefer this over {@link getToday} for anything that reasons about the
   * user's day. `getToday` is a due-date-only slice that omits the overdue
   * pile entirely — on a real account that can mean returning 6 actions while
   * 40 sit overdue. This method uses the server-shared partition, so it agrees
   * with what the user is looking at by construction.
   *
   * Cross-workspace by default. Each group is capped at 50 rows; `count` is the
   * true total.
   */
  async getTodaysActions(workspaceId?: string): Promise<TodaysActions> {
    return await this.client.action.getTodaysActions.query({
      workspaceId,
    }) as TodaysActions;
  }

  /**
   * Why the overdue pile is the size it is.
   *
   * Splits overdue actions into **cohorts** — groups sharing one exact
   * timestamp, the fingerprint of a bulk write like a generated project plan —
   * and **loose** individually-dated debt. Cohort members were almost certainly
   * never individually due, so the honest disposition is {@link bulkDefer},
   * not another {@link bulkReschedule} that re-inflicts the pile tomorrow.
   */
  async getOverdueTriage(workspaceId?: string): Promise<OverdueTriage> {
    return await this.client.action.getOverdueTriage.query({
      workspaceId,
    }) as OverdueTriage;
  }

  /**
   * Move actions to a new do-date (`scheduledStart`), pushing `dueDate` forward
   * only where it would otherwise fall before it. Pass `null` to clear both —
   * though {@link bulkDefer} says that more clearly.
   */
  async bulkReschedule(actionIds: string[], dueDate: Date | null): Promise<{ count: number; actionIds: string[] }> {
    return await this.client.action.bulkReschedule.mutate({
      actionIds,
      dueDate,
    }) as { count: number; actionIds: string[] };
  }

  /**
   * Amnesty: clear the dates so actions fall back to their project backlog
   * untimed. For work that was never really due on the date it carries —
   * typically an overdue cohort. Kanban status is untouched.
   */
  async bulkDefer(actionIds: string[]): Promise<{ count: number; actionIds: string[]; message: string }> {
    return await this.client.action.bulkDefer.mutate({
      actionIds,
    }) as { count: number; actionIds: string[]; message: string };
  }

  async getByDateRange(start: Date, end: Date, workspaceId?: string): Promise<Action[]> {
    return await this.client.action.getByDateRange.query({
      startDate: start,
      endDate: end,
      workspaceId,
    }) as Action[];
  }

  async getKanban(options: ActionsKanbanOptions = {}): Promise<Action[]> {
    const { projectId, status, assigneeId } = options;

    return await this.client.action.getKanbanActions.query({
      projectId,
      kanbanStatus: status,
      assigneeId,
    }) as Action[];
  }

  async getProjectActions(projectId: string, assigneeId?: string): Promise<Action[]> {
    return await this.client.action.getProjectActions.query({
      projectId,
      assigneeId,
    }) as Action[];
  }

  async create(input: ActionCreateInput): Promise<Action> {
    return await this.client.action.create.mutate(input) as Action;
  }

  async update(input: ActionUpdateInput): Promise<Action> {
    return await this.client.action.update.mutate(input) as Action;
  }

  /**
   * One Action per external source: find by (workspaceId, sourceType,
   * sourceId), refresh its name and links, else create it. `outcome` says
   * which happened. Agents may call this; the created Action records the
   * agent's shadow user as creator with `source: "agent"` (ADR-0049).
   */
  async upsertBySource(input: ActionUpsertBySourceInput): Promise<ActionUpsertBySourceResult> {
    return await this.client.action.upsertBySource.mutate(input) as ActionUpsertBySourceResult;
  }
}
