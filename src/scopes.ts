import type { TrpcClient } from './client.js';
import type { Feature, FeatureScope, FeatureScopeStatus } from './types/feature.js';

export interface ScopeListOptions {
  featureId: string;
}

export interface ScopeCreateInput {
  featureId: string;
  /** Short label for the increment, e.g. "V1" or "V2: auto-sync". */
  version: string;
  description: string;
  status?: FeatureScopeStatus;
  shippedAt?: Date;
}

export interface ScopeUpdateInput {
  id: string;
  version?: string;
  description?: string;
  status?: FeatureScopeStatus;
  shippedAt?: Date | null;
  displayOrder?: number;
}

/**
 * Feature scopes: shippable increments of a feature ("V1", "V2"), each with
 * its own lifecycle. Setting a scope SHIPPED stamps `shippedAt` server-side
 * and rolls the feature's status up (any live scope makes the feature Live).
 *
 * Mirrors the `UserStoriesApi` shape: `list` derives from the feature's
 * `getById` payload, which includes `scopes` ordered by `displayOrder` -
 * there is no dedicated list procedure.
 */
export class ScopesApi {
  constructor(private client: TrpcClient) {}

  async list(options: ScopeListOptions): Promise<FeatureScope[]> {
    const feature = await this.client.product.feature.getById.query({
      id: options.featureId,
    }) as Feature & { scopes?: FeatureScope[] };
    return feature.scopes ?? [];
  }

  async create(input: ScopeCreateInput): Promise<FeatureScope> {
    return await this.client.product.feature.addScope.mutate(
      input,
    ) as FeatureScope;
  }

  async update(input: ScopeUpdateInput): Promise<FeatureScope> {
    return await this.client.product.feature.updateScope.mutate(
      input,
    ) as FeatureScope;
  }

  async delete(id: string): Promise<{ success: boolean }> {
    return await this.client.product.feature.deleteScope.mutate({
      id,
    }) as { success: boolean };
  }
}
