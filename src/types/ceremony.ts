// Ceremony types matching the Exponential API responses (ADR-0059).
//
// A Ceremony is a recurring meeting definition in a workspace (Settings →
// Ceremonies): a name, a cadence (RFC 5545 RRULE evaluated in `timezone`), an
// owner, participants and an agenda template. Each scheduled instance is a
// CeremonyOccurrence — the page at `/w/<slug>/ceremonies/<ceremonyId>/<occurrenceId>`.
// Occurrences are pre-created for a rolling window, snapshot the definition
// when created, and carry the generated agenda, notes page and any recorded
// meetings that captured them.

export type CeremonyKind =
  | 'STANDUP'
  | 'PLANNING'
  | 'REVIEW'
  | 'RETROSPECTIVE'
  | 'PRIORITISATION'
  | 'ALL_HANDS'
  | 'ONE_ON_ONE'
  | 'CUSTOM';

/**
 * Where an occurrence is in its lifecycle. `SKIPPED` is only ever set by the
 * owner (with a reason) — an empty agenda offers a skip, it never takes one.
 */
export type CeremonyOccurrenceStatus =
  | 'PLANNED'
  | 'AGENDA_CIRCULATED'
  | 'IN_PROGRESS'
  | 'CAPTURED'
  | 'FOLLOWED_THROUGH'
  | 'SKIPPED';

export interface CeremonyUserRef {
  id: string;
  name: string | null;
  email: string | null;
  image?: string | null;
}

export interface CeremonyNamedRef {
  id: string;
  name: string;
  slug: string;
}

/** One section of a ceremony's agenda template, in running order. */
export interface CeremonyAgendaTemplateSection {
  key: string;
  /** A section type the agenda generator binds a query to (`blockers`, `carried_over`, `okr_review`, …). */
  type: string;
  title: string;
  minutes?: number;
  config?: Record<string, unknown>;
}

/** A row of `ceremonies.list` — the Settings → Ceremonies table. */
export interface CeremonySummary {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  /** Title patterns used to auto-attach recorded meetings and calendar events. */
  aliases: string[];
  kind: CeremonyKind;
  /** Icon key; null shows the kind's default. */
  icon: string | null;
  /** RRULE body, e.g. `FREQ=WEEKLY;BYDAY=MO;BYHOUR=10;BYMINUTE=0`. */
  cadenceRule: string;
  /** IANA zone the cadence is evaluated in. */
  timezone: string;
  startsOn: Date;
  durationMinutes: number;
  /** Hours before the start at which the agenda is generated and circulated. */
  leadTimeHours: number;
  isActive: boolean;
  ownerId: string;
  productId: string | null;
  teamId: string | null;
  includeProjects: boolean;
  projects: Array<{ projectId: string }>;
  owner: CeremonyUserRef;
  _count: { occurrences: number; participants: number };
}

/** A `ceremonies.listForProject` row: the summary plus the next planned occurrence. */
export interface ProjectCeremony extends CeremonySummary {
  /** Zero or one entry — the next non-skipped occurrence from now. */
  occurrences: Array<{
    id: string;
    scheduledStart: Date;
    status: CeremonyOccurrenceStatus;
  }>;
}

/**
 * A recorded meeting that captured an occurrence. Meetings the caller cannot
 * view (ADR-0014) come back as existence-only stubs: `visible: false` with
 * everything else null.
 */
export interface CeremonyRecordedMeeting {
  id: string;
  visible: boolean;
  title: string | null;
  meetingDate: Date | null;
  processedAt?: Date | null;
}

/** An occurrence row as listed inside `ceremonies.get`. */
export interface CeremonyOccurrenceRow {
  id: string;
  scheduledStart: Date;
  scheduledEnd: Date;
  status: CeremonyOccurrenceStatus;
  skipReason: string | null;
  agendaGeneratedAt: Date | null;
  agendaCirculatedAt: Date | null;
  /** The calendar booking for this occurrence, when the scheduling flow made one. */
  scheduledMeetingId: string | null;
  recordedMeetings: CeremonyRecordedMeeting[];
}

