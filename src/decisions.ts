import type { TrpcClient } from './client.js';
import type {
  Decision,
  DecisionEvidenceTurn,
  DraftDecisionsResult,
  DecisionLink,
  DecisionListRow,
  DecisionReviewState,
  DecisionSource,
  DecisionStatus,
  MeetingDecisions,
} from './types/decision.js';

/** A person who made the decision; `name` is the only required half. */
export interface DecisionDeciderInput {
  userId?: string | null;
  name: string;
  email?: string | null;
}

export interface DecisionListOptions {
  workspaceId: string;
  statuses?: DecisionStatus[];
  sources?: DecisionSource[];
  /** A product id, or the literal `"workspace"` for decisions with no product. */
  productId?: string;
  /** With a real `productId`: ALSO include decisions that have no product. */
  includeWorkspaceWide?: boolean;
  projectId?: string;
  /** Free-text over statement and body (max 200 characters). */
  search?: string;
  /** One decision by its workspace sequence number — `D-0003` is number 3. */
  number?: number;
  /** Cap the rows returned (1-500). Unset returns everything visible. */
  limit?: number;
}

export interface DecisionCreateInput {
  workspaceId: string;
  /** The decision itself, or the open question. Max 500 characters. */
  statement: string;
  /** Markdown detail — context, alternatives, consequences. Max 20,000. */
  body?: string | null;
  /**
   * Defaults to `PROPOSED` server-side. Pass `OPEN` to log an OPEN QUESTION —
   * that is the only representation of one. `SUPERSEDED` and `DEPRECATED` are
   * rejected here; they are `setStatus` transitions.
   */
  status?: DecisionStatus;
  source?: DecisionSource;
  decidedAt?: Date | null;
  ownerId?: string | null;
  /** Meeting provenance. Requires EDIT access to that meeting. */
  transcriptionSessionId?: string | null;
  occurrenceId?: string | null;
  productId?: string | null;
  projectId?: string | null;
  goalId?: number | null;
  keyResultId?: string | null;
  /** Max 50. */
  deciders?: DecisionDeciderInput[];
  /**
   * Quoted transcript turns backing the decision (max 50). The server checks
   * every turn against the meeting's actual transcript: the index must
   * resolve and the words must be that turn's, compared loosely for case,
   * punctuation and whitespace. Turns that don't match are DROPPED, silently
   * from the caller's side, and `speaker`/`startTime` are overwritten with
   * the transcript's own values. Evidence therefore requires
   * `transcriptionSessionId` — sending it without one is a BAD_REQUEST.
   */
  evidence?: DecisionEvidenceTurn[];
}

/** Content and scope only — status changes go through {@link DecisionsApi.setStatus}. */
export interface DecisionUpdateInput {
  workspaceId: string;
  decisionId: string;
  statement?: string;
  body?: string | null;
  decidedAt?: Date | null;
  ownerId?: string | null;
  productId?: string | null;
  projectId?: string | null;
  goalId?: number | null;
  keyResultId?: string | null;
  adrDocumentId?: string | null;
}

export interface DecisionSetStatusInput {
  workspaceId: string;
  decisionId: string;
  status: DecisionStatus;
  /** Required by convention when moving to `SUPERSEDED`. */
  supersededById?: string | null;
}

/**
 * Decisions — the writable half of the Decision Log (ADR-0060).
 *
 * The one thing worth knowing before using this: **an open question is a
 * decision with status `OPEN`**. There is no separate model, and it is what
 * the "Open questions" panel on a meeting page reads.
 *
 * Reads need workspace `view`; writes need workspace `edit`, and a decision
 * carrying `transcriptionSessionId` additionally needs edit access to that
 * meeting.
 */
export class DecisionsApi {
  constructor(private client: TrpcClient) {}

  /**
   * Confirmed decisions in a workspace, newest decided first. Drafts are
   * never included — see {@link listForMeeting} for those.
   */
  async list(options: DecisionListOptions): Promise<DecisionListRow[]> {
    return await this.client.decision.list.query(options) as DecisionListRow[];
  }

