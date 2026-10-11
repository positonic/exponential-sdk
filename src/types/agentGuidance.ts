// Agent guidance types matching the Exponential API responses (ADR-0071).
//
// Mirrors `MethodPayload` and `ContextPayload` in exponential-app's
// `src/server/services/agentGuidance/`. That module is the one source; these
// types only describe what it returns.

/** The three method documents, always served in this order. */
export type MethodDocumentId = 'method' | 'glossary' | 'agent-principles';

export interface MethodDocument {
  id: MethodDocumentId;
  title: string;
  href: string;
  /** The page's Markdown body, frontmatter excluded: exactly what /docs renders. */
  markdown: string;
}

/**
 * The current version of the Exponential Method, as agents receive it.
 *
 * While the method is a `draft`, only members of a preview workspace get it;
 * everyone else gets NOT_FOUND "No published method yet".
 */
export interface MethodPayload {
  version: string;
  status: 'draft' | 'published';
  /** `sha256:<hex>`, computed at request time from the documents returned. */
  contentHash: string;
  publishedAt: string | null;
  canonicalSource: {
    repo: 'positonic/exponential';
    path: 'content/docs/method';
    /** `/docs/method` once published; null while the method is dark. */
    url: string | null;
  };
  documents: MethodDocument[];
}

/** Which scope an instruction came from. */
export type InstructionScope = 'workspace' | 'project';

export interface ContextInstruction {
  scope: InstructionScope;
  /** The workspace or project the text belongs to. */
  sourceId: string;
  text: string;
}

/**
 * The AI instructions in scope for a workspace (and optional project),
 * assembled exactly as in-app chat assembles them.
 */
export interface ContextPayload {
  workspace: { id: string; slug: string; name: string };
  /** Null when no project was asked for, or the caller cannot see it. */
  project: { id: string; name: string } | null;
  /** AI instructions never authorise anything (ADR-0071). */
  authority: 'guidance';
  /** Scopes with no text are omitted. */
  instructions: ContextInstruction[];
  /** Byte-identical to the block chat injects; null when no scope has text. */
  assembled: string | null;
  /**
   * `sha256:<hex>` over the source ids and texts, in order. Changes when, and
   * only when, an instruction changes: compare it to know whether a loaded
   * copy is current.
   */
  revision: string;
  /** ISO timestamp. */
  generatedAt: string;
}
