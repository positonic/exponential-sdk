import { describe, it, expect, vi } from 'vitest';
import { PositionsApi } from './positions.js';
import type { TrpcClient } from './client.js';

const position = { id: 'p1', title: 'CTO', remit: 'Tech', notAccountableFor: null, holders: [] };

function makeApi() {
  const calls = {
    list: vi.fn().mockResolvedValue({ positions: [position], members: [] }),
    coverage: vi.fn().mockResolvedValue({ offerImport: false, memberCount: 1, eligibleCount: 1, coveredCount: 1 }),
    create: vi.fn().mockResolvedValue(position),
    update: vi.fn().mockResolvedValue(position),
    delete: vi.fn().mockResolvedValue({ id: 'p1' }),
    setHolders: vi.fn().mockResolvedValue(position),
    importMany: vi.fn().mockResolvedValue({ written: false, results: [] }),
  };
  const client = {
    position: {
      list: { query: calls.list },
      coverage: { query: calls.coverage },
      create: { mutate: calls.create },
      update: { mutate: calls.update },
      delete: { mutate: calls.delete },
      setHolders: { mutate: calls.setHolders },
      importMany: { mutate: calls.importMany },
    },
  } as unknown as TrpcClient;
  return { api: new PositionsApi(client), calls };
}

describe('PositionsApi', () => {
  it('lists and finds one by id', async () => {
    const { api, calls } = makeApi();
    expect(await api.get('ws1', 'p1')).toEqual(position);
    expect(await api.get('ws1', 'nope')).toBeNull();
    expect(calls.list).toHaveBeenCalledWith({ workspaceId: 'ws1' });
  });

  it('passes create, setHolders, delete and importMany straight through', async () => {
    const { api, calls } = makeApi();
    await api.create({ workspaceId: 'ws1', title: 'CTO', remit: 'Tech', holderUserIds: ['u1'] });
    expect(calls.create).toHaveBeenCalledWith({ workspaceId: 'ws1', title: 'CTO', remit: 'Tech', holderUserIds: ['u1'] });
    await api.setHolders('ws1', 'p1', []);
    expect(calls.setHolders).toHaveBeenCalledWith({ workspaceId: 'ws1', positionId: 'p1', userIds: [] });
    await api.delete('ws1', 'p1');
    expect(calls.delete).toHaveBeenCalledWith({ workspaceId: 'ws1', positionId: 'p1' });
    const rows = [{ title: 'CTO', remit: 'Tech', holderUserIds: [] }];
    await api.importMany({ workspaceId: 'ws1', dryRun: true, positions: rows });
    expect(calls.importMany).toHaveBeenCalledWith({ workspaceId: 'ws1', dryRun: true, positions: rows });
  });

  it('sends a partial update and refuses an empty one', async () => {
    const { api, calls } = makeApi();
    await api.update({ workspaceId: 'ws1', positionId: 'p1', notAccountableFor: null });
    expect(calls.update).toHaveBeenCalledWith({ workspaceId: 'ws1', positionId: 'p1', notAccountableFor: null });
    await expect(api.update({ workspaceId: 'ws1', positionId: 'p1' })).rejects.toThrow(/Nothing to update/);
    expect(calls.update).toHaveBeenCalledTimes(1);
  });
});
