import type { TrpcClient } from './client.js';
import type { ReadStatus, Resource, ResourceContentType } from './types/resource.js';

export interface ResourceListOptions {
  workspaceId?: string;
  projectId?: string;
  contentType?: ResourceContentType;
  /**
   * Reading-list filter. `'unread'` is the queue (`to_read` + `reading`);
   * a single status narrows to that status; omitted applies no read filter.
   */
  readStatus?: ReadStatus | 'unread';
  search?: string;
  tags?: string[];
  includeArchived?: boolean;
  limit?: number;
  cursor?: string;
}

export interface ResourceListResult {
  resources: Resource[];
  nextCursor?: string;
}

export interface ResourceCreateInput {
  title: string;
  url?: string;
  description?: string;
  /** Pasted body. Only a Resource with content is embedded for search. */
  content?: string;
  contentType?: ResourceContentType;
  tags?: string[];
  workspaceId?: string;
  projectId?: string;
  /** Defaults to `to_read` server-side, so a saved link lands in the Reading list. */
  readStatus?: ReadStatus;
  /** Defaults to true server-side; a no-op when there is no content to embed. */
  generateEmbeddings?: boolean;
}

/** Fields `update` may change. `tags` replaces the whole set. */
export interface ResourceUpdateInput {
  title?: string;
  description?: string;
  tags?: string[];
  readStatus?: ReadStatus;
}

export interface ResourceReadState {
  id: string;
  readStatus: ReadStatus | string;
  readAt: Date | null;
}

/**
 * Resources: ingested external content (saved links, PDFs, pasted notes).
 * The Reading list is `list({ readStatus: 'unread' })`; `save` is the
 * quick-add that files a URL as a `bookmark` to read.
 *
 * Indexing follows content, never read state: a bare URL has nothing to
 * embed and is findable by title and URL only.
 */
export class ResourcesApi {
  constructor(private client: TrpcClient) {}

  async list(options: ResourceListOptions = {}): Promise<ResourceListResult> {
    return await this.client.resource.list.query(options) as ResourceListResult;
  }

  async create(input: ResourceCreateInput): Promise<Resource> {
    const result = await this.client.resource.create.mutate(input) as { resource: Resource };
    return result.resource;
  }

  async get(id: string): Promise<Resource> {
    const result = await this.client.resource.get.query({ id }) as { resource: Resource };
    return result.resource;
  }

  async update(id: string, input: ResourceUpdateInput): Promise<Resource> {
    const result = await this.client.resource.update.mutate({ id, ...input }) as { resource: Resource };
    return result.resource;
  }

  /**
   * Save a link to the Reading list: a `bookmark` in `to_read`, not embedded.
   *
   * `tags` are added to the ones the link already has. The server dedupes by
   * URL and would replace the set on re-save, so the link is saved untagged
   * (which leaves existing tags alone) and the union written after.
   */
  async save(input: {
    url: string;
    title?: string;
    note?: string;
    tags?: string[];
    workspaceId?: string;
    readStatus?: ReadStatus;
  }): Promise<Resource> {
    const resource = await this.create({
      title: input.title?.trim() || hostnameOf(input.url) || input.url,
      url: input.url,
      description: input.note,
      contentType: 'bookmark',
      readStatus: input.readStatus ?? 'to_read',
      generateEmbeddings: false,
      workspaceId: input.workspaceId,
    });
    const existing = resource.tags ?? [];
    const added = (input.tags ?? []).filter((t) => !existing.includes(t));
    if (added.length === 0) return resource;
    return await this.update(resource.id, { tags: [...existing, ...added] });
  }

  async setReadStatus(id: string, readStatus: ReadStatus): Promise<ResourceReadState> {
    return await this.client.resource.setReadStatus.mutate({ id, readStatus }) as ResourceReadState;
  }

  async archive(id: string): Promise<{ success: boolean }> {
    return await this.client.resource.archive.mutate({ id }) as { success: boolean };
  }
}

function hostnameOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}
