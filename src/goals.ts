import type { TrpcClient } from './client.js';
import type { KeyResultsApi } from './keyResults.js';
import type {
  Goal,
  GoalPeriod,
  GoalStats,
  GoalStatus,
  GoalTreeNode,
  GoalWritableStatus,
} from './types/goal.js';

export interface GoalListOptions {
  /**
   * Scope to a workspace. With it the list is workspace-**wide** — every
   * member's objectives, not just yours. Without it you get your own.
   */
  workspaceId?: string;
  /** Free-form period string, e.g. `"Q3-2026"` or `"Annual-2026"`. */
  period?: string;
  status?: GoalStatus;
}

export interface GoalTreeOptions {
  workspaceId?: string;
  status?: GoalStatus;
}

export interface GoalCreateInput {
  title: string;
  description?: string;
  whyThisGoal?: string;
  notes?: string;
  dueDate?: Date;
  period?: string;
  status?: GoalWritableStatus;
  lifeDomainId?: number;
  /** Link the objective to one project on creation. */
  projectId?: string;
  outcomeIds?: string[];
  driUserId?: string;
  workspaceId?: string;
  /** Nest under a parent objective. Max nesting depth is 5. */
  parentGoalId?: number;
  icon?: string | null;
  iconColor?: string | null;
}

/**
 * A **partial** update: omit a field and it is left untouched, pass an explicit
 * `null` to clear it. Nothing you don't name is written.
 *
 * Prefer {@link GoalsApi.setStatus} for a status change and
 * {@link GoalsApi.setParent} for a re-parent — both write exactly one column.
 */
export interface GoalUpdateInput {
  id: number;
  title?: string;
  description?: string | null;
  whyThisGoal?: string | null;
  notes?: string | null;
  dueDate?: Date | null;
  period?: string | null;
  status?: GoalWritableStatus;
  lifeDomainId?: number | null;
  /** Replace the project links with this one project; `null` clears them. */
  projectId?: string | null;
  /** Replace the project links wholesale; `[]` clears them. */
  projectIds?: string[];
  outcomeIds?: string[];
  driUserId?: string | null;
  workspaceId?: string | null;
  parentGoalId?: number | null;
  displayOrder?: number;
  icon?: string | null;
  iconColor?: string | null;
}

export interface GoalSetStatusInput {
  id: number;
  /** `on-hold` is accepted here and only here. */
  status: GoalStatus;
}

export interface GoalSetParentInput {
  id: number;
  /** `null` detaches the objective from its parent. */
  parentGoalId: number | null;
}

export interface GoalStatsOptions {
  workspaceId?: string;
  period?: string;
}

/**
 * Objectives (`Goal`) — the qualitative half of an OKR, keyed by **integer** id.
 * Their measurable key results hang off {@link KeyResultsApi}, reachable here as
 * `goals.keyResults`.
 *
 * On writes: `update()` is a partial update, but `setStatus()` and `setParent()`
 * each write a single column and are the right call whenever that is all you
 * mean to change — closing a quarter or re-parenting a cascade should never risk
 * a collateral write.
 */
export class GoalsApi {
  constructor(
    private client: TrpcClient,
    /** Key results for these objectives. Same instance as `client.keyResults`. */
    public keyResults: KeyResultsApi,
  ) {}

  /**
   * List objectives. Pass `workspaceId` for the workspace-wide list (every
   * member's), omit it for your own. Includes each objective's linked
   * `projects`, which is the join that maps day-to-day work back to an OKR:
   * every action carries a `projectId`.
   */
  async list(options: GoalListOptions = {}): Promise<Goal[]> {
    return await this.client.goal.getAllMyGoals.query(options) as Goal[];
  }

  /**
   * The same objectives nested parent → child (up to 5 levels), each with its
   * projects and key results. One call for the whole annual → quarterly cascade.
   */
  async tree(options: GoalTreeOptions = {}): Promise<GoalTreeNode[]> {
    return await this.client.goal.getGoalTree.query(
      options,
    ) as GoalTreeNode[];
  }

  async get(id: number): Promise<Goal> {
    return await this.client.goal.getById.query({ id }) as Goal;
  }

  /** Objectives linked to a given project. */
  async listByProject(projectId: string): Promise<Goal[]> {
    return await this.client.goal.getProjectGoals.query({ projectId }) as Goal[];
  }

  async create(input: GoalCreateInput): Promise<Goal> {
    return await this.client.goal.createGoal.mutate(input) as Goal;
  }

  /**
   * Partial update — see {@link GoalUpdateInput}. Fields you omit are left
   * alone; pass an explicit `null` to clear one.
   */
  async update(input: GoalUpdateInput): Promise<Goal> {
    return await this.client.goal.updateGoal.mutate(input) as Goal;
  }

  /**
   * Status-only write. Never touches another field, and is the only path that
   * accepts `on-hold`. Moving an objective to `completed` also records a
   * workspace milestone.
   */
  async setStatus(input: GoalSetStatusInput): Promise<Goal> {
    return await this.client.goal.updateGoalStatus.mutate(input) as Goal;
  }

  /**
   * Re-parent an objective, or detach it with `parentGoalId: null`. Writes only
   * `parentGoalId`, and validates the no-self / no-cycle / depth-5 rules.
   */
  async setParent(input: GoalSetParentInput): Promise<Goal> {
    return await this.client.goal.setParent.mutate(input) as Goal;
  }

  async delete(id: number): Promise<Goal> {
    return await this.client.goal.deleteGoal.mutate({ id }) as Goal;
  }

  /** The conventional period strings (quarters, halves, annual) for this year and next. */
  async periods(): Promise<GoalPeriod[]> {
    return await this.client.okr.getPeriods.query() as GoalPeriod[];
  }

  /** Aggregate objective/key-result counts and average progress. */
  async stats(options: GoalStatsOptions = {}): Promise<GoalStats> {
    return await this.client.okr.getStats.query(options) as GoalStats;
  }
}
