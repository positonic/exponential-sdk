import type { TrpcClient } from './client.js';
import type { TicketComment } from './types/comment.js';
import type {
  Ticket,
  TicketDetail,
  TicketDependencyEdge,
  TicketStatus,
  TicketType,
} from './types/ticket.js';
import type { Action } from './types/action.js';

export interface TicketListOptions {
  /**
   * Required for product-scoped queries. Optional when `prUrl` or `branchName`
   * is supplied — those filters are workspace-global (a PR URL or branch name
   * uniquely identifies a Ticket across all products in the workspace), so the
   * server resolves scope from the caller's auth context instead.
   */
  productId?: string;
  status?: TicketStatus;
  type?: TicketType;
  featureId?: string;
  epicId?: string;
  cycleId?: string;
  assigneeId?: string;
  /** Workspace-scoped lookup by `Ticket.prUrl` (exact match). */
  prUrl?: string;
  /** Workspace-scoped lookup by `Ticket.branchName` (exact match). */
  branchName?: string;
}

export interface TicketCreateInput {
  productId: string;
  title: string;
  body?: string;
  type?: TicketType;
  status?: TicketStatus;
  /** 0–4; lower is higher priority. */
  priority?: number;
  points?: number;
  branchName?: string;
  prUrl?: string;
  designUrl?: string;
  specUrl?: string;
  links?: Record<string, string>;
  epicId?: string;
  featureId?: string;
  cycleId?: string;
  scopeId?: string;
  assigneeId?: string;
  templateId?: string;
}

export interface TicketUpdateInput {
  id: string;
  title?: string;
  body?: string;
  type?: TicketType;
  status?: TicketStatus;
  priority?: number | null;
  points?: number | null;
  branchName?: string | null;
  prUrl?: string | null;
  designUrl?: string | null;
  specUrl?: string | null;
  links?: Record<string, string> | null;
  epicId?: string | null;
  featureId?: string | null;
  cycleId?: string | null;
  scopeId?: string | null;
  assigneeId?: string | null;
}

export interface TicketCommentAddInput {
  ticketId: string;
  content: string;
}

export interface TicketCommentUpdateInput {
  id: string;
  content: string;
}

export interface TicketSearchOptions {
  productId: string;
  query?: string;
  excludeTicketId?: string;
  limit?: number;
}

export class TicketsApi {
  constructor(private client: TrpcClient) {}

  async list(options: TicketListOptions): Promise<Ticket[]> {
    return await this.client.product.ticket.list.query(options) as Ticket[];
  }

  async get(id: string): Promise<TicketDetail> {
    return await this.client.product.ticket.getById.query({
      id,
    }) as TicketDetail;
  }

  async create(input: TicketCreateInput): Promise<Ticket> {
    return await this.client.product.ticket.create.mutate(input) as Ticket;
  }

  async update(input: TicketUpdateInput): Promise<Ticket> {
    return await this.client.product.ticket.update.mutate(input) as Ticket;
  }

  async delete(id: string): Promise<{ success: boolean }> {
    return await this.client.product.ticket.delete.mutate({ id }) as {
      success: boolean;
    };
  }

  async search(options: TicketSearchOptions): Promise<TicketDependencyEdge[]> {
    return await this.client.product.ticket.search.query(
      options,
    ) as TicketDependencyEdge[];
  }

  /** Mark `ticketId` as blocked by `dependsOnId`. */
  async addDependency(
    ticketId: string,
    dependsOnId: string,
  ): Promise<{ id: string; dependsOn: TicketDependencyEdge }> {
    return await this.client.product.ticket.addDependency.mutate({
      ticketId,
      dependsOnId,
    }) as { id: string; dependsOn: TicketDependencyEdge };
  }

  async removeDependency(
    ticketId: string,
    dependsOnId: string,
  ): Promise<{ success: boolean }> {
    return await this.client.product.ticket.removeDependency.mutate({
      ticketId,
      dependsOnId,
    }) as { success: boolean };
  }

  async addComment(input: TicketCommentAddInput): Promise<TicketComment> {
    return await this.client.product.ticket.addComment.mutate(
      input,
    ) as TicketComment;
  }

  async updateComment(input: TicketCommentUpdateInput): Promise<TicketComment> {
    return await this.client.product.ticket.updateComment.mutate(
      input,
    ) as TicketComment;
  }

  async deleteComment(id: string): Promise<{ success: boolean }> {
    return await this.client.product.ticket.deleteComment.mutate({
      id,
    }) as { success: boolean };
  }

  /** Attach an existing action to a ticket. */
  async linkAction(ticketId: string, actionId: string): Promise<Action> {
    return await this.client.product.ticket.linkAction.mutate({
      ticketId,
      actionId,
    }) as Action;
  }

  /** Detach an action from whatever ticket it's linked to. */
  async unlinkAction(actionId: string): Promise<Action> {
    return await this.client.product.ticket.unlinkAction.mutate({
      actionId,
    }) as Action;
  }
}
