import { describe, it, expect, vi } from 'vitest';
import { EpicsApi } from './epics.js';
import type { TrpcClient } from './client.js';

function makeApi() {
  const update = vi.fn().mockResolvedValue({ id: 'e1', ownerId: 'u2' });
  const client = { epic: { update: { mutate: update } } };
  return { api: new EpicsApi(client as unknown as TrpcClient), update };
}

describe('EpicsApi.update', () => {
  it('forwards ownerId so an epic can be handed over', async () => {
    const { api, update } = makeApi();

    await api.update({ id: 'e1', ownerId: 'u2' });

    expect(update).toHaveBeenCalledWith({ id: 'e1', ownerId: 'u2' });
  });

  it('forwards an explicit null unchanged — whether an epic may go ownerless is the server\'s call', async () => {
    const { api, update } = makeApi();

    await api.update({ id: 'e1', ownerId: null });

    expect(update).toHaveBeenCalledWith({ id: 'e1', ownerId: null });
  });
});
