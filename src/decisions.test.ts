import { describe, it, expect, vi } from 'vitest';
import { DecisionsApi } from './decisions.js';
import type { TrpcClient } from './client.js';

function makeClient() {
  const calls = {
    list: vi.fn().mockResolvedValue([]),
    get: vi.fn().mockResolvedValue({ id: 'd1', label: 'D-0001' }),
    listForMeeting: vi
      .fn()
      .mockResolvedValue({ decisions: [], canLogDecision: true, workspaceId: 'w1' }),
    listForAdr: vi.fn().mockResolvedValue([]),
    extractDrafts: vi.fn().mockResolvedValue({
      success: true,
      alreadyPublished: false,
      alreadyDrafted: false,
      draftCount: 3,
      draftsCreated: 3,
      discardedWithoutEvidence: 1,
      errors: [],
    }),
    create: vi.fn().mockResolvedValue({ id: 'd1', label: 'D-0001' }),
    update: vi.fn().mockResolvedValue({ id: 'd1' }),
    setStatus: vi.fn().mockResolvedValue({ id: 'd1', status: 'ACCEPTED' }),
    linkTicket: vi.fn().mockResolvedValue({ id: 'l1', ticketId: 't1' }),
    linkFeature: vi.fn().mockResolvedValue({ id: 'l2', featureId: 'f1' }),
    unlink: vi.fn().mockResolvedValue({ deleted: true }),
    confirmDraft: vi.fn().mockResolvedValue({ id: 'd1', reviewState: 'CONFIRMED' }),
    rejectDraft: vi.fn().mockResolvedValue({ id: 'd1', reviewState: 'REJECTED' }),
    deleteDraft: vi.fn().mockResolvedValue({ id: 'd1' }),
  };

  const client = {
    decision: {
      list: { query: calls.list },
      get: { query: calls.get },
      listForMeeting: { query: calls.listForMeeting },
      listForAdr: { query: calls.listForAdr },
      extractDrafts: { mutate: calls.extractDrafts },
      create: { mutate: calls.create },
      update: { mutate: calls.update },
      setStatus: { mutate: calls.setStatus },
      linkTicket: { mutate: calls.linkTicket },
      linkFeature: { mutate: calls.linkFeature },
      unlink: { mutate: calls.unlink },
      confirmDraft: { mutate: calls.confirmDraft },
      rejectDraft: { mutate: calls.rejectDraft },
      deleteDraft: { mutate: calls.deleteDraft },
    },
  } as unknown as TrpcClient;

  return { api: new DecisionsApi(client), ...calls };
}

describe('DecisionsApi.list', () => {
  it('passes filters through untouched', async () => {
    const { api, list } = makeClient();
    await api.list({
      workspaceId: 'w1',
      statuses: ['OPEN', 'ACCEPTED'],
      sources: ['MEETING'],
      productId: 'workspace',
      search: 'retention',
    });
    expect(list).toHaveBeenCalledWith({
      workspaceId: 'w1',
      statuses: ['OPEN', 'ACCEPTED'],
      sources: ['MEETING'],
      productId: 'workspace',
      search: 'retention',
    });
  });
});

describe('DecisionsApi.list paging', () => {
  it('passes number and limit through', async () => {
    const { api, list } = makeClient();
    await api.list({ workspaceId: 'w1', number: 3, limit: 50 });
    expect(list).toHaveBeenCalledWith({ workspaceId: 'w1', number: 3, limit: 50 });
  });
});

describe('DecisionsApi.extractDrafts', () => {
  it('extracts by meeting and reports what it found', async () => {
    const { api, extractDrafts } = makeClient();
    const result = await api.extractDrafts('m1');
    expect(extractDrafts).toHaveBeenCalledWith({ transcriptionSessionId: 'm1' });
    expect(result.draftCount).toBe(3);
    expect(result.discardedWithoutEvidence).toBe(1);
  });
});

