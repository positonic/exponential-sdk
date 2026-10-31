import type { TrpcClient } from './client.js';
import type {
  CsvCommitResult,
  CsvMapping,
  CsvPreview,
  Database,
  DatabaseRow,
  DatabaseRowsPage,
  DatabaseView,
  DeletedDatabase,
  PillColor,
  PropertyDef,
  PropertyType,
} from './types/database.js';

export interface DatabaseCreateInput {
  /** The page whose body will hold the block; you need edit access to it. */
  pageId: string;
  name: string;
}

export interface DatabaseUpdateInput {
  id: string;
  name?: string;
  /** Replaces the saved view whole — send the full view, not a patch. */
  view?: DatabaseView;
}

/** A select option to add or keep. Pass `id` to rename or recolour an existing one. */
export interface SelectOptionInput {
  id?: string;
  name: string;
  /** Defaults to the next palette colour. */
  color?: PillColor;
}

/** Types a property can be added as or changed to: everything but `title` (one per database) and `relation` (V3). */
export type AddablePropertyType = Exclude<PropertyType, 'title' | 'relation'>;

export interface PropertyAddInput {
  /** The database. */
  id: string;
  name: string;
  type: AddablePropertyType;
  description?: string;
  /** `select` / `multiSelect` only. */
  options?: SelectOptionInput[];
}

export interface PropertyUpdateInput {
  /** The database. */
  id: string;
  /** The property, by id or by (unique, case-insensitive) name. */
  propertyId: string;
  name?: string;
  /** Null clears it. */
  description?: string | null;
  type?: AddablePropertyType;
  /**
   * The full option list: options left out are removed (rows keep the old
   * id, which then reads as its raw text). Options with an `id` keep it.
   */
  options?: SelectOptionInput[];
}

export interface RowListOptions {
  /**
   * A whole view to read through instead of the saved one — for example a
   * single filter. Every property it names must exist.
   */
  view?: DatabaseView;
  /** Rows per page (1–200, server default 50). */
  limit?: number;
  /** `nextCursor` from the previous page. */
  cursor?: string;
}

/**
 * Cell values to write, keyed by property **id or name** (the CLI's
 * `--set Status=Tracked` is a name). Each is checked against the property's
 * type: a select takes an option name or id, a multiSelect a list (or a
 * comma-separated string), a date an ISO string, a checkbox a boolean or
 * "yes"/"no", a person a user id or list of them. `null` clears a cell.
 * The title property's value becomes the row page's title.
 */
export type RowValuesInput = Record<string, unknown>;

export interface RowWriteOptions {
  /** Why — recorded on the row page's revision. Always send one from an agent. */
  note?: string;
}

export interface DatabasePropertyResult {
  property: PropertyDef;
  database: Database;
}

/**
 * Databases (ADR-0078): typed tables inside pages. The database is a block in
 * a page's body, owned by that page; each row is a page of its own, hidden
 * from the Pages list and reached through the database.
 *
 * **Writes are typed.** Values are checked against the property's type and a
 * bad one is refused naming the property (`error.data.property`). Reads of
 * the holding page (`pages.get`) show the table; this API is for the writes
 * and for reading rows as data. Values in responses are keyed by property id;
 * writes accept names too.
 *
 * Not a work tracker: a database may point at a Ticket, Project, Feature,
 * Goal, Key result or Page (relations, V3) but never stands in for one.
 */
export class DatabasesApi {
  constructor(private client: TrpcClient) {}

  /**
   * Create a database on a page with a title property. Then put its
   * `marker` into the page body (`pages.update` with the body plus the
   * marker on its own line) so the page shows it.
   */
  async create(input: DatabaseCreateInput): Promise<Database> {
    return await this.client.database.create.mutate(input) as Database;
  }

  /** One database: definition, view, row count and holding page. */
  async get(id: string): Promise<Database> {
    return await this.client.database.get.query({ id }) as Database;
  }

