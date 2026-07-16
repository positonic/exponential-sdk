// Requirement types matching the Exponential API responses.
// One atomic, testable EARS-style statement on a feature (optionally pinned
// to one of its scopes), checkable met/unmet.

export type RequirementKind = 'FUNCTIONAL' | 'NON_FUNCTIONAL' | 'CONSTRAINT';

export interface Requirement {
  id: string;
  featureId: string;
  scopeId: string | null;
  statement: string;
  kind: RequirementKind | null;
  displayOrder: number;
  checkedAt: Date | null;
  checkedById: string | null;
  createdAt: Date;
  updatedAt: Date;
  checkedBy?: {
    id: string;
    name: string | null;
    image: string | null;
  } | null;
}
