/** Project lifecycle status, as the server's write path declares it. */
export type ProjectStatus = 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';

export type ProjectPriority = 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';

export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string | null;
  priority: string | null;
  workspaceId: string | null;
  createdAt: Date;
  /** Absent on every project read — the model has no `updatedAt` column. */
  updatedAt?: Date;
  workspace?: {
    id: string;
    slug: string;
    name: string;
  } | null;
}

/** One key result a project is linked to, as `projects.get()` returns it. */
export interface ProjectKeyResultLink {
  keyResultId: string;
  keyResult?: {
    id: string;
    title: string;
    goal?: { id: number; title: string } | null;
  } | null;
}

/**
 * The richer shape `projects.get()` returns — the OKR edges (`goals`,
 * `keyResults`) in particular have no counterpart on the list read, which is
 * why "which objective does this project serve?" needs a detail fetch.
 */
export interface ProjectDetail extends Project {
  slug?: string;
  productId?: string | null;
  driId?: string | null;
  goals?: { id: number; title: string; status?: string | null }[];
  outcomes?: { id: string; description: string }[];
  lifeDomains?: { id: number; title: string }[];
  keyResults?: ProjectKeyResultLink[];
  actions?: {
    id: string;
    name: string;
    status: string;
    kanbanStatus?: string | null;
    dueDate?: Date | null;
  }[];
  createdBy?: { id: string; name: string | null; email: string | null } | null;
  dri?: { id: string; name: string | null; email: string | null } | null;
  team?: { id: string; name: string; slug: string } | null;
}

export interface ProjectOutput {
  id: string;
  name: string;
  description: string | null;
  status: string | null;
  priority: string | null;
  workspace: {
    id: string;
    slug: string;
    name: string;
  } | null;
}

export interface ProjectsListOutput {
  projects: ProjectOutput[];
  total: number;
}
