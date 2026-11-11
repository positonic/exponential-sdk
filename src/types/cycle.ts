// Cycle (sprint) types matching the Exponential API responses.
//
// Cycles are product-scoped: server-side they are `List` rows with
// `listType: "SPRINT"` and a `productId`. Each product runs its own cycle
// timeline, so one workspace can have several `ACTIVE` cycles at once — one
// per product. `productId: null` marks a legacy workspace-shared cycle from
// before product scoping; those are visible from every product. Tickets point
// at a cycle via `Ticket.cycleId`.
//
// Auto-numbering ("Cycle N") is per-product, so two products in one workspace
// can each have a cycle named "Cycle 9" — resolve cycles by slug or id where
// possible, and pass a product when resolving by name or asking for "current".
//
// The server reconciles statuses against the current date on every `list`
// call, so a freshly-fetched list is always up to date; there is no separate
// "current" endpoint to call.

export type CycleStatus = 'PLANNED' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';

export interface Cycle {
  id: string;
  workspaceId: string;
  /** Owning product; `null` for a legacy workspace-shared cycle. */
  productId: string | null;
  name: string;
  slug: string;
  description: string | null;
  status: CycleStatus;
  startDate: Date | null;
  endDate: Date | null;
  cycleGoal: string | null;
  achievements: string | null;
  displayOrder: number;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    tickets?: number;
    retrospectives?: number;
  };
}

export interface CycleDetail extends Cycle {
  tickets?: Array<{
    id: string;
    title: string;
    status: string;
    type: string;
    points: number | null;
    assignee?: {
      id: string;
      name: string | null;
      image: string | null;
    } | null;
  }>;
  retrospectives?: Array<{
    id: string;
    title: string;
    conductedAt: Date | null;
    createdAt: Date;
  }>;
  metrics?: unknown;
}
