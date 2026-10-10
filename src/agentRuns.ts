import type { TrpcClient } from './client.js';

/**
 * Agent runs — the local runner's side of an Assistant run (Exponential
 * ADR-0067, "Local runner (V2) procedures" in dev-docs/AGENT_RUNS.md).
 *
 * An Assistant whose executor is LOCAL_CLI is never run by the hosted
 * dispatcher: a process on its owner's machine claims the run with the
 * Assistant's `exp_agent_` key, does the work with the owner's own tools,
 * streams what it did as events, and finishes. Every method needs an
 * **agent-key** client (a personal token or a run token is FORBIDDEN), and
 * every run is resolved through the key's own agent — a run id alone never
 * reaches another agent's work.
 */

export type AgentRunStatus =
  | 'QUEUED'
  | 'RUNNING'
  | 'WAITING_ON_OWNER'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'CANCELLED'
  | 'TIMED_OUT';

export type RunnerEventKind = 'status' | 'tool_call' | 'tool_result' | 'text' | 'log' | 'error';

/** One line of a run's transcript. The runner numbers `seq` itself, from 1, monotonically. */
export interface RunnerEvent {
  seq: number;
  kind: RunnerEventKind;
  payload: Record<string, unknown>;
}

/** A chat-shaped message the runner feeds to its CLI: the persona, then the brief. */
export interface RunMessage {
  role: 'system' | 'user';
  content: string;
}

/** What `claim` hands the runner: the run, the action, the owner, and the exact persona + brief the hosted executor would use. */
export interface ClaimedRun {
  id: string;
  actionId: string;
  predecessorId: string | null;
  claimedBy: string | null;
  startedAt: Date | string | null;
  action: {
    id: string;
    name: string;
    description: string | null;
    workspaceId: string | null;
    project: { id: string; name: string } | null;
  };
  owner: { id: string; name: string | null };
  messages: RunMessage[];
}

export interface HeartbeatResult {
  /** false — the run left RUNNING (a cancel): stop now. */
  ok: boolean;
  lastEventAt: Date | string | null;
}

export interface AppendEventsResult {
  /** Rows actually inserted; a retried batch inserts only the seqs not yet stored. */
  inserted: number;
  newToolCalls: number;
  toolCallCount: number;
}

export type FinishInput =
  | {
      status: 'SUCCEEDED';
      /** Public: the requester, the owner and their teammates read it. */
      summary?: string;
      readyToClose?: boolean;
      usage?: Record<string, unknown>;
    }
  | { status: 'FAILED'; error?: string; summary?: string; usage?: Record<string, unknown> }
  | {
      status: 'WAITING_ON_OWNER';
      /** Required: the app posts it as a comment mentioning the owner and parks the run. */
      question: string;
      summary?: string;
      usage?: Record<string, unknown>;
    };

export interface FinishResult {
  /** false — a cancel landed first; nothing was posted. */
  finished: boolean;
  status: AgentRunStatus;
  /** The ask-owner comment, for WAITING_ON_OWNER. */
  commentId?: string | null;
}

export class AgentRunsApi {
  constructor(private client: TrpcClient) {}

  /**
   * Claim the oldest queued LOCAL_CLI run of this key's Assistant, or null when
   * nothing is queued. `runnerId` names this machine/process; it is recorded on
   * the run and checked by the other calls.
   */
  async claim(runnerId: string): Promise<ClaimedRun | null> {
    return (await this.client.agentRun.claim.mutate({ runnerId })) as ClaimedRun | null;
  }

  /** Keep the run alive while a step is slow (the app times out a silent run after 5 minutes). */
  async heartbeat(runId: string, runnerId?: string): Promise<HeartbeatResult> {
    return (await this.client.agentRun.heartbeat.mutate({ runId, runnerId })) as HeartbeatResult;
  }

  /**
   * Append transcript events (1–200 per call). Idempotent on `seq`, so a batch
   * may be retried after a network error without duplicating lines.
   */
  async appendEvents(runId: string, events: RunnerEvent[], runnerId?: string): Promise<AppendEventsResult> {
    return (await this.client.agentRun.appendEvents.mutate({ runId, runnerId, events })) as AppendEventsResult;
  }

  /** End the run: succeeded, failed, or waiting on the owner's answer to `question`. */
  async finish(runId: string, input: FinishInput, runnerId?: string): Promise<FinishResult> {
    return (await this.client.agentRun.finish.mutate({ runId, runnerId, ...input })) as FinishResult;
  }
}
