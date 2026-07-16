import type { TrpcClient } from './client.js';
import type { Feature } from './types/feature.js';
import type { Requirement, RequirementKind } from './types/requirement.js';

export interface RequirementListOptions {
  featureId: string;
  /** Only requirements pinned to this scope. */
  scopeId?: string;
}

export interface RequirementCreateInput {
  featureId: string;
  /** Pin the requirement to one of the feature's scopes. */
  scopeId?: string;
  /** One EARS-style "shall" statement. */
  statement: string;
  kind?: RequirementKind;
}

/**
 * Requirements on a feature (EARS-style "shall" statements, checkable
 * met/unmet). Replaces user stories as the requirements mechanism.
 *
 * Mirrors the `UserStoriesApi` shape: `list` derives from the feature's
 * `getById` payload, which includes `requirements` ordered by
 * `displayOrder` - there is no dedicated list procedure.
 */
export class RequirementsApi {
  constructor(private client: TrpcClient) {}

  async list(options: RequirementListOptions): Promise<Requirement[]> {
    const feature = await this.client.product.feature.getById.query({
      id: options.featureId,
    }) as Feature & { requirements?: Requirement[] };
    const requirements = feature.requirements ?? [];
    return options.scopeId
      ? requirements.filter((r) => r.scopeId === options.scopeId)
      : requirements;
  }

  async create(input: RequirementCreateInput): Promise<Requirement> {
    return await this.client.product.feature.addRequirement.mutate(
      input,
    ) as Requirement;
  }

  /** Mark a requirement met (true) or unmet (false). */
  async setChecked(id: string, checked: boolean): Promise<Requirement> {
    return await this.client.product.feature.setRequirementChecked.mutate({
      id,
      checked,
    }) as Requirement;
  }

  async delete(id: string): Promise<{ success: boolean }> {
    return await this.client.product.feature.deleteRequirement.mutate({
      id,
    }) as { success: boolean };
  }
}
