import type { TrpcClient } from './client.js';
import type { Cycle, CycleDetail, CycleStatus } from './types/cycle.js';
import type { Product } from './types/product.js';

export interface CycleListOptions {
  workspaceId: string;
  /**
   * Scope to one product's cycles. The server returns that product's cycles
   * PLUS legacy workspace-shared ones (`productId: null`), matching what the
   * product's Cycles tab shows. Takes a product CUID — use
   * `cycles.current(...)` / `cycles.resolve(...)` if you only have a slug.
   * Omit to list every cycle in the workspace, across all products.
   */
  productId?: string;
  status?: CycleStatus;
  /**
   * The server lazily generates upcoming cycles as a side effect of `list`.
   * Pass `false` to read without provisioning anything — useful for read-only
   * callers that should not mutate the workspace just by looking at it.
   */
  autoCreate?: boolean;
}

export interface CycleCreateInput {
  workspaceId: string;
  /** Product this cycle belongs to. Omit for a workspace-shared cycle. */
  productId?: string;
  /**
   * Omit to let the server auto-name it (`Cycle N`). Numbering is per-product
   * (the given product's cycles plus legacy shared ones), so different
   * products in one workspace can both reach e.g. "Cycle 9".
   */
  name?: string;
  /** Omit to let the server slugify `name`, de-duplicating with a suffix. */
  slug?: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  cycleGoal?: string;
}

export interface CycleUpdateInput {
  id: string;
  name?: string;
  description?: string | null;
  status?: CycleStatus;
  startDate?: Date | null;
  endDate?: Date | null;
  cycleGoal?: string | null;
  achievements?: string | null;
}

/** How a cycle is labelled in ambiguity errors. */
function describeCycle(c: Cycle): string {
  return c.productId
    ? `"${c.name}" (slug ${c.slug}, product ${c.productId})`
    : `"${c.name}" (slug ${c.slug}, workspace-shared)`;
}

export class CyclesApi {
  constructor(private client: TrpcClient) {}

  /**
   * List cycles in a workspace, newest start date first. Pass `productId` to
   * scope to one product's timeline (plus legacy workspace-shared cycles).
   *
   * Note this is not a pure read: the server reconciles cycle statuses against
   * today's date and (unless `autoCreate: false`) provisions upcoming cycles —
   * scoped to `productId` when given.
   */
  async list(options: CycleListOptions): Promise<Cycle[]> {
    return await this.client.product.cycle.list.query({
      workspaceId: options.workspaceId,
      productId: options.productId,
      status: options.status,
      autoCreate: options.autoCreate,
    }) as Cycle[];
  }

  async get(id: string): Promise<CycleDetail> {
    return await this.client.product.cycle.getById.query({ id }) as CycleDetail;
  }

  /**
   * The current (`ACTIVE`) cycle, or `null` when none is running (e.g. a gap
   * between cycles).
   *
   * Cycles are product-scoped, so a workspace can have one ACTIVE cycle per
   * product. Pass `product` (a product CUID or slug) to get that product's
   * current cycle — a cycle scoped to the product wins over a legacy
   * workspace-shared one.
   *
   * Without `product`, this stays backward compatible for workspaces with a
   * single timeline: if every ACTIVE cycle belongs to the same product (or all
   * are workspace-shared), the most recently started wins. If ACTIVE cycles
   * from different products coexist, it throws rather than silently picking
   * an arbitrary product's cycle.
   */
  async current(workspaceId: string, product?: string): Promise<Cycle | null> {
    if (product) {
      const productId = await this.resolveProductId(workspaceId, product);
      const active = await this.list({ workspaceId, productId, status: 'ACTIVE' });
      return active.find((c) => c.productId === productId) ?? active[0] ?? null;
    }

    const active = await this.list({ workspaceId, status: 'ACTIVE' });
    if (active.length <= 1) return active[0] ?? null;

    const timelines = new Set(active.map((c) => c.productId ?? null));
    if (timelines.size === 1) return active[0] ?? null;

    throw new Error(
      `Multiple cycles are ACTIVE in this workspace — one per product — so "current" is ambiguous. ` +
      `Pass a product id or slug to pick one. Active: ${active.map(describeCycle).join(', ')}.`,
    );
  }

  /**
   * Resolve what a user typed to a cycle.
   *
   * Accepts, in order of precedence:
   *   - `"current"` / `"active"` → the ACTIVE cycle (see `current()`)
   *   - a cycle CUID
   *   - a cycle slug
   *   - a cycle name (case-insensitive)
   *
   * Pass `product` (a product CUID or slug) to scope the lookup to that
   * product's timeline. Cycle auto-numbering is per-product, so two products
   * can both have a cycle named "Cycle 9" in one workspace: with `product`
   * set, a cycle scoped to that product beats a legacy workspace-shared one
   * of the same name; without it, an ambiguous name throws rather than
   * silently picking one. Ids and slugs are unique per workspace and never
   * ambiguous.
   *
   * Throws rather than returning null so callers never silently file work
   * against the wrong cycle — or against none at all.
   */
  async resolve(
    workspaceId: string,
    slugOrIdOrName: string,
    product?: string,
  ): Promise<Cycle> {
    const candidate = slugOrIdOrName.trim();
    const lower = candidate.toLowerCase();

    if (lower === 'current' || lower === 'active') {
      const cycle = await this.current(workspaceId, product);
      if (!cycle) {
        throw new Error(
          product
            ? `No cycle is currently active for product "${product}". Pass an explicit cycle slug or id, or create a cycle first.`
            : 'No cycle is currently active in this workspace. Pass an explicit cycle slug or id, or create a cycle first.',
        );
      }
      return cycle;
    }

    const productId = product
      ? await this.resolveProductId(workspaceId, product)
      : undefined;
    const cycles = await this.list({ workspaceId, productId });

    const exact =
      cycles.find((c) => c.id === candidate) ??
      cycles.find((c) => c.slug === candidate);
    if (exact) return exact;

    const byName = cycles.filter((c) => c.name.toLowerCase() === lower);
    if (byName.length === 1) return byName[0]!;
    if (byName.length > 1) {
      if (productId) {
        const scoped = byName.filter((c) => c.productId === productId);
        if (scoped.length === 1) return scoped[0]!;
      }
      throw new Error(
        `Cycle name "${candidate}" is ambiguous: ${byName.map(describeCycle).join(', ')}. ` +
        `Use the slug or id instead${productId ? '' : ', or pass a product to scope the lookup'}.`,
      );
    }

    const known = cycles.map((c) => c.slug).join(', ');
    throw new Error(
      `Cycle "${candidate}" not found. Available: ${known || '(none)'}`,
    );
  }

  async create(input: CycleCreateInput): Promise<Cycle> {
    return await this.client.product.cycle.create.mutate(input) as Cycle;
  }

  async update(input: CycleUpdateInput): Promise<Cycle> {
    return await this.client.product.cycle.update.mutate(input) as Cycle;
  }

  async delete(id: string): Promise<{ success: boolean }> {
    return await this.client.product.cycle.delete.mutate({ id }) as {
      success: boolean;
    };
  }

  /**
   * Turn a product reference (CUID or slug) into the CUID the cycle endpoints
   * expect. CUIDs pass through without a lookup — the server validates access.
   */
  private async resolveProductId(
    workspaceId: string,
    product: string,
  ): Promise<string> {
    const ref = product.trim();
    if (/^c[a-z0-9]{20,}$/.test(ref)) return ref;
    const match = await this.client.product.product.getBySlug.query({
      workspaceId,
      slug: ref,
    }) as Product;
    return match.id;
  }
}
