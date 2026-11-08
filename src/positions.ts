import type { TrpcClient } from './client.js';
import type {
  Position,
  PositionCoverage,
  PositionImportOutput,
  PositionList,
} from './types/position.js';

export interface PositionCreateInput {
  workspaceId: string;
  /** 1–80 characters, unique per workspace. */
  title: string;
  /** Markdown, 1–2000 characters. */
  remit: string;
  /** Markdown, up to 2000 characters. */
  notAccountableFor?: string;
  /** Member userIds (max 50). Every one must belong to the workspace. */
  holderUserIds?: string[];
}

/** At least one field besides the ids must be present. */
export interface PositionUpdateInput {
  workspaceId: string;
  positionId: string;
  title?: string;
  remit?: string;
  /** `null` or `""` clears it. */
  notAccountableFor?: string | null;
  /** Replaces the whole holder set (owner/admin only). */
  holderUserIds?: string[];
}

export interface PositionImportRow {
  title: string;
  remit: string;
  /** Omit to keep the stored value on an update; `""` clears it. */
  notAccountableFor?: string;
  holderUserIds: string[];
}

export interface PositionImportInput {
  workspaceId: string;
  /** Validate and return the plan without writing. */
  dryRun: boolean;
  /** 1–50 rows, titles unique (case-insensitive), at most 200 distinct holders. */
  positions: PositionImportRow[];
}

/**
 * Positions — a workspace's roles & responsibilities (ADR-0068).
 *
 * Every write is human-only: it needs a person's own API token (`exponential
 * auth login`), and an agent key is refused with FORBIDDEN. Owners and admins
 * create, rename, delete, set holders and import; a member may edit the
 * remit of a Position they hold.
 */
export class PositionsApi {
  constructor(private client: TrpcClient) {}

  /** Every Position with its holders, plus each member's coverage. */
  async list(workspaceId: string): Promise<PositionList> {
    return await this.client.position.list.query({ workspaceId }) as PositionList;
  }

  /** One Position by id, from `list` (the router has no single-row read). */
  async get(workspaceId: string, positionId: string): Promise<Position | null> {
    const { positions } = await this.list(workspaceId);
    return positions.find((position) => position.id === positionId) ?? null;
  }

  /** How many members have a stated remit, and whether to offer an import. */
  async coverage(workspaceId: string): Promise<PositionCoverage> {
    return await this.client.position.coverage.query({ workspaceId }) as PositionCoverage;
  }

  async create(input: PositionCreateInput): Promise<Position> {
    return await this.client.position.create.mutate(input) as Position;
  }

  async update(input: PositionUpdateInput): Promise<Position> {
    const { workspaceId, positionId, ...edits } = input;
    if (Object.values(edits).every((value) => value === undefined)) {
      throw new Error('Nothing to update: pass title, remit, notAccountableFor or holderUserIds');
    }
    return await this.client.position.update.mutate(input) as Position;
  }

  /** Holders cascade. */
  async delete(workspaceId: string, positionId: string): Promise<{ id: string }> {
    return await this.client.position.delete.mutate({ workspaceId, positionId }) as { id: string };
  }

  /** Replace the holder set; `[]` removes everyone. */
  async setHolders(workspaceId: string, positionId: string, userIds: string[]): Promise<Position> {
    return await this.client.position.setHolders.mutate({ workspaceId, positionId, userIds }) as Position;
  }

  /**
   * Upsert many Positions by title (matched case-insensitively, never renamed).
   * An update replaces the remit and only ADDS holders. Run with
   * `dryRun: true` first to see the plan.
   */
  async importMany(input: PositionImportInput): Promise<PositionImportOutput> {
    return await this.client.position.importMany.mutate(input) as PositionImportOutput;
  }
}
