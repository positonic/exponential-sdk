import type { TrpcClient } from './client.js';
import type { Pipeline, PipelineStage, Deal } from './types/pipeline.js';

export interface DealCreateInput {
  workspaceId: string;
  /** Target pipeline. Omitted → the workspace's default (oldest) pipeline. */
  pipelineId?: string;
  stageId: string;
  title: string;
  description?: string;
  value?: number;
  currency?: string;
  probability?: number;
  expectedCloseDate?: Date;
  contactId?: string;
  organizationId?: string;
  assignedToId?: string;
}

export interface DealUpdateInput {
  id: string;
  title?: string;
  description?: string | null;
  value?: number | null;
  currency?: string;
  probability?: number | null;
  expectedCloseDate?: Date | null;
  contactId?: string | null;
  organizationId?: string | null;
  assignedToId?: string | null;
}

export interface DealMoveInput {
  id: string;
  stageId: string;
  stageOrder: number;
  /**
   * Move the deal to this pipeline; `stageId` must be one of its stages.
   * Omitted → the stage must be on the deal's current pipeline.
   */
  pipelineId?: string;
}

/**
 * Only send `pipelineId` when one was given, so callers on the old
 * single-pipeline signature produce byte-identical requests.
 */
function withPipeline(workspaceId: string, pipelineId?: string): { workspaceId: string; pipelineId?: string } {
  return pipelineId ? { workspaceId, pipelineId } : { workspaceId };
}

export class PipelinesApi {
  constructor(private client: TrpcClient) {}

  /**
   * Every pipeline in the workspace the caller can view, oldest first,
   * including retired ones (status CANCELLED or COMPLETED). When no
   * `pipelineId` is given the server uses the oldest pipeline that is not
   * retired (ADR-0033: a workspace may hold many pipelines).
   */
  async list(workspaceId: string): Promise<Pipeline[]> {
    return await this.client.crmApi.pipelineList.query({ workspaceId }) as Pipeline[];
  }

  /** Create a pipeline with the default stages (Lead → Won/Lost). */
  async create(workspaceId: string, name: string): Promise<Pipeline> {
    return await this.client.crmApi.pipelineCreate.mutate({ workspaceId, name }) as Pipeline;
  }

  async get(workspaceId: string, pipelineId?: string): Promise<Pipeline | null> {
    return await this.client.crmApi.pipelineGet.query(withPipeline(workspaceId, pipelineId)) as Pipeline | null;
  }

  async getStages(workspaceId: string, pipelineId?: string): Promise<PipelineStage[]> {
    return await this.client.crmApi.pipelineGetStages.query(withPipeline(workspaceId, pipelineId)) as PipelineStage[];
  }

  async listDeals(workspaceId: string, pipelineId?: string): Promise<Deal[]> {
    return await this.client.crmApi.dealList.query(withPipeline(workspaceId, pipelineId)) as Deal[];
  }

  async getDeal(id: string): Promise<Deal> {
    return await this.client.crmApi.dealGet.query({ id }) as Deal;
  }

  async createDeal(input: DealCreateInput): Promise<Deal> {
    return await this.client.crmApi.dealCreate.mutate(input) as Deal;
  }

  async updateDeal(input: DealUpdateInput): Promise<Deal> {
    return await this.client.crmApi.dealUpdate.mutate(input) as Deal;
  }

  async moveDeal(input: DealMoveInput): Promise<Deal> {
    return await this.client.crmApi.dealMove.mutate(input) as Deal;
  }

  async deleteDeal(id: string): Promise<void> {
    await this.client.crmApi.dealDelete.mutate({ id });
  }
}
