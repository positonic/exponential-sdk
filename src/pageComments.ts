import type { TrpcClient } from './client.js';
import type { PageComment, PageCommentCreated } from './types/comment.js';

export interface PageCommentCreateInput {
  pageId: string;
  /** Markdown. Mention members with `@[Name](userId)` — see `workspaces.listMembers()`. */
  body: string;
  /**
   * Anchor the comment to this span of the page body, as it reads on the page
   * (no Markdown syntax). The server mints the thread's `threadId`, finds the
   * span and highlights it, and refuses the comment when the text matches no
   * span, or several with nothing to choose between them. Omit for a doc-level
   * comment.
   */
  quotedText?: string;
  /**
   * The text just before and/or after `quotedText`, to pick one occurrence
   * when it appears more than once. Only with `quotedText`.
   */
  quoteContext?: { prefix?: string; suffix?: string };
}

export interface PageCommentReplyInput {
  parentId: string;
  body: string;
}

export interface PageCommentUpdateInput {
  commentId: string;
  body: string;
}

export interface PageCommentThreadInput {
  pageId: string;
  threadId: string;
}

/**
 * Discussion on a Knowledge Page: a doc-level feed under the page body, plus
 * threads anchored to a span of it (`quotedText` on create). View access is
 * the commenting gate: anyone the page is shared with can join the thread,
 * but only an editor's anchored thread highlights the body. Editing and
 * deleting are author-only.
 */
export class PageCommentsApi {
  constructor(private client: TrpcClient) {}

  async list(pageId: string): Promise<PageComment[]> {
    return await this.client.pageComment.list.query({ pageId }) as PageComment[];
  }

  async create(input: PageCommentCreateInput): Promise<PageCommentCreated> {
    return await this.client.pageComment.create.mutate(input) as PageCommentCreated;
  }

  /** Reply to an existing comment. Replies to replies still hang off the root. */
  async reply(input: PageCommentReplyInput): Promise<PageComment> {
    return await this.client.pageComment.reply.mutate(input) as PageComment;
  }

  async update(input: PageCommentUpdateInput): Promise<PageComment> {
    return await this.client.pageComment.update.mutate(input) as PageComment;
  }

  async delete(commentId: string): Promise<{ success: boolean }> {
    return await this.client.pageComment.delete.mutate({
      commentId,
    }) as { success: boolean };
  }

  /** Mark an anchored thread resolved. Only anchored threads have a threadId. */
  async resolve(input: PageCommentThreadInput): Promise<{ success: boolean }> {
    return await this.client.pageComment.resolve.mutate(input) as { success: boolean };
  }

  async unresolve(input: PageCommentThreadInput): Promise<{ success: boolean }> {
    return await this.client.pageComment.unresolve.mutate(input) as { success: boolean };
  }
}