  /** The databases a page holds, detached ones included, with row counts. */
  async list(pageId: string): Promise<Database[]> {
    return await this.client.database.list.query({ pageId }) as Database[];
  }

  /** Rename, or replace the saved view whole. */
  async update(input: DatabaseUpdateInput): Promise<Database> {
    return await this.client.database.update.mutate(input) as Database;
  }

  /** Delete the database and every row with it. Removing the block from the page only detaches; this is the delete. */
  async delete(id: string): Promise<DeletedDatabase> {
    return await this.client.database.delete.mutate({ id }) as DeletedDatabase;
  }

  // ── Properties ─────────────────────────────────────────────────────────────

  /** Add a property. New select options get ids and palette colours; the column goes last in the view. */
  async addProperty(input: PropertyAddInput): Promise<DatabasePropertyResult> {
    return await this.client.database.addProperty.mutate(input) as DatabasePropertyResult;
  }

  /** Rename, describe, retype or re-option a property. Ids stay; no row is rewritten. */
  async updateProperty(input: PropertyUpdateInput): Promise<DatabasePropertyResult> {
    return await this.client.database.updateProperty.mutate(input) as DatabasePropertyResult;
  }

  /** Remove a property (by id or name) from the schema and view. Never the title. */
  async removeProperty(databaseId: string, propertyId: string): Promise<Database> {
    return await this.client.database.removeProperty.mutate({ id: databaseId, propertyId }) as Database;
  }

  /** Set the column order; `propertyIds` must name every property exactly once. */
  async reorderProperties(databaseId: string, propertyIds: string[]): Promise<Database> {
    return await this.client.database.reorderProperties.mutate({ id: databaseId, propertyIds }) as Database;
  }

  // ── Rows ───────────────────────────────────────────────────────────────────

  /** The rows through the saved view (or `options.view`), paged by cursor. */
  async listRows(databaseId: string, options: RowListOptions = {}): Promise<DatabaseRowsPage> {
    return await this.client.database.listRows.query({ id: databaseId, ...options }) as DatabaseRowsPage;
  }

  /** Add a row with typed values. Placed where the holding page is. */
  async createRow(
    databaseId: string,
    values: RowValuesInput = {},
    options: RowWriteOptions = {},
  ): Promise<DatabaseRow> {
    return await this.client.database.createRow.mutate({ id: databaseId, values, ...options }) as DatabaseRow;
  }

  /** Write some of a row's values; cells not named are kept, `null` clears one. Records a revision on the row page. */
  async updateRow(
    rowId: string,
    values: RowValuesInput,
    options: RowWriteOptions = {},
  ): Promise<DatabaseRow> {
    return await this.client.database.updateRow.mutate({ rowId, values, ...options }) as DatabaseRow;
  }

  /** Delete a row — the page and its search chunks. */
  async deleteRow(rowId: string): Promise<{ id: string; databaseId: string }> {
    return await this.client.database.deleteRow.mutate({ rowId }) as { id: string; databaseId: string };
  }

  // ── CSV import ─────────────────────────────────────────────────────────────

  /**
   * Type a CSV against the database before anything is created: columns
   * resolved through `mapping` (or suggested by header name), every row
   * checked, each cell that does not fit named. Writes nothing.
   */
  async previewCsv(databaseId: string, csv: string, mapping?: CsvMapping): Promise<CsvPreview> {
    return await this.client.database.previewCsv.query({ id: databaseId, csv, ...(mapping ? { mapping } : {}) }) as CsvPreview;
  }

  /**
   * Import a CSV: new columns become properties, then every row with no
   * cell error becomes a row with a `create` revision; the rest are reported
   * and left uncreated. Up to 2,000 rows a time.
   */
  async commitCsv(
    databaseId: string,
    csv: string,
    mapping: CsvMapping,
    options: RowWriteOptions = {},
  ): Promise<CsvCommitResult> {
    return await this.client.database.commitCsv.mutate({ id: databaseId, csv, mapping, ...options }) as CsvCommitResult;
  }
}
