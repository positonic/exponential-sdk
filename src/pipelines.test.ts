import { describe, it, expect, vi } from 'vitest';
import { PipelinesApi } from './pipelines.js';
import type { TrpcClient } from './client.js';

function makeApi() {
  const calls = {
    pipelineList: vi.fn().mockResolvedValue([]),
    pipelineGet: vi.fn().mockResolvedValue({ id: 'p1' }),
    pipelineGetStages: vi.fn().mockResolvedValue([]),
    dealList: vi.fn().mockResolvedValue([]),
    dealCreate: vi.fn().mockResolvedValue({ id: 'd1' }),
  };
  const client = {
    crmApi: {
      pipelineList: { query: calls.pipelineList },
      pipelineGet: { query: calls.pipelineGet },
      pipelineGetStages: { query: calls.pipelineGetStages },
      dealList: { query: calls.dealList },
      dealCreate: { mutate: calls.dealCreate },
    },
  } as unknown as TrpcClient;
  return { api: new PipelinesApi(client), calls };
}

describe('PipelinesApi multi-pipeline', () => {
  it('lists every pipeline in a workspace', async () => {
    const { api, calls } = makeApi();

    await api.list('ws1');

    expect(calls.pipelineList).toHaveBeenCalledWith({ workspaceId: 'ws1' });
  });

  it('forwards pipelineId to get, getStages and listDeals', async () => {
    const { api, calls } = makeApi();

    await api.get('ws1', 'pipe2');
    await api.getStages('ws1', 'pipe2');
    await api.listDeals('ws1', 'pipe2');

    expect(calls.pipelineGet).toHaveBeenCalledWith({ workspaceId: 'ws1', pipelineId: 'pipe2' });
    expect(calls.pipelineGetStages).toHaveBeenCalledWith({ workspaceId: 'ws1', pipelineId: 'pipe2' });
    expect(calls.dealList).toHaveBeenCalledWith({ workspaceId: 'ws1', pipelineId: 'pipe2' });
  });

  // Pre-multi-pipeline callers must keep sending the exact same request:
  // no `pipelineId: undefined` key, so the server's default-pipeline fallback
  // is what they get.
  it('keeps the single-argument signatures byte-identical', async () => {
    const { api, calls } = makeApi();

    await api.get('ws1');
    await api.getStages('ws1');
    await api.listDeals('ws1');

    expect(calls.pipelineGet).toHaveBeenCalledWith({ workspaceId: 'ws1' });
    expect(calls.pipelineGetStages).toHaveBeenCalledWith({ workspaceId: 'ws1' });
    expect(calls.dealList).toHaveBeenCalledWith({ workspaceId: 'ws1' });
    for (const call of [calls.pipelineGet, calls.pipelineGetStages, calls.dealList]) {
      expect(Object.keys(call.mock.calls[0]![0] as object)).toEqual(['workspaceId']);
    }
  });

  it('forwards pipelineId on createDeal', async () => {
    const { api, calls } = makeApi();

    await api.createDeal({ workspaceId: 'ws1', pipelineId: 'pipe2', stageId: 's1', title: 'Acme' });

    expect(calls.dealCreate).toHaveBeenCalledWith({
      workspaceId: 'ws1',
      pipelineId: 'pipe2',
      stageId: 's1',
      title: 'Acme',
    });
  });
});
