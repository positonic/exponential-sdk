import type { TrpcClient } from './client.js';
import type {
  KnowledgePage,
  PageDiff,
  PageGetFormat,
  PageHistory,
  PageRevisionDetail,
  PageSearchOutput,
} from './types/page.js';

export interface PageListOptions {
  workspaceId: string;
  projectId?: string;
  /** Case-insensitive substring over title and body. For search by meaning use `search`. */
  search?: string;
}

export interface PageGetOptions {
  /**
   * How much of the body to fetch. Defaults to `markdown` — the Markdown body
   * without the editor's ProseMirror doc, which is several times larger and
   * carries nothing an agent needs. `outline` returns headings only; `full`
   * is the editor payload.
   */
  format?: PageGetFormat;
  /**
   * Narrow the body to one section: the heading's text (case-insensitive;
   * `## ` prefix tolerated) through to the next heading of the same or a
   * higher level. Unknown headings fail with the list of headings that exist.
   */
  section?: string;
}

export interface PageSearchOptions {
  workspaceId: string;
  /** What the page should be about (2–200 chars). */
  query: string;
  projectId?: string;
  /** Max pages returned (1–25, server default 10). */
  limit?: number;
}

export interface PageHistoryOptions {
  /** Max revisions (1–200, server default 50). */
  limit?: number;
  /** `nextCursor` from a previous page of history. */
  cursor?: string;
}

export interface PageDiffOptions {
  /**
   * What to compare the revision with: `previous` (default — what this
   * revision changed), `current` (the page as it is now), or another
   * revision's id.
   */
  against?: 'previous' | 'current' | string;
}

export interface PageCreateInput {
  workspaceId: string;
  projectId?: string | null;
  title?: string;
  /** Markdown body. Indexed for search when non-empty. */
  body?: string;
  includeInSearch?: boolean;
  /** Why the page was created — recorded on its first revision. */
  note?: string;
  /** Provenance: where the facts come from (URL, document, person). */
  source?: string | null;
  /** Provenance: the date the facts were true. */
  asOf?: Date | null;
}

export interface PageUpdateInput {
  id: string;
  title?: string;
  projectId?: string | null;
  includeInSearch?: boolean;
  /**
   * Markdown body. Sending `body` without a rich-text doc is a
   * Markdown-source write: the server treats the Markdown as canonical and
   * the editor re-derives its rich document on next open.
   */
  body?: string;
  /**
   * The `docVersion` you read before editing. With it, a body write is a
   * compare-and-set: if someone saved in between, the call fails with
   * CONFLICT instead of overwriting their work. Always send it when you can.
   */
  baseVersion?: number;
  /**
   * Why this change — recorded on the revision and shown in the page's
   * history. Always send one from an agent: a body write without a note
   * reads "No reason given" to everyone who looks at the history.
   */
  note?: string;
  /** Provenance: where the facts come from. Empty string / null clears it. */
  source?: string | null;
  /** Provenance: the date the facts were true. Null clears it. */
  asOf?: Date | null;
}

export interface PageRestoreOptions {
  /** Why you are restoring; defaults to "Restored the version from <date>". */
  note?: string;
}

/**
 * Knowledge pages (PRDs, research, technical specs). Workspace-scoped
 * documents; link one to a feature via `FeaturesApi.linkPage`.
 *
 * Reads are lean by default: `get` returns Markdown only. Use `outline` to see
 * a long page's shape, then `get(id, { section })` for the part you need.
 * Every write is recorded in the page's history (`history`, `diff`,
 * `restore`); pass a `note` so the record says why.
 */
export class PagesApi {
  constructor(private client: TrpcClient) {}

  async list(options: PageListOptions): Promise<KnowledgePage[]> {
    return await this.client.page.list.query(options) as KnowledgePage[];
  }

  /** One page. Markdown body only unless `format` says otherwise. */
  async get(id: string, options: PageGetOptions = {}): Promise<KnowledgePage> {
    return await this.client.page.get.query({
      id,
      format: options.format ?? 'markdown',
      ...(options.section ? { section: options.section } : {}),
    }) as KnowledgePage;
  }

  /** The page's headings (level, text, line) and `bodyBytes`, no body. */
  async outline(id: string): Promise<KnowledgePage> {
    return await this.get(id, { format: 'outline' });
  }

  /**
   * Pages about something: semantic hits from the Knowledge index first
   * (nearest first, with the matching passage as `snippet`), then pages whose
   * title or body contain the query. Only pages the caller can view.
   */
  async search(options: PageSearchOptions): Promise<PageSearchOutput> {
    return await this.client.page.search.query(options) as PageSearchOutput;
  }

  async create(input: PageCreateInput): Promise<KnowledgePage> {
    return await this.client.page.create.mutate(input) as KnowledgePage;
  }

  async update(input: PageUpdateInput): Promise<KnowledgePage> {
    return await this.client.page.update.mutate(input) as KnowledgePage;
  }

  /** The page's revisions, newest first — who, when, why, size. Never the bodies. */
  async history(id: string, options: PageHistoryOptions = {}): Promise<PageHistory> {
    return await this.client.page.history.query({ id, ...options }) as PageHistory;
  }

  /** One revision with its Markdown body. */
  async revision(pageId: string, revisionId: string): Promise<PageRevisionDetail> {
    return await this.client.page.revision.query({ id: pageId, revisionId }) as PageRevisionDetail;
  }

  /** What a revision changed, as a unified diff of the Markdown. */
  async diff(pageId: string, revisionId: string, options: PageDiffOptions = {}): Promise<PageDiff> {
    return await this.client.page.diff.query({
      id: pageId,
      revisionId,
      against: options.against ?? 'previous',
    }) as PageDiff;
  }

  /**
   * Put a revision's content back as the page's current content. A forward
   * write: `docVersion` bumps and a "restore" revision is recorded.
   */
  async restore(
    pageId: string,
    revisionId: string,
    options: PageRestoreOptions = {},
  ): Promise<{ id: string; docVersion: number; revisionId: string }> {
    return await this.client.page.restore.mutate({ id: pageId, revisionId, ...options }) as {
      id: string;
      docVersion: number;
      revisionId: string;
    };
  }
}
