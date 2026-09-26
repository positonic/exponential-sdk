// Action types matching the Exponential API responses

export type KanbanStatus =
  | 'BACKLOG'
  | 'TODO'
  | 'IN_PROGRESS'
  | 'IN_REVIEW'
  | 'DONE'
  | 'CANCELLED';

export type Priority =
  | 'Quick'
  | 'Scheduled'
  | '1st Priority'
  | '2nd Priority'
  | '3rd Priority'
  | '4th Priority'
  | '5th Priority'
  | 'Errand'
  | 'Remember'
  | 'Watch'
  | 'Someday Maybe';

/**
 * One blocker of an action, as the server returns it under `depsOut[].dependsOn`
 * (ADR-0062). A blocker is *open* while `status === 'ACTIVE'`.
 */
export interface ActionBlocker {
  id: string;
  name: string;
  status: string;
  kanbanStatus: string | null;
  projectId: string | null;
}

/** One `ActionDependency` edge: "this action is blocked by `dependsOn`". */
export interface ActionDependencyEdge {
  id: string;
  dependsOn: ActionBlocker;
}

export interface Action {
  id: string;
  name: string;
  description: string | null;
  status: string;
  priority: string;
  projectId: string | null;
  workspaceId: string | null;
  kanbanStatus: KanbanStatus | null;
  kanbanOrder: number | null;
  dueDate: Date | null;
  scheduledStart: Date | null;
  scheduledEnd: Date | null;
  duration: number | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  source: string;
  /**
   * The actions this one is blocked by, one edge per blocker. Carried by
   * `action.getAll`, `getById`, `getProjectActions` and `getByTranscription`;
   * absent on procedures that do not include the relation (e.g. kanban).
   * The reverse direction ("what does this action block") is not exposed.
   */
  depsOut?: ActionDependencyEdge[];
  /** Server-derived: how many of `depsOut` are still `ACTIVE`. */
  openBlockerCount?: number;
  /**
   * Server-derived: `openBlockerCount > 0` and the action itself is `ACTIVE`.
   * Do not re-derive this client-side.
   */
  isBlocked?: boolean;
  project?: {
    id: string;
    name: string;
  } | null;
  workspace?: {
    id: string;
    slug: string;
    name: string;
  } | null;
  assignees?: Array<{
    /** Bare form returned by `action.upsertBySource`. */
    userId?: string;
    user?: {
      id: string;
      name: string | null;
      email: string | null;
    };
  }>;
}

export interface ActionOutput {
  id: string;
  name: string;
  description: string | null;
  status: string;
  priority: string;
  kanbanStatus: string | null;
  dueDate: string | null;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  project: {
    id: string;
    name: string;
  } | null;
  workspace: {
    id: string;
    slug: string;
    name: string;
  } | null;
  assignees: Array<{
    id: string;
    name: string | null;
    email: string | null;
  }>;
  createdAt: string;
  completedAt: string | null;
  /** Passed through from the server unchanged; absent when the procedure omits it. */
  depsOut?: ActionDependencyEdge[];
  openBlockerCount?: number;
  isBlocked?: boolean;
}

export interface ActionsListOutput {
  actions: ActionOutput[];
  total: number;
  filters: {
    status?: string;
    projectId?: string;
    workspaceId?: string;
    kanbanStatus?: string;
  };
}
