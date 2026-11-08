/**
 * Positions (ADR-0068): the roles & responsibilities of a workspace — "who
 * does what", for humans and agents alike. Shown on the workspace settings
 * page. Routing data only: a Position never grants or restricts access;
 * the member's workspace role does that.
 */

/** Someone who holds a Position. Always a member of the workspace. */
export interface PositionHolder {
  userId: string;
  name: string | null;
  image: string | null;
  isAgent: boolean;
}

export interface Position {
  id: string;
  /** 1–80 characters, unique per workspace (case-sensitive). */
  title: string;
  /** Markdown, 1–2000 characters: the kinds of work its holders take on. */
  remit: string;
  /** Markdown, up to 2000 characters. */
  notAccountableFor: string | null;
  holders: PositionHolder[];
}

/** One row per workspace member, from `positions.list()`. */
export interface PositionMemberCoverage {
  userId: string;
  /** Ids of the Positions this member holds. */
  positionIds: string[];
  /** True when the member has no stated remit (no Position, and no agent description). */
  remitGap: boolean;
}

export interface PositionList {
  positions: Position[];
  members: PositionMemberCoverage[];
}

export interface PositionCoverage {
  /** Whether the chat would offer "Import roles & responsibilities". */
  offerImport: boolean;
  memberCount: number;
  eligibleCount: number;
  coveredCount: number;
}

/** One row of an import result, in input order. */
export interface PositionImportResult {
  title: string;
  outcome: 'create' | 'update';
  /** The value after the import. */
  notAccountableFor: string | null;
  /** Every holder after the import. */
  holderUserIds: string[];
}

export interface PositionImportOutput {
  /** False for a dry run. */
  written: boolean;
  results: PositionImportResult[];
}
