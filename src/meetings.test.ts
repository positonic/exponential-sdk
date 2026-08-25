import { describe, it, expect, vi } from 'vitest';
import { MeetingsApi } from './meetings.js';
import type { TrpcClient } from './client.js';

function makeClient(overrides: { notes?: string | null } = {}) {
  const getAllTranscriptions = vi.fn().mockResolvedValue([]);
  const getById = vi.fn().mockResolvedValue({
    id: 'm1',
    title: 'Standup',
    notes: overrides.notes ?? null,
  });
  const createManualTranscription = vi.fn().mockResolvedValue({ id: 'm1' });
  const updateDetails = vi
    .fn()
    .mockImplementation((input: Record<string, unknown>) =>
      Promise.resolve({ id: input.id, ...input }),
    );
  const updateTitle = vi
    .fn()
    .mockImplementation((input: Record<string, unknown>) =>
      Promise.resolve({ id: input.id, title: input.title }),
    );
  const deleteTranscription = vi.fn().mockResolvedValue({ success: true });
  const bulkDeleteTranscriptions = vi.fn().mockResolvedValue({ count: 0 });

  const client = {
    transcription: {
      getAllTranscriptions: { query: getAllTranscriptions },
      getById: { query: getById },
      createManualTranscription: { mutate: createManualTranscription },
      updateDetails: { mutate: updateDetails },
      updateTitle: { mutate: updateTitle },
      deleteTranscription: { mutate: deleteTranscription },
      bulkDeleteTranscriptions: { mutate: bulkDeleteTranscriptions },
    },
  } as unknown as TrpcClient;

  return {
    api: new MeetingsApi(client),
    getAllTranscriptions,
    getById,
    createManualTranscription,
    updateDetails,
    updateTitle,
    deleteTranscription,
    bulkDeleteTranscriptions,
  };
}

describe('MeetingsApi.list', () => {
  it('passes filters through to getAllTranscriptions', async () => {
    const { api, getAllTranscriptions } = makeClient();
    await api.list({ workspaceId: 'w1', includeArchived: true, meetingType: 'mine' });
    expect(getAllTranscriptions).toHaveBeenCalledWith({
      workspaceId: 'w1',
      includeArchived: true,
      meetingType: 'mine',
    });
  });
});

describe('MeetingsApi.update', () => {
  it('routes title through updateTitle and the rest through updateDetails', async () => {
    const { api, updateTitle, updateDetails } = makeClient();
    await api.update({ id: 'm1', title: 'Renamed', notes: 'hello' });
    expect(updateTitle).toHaveBeenCalledWith({ id: 'm1', title: 'Renamed' });
    expect(updateDetails).toHaveBeenCalledWith({ id: 'm1', notes: 'hello' });
  });

  it('skips updateDetails when only the title changes', async () => {
    const { api, updateTitle, updateDetails } = makeClient();
    await api.update({ id: 'm1', title: 'Renamed' });
    expect(updateTitle).toHaveBeenCalledOnce();
    expect(updateDetails).not.toHaveBeenCalled();
  });

  it('skips updateTitle when only details change', async () => {
    const { api, updateTitle, updateDetails } = makeClient();
    await api.update({ id: 'm1', summary: 'recap' });
    expect(updateTitle).not.toHaveBeenCalled();
    expect(updateDetails).toHaveBeenCalledWith({ id: 'm1', summary: 'recap' });
  });

  it('throws when nothing would be written', async () => {
    const { api } = makeClient();
    await expect(api.update({ id: 'm1' })).rejects.toThrow('nothing to update');
  });
});

describe('MeetingsApi delete', () => {
  it('delete routes through deleteTranscription', async () => {
    const { api, deleteTranscription } = makeClient();
    const result = await api.delete('m1');
    expect(deleteTranscription).toHaveBeenCalledWith({ id: 'm1' });
    expect(result).toEqual({ success: true });
  });

  it('deleteMany routes through bulkDeleteTranscriptions and returns the count', async () => {
    const { api, bulkDeleteTranscriptions } = makeClient();
    bulkDeleteTranscriptions.mockResolvedValue({ count: 2 });
    const result = await api.deleteMany(['m1', 'm2', 'm3']);
    expect(bulkDeleteTranscriptions).toHaveBeenCalledWith({ ids: ['m1', 'm2', 'm3'] });
    expect(result).toEqual({ count: 2 });
  });
});

describe('MeetingsApi notes', () => {
  it('getNotes returns the notes body alone', async () => {
    const { api } = makeClient({ notes: 'existing notes' });
    expect(await api.getNotes('m1')).toBe('existing notes');
  });

  it('setNotes replaces notes via updateDetails', async () => {
    const { api, updateDetails } = makeClient();
    await api.setNotes('m1', 'fresh');
    expect(updateDetails).toHaveBeenCalledWith({ id: 'm1', notes: 'fresh' });
  });

  it('appendNotes adds a blank-line-separated block to existing notes', async () => {
    const { api, updateDetails } = makeClient({ notes: 'first block\n' });
    await api.appendNotes('m1', 'second block');
    expect(updateDetails).toHaveBeenCalledWith({
      id: 'm1',
      notes: 'first block\n\nsecond block',
    });
  });

  it('appendNotes starts fresh when no notes exist', async () => {
    const { api, updateDetails } = makeClient({ notes: null });
    await api.appendNotes('m1', 'only block');
    expect(updateDetails).toHaveBeenCalledWith({ id: 'm1', notes: 'only block' });
  });
});
