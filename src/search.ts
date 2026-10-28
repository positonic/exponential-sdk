import type { TrpcClient } from './client.js';
import type {
  GlobalSearchOptions,
  GlobalSearchOutput,
  KnowledgeSearchOptions,
  KnowledgeSearchOutput,
} from './types/search.js';

export class SearchApi {
  constructor(private client: TrpcClient) {}

  /**
   * Global text search across the entities the caller can access — the same
   * coverage as the app's Cmd+K palette (projects, actions, goals,
   * workspaces, and other entity types as the API grows). Matches titles;
   * for pages by meaning use `knowledge` or `PagesApi.search`.
   */
  async global(options: GlobalSearchOptions): Promise<GlobalSearchOutput> {
    return (await this.client.search.global.query(options)) as GlobalSearchOutput;
  }

  /**
   * Semantic search over one workspace's Knowledge index — the caller's own
   * indexed meetings, resources, documents and pages, scored by meaning. Each
   * source contributes its best-matching passage. Costs an embedding call;
   * never throws for an index failure (returns no results instead).
   */
  async knowledge(options: KnowledgeSearchOptions): Promise<KnowledgeSearchOutput> {
    return (await this.client.search.knowledge.query(options)) as KnowledgeSearchOutput;
  }
}
