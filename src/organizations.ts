import type { TrpcClient } from './client.js';
import type { Organization, OrganizationListOutput, OrganizationSize } from './types/organization.js';

export interface OrganizationsListOptions {
  workspaceId: string;
  search?: string;
  industry?: string;
  limit?: number;
  cursor?: string;
}

export interface OrganizationCreateInput {
  workspaceId: string;
  name: string;
  websiteUrl?: string | null;
  logoUrl?: string | null;
  description?: string;
  industry?: string;
  size?: OrganizationSize;
}

export class OrganizationsApi {
  constructor(private client: TrpcClient) {}

  async list(options: OrganizationsListOptions): Promise<OrganizationListOutput> {
    return await this.client.crmApi.organizationList.query(options) as OrganizationListOutput;
  }

  async get(id: string): Promise<Organization> {
    return await this.client.crmApi.organizationGet.query({ id }) as Organization;
  }

  async create(input: OrganizationCreateInput): Promise<Organization> {
    return await this.client.crmApi.organizationCreate.mutate(input) as Organization;
  }
}
