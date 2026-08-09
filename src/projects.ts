import type { TrpcClient } from './client.js';
import type {
  Project,
  ProjectDetail,
  ProjectPriority,
  ProjectStatus,
} from './types/project.js';

export interface ProjectsListOptions {
  workspaceId?: string;
  includeActions?: boolean;
}

/**
 * A **partial** update. Omit a field and it is left untouched.
 *
 * `name`, `status` and `priority` are required by the server on every call, so
 * {@link ProjectsApi.update} reads the project first and sends the current
 * values for whichever of the three you leave out — the same read-before-write
 * that keeps `goals.update()` from clobbering. Everything else here is written
 * only when present.
 */
export interface ProjectUpdateInput {
  id: string;
  name?: string;
  /** The server has no way to clear a description — pass `''` to blank it. */
  description?: string;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  /** `null` unlinks the product. */
  productId?: string | null;
  /** `null` makes the project personal. */
  workspaceId?: string | null;
  /** Directly responsible individual; `null` clears it. */
  driId?: string | null;
  /**
   * Replace the objective links. Integer goal ids passed as strings — the
   * server parses them. An empty array is a **no-op**, not a clear; the server
   * only writes this when the array is non-empty.
   */
  goalIds?: string[];
  outcomeIds?: string[];
  /** Replace the key-result links wholesale; `[]` clears them. */
  keyResultIds?: string[];
  lifeDomainIds?: number[];
  reviewDate?: Date | null;
  nextActionDate?: Date | null;
  startDate?: Date | null;
  endDate?: Date | null;
}

export class ProjectsApi {
  constructor(private client: TrpcClient) {}

  async list(options: ProjectsListOptions = {}): Promise<Project[]> {
    const { workspaceId, includeActions } = options;

    return await this.client.project.getAll.query({
      workspaceId,
      include: includeActions ? { actions: true } : undefined,
    }) as Project[];
  }

  /**
   * Fetch one project with its relations — actions, linked objectives and key
   * results, DRI, team. Accepts a cuid, a slug, or the compound `slug-cuid`
   * form that appears in app URLs.
   *
   * The list read carries none of the OKR edges, so this is the only way to
   * answer "what is this project driving?".
   */
  async get(idOrSlug: string): Promise<ProjectDetail> {
    return await this.client.project.getById.query({
      id: idOrSlug,
    }) as ProjectDetail;
  }

  /**
   * Partial update — see {@link ProjectUpdateInput}. Costs one extra read when
   * `name`, `status` or `priority` is omitted, because the server requires all
   * three.
   */
  async update(input: ProjectUpdateInput): Promise<Project> {
    const { id, name, status, priority, ...rest } = input;

    let resolvedName = name;
    let resolvedStatus = status;
    let resolvedPriority = priority;

    if (
      resolvedName === undefined ||
      resolvedStatus === undefined ||
      resolvedPriority === undefined
    ) {
      const current = await this.get(id);
      resolvedName ??= current.name;
      resolvedStatus ??= (current.status as ProjectStatus | null) ?? 'ACTIVE';
      resolvedPriority ??=
        (current.priority as ProjectPriority | null) ?? 'NONE';
    }

    return await this.client.project.update.mutate({
      id,
      name: resolvedName,
      status: resolvedStatus,
      priority: resolvedPriority,
      ...rest,
    }) as Project;
  }

  /** Deletes the project and its actions. There is no undo. */
  async delete(id: string): Promise<Project> {
    return await this.client.project.delete.mutate({ id }) as Project;
  }
}
