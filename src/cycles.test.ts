import { describe, it, expect, vi } from 'vitest';
import { CyclesApi } from './cycles.js';
import type { TrpcClient } from './client.js';

// Fixture mirroring a post-product-scoping workspace: two products each with
// their own timeline (both auto-numbered up to "Cycle 9"), plus one legacy
// workspace-shared cycle. Two cycles are ACTIVE at once — one per product.
const CYCLES = [
  { id: 'c1', productId: 'cp1aaaaaaaaaaaaaaaaaaaaaa', name: 'Cycle 9', slug: 'cycle-9', status: 'ACTIVE', startDate: new Date('2026-08-10') },
  { id: 'c2', productId: 'cp2bbbbbbbbbbbbbbbbbbbbbb', name: 'Cycle 9', slug: 'cycle-9-2', status: 'ACTIVE', startDate: new Date('2026-08-03') },
  { id: 'c3', productId: 'cp1aaaaaaaaaaaaaaaaaaaaaa', name: 'Cycle 8', slug: 'cycle-8', status: 'COMPLETED', startDate: new Date('2026-07-27') },
  { id: 'c4', productId: null, name: 'Legacy Cycle', slug: 'legacy-cycle', status: 'COMPLETED', startDate: new Date('2026-07-01') },
];

const P1 = 'cp1aaaaaaaaaaaaaaaaaaaaaa';
const P2 = 'cp2bbbbbbbbbbbbbbbbbbbbbb';

/**
 * Stub client whose cycle.list emulates the server's filter contract:
 * `productId` scopes to that product's cycles PLUS legacy shared ones
 * (`productId: null`); `status` filters exactly.
 */
function makeApi(fixture = CYCLES) {
  const list = vi.fn().mockImplementation(
    (input: { productId?: string; status?: string }) =>
      Promise.resolve(
        fixture
          .filter((c) =>
            input.productId
              ? c.productId === input.productId || c.productId === null
              : true,
          )
          .filter((c) => (input.status ? c.status === input.status : true)),
      ),
  );
  const getBySlug = vi.fn().mockResolvedValue({ id: P1, slug: 'alpha' });
  const client = {
    product: {
      cycle: { list: { query: list } },
      product: { getBySlug: { query: getBySlug } },
    },
  };
  return { api: new CyclesApi(client as unknown as TrpcClient), list, getBySlug };
}

describe('CyclesApi.list', () => {
  it('forwards productId to the server', async () => {
    const { api, list } = makeApi();

    await api.list({ workspaceId: 'w1', productId: P1 });

    expect(list).toHaveBeenCalledWith({
      workspaceId: 'w1',
      productId: P1,
      status: undefined,
      autoCreate: undefined,
    });
  });
});

describe('CyclesApi.current', () => {
  it('returns the single ACTIVE cycle when only one timeline exists', async () => {
    const single = CYCLES.filter((c) => c.id !== 'c2');
    const { api } = makeApi(single);

    const cycle = await api.current('w1');

    expect(cycle?.id).toBe('c1');
  });

  it('throws when ACTIVE cycles from different products coexist and no product is given', async () => {
    const { api } = makeApi();

    await expect(api.current('w1')).rejects.toThrow(/ambiguous/i);
  });

  it('picks the product-scoped ACTIVE cycle when a product id is given', async () => {
    const { api, list } = makeApi();

    const cycle = await api.current('w1', P2);

    expect(cycle?.id).toBe('c2');
    expect(list).toHaveBeenCalledWith(
      expect.objectContaining({ productId: P2, status: 'ACTIVE' }),
    );
  });

  it('falls back to a legacy shared ACTIVE cycle when the product has none of its own', async () => {
    const fixture = [
      { id: 'c5', productId: null, name: 'Cycle 3', slug: 'cycle-3', status: 'ACTIVE', startDate: new Date('2026-08-10') },
    ];
    const { api } = makeApi(fixture);

    const cycle = await api.current('w1', P1);

    expect(cycle?.id).toBe('c5');
  });

  it('resolves a product slug via getBySlug before filtering', async () => {
    const { api, getBySlug, list } = makeApi();

    const cycle = await api.current('w1', 'alpha');

    expect(getBySlug).toHaveBeenCalledWith({ workspaceId: 'w1', slug: 'alpha' });
    expect(cycle?.id).toBe('c1');
    expect(list).toHaveBeenCalledWith(
      expect.objectContaining({ productId: P1 }),
    );
  });

  it('returns null when nothing is ACTIVE', async () => {
    const { api } = makeApi(CYCLES.filter((c) => c.status !== 'ACTIVE'));

    expect(await api.current('w1')).toBeNull();
  });
});

describe('CyclesApi.resolve', () => {
  it('resolves by id and slug regardless of product ambiguity', async () => {
    const { api } = makeApi();

    expect((await api.resolve('w1', 'c2')).id).toBe('c2');
    expect((await api.resolve('w1', 'cycle-9-2')).id).toBe('c2');
  });

  it('throws on an ambiguous name when no product is given', async () => {
    const { api } = makeApi();

    await expect(api.resolve('w1', 'Cycle 9')).rejects.toThrow(/ambiguous/i);
  });

  it('prefers the product-scoped match for an ambiguous name when a product is given', async () => {
    // Two same-name cycles survive the server-side product filter: the
    // product's own and a legacy shared one.
    const fixture = [
      { id: 'c1', productId: P1, name: 'Cycle 9', slug: 'cycle-9', status: 'ACTIVE', startDate: new Date('2026-08-10') },
      { id: 'c6', productId: null, name: 'Cycle 9', slug: 'cycle-9-old', status: 'COMPLETED', startDate: new Date('2026-06-01') },
    ];
    const { api } = makeApi(fixture);

    const cycle = await api.resolve('w1', 'Cycle 9', P1);

    expect(cycle.id).toBe('c1');
  });

  it('resolves an unambiguous name case-insensitively', async () => {
    const { api } = makeApi();

    expect((await api.resolve('w1', 'legacy cycle')).id).toBe('c4');
  });

  it('"current" with a product resolves that product\'s ACTIVE cycle', async () => {
    const { api } = makeApi();

    expect((await api.resolve('w1', 'current', P2)).id).toBe('c2');
  });

  it('"current" without a product throws when multiple products are ACTIVE', async () => {
    const { api } = makeApi();

    await expect(api.resolve('w1', 'current')).rejects.toThrow(/ambiguous/i);
  });

  it('lists available slugs when nothing matches', async () => {
    const { api } = makeApi();

    await expect(api.resolve('w1', 'nope')).rejects.toThrow(/cycle-9, cycle-9-2/);
  });
});

describe('CyclesApi lookups never auto-create cycles', () => {
  it('current() and resolve() list with autoCreate: false', async () => {
    const { api, list } = makeApi();

    await api.current('w1', P1);
    await api.resolve('w1', 'cycle-8', P1);
    await api.resolve('w1', 'current', P1);

    expect(list.mock.calls.length).toBeGreaterThan(0);
    for (const [input] of list.mock.calls) {
      expect(input).toMatchObject({ autoCreate: false });
    }
  });

  it('list() leaves autoCreate to the caller', async () => {
    const { api, list } = makeApi();

    await api.list({ workspaceId: 'w1' });

    expect(list.mock.calls[0]?.[0]).toMatchObject({ autoCreate: undefined });
  });
});
