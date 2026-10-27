// Knowledge page types matching the Exponential API responses.
// Pages are workspace-scoped documents (PRDs, research, specs).

export interface KnowledgePage {
  id: string;
  workspaceId: string;
  projectId: string | null;
  title: string;
  /**
   * Markdown body. With `format: "outline"` this is null; with `section` it is
   * that section only (see `section`).
   */
  body: string | null;
  /** UTF-8 size of the whole Markdown body, whatever `format`/`section` returned. */
  bodyBytes?: number;
  includeInSearch: boolean;
  docVersion: number;
  /** Provenance (ADR-0074): where the page's facts come from — a URL, a document, a person. */
  source?: string | null;
  /** Provenance (ADR-0074): the date the page's facts were true. */
  asOf?: Date | null;
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
  /** Present on `get` responses: which `format` produced this payload. */
  format?: PageGetFormat;
  /** Present on `get` with `format: "outline"`: the page's headings. */
  outline?: PageOutlineEntry[] | null;
  /** Present on `get` with `section`: the heading the body was narrowed to. */
  section?: PageOutlineEntry | null;
}

export type PageGetFormat = 'full' | 'markdown' | 'outline';

export interface PageOutlineEntry {
  /** Heading depth, 1–6. */
  level: number;
  text: string;
  /** 0-based line in the Markdown body. */
  line: number;
}

export type PageRevisionKind = 'create' | 'editor' | 'markdown' | 'restore';

export interface PageRevisionAuthor {
  id: string;
  name: string | null;
  image: string | null;
}

/** One row of a page's history (ADR-0074): a snapshot after a write, without its body. */
export interface PageRevision {
  id: string;
  /** The page's `docVersion` after this write. */
  docVersion: number;
  title: string;
  kind: PageRevisionKind;
  /** Why the change was made, when the writer said. */
  note: string | null;
  /** UTF-8 size of the Markdown body at this revision. */
  bodyBytes: number;
  author: PageRevisionAuthor | null;
  /** When the revision was first recorded. */
  createdAt: Date;
  /** When it last moved forward (editor saves fold into an open revision). */
  updatedAt: Date;
}

export interface PageHistory {
  revisions: PageRevision[];
  /** Pass back as `cursor` to fetch older revisions; null when there are none. */
  nextCursor: string | null;
}

/** A revision with its Markdown body. */
export interface PageRevisionDetail extends PageRevision {
  pageId: string;
  body: string | null;
}

export interface PageDiffSide {
  /** Null for the empty state before the first revision, or for the live page. */
  revisionId: string | null;
  docVersion: number;
  title: string;
  createdAt: Date | null;
}

export interface PageDiff {
  from: PageDiffSide;
  to: PageDiffSide;
  /** Unified diff of the Markdown bodies; empty when identical. */
  unified: string;
  stats: { added: number; removed: number };
  titleChanged: boolean;
}

export interface PageSearchResult {
  id: string;
  title: string;
  /** The best-matching chunk (semantic) or the text around the match. */
  snippet: string;
  /** Cosine similarity for semantic hits; null for substring matches. */
  similarity: number | null;
  matchedBy: 'semantic' | 'text';
  /** App-relative URL. */
  url: string;
}

export interface PageSearchOutput {
  query: string;
  workspaceId: string;
  results: PageSearchResult[];
}
