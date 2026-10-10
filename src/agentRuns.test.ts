import { describe, it, expect, vi } from 'vitest';
import { AgentRunsApi } from './agentRuns.js';
import type { TrpcClient } from './client.js';

function makeApi() {
  const calls = {
    claim: vi.fn().mockResolvedValue(null),
    heartbeat: vi.fn().mockResolvedValue({ ok: true, lastEventAt: null }),
    appendEvents: vi.fn().mockResolvedValue({ inserted: 1, newToolCalls: 1, toolCallCount: 1 }),
    finish: vi.fn().mockResolvedValue({ finished: true, status: 'SUCCEEDED' }),
  };
  const client = {
    agentRun: {
      claim: { mutate: calls.claim },
      heartbeat: { mutate: calls.heartbeat },
      appendEvents: { mutate: calls.appendEvents },
      finish: { mutate: calls.finish },
    },
  } as unknown as TrpcClient;
  return { api: new AgentRunsApi(client), calls };
}

describe('AgentRunsApi', () => {
  it('claim passes the runner id and surfaces null when nothing is queued', async () => {
    const { api, calls } = makeApi();
    expect(await api.claim('james-mbp')).toBeNull();
    expect(calls.claim).toHaveBeenCalledWith({ runnerId: 'james-mbp' });
  });

  it('heartbeat and appendEvents carry runId, runnerId and the events as given', async () => {
    const { api, calls } = makeApi();
    await api.heartbeat('run-1', 'james-mbp');
    expect(calls.heartbeat).toHaveBeenCalledWith({ runId: 'run-1', runnerId: 'james-mbp' });

    const events = [{ seq: 1, kind: 'tool_call' as const, payload: { tool: 'Read' } }];
    await api.appendEvents('run-1', events, 'james-mbp');
    expect(calls.appendEvents).toHaveBeenCalledWith({ runId: 'run-1', runnerId: 'james-mbp', events });
  });

  it('finish spreads the outcome: succeeded, failed, waiting on owner with the question', async () => {
    const { api, calls } = makeApi();
    await api.finish('run-1', { status: 'SUCCEEDED', summary: 'Done.', readyToClose: true }, 'james-mbp');
    expect(calls.finish).toHaveBeenLastCalledWith({
      runId: 'run-1', runnerId: 'james-mbp', status: 'SUCCEEDED', summary: 'Done.', readyToClose: true,
    });
    await api.finish('run-1', { status: 'FAILED', error: 'boom' });
    expect(calls.finish).toHaveBeenLastCalledWith({ runId: 'run-1', runnerId: undefined, status: 'FAILED', error: 'boom' });
    await api.finish('run-1', { status: 'WAITING_ON_OWNER', question: '12 or 19 Nov?' });
    expect(calls.finish).toHaveBeenLastCalledWith({
      runId: 'run-1', runnerId: undefined, status: 'WAITING_ON_OWNER', question: '12 or 19 Nov?',
    });
  });
});
