export type SearchResultType =
  | 'workspace'
  | 'project'
  | 'action'
  | 'goal'
  | 'keyResult'
  | 'outcome'
  | 'ticket'
  | 'feature'
  | 'epic'
  | 'page'
  | 'meeting'
  | 'contact'
  | 'organization'
  | 'product';

export interface SearchResultWorkspace {
  id: string;
  slug: string;
  name: string;
}

export interface SearchResult {
  type: SearchResultType;
  id: string;
  title: string;
  subtitle: string | null;
  workspace: SearchResultWorkspace | null;
  /** App-relative URL of the entity, when it has a stable page. */
  url: string | null;
}

export interface GlobalSearchOptions {
  query: string;
  /** Restrict results to one workspace; defaults to everything the caller can see. */
  workspaceId?: string;
  /** Max results per entity type (1-25, server default 10). */
  limit?: number;
}

export interface GlobalSearchOutput {
  query: string;
  results: SearchResult[];
}
