import { describe, it, expect, vi } from 'vitest';
import { ProjectsApi } from './projects.js';
import type { TrpcClient } from './client.js';

function makeApi(
  current: Record<string, unknown> = {
    id: 'p1',
    name: 'Existing name',
    status: 'ON_HOLD',
    priority: 'HIGH',
  },
) {
  const calls = {
    getAll: vi.fn().mockResolvedValue([]),
    getById: vi.fn().mockResolvedValue(current),
    update: vi.fn().mockResolvedValue({ id: 'p1' }),
    delete: vi.fn().mockResolvedValue({ id: 'p1' }),
  };
  const client = {
    project: {
      getAll: { query: calls.getAll },
      getById: { query: calls.getById },
      update: { mutate: calls.update },
      delete: { mutate: calls.delete },
    },
  } as unknown as TrpcClient;
  return { api: new ProjectsApi(client), calls };
}

describe('ProjectsApi reads', () => {
  it('lists without actions by default', async () => {
    const { api, calls } = makeApi();

    await api.list({ workspaceId: 'ws1' });

    expect(calls.getAll).toHaveBeenCalledWith({
      workspaceId: 'ws1',
      include: undefined,
    });
  });

  it('gets one project by id, slug or compound slug-cuid', async () => {
    const { api, calls } = makeApi();

    await api.get('my_project-cmjoko5550000rz03x4eqvycy');

    expect(calls.getById).toHaveBeenCalledWith({
      id: 'my_project-cmjoko5550000rz03x4eqvycy',
    });
  });
});

describe('ProjectsApi.update', () => {
  // `project.update` requires name/status/priority on every call. A caller who
  // only wants to rename must not have their status and priority reset to
  // whatever default the CLI felt like sending — the current values are read
  // back and re-sent instead.
  it('fills the required fields from the current project', async () => {
    const { api, calls } = makeApi();

    await api.update({ id: 'p1', name: 'Renamed' });

    expect(calls.getById).toHaveBeenCalledWith({ id: 'p1' });
    expect(calls.update).toHaveBeenCalledWith({
      id: 'p1',
      name: 'Renamed',
      status: 'ON_HOLD',
      priority: 'HIGH',
    });
  });

  it('skips the read when all three required fields are supplied', async () => {
    const { api, calls } = makeApi();

    await api.update({
      id: 'p1',
      name: 'Renamed',
      status: 'COMPLETED',
      priority: 'LOW',
    });

    expect(calls.getById).not.toHaveBeenCalled();
    expect(calls.update).toHaveBeenCalledWith({
      id: 'p1',
      name: 'Renamed',
      status: 'COMPLETED',
      priority: 'LOW',
    });
  });

  it('sends nothing the caller did not name beyond the required three', async () => {
    const { api, calls } = makeApi();

    await api.update({ id: 'p1', status: 'COMPLETED' });

    const sent = calls.update.mock.calls[0]![0] as Record<string, unknown>;
    expect(Object.keys(sent).sort()).toEqual([
      'id',
      'name',
      'priority',
      'status',
    ]);
    expect('workspaceId' in sent).toBe(false);
    expect('productId' in sent).toBe(false);
  });

  it('passes an explicit null through as an unlink', async () => {
    const { api, calls } = makeApi();

    await api.update({ id: 'p1', productId: null });

    expect(calls.update).toHaveBeenCalledWith({
      id: 'p1',
      name: 'Existing name',
      status: 'ON_HOLD',
      priority: 'HIGH',
      productId: null,
    });
  });

  it('falls back to sane defaults when the project has no status or priority', async () => {
    const { api, calls } = makeApi({
      id: 'p1',
      name: 'Existing name',
      status: null,
      priority: null,
    });

    await api.update({ id: 'p1', name: 'Renamed' });

    expect(calls.update).toHaveBeenCalledWith({
      id: 'p1',
      name: 'Renamed',
      status: 'ACTIVE',
      priority: 'NONE',
    });
  });

  it('replaces key result links when named', async () => {
    const { api, calls } = makeApi();

    await api.update({ id: 'p1', keyResultIds: [] });

    expect(calls.update).toHaveBeenCalledWith(
      expect.objectContaining({ keyResultIds: [] }),
    );
  });
});

describe('ProjectsApi.delete', () => {
  it('deletes by id', async () => {
    const { api, calls } = makeApi();

    await api.delete('p1');

    expect(calls.delete).toHaveBeenCalledWith({ id: 'p1' });
  });
});
