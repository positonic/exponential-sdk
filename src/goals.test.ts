import { describe, it, expect, vi } from 'vitest';
import { GoalsApi } from './goals.js';
import { KeyResultsApi } from './keyResults.js';
import type { TrpcClient } from './client.js';

function makeApi() {
  const calls = {
    getById: vi.fn().mockResolvedValue({ id: 46 }),
    getAllMyGoals: vi.fn().mockResolvedValue([]),
    getGoalTree: vi.fn().mockResolvedValue([]),
    getProjectGoals: vi.fn().mockResolvedValue([]),
    createGoal: vi.fn().mockResolvedValue({ id: 1 }),
    updateGoal: vi.fn().mockResolvedValue({ id: 46 }),
    updateGoalStatus: vi.fn().mockResolvedValue({ id: 46 }),
    setParent: vi.fn().mockResolvedValue({ id: 46 }),
    deleteGoal: vi.fn().mockResolvedValue({ id: 46 }),
    getPeriods: vi.fn().mockResolvedValue([]),
    getStats: vi.fn().mockResolvedValue({}),
  };
  const client = {
    goal: {
      getById: { query: calls.getById },
      getAllMyGoals: { query: calls.getAllMyGoals },
      getGoalTree: { query: calls.getGoalTree },
      getProjectGoals: { query: calls.getProjectGoals },
      createGoal: { mutate: calls.createGoal },
      updateGoal: { mutate: calls.updateGoal },
      updateGoalStatus: { mutate: calls.updateGoalStatus },
      setParent: { mutate: calls.setParent },
      deleteGoal: { mutate: calls.deleteGoal },
    },
    okr: {
      getPeriods: { query: calls.getPeriods },
      getStats: { query: calls.getStats },
    },
  } as unknown as TrpcClient;
  const keyResults = new KeyResultsApi(client);
  return { api: new GoalsApi(client, keyResults), calls, keyResults };
}

describe('GoalsApi reads', () => {
  it('lists workspace-scoped objectives with period and status filters', async () => {
    const { api, calls } = makeApi();

    await api.list({ workspaceId: 'ws1', period: 'Q3-2026', status: 'active' });

    expect(calls.getAllMyGoals).toHaveBeenCalledWith({
      workspaceId: 'ws1',
      period: 'Q3-2026',
      status: 'active',
    });
  });

  it('lists your own objectives with no options', async () => {
    const { api, calls } = makeApi();

    await api.list();

    expect(calls.getAllMyGoals).toHaveBeenCalledWith({});
  });

  it('reads the nested tree', async () => {
    const { api, calls } = makeApi();

    await api.tree({ workspaceId: 'ws1', status: 'active' });

    expect(calls.getGoalTree).toHaveBeenCalledWith({
      workspaceId: 'ws1',
      status: 'active',
    });
  });

  it('gets one objective by its integer id', async () => {
    const { api, calls } = makeApi();

    await api.get(46);

    expect(calls.getById).toHaveBeenCalledWith({ id: 46 });
  });
});

