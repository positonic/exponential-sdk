import type { TrpcClient } from './client.js';

export interface Area {
  id: string;
  productId: string;
  name: string;
  description: string | null;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    features?: number;
  };
}

export interface AreaListOptions {
  productId: string;
}

export interface AreaCreateInput {
  productId: string;
  name: string;
  description?: string;
}

/**
 * Areas: per-product buckets a feature is filed under (exactly one or none).
 */
export class AreasApi {
  constructor(private client: TrpcClient) {}

  async list(options: AreaListOptions): Promise<Area[]> {
    return await this.client.product.feature.listAreas.query(options) as Area[];
  }

  async create(input: AreaCreateInput): Promise<Area> {
    return await this.client.product.feature.createArea.mutate(input) as Area;
  }
}
