import { describe, it, expect, vi } from 'vitest';
import { PagesApi } from './pages.js';
import { RequirementsApi } from './requirements.js';
import { ScopesApi } from './scopes.js';
import { FeaturesApi } from './features.js';
import type { TrpcClient } from './client.js';

function makeClient() {
  const pageCreate = vi.fn().mockResolvedValue({ id: 'page1' });
  const pageUpdate = vi.fn().mockResolvedValue({ id: 'page1' });
  const pageGet = vi.fn().mockResolvedValue({ id: 'page1', title: 'PRD' });
  const pageList = vi.fn().mockResolvedValue([{ id: 'page1' }]);
  const addRequirement = vi.fn().mockResolvedValue({ id: 'req1' });
  const setRequirementChecked = vi.fn().mockResolvedValue({ id: 'req1', checkedAt: new Date() });
  const deleteRequirement = vi.fn().mockResolvedValue({ success: true });
  const addScope = vi.fn().mockResolvedValue({ id: 'scope1' });
  const updateScope = vi.fn().mockResolvedValue({ id: 'scope1' });
  const deleteScope = vi.fn().mockResolvedValue({ success: true });
  const linkPage = vi.fn().mockResolvedValue({ featureId: 'feat1', pageId: 'page1' });
  const unlinkPage = vi.fn().mockResolvedValue({ success: true });
  const getById = vi.fn().mockResolvedValue({
    id: 'feat1',
    requirements: [
      { id: 'r1', scopeId: null },
      { id: 'r2', scopeId: 'scope1' },
    ],
    scopes: [{ id: 'scope1', version: 'V1' }],
  });

  const client = {
    page: {
      list: { query: pageList },
      get: { query: pageGet },
      create: { mutate: pageCreate },
      update: { mutate: pageUpdate },
    },
    product: {
      feature: {
        getById: { query: getById },
        addRequirement: { mutate: addRequirement },
        setRequirementChecked: { mutate: setRequirementChecked },
        deleteRequirement: { mutate: deleteRequirement },
        addScope: { mutate: addScope },
        updateScope: { mutate: updateScope },
        deleteScope: { mutate: deleteScope },
        linkPage: { mutate: linkPage },
        unlinkPage: { mutate: unlinkPage },
      },
    },
  } as unknown as TrpcClient;

  return {
    client,
    pageCreate,
    pageUpdate,
    addRequirement,
    setRequirementChecked,
    addScope,
    linkPage,
    unlinkPage,
    getById,
  };
}

describe('PagesApi', () => {
  it('creates a page with a Markdown body', async () => {
    const { client, pageCreate } = makeClient();
    const api = new PagesApi(client);
    await api.create({ workspaceId: 'ws1', title: 'PRD: X', body: '## Problem' });
    expect(pageCreate).toHaveBeenCalledWith({
      workspaceId: 'ws1',
      title: 'PRD: X',
      body: '## Problem',
    });
  });

  it('updates a page body as a Markdown-source write', async () => {
    const { client, pageUpdate } = makeClient();
    const api = new PagesApi(client);
    await api.update({ id: 'page1', body: '## Problem\n\nnew' });
    expect(pageUpdate).toHaveBeenCalledWith({ id: 'page1', body: '## Problem\n\nnew' });
  });
});

describe('RequirementsApi', () => {
  it('lists requirements from the feature getById payload', async () => {
    const { client, getById } = makeClient();
    const api = new RequirementsApi(client);
    const all = await api.list({ featureId: 'feat1' });
    expect(getById).toHaveBeenCalledWith({ id: 'feat1' });
    expect(all.map((r) => r.id)).toEqual(['r1', 'r2']);
  });

  it('filters by scopeId when given', async () => {
    const { client } = makeClient();
    const api = new RequirementsApi(client);
    const scoped = await api.list({ featureId: 'feat1', scopeId: 'scope1' });
    expect(scoped.map((r) => r.id)).toEqual(['r2']);
  });

  it('creates an EARS requirement', async () => {
    const { client, addRequirement } = makeClient();
    const api = new RequirementsApi(client);
    await api.create({
      featureId: 'feat1',
      statement: 'When a form is submitted, the system shall create exactly one Insight',
      kind: 'FUNCTIONAL',
    });
    expect(addRequirement).toHaveBeenCalledWith({
      featureId: 'feat1',
      statement: 'When a form is submitted, the system shall create exactly one Insight',
      kind: 'FUNCTIONAL',
    });
  });

  it('checks a requirement met/unmet', async () => {
    const { client, setRequirementChecked } = makeClient();
    const api = new RequirementsApi(client);
    await api.setChecked('req1', true);
    expect(setRequirementChecked).toHaveBeenCalledWith({ id: 'req1', checked: true });
  });
});

describe('ScopesApi', () => {
  it('lists scopes from the feature getById payload', async () => {
    const { client } = makeClient();
    const api = new ScopesApi(client);
    const scopes = await api.list({ featureId: 'feat1' });
    expect(scopes.map((s) => s.id)).toEqual(['scope1']);
  });

  it('creates a scope', async () => {
    const { client, addScope } = makeClient();
    const api = new ScopesApi(client);
    await api.create({ featureId: 'feat1', version: 'V1', description: 'Manual upload' });
    expect(addScope).toHaveBeenCalledWith({
      featureId: 'feat1',
      version: 'V1',
      description: 'Manual upload',
    });
  });
});

describe('FeaturesApi page links', () => {
  it('links a page to a feature, optionally pinned to a scope', async () => {
    const { client, linkPage } = makeClient();
    const api = new FeaturesApi(client);
    await api.linkPage({ featureId: 'feat1', pageId: 'page1', scopeId: 'scope1' });
    expect(linkPage).toHaveBeenCalledWith({
      featureId: 'feat1',
      pageId: 'page1',
      scopeId: 'scope1',
    });
  });

  it('unlinks a page', async () => {
    const { client, unlinkPage } = makeClient();
    const api = new FeaturesApi(client);
    await api.unlinkPage('feat1', 'page1');
    expect(unlinkPage).toHaveBeenCalledWith({ featureId: 'feat1', pageId: 'page1' });
  });
});
