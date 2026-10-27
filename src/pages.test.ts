import { describe, it, expect, vi } from 'vitest';
import { PagesApi } from './pages.js';
import { SearchApi } from './search.js';
import type { TrpcClient } from './client.js';

function makeClient() {
  const get = vi.fn().mockResolvedValue({ id: 'p1', body: '# Hi', bodyDoc: null });
  const search = vi.fn().mockResolvedValue({ query: 'q', workspaceId: 'w', results: [] });
  const history = vi.fn().mockResolvedValue({ revisions: [], nextCursor: null });
  const revision = vi.fn().mockResolvedValue({ id: 'r1', body: '' });
  const diff = vi.fn().mockResolvedValue({ unified: '', stats: { added: 0, removed: 0 } });
  const restore = vi.fn().mockResolvedValue({ id: 'p1', docVersion: 2, revisionId: 'r9' });
  const update = vi.fn().mockResolvedValue({ id: 'p1' });
  const knowledge = vi.fn().mockResolvedValue({ query: 'q', workspaceId: 'w', results: [] });
  const client = {
    page: {
      get: { query: get },
      search: { query: search },
      history: { query: history },
      revision: { query: revision },
      diff: { query: diff },
      restore: { mutate: restore },
      update: { mutate: update },
    },
    search: { knowledge: { query: knowledge } },
  } as unknown as TrpcClient;
  return { client, get, search, history, revision, diff, restore, update, knowledge };
}

describe('PagesApi reads are lean by default', () => {
  it('get asks for Markdown only unless told otherwise', async () => {
    const { client, get } = makeClient();
    const pages = new PagesApi(client);
    await pages.get('p1');
    expect(get).toHaveBeenCalledWith({ id: 'p1', format: 'markdown' });

    await pages.get('p1', { format: 'full' });
    expect(get).toHaveBeenLastCalledWith({ id: 'p1', format: 'full' });

    await pages.get('p1', { section: 'Goals' });
    expect(get).toHaveBeenLastCalledWith({ id: 'p1', format: 'markdown', section: 'Goals' });
  });

  it('outline is get with the outline format', async () => {
    const { client, get } = makeClient();
    await new PagesApi(client).outline('p1');
    expect(get).toHaveBeenCalledWith({ id: 'p1', format: 'outline' });
  });

  it('search goes to page.search with the workspace', async () => {
    const { client, search } = makeClient();
    await new PagesApi(client).search({ workspaceId: 'w', query: 'strategy', limit: 3 });
    expect(search).toHaveBeenCalledWith({ workspaceId: 'w', query: 'strategy', limit: 3 });
  });
});

describe('PagesApi history', () => {
  it('history, revision and diff map their arguments; diff defaults to previous', async () => {
    const { client, history, revision, diff } = makeClient();
    const pages = new PagesApi(client);
    await pages.history('p1', { limit: 10, cursor: 'r5' });
    expect(history).toHaveBeenCalledWith({ id: 'p1', limit: 10, cursor: 'r5' });
    await pages.revision('p1', 'r1');
    expect(revision).toHaveBeenCalledWith({ id: 'p1', revisionId: 'r1' });
    await pages.diff('p1', 'r1');
    expect(diff).toHaveBeenCalledWith({ id: 'p1', revisionId: 'r1', against: 'previous' });
    await pages.diff('p1', 'r1', { against: 'current' });
    expect(diff).toHaveBeenLastCalledWith({ id: 'p1', revisionId: 'r1', against: 'current' });
  });

  it('restore passes the note through', async () => {
    const { client, restore } = makeClient();
    const result = await new PagesApi(client).restore('p1', 'r1', { note: 'back', baseVersion: 5 });
    expect(restore).toHaveBeenCalledWith({ id: 'p1', revisionId: 'r1', note: 'back', baseVersion: 5 });
    expect(result.docVersion).toBe(2);
  });

  it('update forwards baseVersion, note and provenance untouched', async () => {
    const { client, update } = makeClient();
    const asOf = new Date('2026-09-30');
    await new PagesApi(client).update({ id: 'p1', body: '# New', baseVersion: 4, note: 'why', source: 'deck', asOf });
    expect(update).toHaveBeenCalledWith({ id: 'p1', body: '# New', baseVersion: 4, note: 'why', source: 'deck', asOf });
  });
});

describe('SearchApi.knowledge', () => {
  it('passes the workspace and source filter to search.knowledge', async () => {
    const { client, knowledge } = makeClient();
    await new SearchApi(client).knowledge({ workspaceId: 'w', query: 'churn', sourceTypes: ['page'] });
    expect(knowledge).toHaveBeenCalledWith({ workspaceId: 'w', query: 'churn', sourceTypes: ['page'] });
  });
});
