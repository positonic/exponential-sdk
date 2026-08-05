import type { TrpcClient } from './client.js';
import type { PageComment } from './types/comment.js';

export interface PageCommentCreateInput {
  pageId: string;
  /** Markdown. Mention members with `@[Name](userId)` — see `workspaces.listMembers()`. */
  body: string;
}

export interface PageCommentUpdateInput {
  commentId: string;
  body: string;
}

/**
 * Discussion on a Knowledge Page — a flat, doc-level feed under the page body.
 * View access is the commenting gate: anyone the page is shared with can join
 * the thread. Editing and deleting are author-only.
 */
export class PageCommentsApi {
  constructor(private client: TrpcClient) {}

  async list(pageId: string): Promise<PageComment[]> {
    return await this.client.pageComment.list.query({ pageId }) as PageComment[];
  }

  async create(input: PageCommentCreateInput): Promise<PageComment> {
    return await this.client.pageComment.create.mutate(input) as PageComment;
  }

  async update(input: PageCommentUpdateInput): Promise<PageComment> {
    return await this.client.pageComment.update.mutate(input) as PageComment;
  }

  async delete(commentId: string): Promise<{ success: boolean }> {
    return await this.client.pageComment.delete.mutate({
      commentId,
    }) as { success: boolean };
  }
}
