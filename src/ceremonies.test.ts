import { describe, it, expect, vi } from 'vitest';
import { CeremoniesApi } from './ceremonies.js';
import type { TrpcClient } from './client.js';

function makeClient() {
  const calls = {
    templates: vi.fn().mockResolvedValue([]),
    list: vi.fn().mockResolvedValue([]),
    listForProject: vi.fn().mockResolvedValue([]),
    get: vi.fn().mockResolvedValue({ id: 'c1' }),
    listOccurrences: vi.fn().mockResolvedValue([]),
    getOccurrence: vi.fn().mockResolvedValue({ id: 'o1' }),
    myOccurrenceUpdate: vi.fn().mockResolvedValue({ questions: [] }),
    occurrenceUpdateSummary: vi.fn().mockResolvedValue({ participants: [] }),
    draftMyOccurrenceUpdate: vi.fn().mockResolvedValue({ questions: [] }),
    saveMyOccurrenceUpdate: vi.fn().mockResolvedValue({ questions: [] }),
    generateAgenda: vi.fn().mockResolvedValue({ occurrenceId: 'o1', itemCount: 0 }),
    skipOccurrence: vi.fn().mockResolvedValue({ id: 'o1', status: 'SKIPPED' }),
    unskipOccurrence: vi.fn().mockResolvedValue({ id: 'o1', status: 'PLANNED' }),
    resolveAgendaItem: vi.fn().mockResolvedValue({ occurrenceId: 'o1' }),
    addAgendaItem: vi.fn().mockResolvedValue({ occurrenceId: 'o1' }),
    reorderAgendaItems: vi.fn().mockResolvedValue({ occurrenceId: 'o1' }),
    postAgendaToMatrix: vi.fn().mockResolvedValue({ kind: 'no-room' }),
    create: vi.fn().mockResolvedValue({ ceremony: { id: 'c1' }, occurrencesCreated: 4 }),
    update: vi.fn().mockResolvedValue({ ceremony: { id: 'c1' }, occurrencesCreated: 0 }),
    importDefinitions: vi.fn().mockResolvedValue([]),
    backfillAttachments: vi.fn().mockResolvedValue({ dryRun: true, rows: [] }),
    attachMeeting: vi.fn().mockResolvedValue({ meetingId: 'm1', occurrenceId: 'o1' }),
    detachMeeting: vi.fn().mockResolvedValue({ meetingId: 'm1', occurrenceId: null }),
  };

  const q = (fn: unknown) => ({ query: fn });
  const m = (fn: unknown) => ({ mutate: fn });
  const client = {
    ceremony: {
      templates: q(calls.templates),
      list: q(calls.list),
      listForProject: q(calls.listForProject),
      get: q(calls.get),
      listOccurrences: q(calls.listOccurrences),
      getOccurrence: q(calls.getOccurrence),
      myOccurrenceUpdate: q(calls.myOccurrenceUpdate),
      occurrenceUpdateSummary: q(calls.occurrenceUpdateSummary),
      draftMyOccurrenceUpdate: m(calls.draftMyOccurrenceUpdate),
      saveMyOccurrenceUpdate: m(calls.saveMyOccurrenceUpdate),
      generateAgenda: m(calls.generateAgenda),
      skipOccurrence: m(calls.skipOccurrence),
      unskipOccurrence: m(calls.unskipOccurrence),
      resolveAgendaItem: m(calls.resolveAgendaItem),
      addAgendaItem: m(calls.addAgendaItem),
      reorderAgendaItems: m(calls.reorderAgendaItems),
      postAgendaToMatrix: m(calls.postAgendaToMatrix),
      create: m(calls.create),
      update: m(calls.update),
      importDefinitions: m(calls.importDefinitions),
      backfillAttachments: m(calls.backfillAttachments),
      attachMeeting: m(calls.attachMeeting),
      detachMeeting: m(calls.detachMeeting),
    },
  } as unknown as TrpcClient;

  return { api: new CeremoniesApi(client), ...calls };
}

