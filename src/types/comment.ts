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

/** Comments on a Knowledge Page — a flat, doc-level feed. `body` is Markdown. */
export interface PageComment {
  id: string;
  pageId: string;
  body: string;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: CommentAuthor;
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
