import type { TrpcClient } from './client.js';
import type { KnowledgePage } from './types/page.js';

export interface PageListOptions {
  workspaceId: string;
  projectId?: string;
  search?: string;
}

export interface PageCreateInput {
  workspaceId: string;
  projectId?: string | null;
  title?: string;
  /** Markdown body. Indexed for search when non-empty. */
  body?: string;
  includeInSearch?: boolean;
}

export interface PageUpdateInput {
  id: string;
  title?: string;
  projectId?: string | null;
  includeInSearch?: boolean;
  /**
   * Markdown body. Sending `body` without a rich-text doc is a
   * Markdown-source write: the server treats the Markdown as canonical and
   * the editor re-derives its rich document on next open.
   */
  body?: string;
}

/**
 * Knowledge pages (PRDs, research, technical specs). Workspace-scoped
 * documents; link one to a feature via `FeaturesApi.linkPage`.
 */
export class PagesApi {
  constructor(private client: TrpcClient) {}

  async list(options: PageListOptions): Promise<KnowledgePage[]> {
    return await this.client.page.list.query(options) as KnowledgePage[];
  }

  async get(id: string): Promise<KnowledgePage> {
    return await this.client.page.get.query({ id }) as KnowledgePage;
  }

  async create(input: PageCreateInput): Promise<KnowledgePage> {
    return await this.client.page.create.mutate(input) as KnowledgePage;
  }

  async update(input: PageUpdateInput): Promise<KnowledgePage> {
    return await this.client.page.update.mutate(input) as KnowledgePage;
  }
}
