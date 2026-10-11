import type { TrpcClient } from './client.js';
import type { AgentGuidanceContext, AgentGuidanceMethod } from './types/agentGuidance.js';

export interface AgentGuidanceMethodInput {
  /**
   * The workspace the agent is working in. Only matters while the method is
   * a draft: a member of a preview workspace then gets the draft.
   */
  workspaceId?: string;
}

export interface AgentGuidanceContextInput {
  workspaceId: string;
  /** Adds the project's instructions. Must belong to `workspaceId`, else BAD_REQUEST. */
  projectId?: string;
}

/**
 * Agent guidance (ADR-0071): the Exponential Method and the scoped AI
 * instructions, served the same way to every agent surface. A thin wrapper
 * over the `agentGuidance` router; nothing is computed here.
 *
 * Both procedures accept agent keys, `agent-context` JWTs and gateway JWTs.
 */
export class AgentGuidanceApi {
  constructor(private client: TrpcClient) {}

  /**
   * The current method version. Throws NOT_FOUND "No published method yet"
   * when there is none the caller may see.
   */
  async method(input?: AgentGuidanceMethodInput): Promise<AgentGuidanceMethod> {
    return await this.client.agentGuidance.method.query(input) as AgentGuidanceMethod;
  }

  /**
   * The workspace's (and optional project's) AI instructions, marked as
   * guidance. Requires membership of the workspace (FORBIDDEN otherwise).
   */
  async context(input: AgentGuidanceContextInput): Promise<AgentGuidanceContext> {
    return await this.client.agentGuidance.context.query(input) as AgentGuidanceContext;
  }
}
