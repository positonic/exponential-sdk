import { describe, it, expect, vi } from 'vitest';
import { ResourcesApi } from './resources.js';
import type { TrpcClient } from './client.js';

function makeApi() {
  const list = vi.fn().mockResolvedValue({ resources: [], nextCursor: undefined });
  const create = vi.fn().mockImplementation(async (input: Record<string, unknown>) => ({
    resource: { id: 'r1', tags: [], ...input },
  }));
  const get = vi.fn().mockResolvedValue({ resource: { id: 'r1', tags: ['a'] }, chunkCount: 0 });
  const update = vi.fn().mockImplementation(async ({ id, ...input }: Record<string, unknown>) => ({
    resource: { id, ...input },
  }));
  const setReadStatus = vi.fn().mockResolvedValue({ id: 'r1', readStatus: 'read', readAt: new Date() });
  const archive = vi.fn().mockResolvedValue({ success: true });
  const client = {
    resource: {
      list: { query: list },
      create: { mutate: create },
      get: { query: get },
      update: { mutate: update },
      setReadStatus: { mutate: setReadStatus },
      archive: { mutate: archive },
    },
  };
  return {
    api: new ResourcesApi(client as unknown as TrpcClient),
    list,
    create,
    get,
    update,
    setReadStatus,
    archive,
  };
}

describe('ResourcesApi', () => {
  it('list forwards the reading-list filter verbatim', async () => {
    const { api, list } = makeApi();
    await api.list({ workspaceId: 'w1', readStatus: 'unread', limit: 100 });
    expect(list).toHaveBeenCalledWith({ workspaceId: 'w1', readStatus: 'unread', limit: 100 });
  });

  it('create unwraps the { resource } envelope', async () => {
    const { api } = makeApi();
    const out = await api.create({ title: 'T', content: 'body', contentType: 'note' });
    expect(out).toMatchObject({ id: 'r1', title: 'T' });
  });

  it('save files a URL as a to_read bookmark without embedding, titled by hostname when no title is given', async () => {
    const { api, create } = makeApi();
    await api.save({ url: 'https://www.example.com/post', note: 'from Sam', workspaceId: 'w1' });
    expect(create).toHaveBeenCalledWith({
      title: 'example.com',
      url: 'https://www.example.com/post',
      description: 'from Sam',
      contentType: 'bookmark',
      readStatus: 'to_read',
      generateEmbeddings: false,
      workspaceId: 'w1',
    });
  });

  it('save keeps an explicit title and read status', async () => {
    const { api, create } = makeApi();
    await api.save({ url: 'https://example.com/x', title: '  Essay  ', readStatus: 'read' });
    expect(create.mock.calls[0][0]).toMatchObject({ title: 'Essay', readStatus: 'read' });
  });

  it('save without tags makes a single create call', async () => {
    const { api, update } = makeApi();
    await api.save({ url: 'https://example.com/x' });
    expect(update).not.toHaveBeenCalled();
  });

  it('save adds tags to the ones a re-saved link already has, never sending them on create', async () => {
    const { api, create, update } = makeApi();
    create.mockResolvedValueOnce({ resource: { id: 'r9', tags: ['ai', 'thought leader'] } });
    const out = await api.save({ url: 'https://example.com/x', tags: ['thought leader', 'agents'] });
    expect(create.mock.calls[0][0]).not.toHaveProperty('tags');
    expect(update).toHaveBeenCalledWith({ id: 'r9', tags: ['ai', 'thought leader', 'agents'] });
    expect(out.tags).toEqual(['ai', 'thought leader', 'agents']);
  });

  it('save skips the update when the link already has every tag', async () => {
    const { api, create, update } = makeApi();
    create.mockResolvedValueOnce({ resource: { id: 'r9', tags: ['thought leader'] } });
    const out = await api.save({ url: 'https://example.com/x', tags: ['thought leader'] });
    expect(update).not.toHaveBeenCalled();
    expect(out.tags).toEqual(['thought leader']);
  });

  it('get and update unwrap the { resource } envelope', async () => {
    const { api, get, update } = makeApi();
    expect(await api.get('r1')).toMatchObject({ id: 'r1', tags: ['a'] });
    expect(get).toHaveBeenCalledWith({ id: 'r1' });
    const out = await api.update('r1', { tags: ['b'], readStatus: 'read' });
    expect(update).toHaveBeenCalledWith({ id: 'r1', tags: ['b'], readStatus: 'read' });
    expect(out).toMatchObject({ id: 'r1', tags: ['b'] });
  });

  it('setReadStatus and archive call their mutations by id', async () => {
    const { api, setReadStatus, archive } = makeApi();
    await api.setReadStatus('r1', 'read');
    await api.archive('r1');
    expect(setReadStatus).toHaveBeenCalledWith({ id: 'r1', readStatus: 'read' });
    expect(archive).toHaveBeenCalledWith({ id: 'r1' });
  });
});
