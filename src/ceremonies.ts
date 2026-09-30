import type { TrpcClient } from './client.js';
import type {
  Ceremony,
  CeremonyAgendaResult,
  CeremonyAgendaTemplateSection,
  CeremonyBackfillResult,
  CeremonyGenerateAgendaResult,
  CeremonyImportResult,
  CeremonyKind,
  CeremonyMatrixPostResult,
  CeremonyMeetingAttachment,
  CeremonyMyUpdate,
  CeremonyOccurrence,
  CeremonyOccurrenceListRow,
  CeremonySkipResult,
  CeremonySummary,
  CeremonyTemplate,
  CeremonyUpdateSummary,
  CeremonyWriteResult,
  ProjectCeremony,
} from './types/ceremony.js';

/** Definition fields shared by create and update. */
interface CeremonyFields {
  /** Max 120 characters. */
  name: string;
  /** Unique per workspace; derived from `name` when omitted on create. */
  slug?: string;
  /** Title patterns that auto-attach recorded meetings (max 20). */
  aliases?: string[];
  /** Defaults to `CUSTOM`. Drives the default agenda and the async questions. */
  kind?: CeremonyKind;
  /** Icon key; null resets to the kind's default. */
  icon?: string | null;
  purpose?: string | null;
  notFor?: string | null;
  inputs?: string | null;
  outputs?: string | null;
  /** RRULE body, e.g. `FREQ=WEEKLY;BYDAY=MO;BYHOUR=10;BYMINUTE=0`. Validated server-side. */
  cadenceRule: string;
  /** IANA zone, e.g. `Europe/Madrid`. */
  timezone: string;
  /** Anchor date the cadence expands from. */
  startsOn: Date;
  /** 5-1440; defaults to 30. */
  durationMinutes?: number;
  /** 0-336; defaults to 24. */
  leadTimeHours?: number;
  /** Defaults to the caller on create. */
  ownerId?: string;
  productId?: string | null;
  teamId?: string | null;
  /** Projects in the same workspace. Replaces the whole set on update. */
  projectIds?: string[];
  /** Replaces the whole set on update. */
  participantUserIds?: string[];
  agendaTemplate?: CeremonyAgendaTemplateSection[];
  /** Append the linked-projects section to every agenda (default true). */
  includeProjects?: boolean;
  matrixRoomId?: string | null;
}

export interface CeremonyCreateInput extends CeremonyFields {
  workspaceId: string;
}

/**
 * Partial edit. Changing the cadence, zone, anchor or duration drops future
 * PLANNED occurrences that nothing is attached to and regenerates them.
 */
export interface CeremonyUpdateInput extends Partial<CeremonyFields> {
  workspaceId: string;
  id: string;
  /** false retires the ceremony; true re-activates it and refills its window. */
  isActive?: boolean;
}

export interface CeremonyListOccurrencesInput {
  workspaceId: string;
  from: Date;
  to: Date;
  ceremonyId?: string;
}

/** An import-file definition: the template shape keyed by slug, people by name or email. */
export interface CeremonyImportDefinition
  extends Partial<Omit<CeremonyFields, 'ownerId' | 'participantUserIds' | 'productId' | 'teamId' | 'projectIds' | 'slug'>> {
  slug: string;
  ownerName?: string;
  participantNames?: string[];
}

export interface CeremonyImportInput {
  workspaceId: string;
  /** 1-50 definitions. */
  definitions: CeremonyImportDefinition[];
  /** Default zone for definitions that carry none. */
  timezone?: string;
  /** Default anchor for definitions that carry none. */
  startsOn?: Date;
}

export interface CeremonySaveMyUpdateInput {
  workspaceId: string;
  occurrenceId: string;
  /** Markdown answers keyed by question key (`done`, `today`, `blockers` for a standup). */
  answers: Record<string, string>;
  flaggedBlocker?: boolean;
  /** true submits; false reopens a submitted update; omitted leaves it as is. */
  submit?: boolean;
}

export interface CeremonyAddAgendaItemInput {
  workspaceId: string;
  occurrenceId: string;
  /** The agenda section's `key`. */
  sectionKey: string;
  /** Max 300 characters. */
  title: string;
  /** Max 500 characters. */
  detail?: string | null;
}

