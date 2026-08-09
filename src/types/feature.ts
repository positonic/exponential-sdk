// Feature types matching the Exponential API responses.
// Features belong to a product and group user stories, scopes, and tickets.

import type { KeyResultStatus, KeyResultUnit } from './keyResult.js';

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

/**
 * One Feature→Key result execution edge (ADR-0050), as returned on a feature.
 *
 * The nesting mirrors the join row it comes from, so the key result sits under
 * `.keyResult` rather than being flattened. `assignedAt` is only present on the
 * richer `features.get()` read.
 */
export interface FeatureKeyResultLink {
  /** When the link was made. Absent on the lean `features.list()` shape. */
  assignedAt?: Date;
  keyResult: {
    id: string;
    title: string;
    period: string;
    /** The objective the key result hangs off — an integer, unlike its own cuid. */
    goalId: number;
    /** Progress fields below are `features.get()` only, absent from `list()`. */
    status?: KeyResultStatus;
    currentValue?: number;
    targetValue?: number;
    unit?: KeyResultUnit;
    unitLabel?: string | null;
    goal?: { id: number; title: string } | null;
  };
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
  /**
   * The key results this feature is executing (ADR-0050) — the answer to
   * "which numbers does this move".
   *
   * Distinct from {@link Feature.goal}, which is the coarser *Objective*
   * alignment: the objective a feature serves versus the specific key results
   * it moves. The two are allowed to disagree, so neither substitutes for the
   * other.
   *
   * Write this edge from the key result side with
   * {@link KeyResultsApi.linkFeature} — there is no feature-side link call.
   *
   * `list()` returns the lean shape (`id` / `title` / `period` / `goalId`), so
   * a per-feature key result column costs one call; `get()` additionally
   * carries each key result's progress values. Absent against servers older
   * than the readback change.
   */
  keyResultLinks?: FeatureKeyResultLink[];
  scopes?: FeatureScope[];
  _count?: {
    scopes?: number;
    userStories?: number;
    tickets?: number;
  };
}
