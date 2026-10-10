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

  /** Save a link to the Reading list: a `bookmark` in `to_read`, not embedded. */
  async save(input: {
    url: string;
    title?: string;
    note?: string;
    workspaceId?: string;
    readStatus?: ReadStatus;
  }): Promise<Resource> {
    return await this.create({
      title: input.title?.trim() || hostnameOf(input.url) || input.url,
      url: input.url,
      description: input.note,
      contentType: 'bookmark',
      readStatus: input.readStatus ?? 'to_read',
      generateEmbeddings: false,
      workspaceId: input.workspaceId,
    });
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