describe('DecisionsApi.get', () => {
  it('sends workspaceId alongside decisionId', async () => {
    const { api, get } = makeClient();
    await api.get('w1', 'd1');
    expect(get).toHaveBeenCalledWith({ workspaceId: 'w1', decisionId: 'd1' });
  });
});

describe('DecisionsApi.listForMeeting', () => {
  it('queries by meeting alone — the meeting resolves the workspace', async () => {
    const { api, listForMeeting } = makeClient();
    const result = await api.listForMeeting('m1');
    expect(listForMeeting).toHaveBeenCalledWith({ transcriptionSessionId: 'm1' });
    expect(result.canLogDecision).toBe(true);
  });
});

describe('DecisionsApi.create', () => {
  it('logs an open question as a decision with status OPEN', async () => {
    const { api, create } = makeClient();
    await api.create({
      workspaceId: 'w1',
      statement: 'Do we migrate the queue?',
      status: 'OPEN',
      source: 'AGENT',
      transcriptionSessionId: 'm1',
    });
    expect(create).toHaveBeenCalledWith({
      workspaceId: 'w1',
      statement: 'Do we migrate the queue?',
      status: 'OPEN',
      source: 'AGENT',
      transcriptionSessionId: 'm1',
    });
  });

  it('carries deciders and evidence through', async () => {
    const { api, create } = makeClient();
    await api.create({
      workspaceId: 'w1',
      statement: 'Ship on Friday',
      deciders: [{ name: 'Ada', email: 'ada@example.com' }],
      evidence: [{ turnIndex: 12, speaker: 'Ada', startTime: 91.5, text: 'Friday it is.' }],
    });
    expect(create.mock.calls[0]?.[0]).toMatchObject({
      deciders: [{ name: 'Ada', email: 'ada@example.com' }],
      evidence: [{ turnIndex: 12, text: 'Friday it is.' }],
    });
  });
});

describe('DecisionsApi.setStatus', () => {
  it('carries supersededById when superseding', async () => {
    const { api, setStatus } = makeClient();
    await api.setStatus({
      workspaceId: 'w1',
      decisionId: 'd1',
      status: 'SUPERSEDED',
      supersededById: 'd2',
    });
    expect(setStatus).toHaveBeenCalledWith({
      workspaceId: 'w1',
      decisionId: 'd1',
      status: 'SUPERSEDED',
      supersededById: 'd2',
    });
  });
});

describe('DecisionsApi links', () => {
  it('links a ticket', async () => {
    const { api, linkTicket } = makeClient();
    await api.linkTicket('w1', 'd1', 't1');
    expect(linkTicket).toHaveBeenCalledWith({
      workspaceId: 'w1',
      decisionId: 'd1',
      ticketId: 't1',
    });
  });

  it('links a feature', async () => {
    const { api, linkFeature } = makeClient();
    await api.linkFeature('w1', 'd1', 'f1');
    expect(linkFeature).toHaveBeenCalledWith({
      workspaceId: 'w1',
      decisionId: 'd1',
      featureId: 'f1',
    });
  });

  it('unlinks by link id, not by ticket id', async () => {
    const { api, unlink } = makeClient();
    await api.unlink('w1', 'l1');
    expect(unlink).toHaveBeenCalledWith({ workspaceId: 'w1', linkId: 'l1' });
  });
});

describe('DecisionsApi draft lifecycle', () => {
  it('confirms, rejects and deletes by workspace + decision', async () => {
    const { api, confirmDraft, rejectDraft, deleteDraft } = makeClient();
    await api.confirmDraft('w1', 'd1');
    await api.rejectDraft('w1', 'd1');
    await api.deleteDraft('w1', 'd1');
    for (const fn of [confirmDraft, rejectDraft, deleteDraft]) {
      expect(fn).toHaveBeenCalledWith({ workspaceId: 'w1', decisionId: 'd1' });
    }
  });
});
