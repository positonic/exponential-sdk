import { describe, it, expect, vi } from 'vitest';
import { ActionsApi, getBlockers, openBlockers } from './actions.js';
import type { TrpcClient } from './client.js';
import type { Action, ActionDependencyEdge } from './types/action.js';

const edge = (id: string, status: string): ActionDependencyEdge => ({
  id: `dep-${id}`,
  dependsOn: { id, name: `Action ${id}`, status, kanbanStatus: null, projectId: null },
});

describe('getBlockers / openBlockers', () => {
  it('returns the dependsOn rows of every depsOut edge', () => {
    const action = { depsOut: [edge('a', 'ACTIVE'), edge('b', 'COMPLETED')] };
    expect(getBlockers(action).map((b) => b.id)).toEqual(['a', 'b']);
  });

  it('openBlockers keeps only ACTIVE blockers', () => {
    const action = { depsOut: [edge('a', 'ACTIVE'), edge('b', 'COMPLETED'), edge('c', 'CANCELLED')] };
    expect(openBlockers(action).map((b) => b.id)).toEqual(['a']);
  });

  it('is empty when the procedure did not include the relation', () => {
    expect(getBlockers({})).toEqual([]);
    expect(openBlockers({ depsOut: undefined })).toEqual([]);
  });
});

describe('Action response type', () => {
  it('carries depsOut, openBlockerCount and isBlocked and no legacy id arrays', () => {
    const action: Action = {
      id: 'x', name: 'X', description: null, status: 'ACTIVE', priority: 'Quick',
      projectId: null, workspaceId: null, kanbanStatus: null, kanbanOrder: null,
      dueDate: null, scheduledStart: null, scheduledEnd: null, duration: null,
      completedAt: null, createdAt: new Date(), updatedAt: new Date(), source: 'cli',
      depsOut: [edge('a', 'ACTIVE')],
      openBlockerCount: 1,
      isBlocked: true,
    };
    expect(action.isBlocked).toBe(true);
    // The arrays were dropped with ADR-0062; they must not survive as fields.
    expect('blockedByIds' in action).toBe(false);
    expect('blockingIds' in action).toBe(false);
  });
});

describe('ActionsApi dependency calls', () => {
  function makeApi() {
    const getById = vi.fn().mockResolvedValue({ id: 'x', depsOut: [], openBlockerCount: 0, isBlocked: false });
    const search = vi.fn().mockResolvedValue([{ id: 'a', name: 'A', status: 'ACTIVE', kanbanStatus: 'TODO', projectId: null }]);
    const update = vi.fn().mockResolvedValue({ id: 'x' });
    const client = {
      action: {
        getById: { query: getById },
        searchForDependencies: { query: search },
        update: { mutate: update },
      },
    };
    return { api: new ActionsApi(client as unknown as TrpcClient), getById, search, update };
  }

  it('get calls action.getById', async () => {
    const { api, getById } = makeApi();
    const action = await api.get('x');
    expect(getById).toHaveBeenCalledWith({ id: 'x' });
    expect(action.isBlocked).toBe(false);
  });

  it('searchForDependencies forwards the picker options', async () => {
    const { api, search } = makeApi();
    const found = await api.searchForDependencies({ query: 'A', workspaceId: 'ws', excludeId: 'x', limit: 5 });
    expect(search).toHaveBeenCalledWith({ query: 'A', workspaceId: 'ws', excludeId: 'x', limit: 5 });
    expect(found[0]?.id).toBe('a');
  });

  it('update passes blockedByIds through, including an empty array to clear', async () => {
    const { api, update } = makeApi();
    await api.update({ id: 'x', blockedByIds: [] });
    expect(update).toHaveBeenCalledWith({ id: 'x', blockedByIds: [] });
  });
});