describe('CeremoniesApi reads', () => {
  it('list omits includeInactive unless asked', async () => {
    const { api, list } = makeClient();
    await api.list('w1');
    expect(list).toHaveBeenLastCalledWith({ workspaceId: 'w1' });
    await api.list('w1', { includeInactive: true });
    expect(list).toHaveBeenLastCalledWith({ workspaceId: 'w1', includeInactive: true });
  });

  it('get sends the ceremony id as `id`', async () => {
    const { api, get } = makeClient();
    await api.get('w1', 'c1');
    expect(get).toHaveBeenCalledWith({ workspaceId: 'w1', id: 'c1' });
  });

  it('listOccurrences passes the window through', async () => {
    const { api, listOccurrences } = makeClient();
    const from = new Date('2026-09-01');
    const to = new Date('2026-10-01');
    await api.listOccurrences({ workspaceId: 'w1', from, to, ceremonyId: 'c1' });
    expect(listOccurrences).toHaveBeenCalledWith({ workspaceId: 'w1', from, to, ceremonyId: 'c1' });
  });

  it('getOccurrence and the update reads are keyed by workspace + occurrence', async () => {
    const { api, getOccurrence, myOccurrenceUpdate, occurrenceUpdateSummary } = makeClient();
    await api.getOccurrence('w1', 'o1');
    await api.myUpdate('w1', 'o1');
    await api.updateSummary('w1', 'o1');
    for (const fn of [getOccurrence, myOccurrenceUpdate, occurrenceUpdateSummary]) {
      expect(fn).toHaveBeenCalledWith({ workspaceId: 'w1', occurrenceId: 'o1' });
    }
  });

  it('listForProject needs only the project', async () => {
    const { api, listForProject } = makeClient();
    await api.listForProject('p1');
    expect(listForProject).toHaveBeenCalledWith({ projectId: 'p1' });
  });
});

describe('CeremoniesApi writes', () => {
  it('generateAgenda only sends circulate when set', async () => {
    const { api, generateAgenda } = makeClient();
    await api.generateAgenda('w1', 'o1');
    expect(generateAgenda).toHaveBeenLastCalledWith({ workspaceId: 'w1', occurrenceId: 'o1' });
    await api.generateAgenda('w1', 'o1', { circulate: true });
    expect(generateAgenda).toHaveBeenLastCalledWith({ workspaceId: 'w1', occurrenceId: 'o1', circulate: true });
  });

  it('skip carries the reason; unskip does not', async () => {
    const { api, skipOccurrence, unskipOccurrence } = makeClient();
    await api.skipOccurrence('w1', 'o1', 'Nothing on the agenda');
    expect(skipOccurrence).toHaveBeenCalledWith({ workspaceId: 'w1', occurrenceId: 'o1', reason: 'Nothing on the agenda' });
    await api.unskipOccurrence('w1', 'o1');
    expect(unskipOccurrence).toHaveBeenCalledWith({ workspaceId: 'w1', occurrenceId: 'o1' });
  });

  it('resolveAgendaItem defaults to resolved', async () => {
    const { api, resolveAgendaItem } = makeClient();
    await api.resolveAgendaItem('w1', 'o1', 'i1');
    expect(resolveAgendaItem).toHaveBeenLastCalledWith({ workspaceId: 'w1', occurrenceId: 'o1', itemId: 'i1', resolved: true });
    await api.resolveAgendaItem('w1', 'o1', 'i1', false);
    expect(resolveAgendaItem).toHaveBeenLastCalledWith({ workspaceId: 'w1', occurrenceId: 'o1', itemId: 'i1', resolved: false });
  });

  it('backfillAttachments is a dry run unless told otherwise', async () => {
    const { api, backfillAttachments } = makeClient();
    await api.backfillAttachments('w1');
    expect(backfillAttachments).toHaveBeenLastCalledWith({ workspaceId: 'w1', dryRun: true });
    await api.backfillAttachments('w1', { dryRun: false });
    expect(backfillAttachments).toHaveBeenLastCalledWith({ workspaceId: 'w1', dryRun: false });
  });

  it('create and update pass input through untouched', async () => {
    const { api, create, update } = makeClient();
    const startsOn = new Date('2026-10-05');
    const input = {
      workspaceId: 'w1',
      name: 'Weekly Planning',
      kind: 'PLANNING' as const,
      cadenceRule: 'FREQ=WEEKLY;BYDAY=MO;BYHOUR=10;BYMINUTE=0',
      timezone: 'Europe/Madrid',
      startsOn,
    };
    await api.create(input);
    expect(create).toHaveBeenCalledWith(input);
    await api.update({ workspaceId: 'w1', id: 'c1', isActive: false });
    expect(update).toHaveBeenCalledWith({ workspaceId: 'w1', id: 'c1', isActive: false });
  });

  it('attach and detach address the meeting', async () => {
    const { api, attachMeeting, detachMeeting } = makeClient();
    await api.attachMeeting('m1', 'o1');
    expect(attachMeeting).toHaveBeenCalledWith({ meetingId: 'm1', occurrenceId: 'o1' });
    await api.detachMeeting('m1');
    expect(detachMeeting).toHaveBeenCalledWith({ meetingId: 'm1' });
  });
});
