import { describe, it, expect, vi } from 'vitest';
import { AgentGuidanceApi } from './agentGuidance.js';
import type { TrpcClient } from './client.js';

function makeClient() {
  const method = vi.fn().mockResolvedValue({
    version: '0.1.0',
    status: 'draft',
    contentHash: 'sha256:abc',
    publishedAt: null,
    canonicalSource: { repo: 'positonic/exponential', path: 'content/docs/method', url: null },
    documents: [],
  });
  const context = vi.fn().mockResolvedValue({
    workspace: { id: 'w1', slug: 'exponential', name: 'Exponential' },
    project: null,
    authority: 'guidance',
    instructions: [],
    assembled: null,
    revision: 'sha256:def',
    generatedAt: '2026-10-11T00:00:00.000Z',
  });

  const client = {
    agentGuidance: {
      method: { query: method },
      context: { query: context },
    },
  } as unknown as TrpcClient;

  return { api: new AgentGuidanceApi(client), method, context };
}

describe('AgentGuidanceApi.method', () => {
  it('queries agentGuidance.method with the workspace and returns the payload', async () => {
    const { api, method } = makeClient();
    const result = await api.method({ workspaceId: 'w1' });
    expect(method).toHaveBeenCalledWith({ workspaceId: 'w1' });
    expect(result.status).toBe('draft');
    expect(result.contentHash).toBe('sha256:abc');
  });

  it('sends no input when called without a workspace', async () => {
    const { api, method } = makeClient();
    await api.method();
    expect(method).toHaveBeenCalledWith(undefined);
  });
});

describe('AgentGuidanceApi.context', () => {
  it('queries agentGuidance.context with workspace and project', async () => {
    const { api, context } = makeClient();
    const result = await api.context({ workspaceId: 'w1', projectId: 'p1' });
    expect(context).toHaveBeenCalledWith({ workspaceId: 'w1', projectId: 'p1' });
    expect(result.authority).toBe('guidance');
    expect(result.revision).toBe('sha256:def');
  });

  it('sends only the workspace when no project is given', async () => {
    const { api, context } = makeClient();
    await api.context({ workspaceId: 'w1' });
    expect(context).toHaveBeenCalledWith({ workspaceId: 'w1' });
  });
});
