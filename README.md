# Exponential SDK

The official TypeScript SDK for [Exponential](https://exponential.im) — the AI-powered alignment layer where your goals, your team, and your AI stay in sync.

Build integrations that connect daily work to meaningful outcomes. Manage workspaces, projects, and actions programmatically.

## Install

```bash
npm install exponential-sdk
```

## Quick Start

```typescript
import { ExponentialClient, saveConfig, loadConfig } from "exponential-sdk";

// Persist your credentials
saveConfig({
  apiUrl: "https://exponential.im",
  token: "your-bearer-token",
});

// Initialize the client
const config = loadConfig();
const client = new ExponentialClient({
  token: config.token,
  apiUrl: config.apiUrl,
});

// List your workspaces
const workspaces = await client.workspaces.list();

// Get today's actions
const today = await client.actions.getToday(workspaces[0].id);
```

## API Reference

### `ExponentialClient`

Create a client with your API token:

```typescript
const client = new ExponentialClient({
  token: "your-bearer-token",
  apiUrl: "https://exponential.im",
});
```

---

### Workspaces

```typescript
const workspaces = await client.workspaces.list();
```

Returns all workspaces you have access to.

---

### Projects

```typescript
// List all projects
const projects = await client.projects.list();

// Filter by workspace
const projects = await client.projects.list({
  workspaceId: "ws-123",
});

// Include nested actions
const projects = await client.projects.list({
  workspaceId: "ws-123",
  includeActions: true,
});
```

---

### Actions

Actions are the core work items in Exponential — tasks connected to outcomes that move the needle.

```typescript
// List active actions (excludes DONE & CANCELLED by default)
const actions = await client.actions.list();

// Filter by status, project, or assignee
const actions = await client.actions.list({
  status: "IN_PROGRESS",
  projectId: "proj-123",
  assigneeId: "user-456",
});

// Get today's actions for a workspace
const today = await client.actions.getToday("ws-123");

// Get actions within a date range
const upcoming = await client.actions.getByDateRange(
  new Date("2025-01-01"),
  new Date("2025-01-31"),
  "ws-123"
);

// Get actions by kanban status
const todo = await client.actions.getKanban({ status: "TODO" });

// Get all actions for a project
const projectActions = await client.actions.getProjectActions("proj-123");
```

#### Kanban Statuses

`BACKLOG` · `TODO` · `IN_PROGRESS` · `IN_REVIEW` · `DONE` · `CANCELLED`

#### Priorities

`Quick` · `Scheduled` · `1st Priority` · `2nd Priority` · `3rd Priority` · `4th Priority` · `5th Priority` · `Errand` · `Remember` · `Watch` · `Someday Maybe`

---

### Decisions

The workspace Decision Log (ADR-0060). **An open question is a decision with
status `OPEN`** — there is no separate model, and that is exactly what the
"Open questions" panel on a meeting page reads.

```typescript
// Log a decision from a meeting
await client.decisions.create({
  workspaceId: "ws-123",
  statement: "Ship the importer behind a flag",
  body: "## Context\n...\n## Consequences\n...",
  status: "ACCEPTED",
  source: "AGENT",
  transcriptionSessionId: "meeting-123",
  deciders: [{ name: "Ada", email: "ada@example.com" }],
});

// Log an open question from the same meeting
await client.decisions.create({
  workspaceId: "ws-123",
  statement: "Do we backfill historical rows?",
  status: "OPEN",
  transcriptionSessionId: "meeting-123",
});

// Both panels for one meeting, drafts included if you can edit it
const { decisions, canLogDecision } = await client.decisions.listForMeeting("meeting-123");

// The log, filtered
const open = await client.decisions.list({ workspaceId: "ws-123", statuses: ["OPEN"] });

// Answer an open question, then record what implemented it
await client.decisions.setStatus({ workspaceId: "ws-123", decisionId: "d1", status: "ACCEPTED" });
await client.decisions.linkTicket("ws-123", "d1", "ticket-123");
```

#### Statuses

`OPEN` (open question) · `PROPOSED` · `ACCEPTED` · `SUPERSEDED` · `DEPRECATED`

`SUPERSEDED` and `DEPRECATED` are reached through `setStatus`, never as a
birth state.

#### Sources

`MEETING` · `MANUAL` · `AGENT`

#### Evidence

Evidence turns are quotes from the meeting's transcript, and the server checks
them: the `turnIndex` must resolve to a real turn and the words must be that
turn's (compared loosely for case, punctuation and whitespace). Turns that
don't match are **dropped**, and `speaker`/`startTime` are replaced with the
transcript's own values. Evidence therefore requires `transcriptionSessionId`;
sending it without one is a `BAD_REQUEST`.

```typescript
// Let the server propose decisions from a meeting, for someone to review
const { draftCount, discardedWithoutEvidence } =
  await client.decisions.extractDrafts("meeting-123");
```

---

### Databases

Typed tables inside pages (ADR-0078). A database is a block in a page's body,
owned by that page; each row is a page of its own (body, comments, history,
URL) hidden from the Pages list. **Writes are typed**: every value is checked
against its property's type and a bad one is refused naming the property
(`error.data.property`). Reading the holding page with `pages.get` shows the
table; this API is for the writes and for reading rows as data.

```typescript
// Create a database on a page, then place its block by appending the marker
const page = await client.pages.get("page-123");
const metrics = await client.databases.create({ pageId: page.id, name: "Metrics" });
await client.pages.update({
  id: page.id,
  body: `${page.body}\n\n${metrics.marker}`,
  baseVersion: page.docVersion,
  note: "Add the Metrics database",
});

// Properties: title exists from creation; add the rest
await client.databases.addProperty({
  id: metrics.id,
  name: "Status",
  type: "select",
  options: [{ name: "Not measured" }, { name: "Instrumenting" }, { name: "Tracked" }],
});
await client.databases.addProperty({ id: metrics.id, name: "Owner", type: "person" });

// Rows: values by property name (or id); a select by option name
const row = await client.databases.createRow(
  metrics.id,
  { Name: "Alert latency", Status: "Tracked", Owner: "user-123" },
  { note: "Imported from the CLEAR page" },
);
await client.databases.updateRow(row.id, { Status: "Instrumenting" }, { note: "Re-measuring" });

// Read rows through the saved view, or through a view of your own
const { rows, nextCursor, columns } = await client.databases.listRows(metrics.id, {
  view: { filters: [{ propertyId: "Status", op: "eq", value: "Tracked" }], hiddenPropertyIds: [], propertyOrder: [] },
});
```

#### Property types

`title` · `text` · `number` · `select` · `multiSelect` · `date` · `checkbox` ·
`url` · `person` · `relation` (V3), plus read-only `createdTime` ·
`lastEditedTime` · `createdBy`. Property and option ids are stable: renaming
never rewrites a row. Stored values: `select` holds the option **id**,
`multiSelect` and `person` lists, `date` an ISO 8601 string.

#### Lifecycle

Removing the block from the page **detaches** the database (`detachedAt`);
its rows stay until `databases.delete`, the page's deletion, or the daily
purge 30 days later. Writing the marker back re-attaches it. Rows follow the
holding page for access, placement and publishing — `pages.move`,
`pages.publish` and sharing on a row page are refused.

---

### Configuration

Credentials are stored persistently using the OS keychain via [`conf`](https://github.com/sindresorhus/conf).

```typescript
import {
  saveConfig,
  loadConfig,
  clearConfig,
  isAuthenticated,
  getConfigPath,
} from "exponential-sdk";

saveConfig({
  apiUrl: "https://exponential.im",
  token: "your-bearer-token",
  defaultWorkspaceId: "ws-123",
  defaultWorkspaceSlug: "my-team",
});

if (isAuthenticated()) {
  const config = loadConfig();
  console.log(config.token);
}

// For multi-project setups, create isolated config stores
import { createConfigStore } from "exponential-sdk";

const store = createConfigStore({ projectName: "my-app" });
store.saveConfig({ apiUrl: "...", token: "..." });
```

---

### Error Handling

```typescript
import { isTRPCError } from "exponential-sdk";

try {
  const actions = await client.actions.list();
} catch (error) {
  if (isTRPCError(error)) {
    console.error("API error:", error.message);
  }
}
```

## Requirements

- Node.js >= 18.0.0

## License

MIT
