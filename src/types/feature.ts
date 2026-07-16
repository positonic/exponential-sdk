// Feature types matching the Exponential API responses.
// Features belong to a product and group user stories, scopes, and tickets.

export type FeatureStatus =
  | 'IDEA'
  | 'DEFINED'
  | 'IN_PROGRESS'
  | 'SHIPPED'
  | 'DEPRECATED'
  | 'ARCHIVED';

export type FeatureScopeStatus =
  | 'PLANNED'
  | 'IN_PROGRESS'
  | 'SHIPPED'
  | 'DEPRECATED';

export interface FeatureScope {
  id: string;
  featureId: string;
  version: string;
  status: FeatureScopeStatus;
  description: string;
  shippedAt: Date | null;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Feature {
  id: string;
  productId: string;
  name: string;
  description: string | null;
  vision: string | null;
  status: FeatureStatus;
  effort: number | null;
  priority: number | null;
  goalId: number | null;
  areaId: string | null;
  createdById: string | null;
  createdAt: Date;
  updatedAt: Date;
  goal?: {
    id: number;
    title: string;
    period: string | null;
  } | null;
  scopes?: FeatureScope[];
  _count?: {
    scopes?: number;
    userStories?: number;
    tickets?: number;
  };
}
