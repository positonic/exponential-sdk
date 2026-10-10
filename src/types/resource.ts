// Resource types matching the Exponential API responses.
// A Resource is ingested external content (a saved link, PDF, pasted note)
// — the consumption side of Knowledge. The Reading list is a filtered view
// over Resources by read state.

export type ResourceContentType = 'web_page' | 'document' | 'pdf' | 'bookmark' | 'note';

/** Has the owner consumed this Resource yet? Orthogonal to archiving. */
export type ReadStatus = 'to_read' | 'reading' | 'read';

/** The row shape `resource.list` returns. */
export interface Resource {
  id: string;
  title: string;
  description: string | null;
  url: string | null;
  contentType: ResourceContentType | string;
  wordCount: number | null;
  tags: string[];
  pinnedAsContext: boolean;
  readStatus: ReadStatus | string;
  /** First time the resource was marked read; null while unread. */
  readAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
  project?: { id: string; name: string } | null;
}
