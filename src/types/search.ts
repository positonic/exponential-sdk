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

export type KnowledgeSourceType = 'transcription' | 'resource' | 'document' | 'page';

export interface KnowledgeSearchOptions {
  /** What the content should be about (3–200 chars). */
  query: string;
  /** Required: the Knowledge index is searched one workspace at a time. */
  workspaceId: string;
  /** Max sources returned (1-20, server default 5). */
  limit?: number;
  /** Restrict to these kinds of source; default is every kind the caller can see. */
  sourceTypes?: KnowledgeSourceType[];
}

/** One Knowledge Base hit: the best-matching chunk of one indexed source. */
export interface KnowledgeSearchResult {
  sourceType: KnowledgeSourceType;
  sourceId: string;
  title: string;
  /** The matching chunk, whitespace-collapsed and cut to a one-line preview. */
  snippet: string;
  similarity: number;
  /** In-app route, or the source's own URL when `external`. */
  url: string;
  external: boolean;
}

export interface KnowledgeSearchOutput {
  query: string;
  workspaceId: string;
  results: KnowledgeSearchResult[];
}
