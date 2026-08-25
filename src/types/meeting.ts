// Meeting types matching the Exponential API responses.
// A Meeting is a TranscriptionSession row: recorded/imported meetings
// (Fireflies etc.) and manually created ones. `notes` is the free-form
// meeting-notes field; `summary` is the AI-generated summary; and
// `transcription` is the raw transcript text.

export interface MeetingWorkspaceRef {
  id: string;
  name: string;
  slug: string;
}

export interface MeetingProjectRef {
  id: string;
  name: string;
  slug?: string;
}

export interface MeetingSourceIntegration {
  id: string;
  provider: string;
  name: string | null;
}

/** Attendee row from the calendar invite / manual entry, not transcript speakers. */
export interface MeetingParticipant {
  id: string;
  email: string;
  name: string | null;
  /** Present on `get` responses. */
  speakerLabel?: string | null;
  /** Present on `get` responses. */
  isHost?: boolean;
  userId?: string | null;
  contactId?: string | null;
}

export interface MeetingActionSummary {
  id: string;
  name: string;
  status: string;
  priority: string;
}

export interface Meeting {
  id: string;
  sessionId: string;
  title: string | null;
  description: string | null;
  /** Free-form meeting notes (Markdown). */
  notes: string | null;
  /** AI-generated summary. */
  summary: string | null;
  /** Raw transcript text — can be very large. */
  transcription: string | null;
  /** When the meeting actually occurred (createdAt is when the row landed). */
  meetingDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  userId: string | null;
  projectId: string | null;
  workspaceId: string | null;
  archivedAt: Date | null;
  durationSeconds?: number | null;
  participantCount?: number | null;
  videoUrl?: string | null;
  project?: MeetingProjectRef | null;
  /** Present on `get` responses. */
  workspace?: MeetingWorkspaceRef | null;
  sourceIntegration?: MeetingSourceIntegration | null;
  participants?: MeetingParticipant[];
  actions?: MeetingActionSummary[];
}
