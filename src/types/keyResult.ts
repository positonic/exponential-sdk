// Key Result types matching the Exponential API responses.
//
// A key result hangs off exactly one objective (`Goal`) and is keyed by a cuid
// string — the objective it belongs to is keyed by an integer. The tRPC router
// backing all of this is mounted at `okr`.

export type KeyResultStatus =
  | 'not-started'
  | 'on-track'
  | 'at-risk'
  | 'off-track'
  | 'achieved';

export type KeyResultUnit =
  | 'percent'
  | 'count'
  | 'currency'
  | 'hours'
  | 'custom';

export interface KeyResultCheckIn {
  id: string;
  keyResultId: string;
  previousValue: number;
  newValue: number;
  notes: string | null;
  createdById: string | null;
  createdAt: Date;
  createdBy?: { id: string; name: string | null; image?: string | null } | null;
}

export interface KeyResultProjectLink {
  keyResultId: string;
  projectId: string;
  project?: { id: string; name: string; status?: string | null };
}

export interface KeyResultFeatureLink {
  keyResultId: string;
  featureId: string;
  feature?: {
    id: string;
    name: string;
    status?: string | null;
    /** Done/total ticket counts, or null for a feature with no tickets. */
    ticketProgress?: { done: number; total: number } | null;
  };
}

export interface KeyResult {
  /** cuid — unlike the objective's integer `goalId`. */
  id: string;
  goalId: number;
  title: string;
  description: string | null;
  status: string;
  /** Manual status override. When set it wins over `status`. */
  statusOverride?: string | null;
  startValue: number;
  currentValue: number;
  targetValue: number;
  unit: string;
  unitLabel?: string | null;
  confidence?: number | null;
  period: string;
  periodStart?: Date | null;
  periodEnd?: Date | null;
  userId: string;
  driUserId: string | null;
  workspaceId: string | null;
  createdAt: Date;
  updatedAt: Date;
  goal?: { id: number; title: string; period?: string | null } | null;
  checkIns?: KeyResultCheckIn[];
  projects?: KeyResultProjectLink[];
  features?: KeyResultFeatureLink[];
  driUser?: {
    id: string;
    name: string | null;
    email?: string | null;
    image?: string | null;
  } | null;
}

/**
 * One objective with its key results, as returned by
 * `goals.keyResults.byObjective()` — the richest OKR read, and workspace-scoped
 * rather than user-scoped. This is the shape `exponential okrs list` renders.
 */
export interface ObjectiveWithKeyResults {
  id: number;
  title: string;
  description: string | null;
  status: string;
  period: string | null;
  health: string | null;
  workspaceId: string | null;
  driUserId: string | null;
  parentGoalId: number | null;
  keyResults: KeyResult[];
  /** Manual progress override if set, else the mean of the key results, else 0. */
  progress: number;
  statusCounts: {
    'on-track': number;
    'at-risk': number;
    'off-track': number;
    achieved: number;
  };
  lifeDomain?: { id: number; title: string; color?: string | null } | null;
  driUser?: {
    id: string;
    name: string | null;
    email?: string | null;
    image?: string | null;
  } | null;
}