/** Full ceremony definition from `ceremonies.get`. */
export interface Ceremony {
  id: string;
  workspaceId: string;
  productId: string | null;
  teamId: string | null;
  name: string;
  slug: string;
  aliases: string[];
  kind: CeremonyKind;
  icon: string | null;
  /** Markdown. */
  purpose: string | null;
  /** Markdown — what this ceremony is explicitly not for. */
  notFor: string | null;
  /** Markdown — required inputs. */
  inputs: string | null;
  /** Markdown — expected outputs. */
  outputs: string | null;
  cadenceRule: string;
  timezone: string;
  startsOn: Date;
  durationMinutes: number;
  leadTimeHours: number;
  ownerId: string;
  agendaTemplate: CeremonyAgendaTemplateSection[];
  includeProjects: boolean;
  matrixRoomId: string | null;
  isActive: boolean;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  owner: CeremonyUserRef;
  product: CeremonyNamedRef | null;
  team: CeremonyNamedRef | null;
  projects: Array<{ projectId: string; project: CeremonyNamedRef }>;
  participants: Array<{
    id: string;
    ceremonyId: string;
    userId: string;
    user: CeremonyUserRef;
  }>;
  /**
   * Up to 30 upcoming (furthest first) then up to 50 past (most recent first)
   * — newest first overall.
   */
  occurrences: CeremonyOccurrenceRow[];
}

/** The bare ceremony row returned by `create` / `update`. */
export type CeremonyRecord = Omit<
  Ceremony,
  'owner' | 'product' | 'team' | 'projects' | 'participants' | 'occurrences'
>;

export interface CeremonyWriteResult {
  ceremony: CeremonyRecord;
  /** Occurrences created for the rolling window by this write. */
  occurrencesCreated: number;
}

/** A row of `ceremonies.listOccurrences` (ordered by start ascending, max 200). */
export interface CeremonyOccurrenceListRow {
  id: string;
  ceremonyId: string;
  scheduledStart: Date;
  scheduledEnd: Date;
  status: CeremonyOccurrenceStatus;
  ceremony: { id: string; name: string; kind: CeremonyKind };
}

export type CeremonyAgendaRefType =
  | 'action'
  | 'decision'
  | 'key_result'
  | 'goal'
  | 'ticket'
  | 'cycle'
  | 'meeting'
  | 'project'
  | 'text';

export interface CeremonyAgendaItem {
  /** Stable per occurrence: `<sectionKey>:<refType>:<refId>` for query items. */
  id: string;
  sectionKey: string;
  title: string;
  refType: CeremonyAgendaRefType;
  /** The underlying record's id; for `text` items, the item id itself. */
  refId: string;
  goalId?: number | null;
  keyResultId?: string | null;
  goalTitle?: string | null;
  keyResultTitle?: string | null;
  /** Set when carried from a previous occurrence's unresolved list. */
  carriedFromOccurrenceId?: string | null;
  carryCount?: number | null;
  /** Set when a person added the item by hand; those survive regeneration. */
  addedByUserId?: string | null;
  /** ISO timestamp; null/absent while unresolved. */
  resolvedAt?: string | null;
  order: number;
  detail?: string | null;
  /** App-relative link to the record. */
  href?: string | null;
}

export interface CeremonyAgendaSection {
  key: string;
  type: string;
  title: string;
  minutes?: number | null;
  items: CeremonyAgendaItem[];
  /** Why the section is empty, when its query ran and found nothing. */
  emptyReason?: string | null;
}

export interface CeremonyAgendaMatrixPost {
  roomId: string;
  serverId: string;
  eventId: string;
  postedAt: string;
  postedById: string | null;
}

/** The agenda snapshot stored on an occurrence (ISO strings, not Dates). */
export interface CeremonyAgenda {
  version: 1;
  generatedAt: string;
  sections: CeremonyAgendaSection[];
  /** Markdown narrative rendered from the sections. */
  narrative?: string | null;
  narratedAt?: string | null;
  matrixPosts?: CeremonyAgendaMatrixPost[];
}

/** Why an empty-agenda skip is (not) being offered to the owner. */
export interface CeremonySkipProposal {
  proposed: boolean;
  reason:
    | 'agenda-has-items'
    | 'blocker-flagged'
    | 'no-agenda-yet'
    | 'not-async'
    | 'already-resolved'
    | null;
}

