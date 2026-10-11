// Agent guidance types matching the Exponential API responses (ADR-0071).
//
// `AgentGuidanceMethod` and `AgentGuidanceContext` mirror `MethodPayload` and
// `ContextPayload` in exponential-app's `src/server/services/agentGuidance/`.
// That module is the one source; these types only describe what it returns.

/** The three method documents, always served in this order. */
export type AgentGuidanceMethodDocumentId = 'method' | 'glossary' | 'agent-principles';

export interface AgentGuidanceMethodDocument {
  id: AgentGuidanceMethodDocumentId;
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
export interface AgentGuidanceMethod {
  version: string;
  status: 'draft' | 'published';
  /** `sha256:<hex>`, computed at request time from the documents returned. */
  contentHash: string;
  publishedAt: string | null;
  canonicalSource: {
    /** Currently `positonic/exponential`. */
    repo: string;
    /** Currently `content/docs/method`. */
    path: string;
    /** `/docs/method` once published; null while the method is dark. */
    url: string | null;
  };
  documents: AgentGuidanceMethodDocument[];
}

/** Which scope an instruction came from. */
export type AgentGuidanceInstructionScope = 'workspace' | 'project';

export interface AgentGuidanceContextInstruction {
  scope: AgentGuidanceInstructionScope;
  /** The workspace or project the text belongs to. */
  sourceId: string;
  text: string;
}

/**
 * The AI instructions in scope for a workspace (and optional project),
 * assembled exactly as in-app chat assembles them.
 */
export interface AgentGuidanceContext {
  workspace: { id: string; slug: string; name: string };
  /** Null when no project was asked for, or the caller cannot see it. */
  project: { id: string; name: string } | null;
  /** AI instructions never authorise anything (ADR-0071). */
  authority: 'guidance';
  /** Scopes with no text are omitted. */
  instructions: AgentGuidanceContextInstruction[];
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
