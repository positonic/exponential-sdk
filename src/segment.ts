/**
 * Worklog segments (CONTEXT.md "Worklog segment"): cut a conversation into
 * the stretches of a person's attention it actually held. Pure — it lives in
 * the SDK because the Daily worklog that needs it runs outside the app
 * (decision 2026-09-12).
 */

export interface ConversationMessage {
  at: Date | string;
  role: 'user' | 'assistant';
}

export interface WorklogSegment {
  start: Date;
  end: Date;
  /** Number of the person's messages inside. `0` marks an Agent-run stretch. */
  humanTurns: number;
}

/** Silence between the person's messages that ends a segment. */
export const DEFAULT_GAP_MINUTES = 30;
/** Segment bounds are rounded outward to this grain. */
export const ROUND_MINUTES = 5;

function roundDown(ms: number): Date {
  const grain = ROUND_MINUTES * 60_000;
  return new Date(Math.floor(ms / grain) * grain);
}

function roundUp(ms: number): Date {
  const grain = ROUND_MINUTES * 60_000;
  return new Date(Math.ceil(ms / grain) * grain);
}

/**
 * Rules:
 *  - a segment opens at a user message and, as long as the person keeps
 *    replying within `gapMinutes` of their previous message, runs to the
 *    last reply before the next gap (CONTEXT.md: "starts at the person's
 *    first message and ends at the last reply");
 *  - the exception is unattended work: once the assistant has been talking
 *    alone for longer than `gapMinutes` since the person's last message, the
 *    rest of that run — when it lasts longer than `gapMinutes` itself — is
 *    a separate segment with `humanTurns: 0`, and the person's segment ends
 *    at the last message inside the window. A shorter tail is just the reply
 *    and stays in the person's segment — but only when it starts within
 *    `gapMinutes` of the window closing (two gaps after the person's last
 *    message). A short burst that comes later, e.g. the assistant speaking
 *    just before the person resumes days afterwards, belongs to no segment;
 *  - an agent-run ends at a silence longer than two gaps: whatever the
 *    assistant says after it starts a new candidate run, so a Monitor ticking
 *    every few hours is not one unbroken stretch. A shorter silence is a long
 *    tool call inside the run;
 *  - every segment is rounded outward to 5 minutes.
 */
export function segmentConversation(
  messages: ConversationMessage[],
  gapMinutes = DEFAULT_GAP_MINUTES,
): WorklogSegment[] {
  const gapMs = gapMinutes * 60_000;
  const sorted = messages
    .map((m) => ({ at: new Date(m.at).getTime(), role: m.role }))
    .filter((m) => !Number.isNaN(m.at))
    .sort((a, b) => a.at - b.at);

  const out: WorklogSegment[] = [];
  let seg: { start: number; end: number; humanTurns: number; lastUserAt: number } | null = null;
  // Assistant messages beyond the person's window: a candidate agent-run.
  let run: { start: number; end: number } | null = null;

  const closeSegment = () => {
    if (seg) out.push({ start: roundDown(seg.start), end: roundUp(seg.end), humanTurns: seg.humanTurns });
    seg = null;
  };
  const resolveRun = () => {
    if (!run) return;
    if (run.end - run.start > gapMs) {
      closeSegment();
      out.push({ start: roundDown(run.start), end: roundUp(run.end), humanTurns: 0 });
    } else if (seg && run.start - seg.lastUserAt <= 2 * gapMs) {
      seg.end = Math.max(seg.end, run.end);
    }
    run = null;
  };

  for (const m of sorted) {
    if (m.role === 'user') {
      resolveRun();
      if (seg && m.at - seg.lastUserAt > gapMs) closeSegment();
      if (!seg) seg = { start: m.at, end: m.at, humanTurns: 0, lastUserAt: m.at };
      seg.end = Math.max(seg.end, m.at);
      seg.lastUserAt = m.at;
      seg.humanTurns += 1;
      continue;
    }
    if (run) {
      if (m.at - run.end > 2 * gapMs) {
        resolveRun();
        run = { start: m.at, end: m.at };
      } else {
        run.end = m.at;
      }
    } else if (!seg || m.at - seg.lastUserAt > gapMs) {
      run = { start: m.at, end: m.at };
    } else {
      seg.end = Math.max(seg.end, m.at);
    }
  }
  resolveRun();
  closeSegment();
  return out;
}
