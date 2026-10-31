// Database types matching the Exponential API responses (ADR-0078).
// A Database is a typed set of Rows inside a Page: a schema of Properties and
// one saved table view, owned by the page that holds its block. Rows are pages
// (`KnowledgePage` with `databaseId`), so a row has a URL, a body, comments and
// history of its own — and access, placement and publishing follow the holding
// page.

export type PropertyType =
  | 'title'
  | 'text'
  | 'number'
  | 'select'
  | 'multiSelect'
  | 'date'
  | 'checkbox'
  | 'url'
  | 'person'
  | 'relation'
  | 'createdTime'
  | 'lastEditedTime'
  | 'createdBy';

/** Select-option colours are palette names, never hex. */
export type PillColor =
  | 'gray'
  | 'red'
  | 'pink'
  | 'grape'
  | 'violet'
  | 'indigo'
  | 'blue'
  | 'cyan'
  | 'teal'
  | 'green'
  | 'lime'
  | 'yellow'
  | 'orange';

export type RelationTargetKind =
  | 'ROW'
  | 'TICKET'
  | 'PROJECT'
  | 'FEATURE'
  | 'GOAL'
  | 'KEY_RESULT'
  | 'PAGE';

export interface SelectOption {
  /** Stable: a renamed option keeps its id, so rows never need rewriting. */
  id: string;
  name: string;
  color: PillColor;
}

export interface RelationConfig {
  targetKind: RelationTargetKind;
  /** The other database, for `ROW` targets. */
  targetDatabaseId?: string;
  /** Set on the auto-created reverse column of a two-way database relation. */
  inverseOf?: { databaseId: string; propertyId: string };
  many: boolean;
}

/** One column of a database. Ids are stable; names are free to change. */
export interface PropertyDef {
  id: string;
  name: string;
  type: PropertyType;
  description?: string;
  /** `select` / `multiSelect` only. */
  options?: SelectOption[];
  /** `relation` only (written from V3). */
  relation?: RelationConfig;
}

export type FilterOp =
  | 'eq'
  | 'neq'
  | 'contains'
  | 'isEmpty'
  | 'isNotEmpty'
  | 'gt'
  | 'lt'
  | 'before'
  | 'after'
  | 'anyOf';

export interface DatabaseFilter {
  propertyId: string;
  op: FilterOp;
  /**
   * Checked against the property like a written value: a select may be
   * named by option name or id; `anyOf` takes a list (or a comma-separated
   * string); `gt`/`lt` a number; `before`/`after` an ISO date.
   */
  value?: unknown;
}

/** The one table view saved on the block: sort, filters, hidden columns, column order. */
export interface DatabaseView {
  sort?: { propertyId: string; direction: 'asc' | 'desc' };
  filters: DatabaseFilter[];
  hiddenPropertyIds: string[];
  /** Column order by property id; properties missing here follow in definition order. */
  propertyOrder: string[];
}

export interface Database {
  id: string;
  /** The page whose body holds the block, and which decides access to every row. */
  pageId: string;
  workspaceId: string;
  name: string;
  properties: PropertyDef[];
  view: DatabaseView;
  /** The id of the `title` property; its value is each row page's title. */
  titlePropertyId: string;
  /**
   * Set while the block is out of the page body. A detached database keeps
   * its rows until it is deleted, its page is deleted, or the daily purge
   * takes it after 30 days; writing its marker back into the body re-attaches it.
   */
  detachedAt: Date | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  page: { id: string; title: string };
  /**
   * The marker line that stands for the block in the page's Markdown body:
   * `<!-- database:<id> -->`. Append it to the body (through `pages.update`)
   * to place a database you created; reads expand it into the table.
   */
  marker?: string;
  /** Present on `get` and `list`. */
  rowCount?: number;
}

/**
 * A stored cell value: `title`/`text`/`url` a string, `number` a number,
 * `select` an option id, `multiSelect` option ids, `date` an ISO 8601 string,
 * `checkbox` a boolean, `person` user ids.
 */
export type PropertyValue = string | number | boolean | string[];

/** A row: a page of the database with its typed values keyed by property id. */
export interface DatabaseRow {
  id: string;
  /** The title property's value — the row page's title. */
  title: string;
  databaseId: string | null;
  /** Values keyed by **property id** (not name); the title is not among them. */
  values: Record<string, PropertyValue | null>;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DatabaseRowsPage {
  rows: DatabaseRow[];
  /** Pass back as `cursor` for the next page; null on the last one. */
  nextCursor: string | null;
  /** The visible property ids in view order. Rows still carry hidden values. */
  columns: string[];
}

/**
 * Why a write was refused: the property it names and the reason, in plain
 * words. Arrives as `error.data.property` on a `BAD_REQUEST`.
 */
export interface PropertyRejection {
  /** Null when the write named a property that does not exist. */
  propertyId: string | null;
  propertyName: string;
  reason: string;
}

export interface DeletedDatabase {
  id: string;
  /** Rows deleted with it. */
  rowCount: number;
}
