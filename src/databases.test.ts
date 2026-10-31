import { describe, it, expect, vi } from 'vitest';
import { DatabasesApi } from './databases.js';
import type { TrpcClient } from './client.js';

function makeClient() {
  const create = vi.fn().mockResolvedValue({ id: 'db1', marker: '<!-- database:db1 -->' });
  const get = vi.fn().mockResolvedValue({ id: 'db1', rowCount: 2 });
  const list = vi.fn().mockResolvedValue([{ id: 'db1' }]);
  const update = vi.fn().mockResolvedValue({ id: 'db1' });
  const del = vi.fn().mockResolvedValue({ id: 'db1', rowCount: 2 });
  const addProperty = vi.fn().mockResolvedValue({ property: { id: 'p1' }, database: { id: 'db1' } });
  const updateProperty = vi.fn().mockResolvedValue({ property: { id: 'p1' }, database: { id: 'db1' } });
  const removeProperty = vi.fn().mockResolvedValue({ id: 'db1' });
  const reorderProperties = vi.fn().mockResolvedValue({ id: 'db1' });
  const listRows = vi.fn().mockResolvedValue({ rows: [], nextCursor: null, columns: [] });
  const createRow = vi.fn().mockResolvedValue({ id: 'r1', values: {} });
  const previewCsv = vi.fn().mockResolvedValue({ rows: [], importable: 0 });
  const commitCsv = vi.fn().mockResolvedValue({ created: [], skipped: [] });
  const updateRow = vi.fn().mockResolvedValue({ id: 'r1', values: {} });
  const deleteRow = vi.fn().mockResolvedValue({ id: 'r1', databaseId: 'db1' });
  const client = {
    database: {
      create: { mutate: create },
      get: { query: get },
      list: { query: list },
      update: { mutate: update },
      delete: { mutate: del },
      addProperty: { mutate: addProperty },
      updateProperty: { mutate: updateProperty },
      removeProperty: { mutate: removeProperty },
      reorderProperties: { mutate: reorderProperties },
      listRows: { query: listRows },
      createRow: { mutate: createRow },
      previewCsv: { query: previewCsv },
      commitCsv: { mutate: commitCsv },
      updateRow: { mutate: updateRow },
      deleteRow: { mutate: deleteRow },
    },
  } as unknown as TrpcClient;
  return {
    client,
    create,
    get,
    list,
    update,
    del,
    addProperty,
    updateProperty,
    removeProperty,
    reorderProperties,
    listRows,
    createRow,
    previewCsv,
    commitCsv,
    updateRow,
    deleteRow,
  };
}

describe('DatabasesApi — the database', () => {
  it('create, get, list, update and delete map to database.*', async () => {
    const m = makeClient();
    const api = new DatabasesApi(m.client);
    const created = await api.create({ pageId: 'page1', name: 'Metrics' });
    expect(m.create).toHaveBeenCalledWith({ pageId: 'page1', name: 'Metrics' });
    expect(created.marker).toBe('<!-- database:db1 -->');

    await api.get('db1');
    expect(m.get).toHaveBeenCalledWith({ id: 'db1' });
    await api.list('page1');
    expect(m.list).toHaveBeenCalledWith({ pageId: 'page1' });

    const view = { filters: [], hiddenPropertyIds: [], propertyOrder: ['p1'] };
    await api.update({ id: 'db1', name: 'Metrics 2', view });
    expect(m.update).toHaveBeenCalledWith({ id: 'db1', name: 'Metrics 2', view });

    await expect(api.delete('db1')).resolves.toEqual({ id: 'db1', rowCount: 2 });
    expect(m.del).toHaveBeenCalledWith({ id: 'db1' });
  });
});

describe('DatabasesApi — properties', () => {
  it('addProperty passes the definition through; updateProperty names the property by id or name', async () => {
    const m = makeClient();
    const api = new DatabasesApi(m.client);
    await api.addProperty({
      id: 'db1',
      name: 'Status',
      type: 'select',
      options: [{ name: 'Not measured' }, { name: 'Tracked', color: 'green' }],
    });
    expect(m.addProperty).toHaveBeenCalledWith({
      id: 'db1',
      name: 'Status',
      type: 'select',
      options: [{ name: 'Not measured' }, { name: 'Tracked', color: 'green' }],
    });
    await api.updateProperty({ id: 'db1', propertyId: 'Status', name: 'Stage', description: null });
    expect(m.updateProperty).toHaveBeenCalledWith({ id: 'db1', propertyId: 'Status', name: 'Stage', description: null });
  });

  it('removeProperty and reorderProperties take the database then the property ids', async () => {
    const m = makeClient();
    const api = new DatabasesApi(m.client);
    await api.removeProperty('db1', 'p2');
    expect(m.removeProperty).toHaveBeenCalledWith({ id: 'db1', propertyId: 'p2' });
    await api.reorderProperties('db1', ['p2', 'p1']);
    expect(m.reorderProperties).toHaveBeenCalledWith({ id: 'db1', propertyIds: ['p2', 'p1'] });
  });
});

describe('DatabasesApi — rows', () => {
  it('listRows sends the database id with the paging and view options', async () => {
    const m = makeClient();
    const api = new DatabasesApi(m.client);
    await api.listRows('db1');
    expect(m.listRows).toHaveBeenCalledWith({ id: 'db1' });
    const view = { filters: [{ propertyId: 'p1', op: 'eq' as const, value: 'Tracked' }], hiddenPropertyIds: [], propertyOrder: [] };
    await api.listRows('db1', { view, limit: 20, cursor: '20' });
    expect(m.listRows).toHaveBeenLastCalledWith({ id: 'db1', view, limit: 20, cursor: '20' });
  });

  it('createRow and updateRow send values keyed by property id or name, with the note', async () => {
    const m = makeClient();
    const api = new DatabasesApi(m.client);
    await api.createRow('db1', { Name: 'Alert latency', Status: 'Tracked' }, { note: 'From the CLEAR page' });
    expect(m.createRow).toHaveBeenCalledWith({
      id: 'db1',
      values: { Name: 'Alert latency', Status: 'Tracked' },
      note: 'From the CLEAR page',
    });
    await api.createRow('db1');
    expect(m.createRow).toHaveBeenLastCalledWith({ id: 'db1', values: {} });

    await api.updateRow('r1', { Status: null });
    expect(m.updateRow).toHaveBeenCalledWith({ rowId: 'r1', values: { Status: null } });
    await api.deleteRow('r1');
    expect(m.deleteRow).toHaveBeenCalledWith({ rowId: 'r1' });
  });

  it('previewCsv sends the file with an optional mapping; commitCsv requires the mapping and takes a note', async () => {
    const m = makeClient();
    const api = new DatabasesApi(m.client);
    const { previewCsv, commitCsv } = m;
    await api.previewCsv('db1', 'Name,Score\nA,1');
    expect(previewCsv).toHaveBeenCalledWith({ id: 'db1', csv: 'Name,Score\nA,1' });
    const mapping = { Name: { kind: 'property' as const, propertyId: 'ptitle000001' } };
    await api.previewCsv('db1', 'Name\nA', mapping);
    expect(previewCsv).toHaveBeenLastCalledWith({ id: 'db1', csv: 'Name\nA', mapping });
    await api.commitCsv('db1', 'Name\nA', mapping, { note: 'Q3 sheet' });
    expect(commitCsv).toHaveBeenCalledWith({ id: 'db1', csv: 'Name\nA', mapping, note: 'Q3 sheet' });
  });
});
