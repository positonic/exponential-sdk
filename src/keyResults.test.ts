import { describe, it, expect, vi } from 'vitest';
import { KeyResultsApi } from './keyResults.js';
import type { TrpcClient } from './client.js';

function makeApi(goal: { workspaceId: string | null } = { workspaceId: 'ws1' }) {
  const goalGetById = vi.fn().mockResolvedValue(goal);
  const calls = {
    getAll: vi.fn().mockResolvedValue([]),
    getByObjective: vi.fn().mockResolvedValue([]),
    getById: vi.fn().mockResolvedValue({ id: 'kr1' }),
    create: vi.fn().mockResolvedValue({ id: 'kr1' }),
    update: vi.fn().mockResolvedValue({ id: 'kr1' }),
    checkIn: vi.fn().mockResolvedValue({ id: 'ci1' }),
    delete: vi.fn().mockResolvedValue({ success: true }),
    linkProject: vi.fn().mockResolvedValue({ success: true }),
    unlinkProject: vi.fn().mockResolvedValue({ success: true }),
    linkFeature: vi.fn().mockResolvedValue({ success: true }),
    unlinkFeature: vi.fn().mockResolvedValue({ success: true }),
  };
  const client = {
    goal: { getById: { query: goalGetById } },
    okr: {
      getAll: { query: calls.getAll },
      getByObjective: { query: calls.getByObjective },
      getById: { query: calls.getById },
      create: { mutate: calls.create },
      update: { mutate: calls.update },
      checkIn: { mutate: calls.checkIn },
      delete: { mutate: calls.delete },
      linkProject: { mutate: calls.linkProject },
      unlinkProject: { mutate: calls.unlinkProject },
      linkFeature: { mutate: calls.linkFeature },
      unlinkFeature: { mutate: calls.unlinkFeature },
    },
  } as unknown as TrpcClient;
  return { api: new KeyResultsApi(client), calls, goalGetById };
}

describe('KeyResultsApi reads', () => {
  it('lists workspace-wide key results with filters', async () => {
    const { api, calls } = makeApi();

    await api.list({ workspaceId: 'ws1', goalId: 46, period: 'Q3-2026' });

    expect(calls.getAll).toHaveBeenCalledWith({
      workspaceId: 'ws1',
      goalId: 46,
      period: 'Q3-2026',
    });
  });

  it('forwards onlyMine to narrow a workspace list', async () => {
    const { api, calls } = makeApi();

    await api.list({ workspaceId: 'ws1', onlyMine: true });

    expect(calls.getAll).toHaveBeenCalledWith({
      workspaceId: 'ws1',
      onlyMine: true,
    });
  });

  it('reads objectives with nested key results', async () => {
    const { api, calls } = makeApi();

    await api.byObjective({ workspaceId: 'ws1', period: 'Q3-2026' });

    expect(calls.getByObjective).toHaveBeenCalledWith({
      workspaceId: 'ws1',
      period: 'Q3-2026',
    });
  });

  it('gets one key result by cuid', async () => {
    const { api, calls } = makeApi();

    await api.get('clkr1');

    expect(calls.getById).toHaveBeenCalledWith({ id: 'clkr1' });
  });
});

describe('KeyResultsApi writes', () => {
  it('creates against an integer objective id', async () => {
    const { api, calls } = makeApi();

    await api.create({
      goalId: 46,
      title: 'Weekly active teams 40 → 120',
      targetValue: 120,
      startValue: 40,
      unit: 'count',
      period: 'Q3-2026',
    });

    expect(calls.create).toHaveBeenCalledWith({
      goalId: 46,
      title: 'Weekly active teams 40 → 120',
      targetValue: 120,
      startValue: 40,
      unit: 'count',
      period: 'Q3-2026',
      workspaceId: 'ws1',
    });
  });

  it('updates only the supplied fields', async () => {
    const { api, calls } = makeApi();

    await api.update({ id: 'kr1', currentValue: 90 });

    expect(calls.update).toHaveBeenCalledWith({ id: 'kr1', currentValue: 90 });
  });

  // The SDK's checkIn signature is ergonomic (id/value/note); the procedure's
  // is not (keyResultId/newValue/notes). Pin the translation down.
  it('translates checkIn to the procedure field names', async () => {
    const { api, calls } = makeApi();

    await api.checkIn({ id: 'kr1', value: 90, note: 'shipped export' });

    expect(calls.checkIn).toHaveBeenCalledWith({
      keyResultId: 'kr1',
      newValue: 90,
      notes: 'shipped export',
    });
  });

  it('omits notes when no note is given', async () => {
    const { api, calls } = makeApi();

    await api.checkIn({ id: 'kr1', value: 90 });

    expect(calls.checkIn).toHaveBeenCalledWith({
      keyResultId: 'kr1',
      newValue: 90,
      notes: undefined,
    });
  });

  it('links and unlinks projects and features', async () => {
    const { api, calls } = makeApi();

    await api.linkProject({ keyResultId: 'kr1', projectId: 'p1' });
    await api.unlinkProject({ keyResultId: 'kr1', projectId: 'p1' });
    await api.linkFeature({ keyResultId: 'kr1', featureId: 'f1' });
    await api.unlinkFeature({ keyResultId: 'kr1', featureId: 'f1' });

    expect(calls.linkProject).toHaveBeenCalledWith({
      keyResultId: 'kr1',
      projectId: 'p1',
    });
    expect(calls.unlinkProject).toHaveBeenCalledWith({
      keyResultId: 'kr1',
      projectId: 'p1',
    });
    expect(calls.linkFeature).toHaveBeenCalledWith({
      keyResultId: 'kr1',
      featureId: 'f1',
    });
    expect(calls.unlinkFeature).toHaveBeenCalledWith({
      keyResultId: 'kr1',
      featureId: 'f1',
    });
  });

  it('deletes by cuid', async () => {
    const { api, calls } = makeApi();

    await api.delete('kr1');

    expect(calls.delete).toHaveBeenCalledWith({ id: 'kr1' });
  });
});

// A key result with no workspace is invisible to workspace-scoped reads and
// unwritable by teammates — the same orphaning that has already cost a goal.
// The server only grew an inherit-from-objective fallback recently, so the SDK
// resolves it rather than trusting the instance it happens to be talking to.
describe('KeyResultsApi.create resolves the workspace', () => {
  it("inherits the objective's workspace when none is given", async () => {
    const { api, calls, goalGetById } = makeApi({ workspaceId: 'ws-from-goal' });

    await api.create({
      goalId: 46,
      title: 'NPS 30 → 45',
      targetValue: 45,
      period: 'Q3-2026',
    });

    expect(goalGetById).toHaveBeenCalledWith({ id: 46 });
    expect(calls.create).toHaveBeenCalledWith(
      expect.objectContaining({ goalId: 46, workspaceId: 'ws-from-goal' }),
    );
  });

  it('does not look the objective up when a workspace is given', async () => {
    const { api, calls, goalGetById } = makeApi();

    await api.create({
      goalId: 46,
      title: 'NPS 30 → 45',
      targetValue: 45,
      period: 'Q3-2026',
      workspaceId: 'ws-explicit',
    });

    expect(goalGetById).not.toHaveBeenCalled();
    expect(calls.create).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: 'ws-explicit' }),
    );
  });

  it('leaves the workspace undefined for a personal objective', async () => {
    const { api, calls } = makeApi({ workspaceId: null });

    await api.create({
      goalId: 46,
      title: 'NPS 30 → 45',
      targetValue: 45,
      period: 'Q3-2026',
    });

    expect(calls.create).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: undefined }),
    );
  });
});
