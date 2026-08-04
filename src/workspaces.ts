import type { TrpcClient } from './client.js';
import type { Workspace, WorkspaceMember } from './types/workspace.js';

export class WorkspacesApi {
  constructor(private client: TrpcClient) {}

  async list(): Promise<Workspace[]> {
    return await this.client.workspace.list.query() as Workspace[];
  }

  /**
   * Everyone who belongs to a workspace — direct members plus anyone with
   * access through a linked team. This is the lookup that makes mentions
   * possible from outside the app: match a name or email here, then drop the
   * row's `mentionSyntax` into a comment body.
   */
  async listMembers(workspaceId: string): Promise<WorkspaceMember[]> {
    return await this.client.workspace.listMembers.query({
      workspaceId,
    }) as WorkspaceMember[];
  }
}
