import { describe, it, expect, vi } from 'vitest';
import { FeatureCommentsApi } from './featureComments.js';
import { PageCommentsApi } from './pageComments.js';
import { GoalCommentsApi } from './goalComments.js';
import { WorkspacesApi } from './workspaces.js';
import { TicketsApi } from './tickets.js';
import type { TrpcClient } from './client.js';

function makeClient() {
  const fns = {
    fcList: vi.fn().mockResolvedValue([{ id: 'c1' }]),
    fcCreate: vi.fn().mockResolvedValue({ id: 'c1' }),
    fcReply: vi.fn().mockResolvedValue({ id: 'c2' }),
    fcUpdate: vi.fn().mockResolvedValue({ id: 'c1' }),
    fcDelete: vi.fn().mockResolvedValue({ success: true }),
    fcResolve: vi.fn().mockResolvedValue({ success: true }),
    fcUnresolve: vi.fn().mockResolvedValue({ success: true }),
    pcList: vi.fn().mockResolvedValue([{ id: 'p1' }]),
    pcCreate: vi.fn().mockResolvedValue({ id: 'p1' }),
    pcUpdate: vi.fn().mockResolvedValue({ id: 'p1' }),
    pcDelete: vi.fn().mockResolvedValue({ success: true }),
    gcList: vi.fn().mockResolvedValue([{ id: 'g1' }]),
    gcAdd: vi.fn().mockResolvedValue({ id: 'g1' }),
    gcUpdate: vi.fn().mockResolvedValue({ id: 'g1' }),
    gcDelete: vi.fn().mockResolvedValue({ success: true }),
    listMembers: vi.fn().mockResolvedValue([
      {
        id: 'u1',
        name: 'Andi Stanner',
        email: 'andi@example.com',
        role: 'member',
        teamRole: null,
        source: 'workspace',
        teams: [],
        mentionSyntax: '@[Andi Stanner](u1)',
      },
    ]),
    ticketUpdateComment: vi.fn().mockResolvedValue({ id: 't1' }),
  };

  const client = {
    workspace: {
      listMembers: { query: fns.listMembers },
    },
    goalComment: {
      getComments: { query: fns.gcList },
      addComment: { mutate: fns.gcAdd },
      updateComment: { mutate: fns.gcUpdate },
      deleteComment: { mutate: fns.gcDelete },
    },
    pageComment: {
      list: { query: fns.pcList },
      create: { mutate: fns.pcCreate },
      update: { mutate: fns.pcUpdate },
      delete: { mutate: fns.pcDelete },
    },
    product: {
      featureComment: {
        list: { query: fns.fcList },
        create: { mutate: fns.fcCreate },
        reply: { mutate: fns.fcReply },
        update: { mutate: fns.fcUpdate },
        delete: { mutate: fns.fcDelete },
        resolve: { mutate: fns.fcResolve },
        unresolve: { mutate: fns.fcUnresolve },
      },
      ticket: {
        updateComment: { mutate: fns.ticketUpdateComment },
      },
    },
  } as unknown as TrpcClient;

  return { client, ...fns };
}

describe('FeatureCommentsApi', () => {
  it('lists comments for a feature', async () => {
    const { client, fcList } = makeClient();
    const result = await new FeatureCommentsApi(client).list('feat1');

    expect(fcList).toHaveBeenCalledWith({ featureId: 'feat1' });
    expect(result).toEqual([{ id: 'c1' }]);
  });

  it('passes the mention body through untouched', async () => {
    const { client, fcCreate } = makeClient();
    const body = 'Thoughts on this? @[Andi Stanner](u1)';
    await new FeatureCommentsApi(client).create({ featureId: 'feat1', body });

    expect(fcCreate).toHaveBeenCalledWith({ featureId: 'feat1', body });
  });

  it('supports scope-attached comments', async () => {
    const { client, fcCreate } = makeClient();
    await new FeatureCommentsApi(client).create({
      featureId: 'feat1',
      scopeId: 'scope1',
      body: 'scoped',
    });

    expect(fcCreate).toHaveBeenCalledWith({
      featureId: 'feat1',
      scopeId: 'scope1',
      body: 'scoped',
    });
  });

  it('replies to a comment by parent id', async () => {
    const { client, fcReply } = makeClient();
    await new FeatureCommentsApi(client).reply({ parentId: 'c1', body: 'agreed' });

    expect(fcReply).toHaveBeenCalledWith({ parentId: 'c1', body: 'agreed' });
  });

  it('wraps commentId for delete', async () => {
    const { client, fcDelete } = makeClient();
    const result = await new FeatureCommentsApi(client).delete('c1');

    expect(fcDelete).toHaveBeenCalledWith({ commentId: 'c1' });
    expect(result).toEqual({ success: true });
  });

  it('resolves and unresolves a thread', async () => {
    const { client, fcResolve, fcUnresolve } = makeClient();
    const api = new FeatureCommentsApi(client);
    await api.resolve({ featureId: 'feat1', threadId: 't1' });
    await api.unresolve({ featureId: 'feat1', threadId: 't1' });

    expect(fcResolve).toHaveBeenCalledWith({ featureId: 'feat1', threadId: 't1' });
    expect(fcUnresolve).toHaveBeenCalledWith({ featureId: 'feat1', threadId: 't1' });
  });
});

describe('PageCommentsApi', () => {
  it('lists and creates page comments', async () => {
    const { client, pcList, pcCreate } = makeClient();
    const api = new PageCommentsApi(client);
    await api.list('page1');
    await api.create({ pageId: 'page1', body: 'hi' });

    expect(pcList).toHaveBeenCalledWith({ pageId: 'page1' });
    expect(pcCreate).toHaveBeenCalledWith({ pageId: 'page1', body: 'hi' });
  });

  it('wraps commentId for delete', async () => {
    const { client, pcDelete } = makeClient();
    await new PageCommentsApi(client).delete('p1');

    expect(pcDelete).toHaveBeenCalledWith({ commentId: 'p1' });
  });
});

describe('GoalCommentsApi', () => {
  it('passes the numeric goal id through', async () => {
    const { client, gcList, gcAdd } = makeClient();
    const api = new GoalCommentsApi(client);
    await api.list(42);
    await api.add({ goalId: 42, content: 'progress?' });

    expect(gcList).toHaveBeenCalledWith({ goalId: 42 });
    expect(gcAdd).toHaveBeenCalledWith({ goalId: 42, content: 'progress?' });
  });
});

describe('WorkspacesApi.listMembers', () => {
  it('returns members carrying ready-to-paste mention syntax', async () => {
    const { client, listMembers } = makeClient();
    const members = await new WorkspacesApi(client).listMembers('ws1');

    expect(listMembers).toHaveBeenCalledWith({ workspaceId: 'ws1' });
    expect(members[0]?.mentionSyntax).toBe('@[Andi Stanner](u1)');
  });
});

describe('TicketsApi.updateComment', () => {
  it('edits a ticket comment by id', async () => {
    const { client, ticketUpdateComment } = makeClient();
    await new TicketsApi(client).updateComment({ id: 't1', content: 'edited' });

    expect(ticketUpdateComment).toHaveBeenCalledWith({ id: 't1', content: 'edited' });
  });
});