/** One occurrence — the ceremony meeting page — from `ceremonies.getOccurrence`. */
export interface CeremonyOccurrence {
  id: string;
  ceremonyId: string;
  workspaceId: string;
  scheduledStart: Date;
  scheduledEnd: Date;
  status: CeremonyOccurrenceStatus;
  skipReason: string | null;
  /** The ceremony definition as it was when this occurrence was created. */
  definitionSnapshot: unknown;
  /** Null until an agenda has been generated. */
  agenda: CeremonyAgenda | null;
  agendaGeneratedAt: Date | null;
  agendaCirculatedAt: Date | null;
  scheduledMeetingId: string | null;
  previousOccurrenceId: string | null;
  /** The occurrence's notes canvas — a Knowledge Page, created with the agenda. */
  notesPageId: string | null;
  createdAt: Date;
  updatedAt: Date;
  ceremony: {
    id: string;
    name: string;
    kind: CeremonyKind;
    timezone: string;
    durationMinutes: number;
    leadTimeHours: number;
    ownerId: string;
    matrixRoomId: string | null;
    agendaTemplate: CeremonyAgendaTemplateSection[];
    owner: CeremonyUserRef;
  };
  recordedMeetings: CeremonyRecordedMeeting[];
  /** Whether the caller may generate, skip or post this occurrence's agenda. */
  canGenerate: boolean;
  skipProposal: CeremonySkipProposal;
}

/** A per-person async question (only STANDUP has them today). */
export interface CeremonyUpdateQuestion {
  key: string;
  prompt: string;
  placeholder: string;
  draftFrom: string[];
}

/** The caller's own async update for an occurrence. Answers are Markdown keyed by question key. */
export interface CeremonyMyUpdate {
  questions: CeremonyUpdateQuestion[];
  draftAnswers: Record<string, string>;
  answers: Record<string, string>;
  draftedAt: Date | null;
  submittedAt: Date | null;
  flaggedBlocker: boolean;
  /** Only on `myOccurrenceUpdate`. */
  isParticipant?: boolean;
}

export interface CeremonyParticipantUpdate {
  userId: string;
  name: string | null;
  email: string | null;
  image: string | null;
  answers: Record<string, string>;
  /** Null for participants who haven't submitted. */
  submittedAt: Date | null;
  flaggedBlocker: boolean;
}

/** Every participant's submitted update — the meeting, held in writing. */
export interface CeremonyUpdateSummary {
  questions: CeremonyUpdateQuestion[];
  participants: CeremonyParticipantUpdate[];
  submittedCount: number;
  blockedCount: number;
}

export interface CeremonyAgendaResult {
  occurrenceId: string;
  agenda: CeremonyAgenda;
}

export interface CeremonyGenerateAgendaResult extends CeremonyAgendaResult {
  itemCount: number;
  /** True when `circulate` was requested and participants were notified. */
  circulated: boolean;
}

export interface CeremonySkipResult {
  id: string;
  status: CeremonyOccurrenceStatus;
  skipReason: string | null;
}

export type CeremonyMatrixPostResult =
  | { kind: 'posted'; roomId: string; eventId: string }
  | { kind: 'no-room' }
  | { kind: 'no-agenda' }
  | { kind: 'already-posted'; roomId: string; postedAt: string }
  | { kind: 'no-server'; reason: string }
  | { kind: 'failed'; reason: string };

/** A built-in template for one ceremony kind ("Add from template"). */
export interface CeremonyTemplate {
  kind: CeremonyKind;
  name: string;
  slug: string;
  aliases: string[];
  purpose: string;
  notFor: string;
  inputs: string;
  outputs: string;
  cadenceRule: string;
  durationMinutes: number;
  leadTimeHours: number;
  agendaTemplate: CeremonyAgendaTemplateSection[];
}

export interface CeremonyImportResult {
  slug: string;
  action: 'created' | 'updated';
  occurrencesCreated: number;
  /** Owner / participant names that matched no workspace member. */
  unresolved: string[];
}

export interface CeremonyBackfillRow {
  meetingId: string;
  title: string | null;
  anchorDate: Date;
  occurrenceId: string | null;
  ceremonyName: string | null;
  scheduledStart: Date | null;
  reason: string;
}

export interface CeremonyBackfillResult {
  dryRun: boolean;
  occurrencesCreated: number;
  scanned: number;
  matched: number;
  rows: CeremonyBackfillRow[];
}

export interface CeremonyMeetingAttachment {
  meetingId: string;
  occurrenceId: string | null;
}
