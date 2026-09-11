// Decision types matching the Exponential API responses (ADR-0060).
//
// A Decision is one row in the workspace Decision Log. It is the single model
// behind both panels on a meeting page: a decision that has been made is
// `ACCEPTED` (or `PROPOSED`), and an OPEN QUESTION is simply a Decision whose
// status is `OPEN` — there is no separate "open question" model.

/**
 * Lifecycle of a decision.
 *
 * - `OPEN` — an open question: raised, not yet decided. This is how the
 *   "Open questions" panel is populated; there is no separate model.
 * - `PROPOSED` — put forward, not yet agreed (the server's default).
 * - `ACCEPTED` — decided.
 * - `SUPERSEDED` / `DEPRECATED` — end states reached through `setStatus`;
 *   `create` rejects them as a birth state.
 */
export type DecisionStatus =
  | 'OPEN'
  | 'PROPOSED'
  | 'ACCEPTED'
  | 'SUPERSEDED'
  | 'DEPRECATED';

/** Who logged it: a meeting, a person by hand, or an agent. */
export type DecisionSource = 'MEETING' | 'MANUAL' | 'AGENT';

/**
 * Draft decisions are invisible everywhere except the source meeting's draft
 * views, and only to people who can edit that meeting.
 */
export type DecisionReviewState = 'DRAFT' | 'CONFIRMED' | 'REJECTED';

/** A quoted transcript turn backing a decision (max 50 per decision). */
export interface DecisionEvidenceTurn {
  turnIndex: number;
  speaker?: string | null;
  startTime?: number | null;
  text: string;
}

/**
 * Someone who made the decision. External participants have no `User` row, so
 * `userId` is null and the name/email pair carries them.
 */
export interface DecisionDecider {
  id: string;
  userId: string | null;
  name: string;
  email: string | null;
}

export interface DecisionUserRef {
  id: string;
  name: string | null;
  email?: string | null;
  image?: string | null;
}

export interface DecisionProductRef {
  id: string;
  name: string;
  slug: string;
}

export interface DecisionProjectRef {
  id: string;
  name: string;
  slug: string;
}

export interface DecisionMeetingRef {
  id: string;
  title: string | null;
  meetingDate?: Date | null;
  workspaceId?: string | null;
}

export interface DecisionOccurrenceRef {
  id: string;
  scheduledStart: Date;
  ceremony: { id: string; name: string; slug: string };
}

/** A neighbour in the supersession chain. */
export interface DecisionChainRef {
  id: string;
  number: number;
  statement: string;
  status: DecisionStatus;
}

export interface DecisionTicketRef {
  id: string;
  shortId: string | null;
  number: number;
  title: string;
  status: string;
  productId: string;
}

export interface DecisionFeatureRef {
  id: string;
  name: string;
  status: string;
}

/** An "implemented by" edge to a ticket or a feature. */
export interface DecisionLink {
  id: string;
  decisionId: string;
  ticketId: string | null;
  featureId: string | null;
  createdById: string;
  createdAt: Date;
  ticket?: DecisionTicketRef | null;
  feature?: DecisionFeatureRef | null;
  createdBy?: DecisionUserRef;
}

export interface DecisionAdrRef {
  id: string;
  number: number;
  title: string;
  repositoryId: string | null;
}

/**
 * A list row — enough for the Decision Log and the meeting panels, without
 * the body, evidence text, deciders or links.
 */
export interface DecisionListRow {
  id: string;
  workspaceId: string;
  /** Sequence number within the workspace; `label` is its rendered form. */
  number: number;
  /** `D-` plus the zero-padded number, e.g. `D-0042`. */
  label: string;
  statement: string;
  status: DecisionStatus;
  source: DecisionSource;
  decidedAt: Date | null;
  updatedAt: Date;
  transcriptionSessionId: string | null;
  occurrenceId: string | null;
  productId: string | null;
  projectId: string | null;
  supersededById: string | null;
  evidenceCount: number;
  product: DecisionProductRef | null;
  project: DecisionProjectRef | null;
  occurrence: DecisionOccurrenceRef | null;
  transcriptionSession: { id: string; title: string | null } | null;
  /**
   * `listForMeeting` rows carry `statement` and `status` too; the workspace
   * log's rows carry only the id and label.
   */
  supersededBy:
    | { id: string; label: string; statement?: string; status?: DecisionStatus }
    | null;
  /** Present only on `listForMeeting` rows. */
  reviewState?: DecisionReviewState;
  _count?: { links: number; deciders: number };
}

/** One decision in full, as `get`, `create`, `update` and `setStatus` return it. */
export interface Decision {
  id: string;
  workspaceId: string;
  number: number;
  label: string;
  statement: string;
  /** Markdown, with ADR headings (context / alternatives / consequences). */
  body: string | null;
  status: DecisionStatus;
  reviewState: DecisionReviewState;
  source: DecisionSource;
  decidedAt: Date | null;
  ownerId: string | null;
  createdById: string;
  confirmedById: string | null;
  confirmedAt: Date | null;
  transcriptionSessionId: string | null;
  occurrenceId: string | null;
  productId: string | null;
  projectId: string | null;
  goalId: number | null;
  keyResultId: string | null;
  supersededById: string | null;
  adrDocumentId: string | null;
  pendingAdrPrUrl: string | null;
  evidence: DecisionEvidenceTurn[];
  createdAt: Date;
  updatedAt: Date;
  owner?: DecisionUserRef | null;
  createdBy?: DecisionUserRef;
  confirmedBy?: DecisionUserRef | null;
  deciders?: DecisionDecider[];
  transcriptionSession?: DecisionMeetingRef | null;
  occurrence?: DecisionOccurrenceRef | null;
  product?: DecisionProductRef | null;
  project?: DecisionProjectRef | null;
  goal?: { id: number; title: string } | null;
  keyResult?: { id: string; title: string } | null;
  supersededBy?: DecisionChainRef | null;
  supersedes?: DecisionChainRef[];
  adrDocument?: DecisionAdrRef | null;
  links?: DecisionLink[];
  /** Present on `get`: whether the caller may write to this decision. */
  canEdit?: boolean;
}

/** What `listForMeeting` answers with — the rows plus the caller's rights. */
export interface MeetingDecisions {
  decisions: DecisionListRow[];
  /** False when the caller can't edit the meeting, or it has no workspace. */
  canLogDecision: boolean;
  workspaceId: string | null;
}

/** What `extractDrafts` reports back about one meeting. */
export interface DraftDecisionsResult {
  success: boolean;
  /** The meeting already has confirmed decisions; nothing was extracted. */
  alreadyPublished: boolean;
  /** The meeting already had drafts; they were returned, not regenerated. */
  alreadyDrafted: boolean;
  /** Drafts now awaiting review (existing or just created). */
  draftCount: number;
  draftsCreated: number;
  /** Candidates dropped because no transcript turn supported them. */
  discardedWithoutEvidence: number;
  errors: string[];
}
