import type { TrpcClient } from './client.js';
import type { Meeting } from './types/meeting.js';

export type MeetingTypeFilter =
  | 'all'
  | 'mine'
  | 'one_on_one'
  | 'customer'
  | 'internal';

export interface MeetingListOptions {
  workspaceId?: string;
  includeArchived?: boolean;
  /**
   * - `mine`: caller owns the meeting or is a participant
   * - `one_on_one`: exactly two participants
   * - `customer` / `internal`: always empty until meeting tagging ships
   */
  meetingType?: MeetingTypeFilter;
}

/** A member (userId), an existing CRM contact (contactId), or a name/email. */
export interface MeetingParticipantInput {
  userId?: string;
  contactId?: string;
  email?: string;
  name?: string;
}

export interface MeetingCreateInput {
  title: string;
  /** Raw transcript text — required by the server, min 1 character. */
  transcription: string;
  description?: string;
  notes?: string;
  meetingDate?: Date;
  /** A project-linked meeting inherits its project's workspace. */
  projectId?: string;
  workspaceId?: string;
  participants?: MeetingParticipantInput[];
}

export interface MeetingUpdateInput {
  id: string;
  title?: string;
  description?: string;
  notes?: string;
  summary?: string;
  transcription?: string;
  meetingDate?: Date | null;
  workspaceId?: string | null;
}

/**
 * Meetings (transcription sessions): recorded/imported meetings and manually
 * created ones, each carrying `notes`, an AI `summary`, and the raw
 * `transcription`.
 */
export class MeetingsApi {
  constructor(private client: TrpcClient) {}

  /**
   * List meetings visible to the caller (owner, participant, project access,
   * or workspace membership). Rows include full `notes`/`summary`/
   * `transcription` bodies, so expect large payloads.
   */
  async list(options: MeetingListOptions = {}): Promise<Meeting[]> {
    return await this.client.transcription.getAllTranscriptions.query(
      options,
    ) as Meeting[];
  }

  async get(id: string): Promise<Meeting> {
    return await this.client.transcription.getById.query({ id }) as Meeting;
  }

  async create(input: MeetingCreateInput): Promise<Meeting> {
    return await this.client.transcription.createManualTranscription.mutate(
      input,
    ) as Meeting;
  }

  /**
   * Partial update — only the keys present are written. The server splits
   * title from the other fields, so a title change is a second mutation.
   */
  async update(input: MeetingUpdateInput): Promise<Meeting> {
    const { id, title, ...details } = input;
    const hasDetails = Object.values(details).some((v) => v !== undefined);
    if (title === undefined && !hasDetails) {
      throw new Error('MeetingsApi.update: nothing to update');
    }

    let result: Meeting | undefined;
    if (title !== undefined) {
      result = await this.client.transcription.updateTitle.mutate({
        id,
        title,
      }) as Meeting;
    }
    if (hasDetails) {
      result = await this.client.transcription.updateDetails.mutate({
        id,
        ...details,
      }) as Meeting;
    }
    return result!;
  }

  /** The meeting-notes body alone (null when none have been written). */
  async getNotes(id: string): Promise<string | null> {
    const meeting = await this.get(id);
    return meeting.notes ?? null;
  }

  /** Replace the meeting's notes. */
  async setNotes(id: string, notes: string): Promise<Meeting> {
    return await this.update({ id, notes });
  }

  /**
   * Permanently delete one meeting. Owner-only: the server answers
   * NOT_FOUND for a missing id and FORBIDDEN for a meeting you don't own.
   * Linked actions survive (their meeting link is nulled).
   */
  async delete(id: string): Promise<{ success: boolean }> {
    return await this.client.transcription.deleteTranscription.mutate({
      id,
    }) as { success: boolean };
  }

  /**
   * Permanently delete meetings in bulk. Scoped to meetings the caller
   * owns — ids that are missing or owned by someone else are silently
   * skipped, so compare `count` against the ids you sent.
   */
  async deleteMany(ids: string[]): Promise<{ count: number }> {
    return await this.client.transcription.bulkDeleteTranscriptions.mutate({
      ids,
    }) as { count: number };
  }

  /**
   * Append a block to the meeting's notes (separated by a blank line),
   * creating them if none exist. Read-modify-write, not atomic.
   */
  async appendNotes(id: string, text: string): Promise<Meeting> {
    const existing = await this.getNotes(id);
    const notes = existing?.trim()
      ? `${existing.replace(/\s+$/, '')}\n\n${text}`
      : text;
    return await this.update({ id, notes });
  }
}