  async get(workspaceId: string, decisionId: string): Promise<Decision> {
    return await this.client.decision.get.query({
      workspaceId,
      decisionId,
    }) as Decision;
  }

  /**
   * Decisions logged from one meeting — both panels' contents. Drafts are
   * included for callers who can edit the meeting. No workspace id needed:
   * the meeting resolves it.
   */
  async listForMeeting(
    transcriptionSessionId: string,
  ): Promise<MeetingDecisions> {
    return await this.client.decision.listForMeeting.query({
      transcriptionSessionId,
    }) as MeetingDecisions;
  }

  /** Decisions formalised as one ADR ("Decided in"). */
  async listForAdr(
    workspaceId: string,
    adrDocumentId: string,
  ): Promise<DecisionListRow[]> {
    return await this.client.decision.listForAdr.query({
      workspaceId,
      adrDocumentId,
    }) as DecisionListRow[];
  }

  /**
   * Extract draft decisions from a meeting's notes and transcript. Drafts
   * only — someone confirms or rejects each one. Idempotent per meeting:
   * existing drafts come back untouched, and a meeting that already has
   * confirmed decisions reports `alreadyPublished` without calling the model.
   */
  async extractDrafts(
    transcriptionSessionId: string,
  ): Promise<DraftDecisionsResult> {
    return await this.client.decision.extractDrafts.mutate({
      transcriptionSessionId,
    }) as DraftDecisionsResult;
  }

  /**
   * Log a decision. Pass `status: 'OPEN'` for an open question, and
   * `transcriptionSessionId` to attach it to the meeting it came out of.
   */
  async create(input: DecisionCreateInput): Promise<Decision> {
    return await this.client.decision.create.mutate(input) as Decision;
  }

  async update(input: DecisionUpdateInput): Promise<Decision> {
    return await this.client.decision.update.mutate(input) as Decision;
  }

  /**
   * Lifecycle transition — including answering an open question by moving it
   * from `OPEN` to `ACCEPTED`.
   */
  async setStatus(input: DecisionSetStatusInput): Promise<Decision> {
    return await this.client.decision.setStatus.mutate(input) as Decision;
  }

  /** "Implemented by" a ticket. Idempotent: an existing link is returned. */
  async linkTicket(
    workspaceId: string,
    decisionId: string,
    ticketId: string,
  ): Promise<DecisionLink> {
    return await this.client.decision.linkTicket.mutate({
      workspaceId,
      decisionId,
      ticketId,
    }) as DecisionLink;
  }

  /** "Implemented by" a feature. Idempotent: an existing link is returned. */
  async linkFeature(
    workspaceId: string,
    decisionId: string,
    featureId: string,
  ): Promise<DecisionLink> {
    return await this.client.decision.linkFeature.mutate({
      workspaceId,
      decisionId,
      featureId,
    }) as DecisionLink;
  }

  /** Remove one link, by the `DecisionLink` id (not the ticket/feature id). */
  async unlink(workspaceId: string, linkId: string): Promise<{ deleted: boolean }> {
    return await this.client.decision.unlink.mutate({
      workspaceId,
      linkId,
    }) as { deleted: boolean };
  }

  /** Publish a draft into the log. */
  async confirmDraft(workspaceId: string, decisionId: string): Promise<Decision> {
    return await this.client.decision.confirmDraft.mutate({
      workspaceId,
      decisionId,
    }) as Decision;
  }

  /**
   * Reject a draft. Confirmed decisions are never rejected — deprecate or
   * supersede them through {@link setStatus}.
   */
  async rejectDraft(
    workspaceId: string,
    decisionId: string,
  ): Promise<{ id: string; reviewState: DecisionReviewState }> {
    return await this.client.decision.rejectDraft.mutate({
      workspaceId,
      decisionId,
    }) as { id: string; reviewState: DecisionReviewState };
  }

  /**
   * Hard-delete a draft or rejected row. The server refuses for a confirmed
   * decision — the log keeps its history.
   */
  async deleteDraft(
    workspaceId: string,
    decisionId: string,
  ): Promise<{ id: string }> {
    return await this.client.decision.deleteDraft.mutate({
      workspaceId,
      decisionId,
    }) as { id: string };
  }
}
