import type { TrpcClient } from './client.js';
import type { GoalComment } from './types/comment.js';

export interface GoalCommentAddInput {
  goalId: number;
  /** Markdown. Mention members with `@[Name](userId)` — see `workspaces.listMembers()`. */
  content: string;
  /** Thread this comment under a specific goal update rather than the goal itself. */
  parentUpdateId?: string;
}

export interface GoalCommentUpdateInput {
  commentId: string;
  content: string;
}

/**
 * Discussion on a Goal/Objective. Note `goalId` is numeric — goals use integer
 * ids, unlike the cuid-keyed product entities.
 */
export class GoalCommentsApi {
  constructor(private client: TrpcClient) {}

  async list(goalId: number): Promise<GoalComment[]> {
    return await this.client.goalComment.getComments.query({
      goalId,
    }) as GoalComment[];
  }

  async add(input: GoalCommentAddInput): Promise<GoalComment> {
    return await this.client.goalComment.addComment.mutate(input) as GoalComment;
  }

  async update(input: GoalCommentUpdateInput): Promise<GoalComment> {
    return await this.client.goalComment.updateComment.mutate(
      input,
    ) as GoalComment;
  }

  async delete(commentId: string): Promise<{ success: boolean }> {
    return await this.client.goalComment.deleteComment.mutate({
      commentId,
    }) as { success: boolean };
  }
}
