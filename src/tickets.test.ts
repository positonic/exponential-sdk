import { describe, it, expect, vi } from 'vitest';
import { TicketsApi } from './tickets.js';
import type { TrpcClient } from './client.js';

const TICKETS = [
  { id: 't1', branchName: 'feat/alpha', prUrl: 'https://gh/x/pull/1' },
  { id: 't2', branchName: 'feat/beta', prUrl: 'https://gh/x/pull/2' },
  { id: 't3', branchName: 'feat/beta', prUrl: null },
  { id: 't4', branchName: null, prUrl: null },
];

function makeApi() {
  const list = vi.fn().mockResolvedValue(TICKETS);
  const client = { product: { ticket: { list: { query: list } } } };
  return { api: new TicketsApi(client as unknown as TrpcClient), list };
}

describe('TicketsApi.list', () => {
  it('filters by branchName client-side and does not forward it', async () => {
    const { api, list } = makeApi();

    const found = await api.list({ productId: 'p1', branchName: 'feat/beta' });

    expect(found.map((t) => t.id)).toEqual(['t2', 't3']);
    // The server schema has no branchName field and zod strips unknown keys —
    // forwarding it would silently match nothing and return everything.
    expect(list).toHaveBeenCalledWith({ productId: 'p1' });
  });

  it('returns empty for a branch no ticket carries', async () => {
    const { api } = makeApi();

    const found = await api.list({ productId: 'p1', branchName: 'no-such' });

    expect(found).toEqual([]);
  });

  it('filters by prUrl client-side and does not forward it', async () => {
    const { api, list } = makeApi();

    const found = await api.list({
      productId: 'p1',
      prUrl: 'https://gh/x/pull/2',
    });

    expect(found.map((t) => t.id)).toEqual(['t2']);
    expect(list).toHaveBeenCalledWith({ productId: 'p1' });
  });

  it('ANDs branchName and prUrl together', async () => {
    const { api } = makeApi();

    expect(
      await api.list({
        productId: 'p1',
        branchName: 'feat/beta',
        prUrl: 'https://gh/x/pull/2',
      }),
    ).toHaveLength(1);
    expect(
      await api.list({
        productId: 'p1',
        branchName: 'feat/alpha',
        prUrl: 'https://gh/x/pull/2',
      }),
    ).toEqual([]);
  });

  it('passes server-side filters through untouched', async () => {
    const { api, list } = makeApi();

    await api.list({ productId: 'p1', status: 'QA', epicId: 'e1' });

    expect(list).toHaveBeenCalledWith({
      productId: 'p1',
      status: 'QA',
      epicId: 'e1',
    });
  });

  it('never matches a null branch or prUrl against a filter', async () => {
    const { api } = makeApi();

    expect(await api.list({ productId: 'p1', branchName: '' })).toEqual([]);
    expect(await api.list({ productId: 'p1', prUrl: '' })).toEqual([]);
  });
});
