import type { TicketComment } from './comment.js';
// Ticket types matching the Exponential API responses.
// Tickets are the unit of work in the product backlog and can link
// to features, epics, scopes, cycles, and actions.

export type TicketStatus =
  | 'BACKLOG'
  | 'NEEDS_REFINEMENT'
  | 'READY_TO_PLAN'
  | 'COMMITTED'
  | 'IN_PROGRESS'
  | 'BLOCKED'
  | 'QA'
  | 'DONE'
  | 'DEPLOYED'
  | 'ARCHIVED';

export type TicketType =
  | 'BUG'
  | 'FEATURE'
  | 'CHORE'
  | 'IMPROVEMENT'
  | 'SPIKE'
  | 'RESEARCH';

export interface TicketAssignee {
  id: string;
  name: string | null;
  email?: string | null;
  image: string | null;
}

export interface TicketDependencyEdge {
  id: string;
  number: number | null;
  shortId: string | null;
  title: string;
  status: TicketStatus;
  priority: number | null;
  assignee: TicketAssignee | null;
}

export interface Ticket {
  id: string;
  productId: string;
  number: number | null;
  shortId: string | null;
  title: string;
  body: string | null;
  type: TicketType;
  status: TicketStatus;
  priority: number | null;
  points: number | null;
  branchName: string | null;
  prUrl: string | null;
  designUrl: string | null;
  specUrl: string | null;
  links: Record<string, string> | null;
  epicId: string | null;
  featureId: string | null;
  cycleId: string | null;
  scopeId: string | null;
  assigneeId: string | null;
  createdById: string | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  // Enrichments returned by list/getById:
  assignee?: TicketAssignee | null;
  feature?: { id: string; name: string; status?: string } | null;
  epic?: { id: string; name: string; status?: string } | null;
  cycle?: {
    id: string;
    name: string;
    status?: string;
    startDate?: Date | null;
    endDate?: Date | null;
  } | null;
  openBlockerCount?: number;
  isBlocked?: boolean;
  _count?: {
    actions?: number;
    comments?: number;
  };
}

export interface TicketDetail extends Ticket {
  product?: {
    id: string;
    slug: string;
    workspaceId: string;
    name: string;
    funTicketIds?: boolean;
  };
  dependsOn?: TicketDependencyEdge[];
  requiredFor?: TicketDependencyEdge[];
  actions?: Array<{
    id: string;
    name: string;
    status: string;
    completedAt: Date | null;
    kanbanStatus: string | null;
  }>;
  /**
   * The ticket's discussion, newest first. The detail fetch is the only way to
   * read ticket comments — there is no standalone list endpoint.
   */
  comments?: TicketComment[];
}
