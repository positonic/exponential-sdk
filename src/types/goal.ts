// Goal (Objective) types matching the Exponential API responses.
//
// Naming trap worth stating once: an **Objective** is a `Goal` and carries an
// INTEGER id. A **Key Result** is a `KeyResult` with a cuid string id, and the
// tRPC router mounted at `okr` is the key-result router — not an objective
// router. See ./keyResult.ts.

/**
 * Status on the goal write paths. `on-hold` is accepted only by
 * `goals.setStatus()` (`goal.updateGoalStatus`), never by `goals.update()`.
 */
export type GoalStatus =
  | 'planned'
  | 'active'
  | 'completed'
  | 'archived'
  | 'on-hold';

/** The subset `goals.update()` accepts. */
export type GoalWritableStatus = Exclude<GoalStatus, 'on-hold'>;

/**
 * Rolled-up health, computed from key results, linked projects and child
 * goals. `healthOverride` wins over `health` when set.
 */
export type GoalHealth = 'on-track' | 'at-risk' | 'off-track' | 'no-update';

export interface GoalLifeDomain {
  id: number;
  title: string;
  description?: string | null;
  color?: string | null;
  icon?: string | null;
}

export interface GoalProjectSummary {
  id: string;
  name: string;
  status?: string | null;
  progress?: number | null;
  priority?: string | null;
  endDate?: Date | null;
}

export interface GoalChildSummary {
  id: number;
  title: string;
  status: string;
  health: string | null;
}

export interface GoalUserSummary {
  id: string;
  name: string | null;
  image?: string | null;
}

export interface Goal {
  id: number;
  title: string;
  description: string | null;
  whyThisGoal?: string | null;
  notes?: string | null;
  dueDate: Date | null;
  /**
   * OKR period. A **free-form string** — `"Q3-2026"`, `"Annual-2026"`,
   * `"H1-2027"` — not an enum. `goals.periods()` lists the conventional values.
   */
  period: string | null;
  status: string;
  health: string | null;
  healthOverride?: string | null;
  progressOverride?: number | null;
  lifeDomainId: number | null;
  userId: string;
  driUserId: string | null;
  workspaceId: string | null;
  parentGoalId: number | null;
  icon?: string | null;
  iconColor?: string | null;
  displayOrder?: number;
  createdAt: Date;
  updatedAt: Date;
  lifeDomain?: GoalLifeDomain | null;
  projects?: GoalProjectSummary[];
  outcomes?: { id: string; description: string }[];
  childGoals?: GoalChildSummary[];
  parentGoal?: { id: number; title: string } | null;
  user?: GoalUserSummary;
  driUser?: GoalUserSummary | null;
  workspace?: { id: string; name: string; slug: string } | null;
  _count?: { keyResults?: number; comments?: number };
}

/**
 * A goal with its children nested, as returned by `goals.tree()`. Only roots
 * (goals with no parent) come back at the top level; the server nests up to
 * the 5-level cap.
 */
export interface GoalTreeNode extends Goal {
  childGoals?: GoalTreeNode[] & GoalChildSummary[];
  keyResults?: {
    id: string;
    status: string;
    currentValue: number;
    targetValue: number;
  }[];
}

/** One entry from `goals.periods()`. */
export interface GoalPeriod {
  value: string;
  label: string;
}

/** Aggregate OKR numbers from `goals.stats()`. */
export interface GoalStats {
  totalObjectives: number;
  totalKeyResults: number;
  completedKeyResults: number;
  statusBreakdown: {
    onTrack: number;
    atRisk: number;
    offTrack: number;
    achieved: number;
  };
  averageProgress: number;
  averageConfidence: number | null;
  periodEndDate: Date | null;
}
