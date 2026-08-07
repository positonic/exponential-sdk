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
   * Always required. `product.ticket.list` is product-scoped on the server —
   * there is no workspace-wide ticket query. To search several products, call
   * `list` once per product and merge the results.
   */
  productId: string;
  status?: TicketStatus;
  type?: TicketType;
  featureId?: string;
  epicId?: string;
  cycleId?: string;
  assigneeId?: string;
  /**
   * Filter by `Ticket.prUrl` (exact match).
   *
   * Applied **client-side**, after the product-scoped fetch — the server's
   * `list` input schema has no `prUrl` field. See the note on {@link
   * TicketsApi.list}.
   */
  prUrl?: string;
  /**
   * Filter by `Ticket.branchName` (exact match).
   *
   * Applied **client-side**, after the product-scoped fetch — the server's
   * `list` input schema has no `branchName` field. See the note on {@link
   * TicketsApi.list}.
   */
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

  /**
   * List tickets in one product.
   *
   * `prUrl` and `branchName` are filtered here rather than on the server. The
   * `product.ticket.list` tRPC input schema accepts neither, and zod strips
   * unknown keys, so forwarding them was silently a no-op: a lookup by a branch
   * that matched nothing came back as *every ticket in the product*. Filtering
   * locally makes them mean what they say. Move them server-side once
   * `product.ticket.list` grows the matching input fields.
   */
  async list(options: TicketListOptions): Promise<Ticket[]> {
    const { prUrl, branchName, ...serverQuery } = options;
    const tickets = await this.client.product.ticket.list.query(
      serverQuery,
    ) as Ticket[];

    return tickets.filter((t) =>
      (prUrl === undefined || t.prUrl === prUrl) &&
      (branchName === undefined || t.branchName === branchName)
    );
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
