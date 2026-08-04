import type { TrpcClient } from './client.js';
import type { GlobalSearchOptions, GlobalSearchOutput } from './types/search.js';

export class SearchApi {
  constructor(private client: TrpcClient) {}

  /**
   * Global text search across the entities the caller can access — the same
   * coverage as the app's Cmd+K palette (projects, actions, goals,
   * workspaces, and other entity types as the API grows).
   */
  async global(options: GlobalSearchOptions): Promise<GlobalSearchOutput> {
    return (await this.client.search.global.query(options)) as GlobalSearchOutput;
  }
}
