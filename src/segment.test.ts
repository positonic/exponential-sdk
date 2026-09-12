import { describe, it, expect } from 'vitest';
import { segmentConversation } from './segment.js';

const t = (h: number, m: number, s = 0) => new Date(2026, 8, 11, h, m, s);
const u = (h: number, m: number, s = 0) => ({ at: t(h, m, s), role: 'user' as const });
const a = (h: number, m: number, s = 0) => ({ at: t(h, m, s), role: 'assistant' as const });

describe('segmentConversation', () => {
  it('one exchange is one segment from the first message to the last reply, rounded outward', () => {
    expect(segmentConversation([u(9, 22), a(9, 23, 30), u(9, 40), a(10, 28)])).toEqual([
      { start: t(9, 20), end: t(10, 30), humanTurns: 2 },
    ]);
  });

  it('a 30-minute gap between the person\'s messages does not split; 31 minutes does', () => {
    expect(segmentConversation([u(9, 0), a(9, 1), u(9, 30), a(9, 31)])).toHaveLength(1);
    const split = segmentConversation([u(9, 0), a(9, 1), u(9, 31), a(9, 32)]);
    expect(split).toEqual([
      { start: t(9, 0), end: t(9, 5), humanTurns: 1 },
      { start: t(9, 30), end: t(9, 35), humanTurns: 1 },
    ]);
  });

  it('the segment closes at the last reply before the gap, not at the next user message', () => {
    const [first] = segmentConversation([u(9, 0), a(9, 12), u(10, 0), a(10, 1)]);
    expect(first).toEqual({ start: t(9, 0), end: t(9, 15), humanTurns: 1 });
  });

  it('an assistant-only run longer than the gap becomes its own humanTurns: 0 segment', () => {
    const segments = segmentConversation([
      u(10, 0),
      a(10, 5),
      a(10, 20),
      a(10, 31), // the person has been quiet for 31 minutes: unattended from here
      a(11, 0),
      a(12, 0),
      u(12, 5),
      a(12, 6),
    ]);
    expect(segments).toEqual([
      { start: t(10, 0), end: t(10, 20), humanTurns: 1 },
      { start: t(10, 30), end: t(12, 0), humanTurns: 0 },
      { start: t(12, 5), end: t(12, 10), humanTurns: 1 },
    ]);
  });

  it('a short assistant tail beyond the gap is still the reply: the segment ends at it', () => {
    const segments = segmentConversation([u(10, 0), a(10, 5), a(10, 40), a(10, 50)]);
    expect(segments).toEqual([{ start: t(10, 0), end: t(10, 50), humanTurns: 1 }]);
  });

  it('a run with no human message at all is agent-run when it lasts longer than the gap', () => {
    expect(segmentConversation([a(2, 0), a(2, 20), a(2, 45)])).toEqual([
      { start: t(2, 0), end: t(2, 45), humanTurns: 0 },
    ]);
    expect(segmentConversation([a(2, 0), a(2, 20)])).toEqual([]);
  });

  it('accepts ISO strings, sorts out-of-order input, and honours a custom gap', () => {
    const segments = segmentConversation(
      [
        { at: '2026-09-11T09:20:00', role: 'assistant' },
        { at: '2026-09-11T09:00:00', role: 'user' },
        { at: '2026-09-11T09:30:00', role: 'user' },
      ],
      10,
    );
    expect(segments).toEqual([
      { start: t(9, 0), end: t(9, 20), humanTurns: 1 },
      { start: t(9, 30), end: t(9, 30), humanTurns: 1 },
    ]);
  });

  it('empty input → no segments', () => {
    expect(segmentConversation([])).toEqual([]);
  });
});
