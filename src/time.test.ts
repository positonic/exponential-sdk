import { describe, it, expect, vi } from 'vitest';
import { TimeApi } from './time.js';
import { ActionsApi } from './actions.js';
import type { TrpcClient } from './client.js';

const START = new Date('2026-09-11T09:22:00Z');
const END = new Date('2026-09-11T10:30:00Z');

function entry(overrides: Record<string, unknown> = {}) {
  return {
    id: 'e1',
    userId: 'owner',
    actionId: 'a1',
    workspaceId: 'ws1',
    startedAt: START,
    endedAt: END,
    source: 'claude-desktop',
    status: 'PROPOSED',
    sourceRef: null,
    note: null,
    createdByAgentId: 'agent',
    action: { id: 'a1', name: 'Action modal close latency', projectId: null, workspaceId: 'ws1' },
    ...overrides,
  };
}

function makeClient() {
  const calls = {
    create: vi.fn().mockResolvedValue(entry()),
    upsertBySourceRef: vi
      .fn()
      .mockResolvedValue({ entry: entry({ sourceRef: 'claude-session:s1#0' }), outcome: 'updated' }),
    listByDateRange: vi.fn().mockResolvedValue([entry()]),
    upsertBySource: vi.fn().mockResolvedValue({ action: { id: 'a1', name: 'x' }, outcome: 'created' }),
  };
  const client = {
    timeEntry: {
      create: { mutate: calls.create },
      upsertBySourceRef: { mutate: calls.upsertBySourceRef },
      listByDateRange: { query: calls.listByDateRange },
    },
    action: { upsertBySource: { mutate: calls.upsertBySource } },
  } as unknown as TrpcClient;
  return { api: new TimeApi(client), actions: new ActionsApi(client), ...calls };
}

describe('TimeApi.log', () => {
  it('without a sourceRef creates and reports outcome "created"', async () => {
    const { api, create, upsertBySourceRef } = makeClient();
    const result = await api.log({ actionId: 'a1', startedAt: START, endedAt: END, source: 'claude-desktop' });
    expect(create).toHaveBeenCalledWith({ actionId: 'a1', startedAt: START, endedAt: END, source: 'claude-desktop' });
    expect(upsertBySourceRef).not.toHaveBeenCalled();
    expect(result.outcome).toBe('created');
    expect(result.entry.id).toBe('e1');
  });

  it('with a sourceRef upserts and passes the outcome through', async () => {
    const { api, create, upsertBySourceRef } = makeClient();
    const result = await api.log({
      actionId: 'a1',
      startedAt: START,
      endedAt: END,
      sourceRef: 'claude-session:s1#0',
      note: 'PR 642',
    });
    expect(upsertBySourceRef).toHaveBeenCalledWith(
      expect.objectContaining({ actionId: 'a1', sourceRef: 'claude-session:s1#0', note: 'PR 642' }),
    );
    expect(create).not.toHaveBeenCalled();
    expect(result.outcome).toBe('updated');
  });
});

describe('TimeApi.logBatch', () => {
  it('applies defaults, runs in order, and reports per-entry failures without aborting', async () => {
    const { api, upsertBySourceRef, create } = makeClient();
    upsertBySourceRef
      .mockResolvedValueOnce({ entry: entry({ sourceRef: 'r0' }), outcome: 'created' })
      .mockRejectedValueOnce(new Error('CONFLICT'));

    const results = await api.logBatch(
      [
        { startedAt: START, endedAt: END, sourceRef: 'r0' },
        { startedAt: START, endedAt: END, sourceRef: 'r1', actionId: 'a2' },
        { startedAt: START, endedAt: END },
        { endedAt: END },
      ],
      { actionId: 'a1', source: 'claude-desktop' },
    );

    expect(upsertBySourceRef.mock.calls[0]?.[0]).toMatchObject({ actionId: 'a1', source: 'claude-desktop', sourceRef: 'r0' });
    expect(upsertBySourceRef.mock.calls[1]?.[0]).toMatchObject({ actionId: 'a2', sourceRef: 'r1' });
    expect(create).toHaveBeenCalledTimes(1);
    expect(results.map((r) => [r.index, r.success, r.outcome ?? r.error])).toEqual([
      [0, true, 'created'],
      [1, false, 'CONFLICT'],
      [2, true, 'created'],
      [3, false, 'startedAt and endedAt are required'],
    ]);
  });
});

describe('TimeApi.list', () => {
  it('queries one local calendar day from YYYY-MM-DD', async () => {
    const { api, listByDateRange } = makeClient();
    const rows = await api.list('2026-09-11', 'ws1');
    const arg = listByDateRange.mock.calls[0]?.[0] as { startDate: Date; endDate: Date; workspaceId?: string };
    expect(arg.startDate).toEqual(new Date(2026, 8, 11));
    expect(arg.endDate.getTime() - arg.startDate.getTime()).toBe(24 * 60 * 60 * 1000);
    expect(arg.workspaceId).toBe('ws1');
    expect(rows[0]?.status).toBe('PROPOSED');
  });

  it('rejects an unparseable date before calling the API', async () => {
    const { api, listByDateRange } = makeClient();
    await expect(api.list('yesterday')).rejects.toThrow('Invalid date');
    expect(listByDateRange).not.toHaveBeenCalled();
  });
});

describe('ActionsApi.upsertBySource', () => {
  it('passes the source pair and links through', async () => {
    const { actions, upsertBySource } = makeClient();
    const result = await actions.upsertBySource({
      sourceType: 'claude-session',
      sourceId: 's1',
      name: 'Action modal close latency',
      workspaceId: 'ws1',
      ticketId: 't1',
    });
    expect(upsertBySource).toHaveBeenCalledWith({
      sourceType: 'claude-session',
      sourceId: 's1',
      name: 'Action modal close latency',
      workspaceId: 'ws1',
      ticketId: 't1',
    });
    expect(result.outcome).toBe('created');
  });
});