describe('GoalsApi writes', () => {
  // The incident this whole surface exists to prevent: `{id, title, status}`
  // through the old full-overwrite `updateGoal` nulled `period` and
  // `workspaceId`, orphaning goal 46 out of its workspace. The SDK must send
  // exactly what the caller named — no synthesised nulls, no re-sent fields.
  it('update forwards only the fields the caller supplied', async () => {
    const { api, calls } = makeApi();

    await api.update({ id: 46, title: 'Renamed' });

    expect(calls.updateGoal).toHaveBeenCalledWith({ id: 46, title: 'Renamed' });
    const sent = calls.updateGoal.mock.calls[0]![0] as Record<string, unknown>;
    expect(Object.keys(sent).sort()).toEqual(['id', 'title']);
    expect('period' in sent).toBe(false);
    expect('workspaceId' in sent).toBe(false);
  });

  it('update passes an explicit null through as a clear', async () => {
    const { api, calls } = makeApi();

    await api.update({ id: 46, period: null });

    expect(calls.updateGoal).toHaveBeenCalledWith({ id: 46, period: null });
  });

  it('setStatus routes through updateGoalStatus, never updateGoal', async () => {
    const { api, calls } = makeApi();

    await api.setStatus({ id: 46, status: 'completed' });

    expect(calls.updateGoalStatus).toHaveBeenCalledWith({
      id: 46,
      status: 'completed',
    });
    expect(calls.updateGoal).not.toHaveBeenCalled();
  });

  it('setStatus accepts on-hold, which the update path does not', async () => {
    const { api, calls } = makeApi();

    await api.setStatus({ id: 46, status: 'on-hold' });

    expect(calls.updateGoalStatus).toHaveBeenCalledWith({
      id: 46,
      status: 'on-hold',
    });
  });

  it('setParent routes through the single-column procedure, never updateGoal', async () => {
    const { api, calls } = makeApi();

    await api.setParent({ id: 47, parentGoalId: 46 });

    expect(calls.setParent).toHaveBeenCalledWith({ id: 47, parentGoalId: 46 });
    expect(calls.updateGoal).not.toHaveBeenCalled();
  });

  it('setParent detaches with null', async () => {
    const { api, calls } = makeApi();

    await api.setParent({ id: 47, parentGoalId: null });

    expect(calls.setParent).toHaveBeenCalledWith({ id: 47, parentGoalId: null });
  });

  it('creates and deletes by integer id', async () => {
    const { api, calls } = makeApi();

    await api.create({ title: 'New objective', workspaceId: 'ws1' });
    await api.delete(46);

    expect(calls.createGoal).toHaveBeenCalledWith({
      title: 'New objective',
      workspaceId: 'ws1',
    });
    expect(calls.deleteGoal).toHaveBeenCalledWith({ id: 46 });
  });
});

describe('GoalsApi OKR helpers', () => {
  it('reads periods and stats off the okr router', async () => {
    const { api, calls } = makeApi();

    await api.periods();
    await api.stats({ workspaceId: 'ws1', period: 'Q3-2026' });

    expect(calls.getPeriods).toHaveBeenCalled();
    expect(calls.getStats).toHaveBeenCalledWith({
      workspaceId: 'ws1',
      period: 'Q3-2026',
    });
  });

  it('exposes key results as goals.keyResults', () => {
    const { api, keyResults } = makeApi();

    expect(api.keyResults).toBe(keyResults);
  });
});

describe('GoalsApi.list defensive filtering', () => {
  // A server that predates the period/status filters strips the unknown keys
  // and returns everything. Silently matching every objective is the worst
  // possible failure for a filter, so the SDK re-applies them.
  function makeUnfilteredApi() {
    const getAllMyGoals = vi.fn().mockResolvedValue([
      { id: 1, period: 'Q3-2026', status: 'active' },
      { id: 2, period: 'Q2-2026', status: 'completed' },
      { id: 3, period: null, status: 'active' },
    ]);
    const client = {
      goal: { getAllMyGoals: { query: getAllMyGoals } },
    } as unknown as TrpcClient;
    return {
      api: new GoalsApi(client, new KeyResultsApi(client)),
      getAllMyGoals,
    };
  }

  it('re-applies the period filter the server may have ignored', async () => {
    const { api, getAllMyGoals } = makeUnfilteredApi();

    const found = await api.list({ workspaceId: 'ws1', period: 'Q3-2026' });

    expect(found.map((g) => g.id)).toEqual([1]);
    // Still sent, so a server that supports it does the work.
    expect(getAllMyGoals).toHaveBeenCalledWith({
      workspaceId: 'ws1',
      period: 'Q3-2026',
    });
  });

  it('re-applies the status filter', async () => {
    const { api } = makeUnfilteredApi();

    const found = await api.list({ status: 'active' });

    expect(found.map((g) => g.id)).toEqual([1, 3]);
  });

  it('ANDs period and status', async () => {
    const { api } = makeUnfilteredApi();

    expect(
      (await api.list({ period: 'Q3-2026', status: 'completed' })).map((g) => g.id),
    ).toEqual([]);
  });

  it('returns everything when neither filter is given', async () => {
    const { api } = makeUnfilteredApi();

    expect((await api.list()).map((g) => g.id)).toEqual([1, 2, 3]);
  });
});
