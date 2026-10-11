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

  const client = {
    agentGuidance: {
      method: { query: method },
    },
  } as unknown as TrpcClient;

  return { api: new AgentGuidanceApi(client), method };
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