/**
 * Ceremonies — recurring meeting definitions and their occurrences (ADR-0059).
 *
 * A ceremony is the definition listed at Settings → Ceremonies; an occurrence
 * is one scheduled instance of it, the page at
 * `/w/<slug>/ceremonies/<ceremonyId>/<occurrenceId>`. Decisions logged in an
 * occurrence live in {@link DecisionsApi} (`occurrenceId` on the decision).
 *
 * Reads need workspace `view`; writes need `edit`. Generating, skipping or
 * posting an agenda additionally needs to be the ceremony owner (or a
 * workspace owner/admin); import and backfill need `manage_members`.
 */
export class CeremoniesApi {
  constructor(private client: TrpcClient) {}

  /** Built-in templates, one per kind — the "Add from template" list. */
  async templates(): Promise<CeremonyTemplate[]> {
    return await this.client.ceremony.templates.query() as CeremonyTemplate[];
  }

  /** Ceremonies of a workspace, active first then by name. Inactive ones only on request. */
  async list(
    workspaceId: string,
    options: { includeInactive?: boolean } = {},
  ): Promise<CeremonySummary[]> {
    return await this.client.ceremony.list.query({
      workspaceId,
      ...(options.includeInactive ? { includeInactive: true } : {}),
    }) as CeremonySummary[];
  }

  /** Active ceremonies linked to a project, each with its next planned occurrence. */
  async listForProject(projectId: string): Promise<ProjectCeremony[]> {
    return await this.client.ceremony.listForProject.query({ projectId }) as ProjectCeremony[];
  }

  /** One ceremony with participants, projects and its recent + upcoming occurrences. */
  async get(workspaceId: string, id: string): Promise<Ceremony> {
    return await this.client.ceremony.get.query({ workspaceId, id }) as Ceremony;
  }

  /** Occurrences starting inside a window, across ceremonies or for one (max 200). */
  async listOccurrences(
    input: CeremonyListOccurrencesInput,
  ): Promise<CeremonyOccurrenceListRow[]> {
    return await this.client.ceremony.listOccurrences.query(input) as CeremonyOccurrenceListRow[];
  }

  /** One occurrence — the meeting page — with its agenda, ceremony and recordings. */
  async getOccurrence(
    workspaceId: string,
    occurrenceId: string,
  ): Promise<CeremonyOccurrence> {
    return await this.client.ceremony.getOccurrence.query({
      workspaceId,
      occurrenceId,
    }) as CeremonyOccurrence;
  }

  /** The caller's own async update for an occurrence. */
  async myUpdate(workspaceId: string, occurrenceId: string): Promise<CeremonyMyUpdate> {
    return await this.client.ceremony.myOccurrenceUpdate.query({
      workspaceId,
      occurrenceId,
    }) as CeremonyMyUpdate;
  }

  /** Every participant's submitted update, and who hasn't answered. */
  async updateSummary(
    workspaceId: string,
    occurrenceId: string,
  ): Promise<CeremonyUpdateSummary> {
    return await this.client.ceremony.occurrenceUpdateSummary.query({
      workspaceId,
      occurrenceId,
    }) as CeremonyUpdateSummary;
  }

  /** Draft the caller's answers from their activity since the previous occurrence. */
  async draftMyUpdate(workspaceId: string, occurrenceId: string): Promise<CeremonyMyUpdate> {
    return await this.client.ceremony.draftMyOccurrenceUpdate.mutate({
      workspaceId,
      occurrenceId,
    }) as CeremonyMyUpdate;
  }

  /** Save, submit or reopen the caller's own answers. */
  async saveMyUpdate(input: CeremonySaveMyUpdateInput): Promise<CeremonyMyUpdate> {
    return await this.client.ceremony.saveMyOccurrenceUpdate.mutate(input) as CeremonyMyUpdate;
  }

  /** Generate or regenerate an occurrence's agenda; `circulate` also notifies participants. */
  async generateAgenda(
    workspaceId: string,
    occurrenceId: string,
    options: { circulate?: boolean } = {},
  ): Promise<CeremonyGenerateAgendaResult> {
    return await this.client.ceremony.generateAgenda.mutate({
      workspaceId,
      occurrenceId,
      ...(options.circulate ? { circulate: true } : {}),
    }) as CeremonyGenerateAgendaResult;
  }

