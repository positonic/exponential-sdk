import type { TrpcClient } from './client.js';
import type { Feature, FeatureStatus } from './types/feature.js';

export interface FeatureListOptions {
  productId: string;
  status?: FeatureStatus;
}

export interface FeatureCreateInput {
  productId: string;
  name: string;
  description?: string;
  vision?: string;
  status?: FeatureStatus;
  effort?: number;
  /** 0–4; lower is higher priority. */
  priority?: number;
  goalId?: number;
  /** Area (per-product bucket) to file the feature under. */
  areaId?: string;
}

export interface FeatureUpdateInput {
  id: string;
  name?: string;
  description?: string;
  vision?: string;
  status?: FeatureStatus;
  effort?: number;
  priority?: number;
  goalId?: number | null;
  areaId?: string | null;
}

export interface FeatureLinkPageInput {
  featureId: string;
  pageId: string;
  /** Pin the linked page to one of the feature's scopes. */
  scopeId?: string;
}

export class FeaturesApi {
  constructor(private client: TrpcClient) {}

  async list(options: FeatureListOptions): Promise<Feature[]> {
    return await this.client.product.feature.list.query({
      productId: options.productId,
      status: options.status,
    }) as Feature[];
  }

  async get(id: string): Promise<Feature> {
    return await this.client.product.feature.getById.query({ id }) as Feature;
  }

  async create(input: FeatureCreateInput): Promise<Feature> {
    return await this.client.product.feature.create.mutate(input) as Feature;
  }

  async update(input: FeatureUpdateInput): Promise<Feature> {
    return await this.client.product.feature.update.mutate(input) as Feature;
  }

  async delete(id: string): Promise<{ success: boolean }> {
    return await this.client.product.feature.delete.mutate({ id }) as {
      success: boolean;
    };
  }

  /** Link a Knowledge page (PRD, spec, research) to a feature. */
  async linkPage(input: FeatureLinkPageInput): Promise<unknown> {
    return await this.client.product.feature.linkPage.mutate(input);
  }

  async unlinkPage(featureId: string, pageId: string): Promise<{ success: boolean }> {
    return await this.client.product.feature.unlinkPage.mutate({
      featureId,
      pageId,
    }) as { success: boolean };
  }
}
