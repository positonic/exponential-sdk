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
