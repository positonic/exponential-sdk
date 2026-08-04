import type { TrpcClient } from './client.js';
import type { FeatureComment } from './types/comment.js';

export interface FeatureCommentCreateInput {
  featureId: string;
  /** Attach to a scope's activity feed instead of the feature's own feed. */
  scopeId?: string;
  /** Anchor to a span of the PRD body. Omit for a doc-level comment. */
  threadId?: string;
  /** Markdown. Mention members with `@[Name](userId)` — see `workspaces.listMembers()`. */
  body: string;
  quotedText?: string;
}

export interface FeatureCommentReplyInput {
  parentId: string;
  body: string;
}

export interface FeatureCommentUpdateInput {
  commentId: string;
  body: string;
}

export interface FeatureCommentThreadInput {
  featureId: string;
  threadId: string;
}

/**
 * Discussion on a Feature (PRD). Any workspace member can read and comment;
 * editing and deleting are author-only.
 *
 * Mentions are `@[Display Name](userId)` in the body — that markup is what
 * triggers a notification. `workspaces.listMembers()` returns a ready-made
 * `mentionSyntax` per member so callers never have to build it by hand.
 */
export class FeatureCommentsApi {
  constructor(private client: TrpcClient) {}

  async list(featureId: string): Promise<FeatureComment[]> {
    return await this.client.product.featureComment.list.query({
      featureId,
    }) as FeatureComment[];
  }

  async create(input: FeatureCommentCreateInput): Promise<FeatureComment> {
    return await this.client.product.featureComment.create.mutate(
      input,
    ) as FeatureComment;
  }

  /** Reply to an existing comment. Replies to replies still hang off the root. */
  async reply(input: FeatureCommentReplyInput): Promise<FeatureComment> {
    return await this.client.product.featureComment.reply.mutate(
      input,
    ) as FeatureComment;
  }

  async update(input: FeatureCommentUpdateInput): Promise<FeatureComment> {
    return await this.client.product.featureComment.update.mutate(
      input,
    ) as FeatureComment;
  }

  async delete(commentId: string): Promise<{ success: boolean }> {
    return await this.client.product.featureComment.delete.mutate({
      commentId,
    }) as { success: boolean };
  }

  /** Mark an anchored thread resolved. Only anchored threads have a threadId. */
  async resolve(input: FeatureCommentThreadInput): Promise<{ success: boolean }> {
    return await this.client.product.featureComment.resolve.mutate(
      input,
    ) as { success: boolean };
  }

  async unresolve(input: FeatureCommentThreadInput): Promise<{ success: boolean }> {
    return await this.client.product.featureComment.unresolve.mutate(
      input,
    ) as { success: boolean };
  }
}
