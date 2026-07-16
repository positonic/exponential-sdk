// Knowledge page types matching the Exponential API responses.
// Pages are workspace-scoped documents (PRDs, research, specs).

export interface KnowledgePage {
  id: string;
  workspaceId: string;
  projectId: string | null;
  title: string;
  body: string | null;
  includeInSearch: boolean;
  docVersion: number;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  project?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  createdBy?: {
    id: string;
    name: string | null;
    image: string | null;
  };
  /** Present on `get` responses: whether the caller may edit the page. */
  canEdit?: boolean;
}