  /** Skip an occurrence with a reason (1-500 characters). Participants are told. */
  async skipOccurrence(
    workspaceId: string,
    occurrenceId: string,
    reason: string,
  ): Promise<CeremonySkipResult> {
    return await this.client.ceremony.skipOccurrence.mutate({
      workspaceId,
      occurrenceId,
      reason,
    }) as CeremonySkipResult;
  }

  async unskipOccurrence(
    workspaceId: string,
    occurrenceId: string,
  ): Promise<CeremonySkipResult> {
    return await this.client.ceremony.unskipOccurrence.mutate({
      workspaceId,
      occurrenceId,
    }) as CeremonySkipResult;
  }

  /** Mark an agenda item resolved, or reopen it. Survives regeneration. */
  async resolveAgendaItem(
    workspaceId: string,
    occurrenceId: string,
    itemId: string,
    resolved = true,
  ): Promise<CeremonyAgendaResult> {
    return await this.client.ceremony.resolveAgendaItem.mutate({
      workspaceId,
      occurrenceId,
      itemId,
      resolved,
    }) as CeremonyAgendaResult;
  }

  /** Add an item by hand to an agenda section; kept across regeneration. */
  async addAgendaItem(input: CeremonyAddAgendaItemInput): Promise<CeremonyAgendaResult> {
    return await this.client.ceremony.addAgendaItem.mutate(input) as CeremonyAgendaResult;
  }

  /** Reorder one section's items; the order is kept across regeneration. */
  async reorderAgendaItems(
    workspaceId: string,
    occurrenceId: string,
    sectionKey: string,
    itemIds: string[],
  ): Promise<CeremonyAgendaResult> {
    return await this.client.ceremony.reorderAgendaItems.mutate({
      workspaceId,
      occurrenceId,
      sectionKey,
      itemIds,
    }) as CeremonyAgendaResult;
  }

  /** Post the agenda to the ceremony's Matrix room. A repost needs `confirmRepost`. */
  async postAgendaToMatrix(
    workspaceId: string,
    occurrenceId: string,
    options: { confirmRepost?: boolean } = {},
  ): Promise<CeremonyMatrixPostResult> {
    return await this.client.ceremony.postAgendaToMatrix.mutate({
      workspaceId,
      occurrenceId,
      ...(options.confirmRepost ? { confirmRepost: true } : {}),
    }) as CeremonyMatrixPostResult;
  }

  /** Create a ceremony and its first occurrences for the rolling window. */
  async create(input: CeremonyCreateInput): Promise<CeremonyWriteResult> {
    return await this.client.ceremony.create.mutate(input) as CeremonyWriteResult;
  }

  async update(input: CeremonyUpdateInput): Promise<CeremonyWriteResult> {
    return await this.client.ceremony.update.mutate(input) as CeremonyWriteResult;
  }

  /** Upsert definitions by slug. Keys a definition omits are left untouched. */
  async importDefinitions(input: CeremonyImportInput): Promise<CeremonyImportResult[]> {
    return await this.client.ceremony.importDefinitions.mutate(input) as CeremonyImportResult[];
  }

  /**
   * Attach unattached recordings to occurrences by alias. Defaults to a dry
   * run — the report is the review step; pass `dryRun: false` to write.
   */
  async backfillAttachments(
    workspaceId: string,
    options: { dryRun?: boolean } = {},
  ): Promise<CeremonyBackfillResult> {
    return await this.client.ceremony.backfillAttachments.mutate({
      workspaceId,
      dryRun: options.dryRun ?? true,
    }) as CeremonyBackfillResult;
  }

  /** Link a recorded meeting to the occurrence it captured (same workspace). */
  async attachMeeting(
    meetingId: string,
    occurrenceId: string,
  ): Promise<CeremonyMeetingAttachment> {
    return await this.client.ceremony.attachMeeting.mutate({
      meetingId,
      occurrenceId,
    }) as CeremonyMeetingAttachment;
  }

  async detachMeeting(meetingId: string): Promise<CeremonyMeetingAttachment> {
    return await this.client.ceremony.detachMeeting.mutate({
      meetingId,
    }) as CeremonyMeetingAttachment;
  }
}
