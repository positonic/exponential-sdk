import type { TrpcClient } from './client.js';
import type {
  KeyResult,
  KeyResultCheckIn,
  KeyResultStatus,
  KeyResultUnit,
  ObjectiveWithKeyResults,
} from './types/keyResult.js';

export interface KeyResultListOptions {
  /**
   * Scope to a workspace. With it the list is workspace-**wide** — every
   * member's key results, not just yours. Without it you get your own.
   */
  workspaceId?: string;
  /** Objective id — an integer, unlike the key result's own cuid. */
  goalId?: number;
  period?: string;
  status?: KeyResultStatus;
  /** Narrow a workspace-scoped list back to the key results you own. */
  onlyMine?: boolean;
}

export interface KeyResultByObjectiveOptions {
  workspaceId?: string;
  period?: string;
  /** Also include the period's parent annual period (Q3-2026 → Annual-2026). */
  includePairedPeriod?: boolean;
  onlyMine?: boolean;
}

export interface KeyResultCreateInput {
  /** Objective (integer id) the key result hangs off. */
  goalId: number;
  title: string;
  targetValue: number;
  /** Free-form, e.g. `"Q3-2026"`. */
  period: string;
  description?: string;
  startValue?: number;
  currentValue?: number;
  unit?: KeyResultUnit;
  unitLabel?: string;
  driUserId?: string;
  /** Defaults to the objective's workspace when omitted. */
  workspaceId?: string;
}

export interface KeyResultUpdateInput {
  /** cuid. */
  id: string;
  title?: string;
  description?: string;
  targetValue?: number;
  currentValue?: number;
  startValue?: number;
  unit?: KeyResultUnit;
  unitLabel?: string;
  status?: KeyResultStatus;
  /** 0–100. */
  confidence?: number;
  driUserId?: string;
  /** Move the key result to a different objective. */
  goalId?: number;
}

export interface KeyResultCheckInInput {
  /** cuid. */
  id: string;
  /** The new current value. */
  value: number;
  note?: string;
}

export interface KeyResultStatsOptions {
  workspaceId?: string;
  period?: string;
}

/**
 * Key results — the measurable half of an OKR.
 *
 * Reachable both as `client.keyResults` and as `client.goals.keyResults`; they
 * are the same instance. Every id here is a **cuid string**, while the `goalId`
 * that ties a key result to its objective is an **integer**. The tRPC router
 * behind these calls is mounted at `okr`, which is the key-result router — not
 * an objective router. Objectives live on {@link GoalsApi}.
 */
export class KeyResultsApi {
  constructor(private client: TrpcClient) {}

  /**
   * List key results. Pass `workspaceId` for the workspace-wide list (every
   * member's), omit it for your own.
   */
  async list(options: KeyResultListOptions = {}): Promise<KeyResult[]> {
    return await this.client.okr.getAll.query(options) as KeyResult[];
  }

  /**
   * Objectives with their key results nested — the richest OKR read, and the
   * one to reach for when rendering "here is the quarter".
   */
  async byObjective(
    options: KeyResultByObjectiveOptions = {},
  ): Promise<ObjectiveWithKeyResults[]> {
    return await this.client.okr.getByObjective.query(
      options,
    ) as ObjectiveWithKeyResults[];
  }

  async get(id: string): Promise<KeyResult> {
    return await this.client.okr.getById.query({ id }) as KeyResult;
  }

  async create(input: KeyResultCreateInput): Promise<KeyResult> {
    return await this.client.okr.create.mutate(input) as KeyResult;
  }

  async update(input: KeyResultUpdateInput): Promise<KeyResult> {
    return await this.client.okr.update.mutate(input) as KeyResult;
  }

  /**
   * Record a progress check-in. The server derives the new status from where
   * `value` lands between `startValue` and `targetValue`, so a check-in both
   * moves the number and re-colours the key result.
   */
  async checkIn(input: KeyResultCheckInInput): Promise<KeyResultCheckIn> {
    return await this.client.okr.checkIn.mutate({
      keyResultId: input.id,
      newValue: input.value,
      notes: input.note,
    }) as KeyResultCheckIn;
  }

  async delete(id: string): Promise<{ success: boolean }> {
    return await this.client.okr.delete.mutate({ id }) as { success: boolean };
  }

  /** Link a project to a key result as executing work. Idempotent. */
  async linkProject(input: {
    keyResultId: string;
    projectId: string;
  }): Promise<{ success: boolean }> {
    return await this.client.okr.linkProject.mutate(input) as {
      success: boolean;
    };
  }

  async unlinkProject(input: {
    keyResultId: string;
    projectId: string;
  }): Promise<{ success: boolean }> {
    return await this.client.okr.unlinkProject.mutate(input) as {
      success: boolean;
    };
  }

  /**
   * Link a feature to a key result as executing work. Idempotent. The feature's
   * product must live in the key result's workspace. A feature with no
   * objective alignment inherits the key result's objective; one that already
   * has an objective is never overwritten.
   */
  async linkFeature(input: {
    keyResultId: string;
    featureId: string;
  }): Promise<{ success: boolean }> {
    return await this.client.okr.linkFeature.mutate(input) as {
      success: boolean;
    };
  }

  /** Removes only the link row — never the feature's objective alignment. */
  async unlinkFeature(input: {
    keyResultId: string;
    featureId: string;
  }): Promise<{ success: boolean }> {
    return await this.client.okr.unlinkFeature.mutate(input) as {
      success: boolean;
    };
  }
}
