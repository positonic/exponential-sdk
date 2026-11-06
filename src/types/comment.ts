// Comment types matching the Exponential API responses

export interface CommentAuthor {
  id: string;
  name: string | null;
  image: string | null;
}

export interface ActionComment {
  id: string;
  actionId: string;
  authorId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  author: CommentAuthor;
}

export interface TicketComment {
  id: string;
  ticketId: string;
  authorId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  author: CommentAuthor;
}

/**
 * Comments on a Feature (PRD). `body` is Markdown. A comment is either
 * doc-level (`threadId` null), anchored to a span of the PRD body (`threadId`
 * matches a comment mark in the doc), or attached to a scope's feed
 * (`scopeId` set). `parentId` marks a reply; threads are one level deep.
 */
export interface FeatureComment {
  id: string;
  featureId: string;
  scopeId: string | null;
  threadId: string | null;
  parentId: string | null;
  body: string;
  quotedText: string | null;
  resolvedAt: Date | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: CommentAuthor;
}

/**
 * Comments on a Knowledge Page. `body` is Markdown. A comment is doc-level
 * (`threadId` null) or part of a thread anchored to a span of the page body
 * (`threadId` matches a comment mark; `quotedText` snapshots the span so the
 * thread still reads if the text is later edited away). `parentId` marks a
 * reply; threads are one level deep.
 */
export interface PageComment {
  id: string;
  pageId: string;
  threadId: string | null;
  parentId: string | null;
  body: string;
  quotedText: string | null;
  resolvedAt: Date | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: CommentAuthor;
}

/** What `pageComments.create` returns: the comment plus how its anchoring went. */
export interface PageCommentCreated extends PageComment {
  anchor: {
    /** The page body now highlights the thread's span. False for doc-level
     *  comments and for a viewer's thread (viewers can't edit the body). */
    anchored: boolean;
    /** The page's `docVersion` after the highlight was written. */
    docVersion?: number;
    fastForward: boolean;
  };
}

/** Comments on a Goal/Objective. `content` is Markdown. */
export interface GoalComment {
  id: string;
  goalId: number;
  authorId: string;
  content: string;
  parentUpdateId: string | null;
  createdAt: Date;
  updatedAt: Date;
  author: CommentAuthor;
}
