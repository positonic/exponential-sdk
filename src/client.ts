import { createTRPCClient, httpBatchLink, TRPCClientError } from '@trpc/client';
import superjson from 'superjson';

type ActionInput = {
  assigneeId?: string;
};

type KanbanInput = {
  projectId?: string;
  assigneeId?: string;
  kanbanStatus?: 'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'CANCELLED';
};

type TodayInput = {
  workspaceId?: string;
};

type DateRangeInput = {
  startDate: Date;
  endDate: Date;
  workspaceId?: string;
};

type ProjectInput = {
  include?: {
    actions?: boolean;
  };
  workspaceId?: string;
};

type ActionStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'DELETED' | 'DRAFT';
type ActionKanbanStatus = 'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'CANCELLED';
type ActionPriority = 'Quick' | 'Scheduled' | '1st Priority' | '2nd Priority' | '3rd Priority' | '4th Priority' | '5th Priority' | 'Errand' | 'Remember' | 'Watch' | 'Someday Maybe';

type ActionCreateInput = {
  name: string;
  description?: string;
  projectId?: string;
  workspaceId?: string;
  dueDate?: Date;
  scheduledStart?: Date;
  scheduledEnd?: Date;
  duration?: number;
  priority?: ActionPriority;
  status?: ActionStatus;
  epicId?: string;
  effortEstimate?: number;
  blockedByIds?: string[];
};

type ActionUpdateInput = {
  id: string;
  name?: string;
  description?: string;
  projectId?: string;
  workspaceId?: string | null;
  dueDate?: Date | null;
  scheduledStart?: Date | null;
  scheduledEnd?: Date | null;
  duration?: number | null;
  priority?: ActionPriority;
  status?: ActionStatus;
  kanbanStatus?: ActionKanbanStatus;
  epicId?: string | null;
  effortEstimate?: number | null;
  blockedByIds?: string[];
};

// ── Goals (objectives) and key results ──────────────────────────────────────
// Objectives are `Goal` rows with INTEGER ids; key results are `KeyResult` rows
// with cuid ids. `period` is a free-form string ("Q3-2026", "Annual-2026").

type GoalStatusInput = 'planned' | 'active' | 'completed' | 'archived';
/** Reads and `updateGoalStatus` also accept `on-hold`; `updateGoal` does not. */
type GoalQueryStatusInput = GoalStatusInput | 'on-hold';

type GoalCreateProcedureInput = {
  title: string;
  description?: string;
  whyThisGoal?: string;
  notes?: string;
  dueDate?: Date;
  period?: string;
  status?: GoalStatusInput;
  lifeDomainId?: number;
  projectId?: string;
  outcomeIds?: string[];
  driUserId?: string;
  workspaceId?: string;
  parentGoalId?: number;
  icon?: string | null;
  iconColor?: string | null;
};

type GoalUpdateProcedureInput = {
  id: number;
  title?: string;
  description?: string | null;
  whyThisGoal?: string | null;
  notes?: string | null;
  dueDate?: Date | null;
  period?: string | null;
  status?: GoalStatusInput;
  lifeDomainId?: number | null;
  projectId?: string | null;
  projectIds?: string[];
  outcomeIds?: string[];
  driUserId?: string | null;
  workspaceId?: string | null;
  parentGoalId?: number | null;
  displayOrder?: number;
  icon?: string | null;
  iconColor?: string | null;
};

type KeyResultStatusInput =
  | 'not-started'
  | 'on-track'
  | 'at-risk'
  | 'off-track'
  | 'achieved';

type KeyResultUnitInput = 'percent' | 'count' | 'currency' | 'hours' | 'custom';

type KeyResultCreateProcedureInput = {
  goalId: number;
  title: string;
  description?: string;
  targetValue: number;
  startValue?: number;
  currentValue?: number;
  unit?: KeyResultUnitInput;
  unitLabel?: string;
  period: string;
  periodStart?: Date;
  periodEnd?: Date;
  driUserId?: string;
  workspaceId?: string;
};

type KeyResultUpdateProcedureInput = {
  id: string;
  title?: string;
  description?: string;
  targetValue?: number;
  currentValue?: number;
  startValue?: number;
  unit?: KeyResultUnitInput;
  unitLabel?: string;
  status?: KeyResultStatusInput;
  confidence?: number;
  driUserId?: string;
  goalId?: number;
};

type CalendarProviderInput = 'google' | 'microsoft';

type CalendarAccountSelectorInput = {
  provider?: CalendarProviderInput;
  accountId?: string;
};

type CalendarCreateEventPayload = {
  summary: string;
  description?: string;
  start: { dateTime: string; timeZone?: string };
  end: { dateTime: string; timeZone?: string };
  attendees?: Array<{ email: string }>;
  conferenceData?: {
    createRequest: {
      requestId: string;
      conferenceSolutionKey: { type: 'hangoutsMeet' };
    };
  };
  calendarId?: string;
  provider?: CalendarProviderInput;
};

export interface TrpcClient {
  calendar: {
    getAllConnectionStatuses: { query: () => Promise<unknown> };
    getCalendarAccounts: { query: () => Promise<unknown> };
    getEventsMultiCalendar: {
      query: (input: {
        timeMin?: Date;
        timeMax?: Date;
        maxResults?: number;
      }) => Promise<unknown[]>;
    };
    listCalendars: {
      query: (input?: CalendarAccountSelectorInput) => Promise<unknown[]>;
    };
    getCalendarPreferences: {
      query: (input?: CalendarAccountSelectorInput) => Promise<unknown>;
    };
    updateSelectedCalendars: {
      mutate: (
        input: CalendarAccountSelectorInput & { calendarIds: string[] },
      ) => Promise<unknown>;
    };
    syncCalendarList: {
      mutate: (input?: CalendarAccountSelectorInput) => Promise<unknown>;
    };
    createEvent: { mutate: (input: CalendarCreateEventPayload) => Promise<unknown> };
    disconnect: { mutate: (input?: CalendarAccountSelectorInput) => Promise<unknown> };
  };
  search: {
    global: {
      query: (input: { query: string; workspaceId?: string; limit?: number }) => Promise<unknown>;
    };
  };
  action: {
    getAll: { query: (input?: ActionInput) => Promise<unknown[]> };
    getKanbanActions: { query: (input?: KanbanInput) => Promise<unknown[]> };
    getToday: { query: (input?: TodayInput) => Promise<unknown[]> };
    getTodaysActions: { query: (input?: TodayInput) => Promise<unknown> };
    getOverdueTriage: { query: (input?: TodayInput) => Promise<unknown> };
    getByDateRange: { query: (input: DateRangeInput) => Promise<unknown[]> };
    getProjectActions: { query: (input: { projectId: string; assigneeId?: string }) => Promise<unknown[]> };
    create: { mutate: (input: ActionCreateInput) => Promise<unknown> };
    update: { mutate: (input: ActionUpdateInput) => Promise<unknown> };
    bulkReschedule: { mutate: (input: { actionIds: string[]; dueDate: Date | null }) => Promise<unknown> };
    bulkDefer: { mutate: (input: { actionIds: string[] }) => Promise<unknown> };
  };
  project: {
    getAll: { query: (input?: ProjectInput) => Promise<unknown[]> };
  };
  workspace: {
    list: { query: () => Promise<unknown[]> };
    listMembers: { query: (input: { workspaceId: string }) => Promise<unknown[]> };
  };
  goal: {
    getById: { query: (input: { id: number }) => Promise<unknown> };
    getAllMyGoals: {
      query: (input?: {
        workspaceId?: string;
        period?: string;
        status?: GoalQueryStatusInput;
      }) => Promise<unknown[]>;
    };
    getGoalTree: {
      query: (input?: {
        workspaceId?: string;
        status?: GoalQueryStatusInput;
      }) => Promise<unknown[]>;
    };
    getProjectGoals: { query: (input: { projectId: string }) => Promise<unknown[]> };
    createGoal: { mutate: (input: GoalCreateProcedureInput) => Promise<unknown> };
    /**
     * Partial update — only the keys present are written, and an explicit null
     * clears. Every nullable field is therefore `T | null | undefined`.
     */
    updateGoal: { mutate: (input: GoalUpdateProcedureInput) => Promise<unknown> };
    /** Status-only write; the only path that accepts `on-hold`. */
    updateGoalStatus: {
      mutate: (input: { id: number; status: GoalQueryStatusInput }) => Promise<unknown>;
    };
    /** Single-column re-parent; validates no-self / no-cycle / depth-5. */
    setParent: {
      mutate: (input: { id: number; parentGoalId: number | null }) => Promise<unknown>;
    };
    deleteGoal: { mutate: (input: { id: number }) => Promise<unknown> };
  };
  // Mounted at `okr`, but this is the KEY RESULT router — objectives live on
  // `goal` above. Key results are cuid-keyed; the `goalId` linking them to an
  // objective is an integer.
  okr: {
    getAll: {
      query: (input?: {
        workspaceId?: string;
        goalId?: number;
        period?: string;
        status?: KeyResultStatusInput;
        onlyMine?: boolean;
      }) => Promise<unknown[]>;
    };
    getByObjective: {
      query: (input: {
        workspaceId?: string;
        period?: string;
        includePairedPeriod?: boolean;
        onlyMine?: boolean;
      }) => Promise<unknown[]>;
    };
    getById: { query: (input: { id: string }) => Promise<unknown> };
    getByIds: { query: (input: { ids: string[] }) => Promise<unknown[]> };
    create: { mutate: (input: KeyResultCreateProcedureInput) => Promise<unknown> };
    update: { mutate: (input: KeyResultUpdateProcedureInput) => Promise<unknown> };
    checkIn: {
      mutate: (input: {
        keyResultId: string;
        newValue: number;
        notes?: string;
      }) => Promise<unknown>;
    };
    delete: { mutate: (input: { id: string }) => Promise<unknown> };
    linkProject: {
      mutate: (input: { keyResultId: string; projectId: string }) => Promise<unknown>;
    };
    unlinkProject: {
      mutate: (input: { keyResultId: string; projectId: string }) => Promise<unknown>;
    };
    linkFeature: {
      mutate: (input: { keyResultId: string; featureId: string }) => Promise<unknown>;
    };
    unlinkFeature: {
      mutate: (input: { keyResultId: string; featureId: string }) => Promise<unknown>;
    };
    getPeriods: { query: () => Promise<unknown[]> };
    getStats: {
      query: (input: { workspaceId?: string; period?: string }) => Promise<unknown>;
    };
  };
  goalComment: {
    getComments: { query: (input: { goalId: number }) => Promise<unknown[]> };
    addComment: { mutate: (input: { goalId: number; content: string; parentUpdateId?: string }) => Promise<unknown> };
    updateComment: { mutate: (input: { commentId: string; content: string }) => Promise<unknown> };
    deleteComment: { mutate: (input: { commentId: string }) => Promise<unknown> };
  };
  pageComment: {
    list: { query: (input: { pageId: string }) => Promise<unknown[]> };
    create: { mutate: (input: { pageId: string; body: string }) => Promise<unknown> };
    update: { mutate: (input: { commentId: string; body: string }) => Promise<unknown> };
    delete: { mutate: (input: { commentId: string }) => Promise<unknown> };
  };
  crmApi: {
    contactList: { query: (input: { workspaceId: string; search?: string; tags?: string[]; organizationId?: string; limit?: number; cursor?: string }) => Promise<unknown> };
    contactGet: { query: (input: { id: string; includeInteractions?: boolean }) => Promise<unknown> };
    contactCreate: { mutate: (input: { workspaceId: string; firstName?: string; lastName?: string; email?: string | null; phone?: string; linkedIn?: string; telegram?: string; twitter?: string; github?: string; bluesky?: string; about?: string; profileType?: string; skills?: string[]; tags?: string[]; organizationId?: string; organizationName?: string }) => Promise<unknown> };
    contactUpdate: { mutate: (input: { id: string; firstName?: string; lastName?: string; email?: string | null; phone?: string | null; linkedIn?: string | null; telegram?: string | null; twitter?: string | null; github?: string | null; bluesky?: string | null; about?: string; profileType?: string; skills?: string[]; tags?: string[]; organizationId?: string | null; organizationName?: string }) => Promise<unknown> };
    contactDelete: { mutate: (input: { id: string }) => Promise<unknown> };
    contactAddInteraction: { mutate: (input: { contactId: string; type: string; direction: string; subject?: string; notes?: string; metadata?: unknown; occurredAt?: Date | string }) => Promise<unknown> };
    contactEnrich: { mutate: (input: { contactId: string }) => Promise<unknown> };
    organizationList: { query: (input: { workspaceId: string; search?: string; industry?: string; limit?: number; cursor?: string }) => Promise<unknown> };
    organizationGet: { query: (input: { id: string }) => Promise<unknown> };
    organizationCreate: { mutate: (input: { workspaceId: string; name: string; websiteUrl?: string | null; logoUrl?: string | null; description?: string; industry?: string; size?: string }) => Promise<unknown> };
    pipelineGet: { query: (input: { workspaceId: string }) => Promise<unknown> };
    pipelineGetStages: { query: (input: { workspaceId: string }) => Promise<unknown[]> };
    dealList: { query: (input: { workspaceId: string }) => Promise<unknown[]> };
    dealGet: { query: (input: { id: string }) => Promise<unknown> };
    dealCreate: { mutate: (input: { workspaceId: string; stageId: string; title: string; description?: string; value?: number; currency?: string; probability?: number; expectedCloseDate?: Date; contactId?: string; organizationId?: string; assignedToId?: string }) => Promise<unknown> };
    dealUpdate: { mutate: (input: { id: string; title?: string; description?: string | null; value?: number | null; currency?: string; probability?: number | null; expectedCloseDate?: Date | null; contactId?: string | null; organizationId?: string | null; assignedToId?: string | null }) => Promise<unknown> };
    dealMove: { mutate: (input: { id: string; stageId: string; stageOrder: number }) => Promise<unknown> };
    dealDelete: { mutate: (input: { id: string }) => Promise<unknown> };
  };
  actionComment: {
    getComments: { query: (input: { actionId: string }) => Promise<unknown[]> };
    addComment: { mutate: (input: { actionId: string; content: string }) => Promise<unknown> };
    updateComment: { mutate: (input: { commentId: string; content: string }) => Promise<unknown> };
    deleteComment: { mutate: (input: { commentId: string }) => Promise<unknown> };
  };
  page: {
    list: { query: (input: { workspaceId: string; projectId?: string; search?: string }) => Promise<unknown[]> };
    get: { query: (input: { id: string }) => Promise<unknown> };
    create: { mutate: (input: { workspaceId: string; projectId?: string | null; title?: string; body?: string; includeInSearch?: boolean }) => Promise<unknown> };
    update: { mutate: (input: { id: string; title?: string; projectId?: string | null; includeInSearch?: boolean; body?: string }) => Promise<unknown> };
  };
  epic: {
    list: { query: (input: { workspaceId: string; status?: 'OPEN' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED' }) => Promise<unknown[]> };
    getById: { query: (input: { id: string }) => Promise<unknown> };
    create: { mutate: (input: { workspaceId: string; name: string; description?: string; priority?: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE'; startDate?: Date; targetDate?: Date }) => Promise<unknown> };
    update: { mutate: (input: { id: string; name?: string; description?: string | null; status?: 'OPEN' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED'; priority?: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE'; startDate?: Date | null; targetDate?: Date | null }) => Promise<unknown> };
    delete: { mutate: (input: { id: string }) => Promise<unknown> };
  };
  tag: {
    list: { query: (input?: { workspaceId?: string; category?: string | null }) => Promise<unknown> };
    create: { mutate: (input: { workspaceId: string; name: string; color: string; description?: string; category?: string | null }) => Promise<unknown> };
    setEntityTags: { mutate: (input: { entityType: 'action' | 'ticket' | 'feature' | 'epic'; entityId: string; tagIds: string[] }) => Promise<unknown> };
    listForEntity: { query: (input: { entityType: 'action' | 'ticket' | 'feature' | 'epic'; entityId: string }) => Promise<unknown[]> };
  };
  product: {
    product: {
      list: { query: (input: { workspaceId: string }) => Promise<unknown[]> };
      getById: { query: (input: { id: string }) => Promise<unknown> };
      getBySlug: { query: (input: { workspaceId: string; slug: string }) => Promise<unknown> };
      create: { mutate: (input: { workspaceId: string; name: string; slug: string; description?: string; icon?: string; color?: string }) => Promise<unknown> };
      update: { mutate: (input: { id: string; name?: string; description?: string; icon?: string; color?: string; funTicketIds?: boolean }) => Promise<unknown> };
      delete: { mutate: (input: { id: string }) => Promise<unknown> };
    };
    featureComment: {
      list: { query: (input: { featureId: string }) => Promise<unknown[]> };
      create: { mutate: (input: { featureId: string; scopeId?: string; threadId?: string; body: string; quotedText?: string }) => Promise<unknown> };
      reply: { mutate: (input: { parentId: string; body: string }) => Promise<unknown> };
      update: { mutate: (input: { commentId: string; body: string }) => Promise<unknown> };
      delete: { mutate: (input: { commentId: string }) => Promise<unknown> };
      resolve: { mutate: (input: { featureId: string; threadId: string }) => Promise<unknown> };
      unresolve: { mutate: (input: { featureId: string; threadId: string }) => Promise<unknown> };
    };
    feature: {
      list: { query: (input: { productId: string; status?: 'IDEA' | 'DEFINED' | 'IN_PROGRESS' | 'SHIPPED' | 'DEPRECATED' | 'ARCHIVED' }) => Promise<unknown[]> };
      getById: { query: (input: { id: string }) => Promise<unknown> };
      create: { mutate: (input: { productId: string; name: string; description?: string; vision?: string; status?: 'IDEA' | 'DEFINED' | 'IN_PROGRESS' | 'SHIPPED' | 'DEPRECATED' | 'ARCHIVED'; effort?: number; priority?: number; goalId?: number; areaId?: string }) => Promise<unknown> };
      update: { mutate: (input: { id: string; name?: string; description?: string; vision?: string; status?: 'IDEA' | 'DEFINED' | 'IN_PROGRESS' | 'SHIPPED' | 'DEPRECATED' | 'ARCHIVED'; effort?: number; priority?: number; goalId?: number | null; areaId?: string | null }) => Promise<unknown> };
      delete: { mutate: (input: { id: string }) => Promise<unknown> };
      addUserStory: { mutate: (input: { featureId: string; scopeId?: string; asA?: string; iWant?: string; soThat?: string; acceptanceCriteria?: string }) => Promise<unknown> };
      updateUserStory: { mutate: (input: { id: string; scopeId?: string | null; asA?: string; iWant?: string; soThat?: string; acceptanceCriteria?: string }) => Promise<unknown> };
      deleteUserStory: { mutate: (input: { id: string }) => Promise<unknown> };
      addScope: { mutate: (input: { featureId: string; version: string; description: string; status?: 'PLANNED' | 'IN_PROGRESS' | 'SHIPPED' | 'DEPRECATED'; shippedAt?: Date }) => Promise<unknown> };
      updateScope: { mutate: (input: { id: string; version?: string; description?: string; status?: 'PLANNED' | 'IN_PROGRESS' | 'SHIPPED' | 'DEPRECATED'; shippedAt?: Date | null; displayOrder?: number }) => Promise<unknown> };
      deleteScope: { mutate: (input: { id: string }) => Promise<unknown> };
      addRequirement: { mutate: (input: { featureId: string; scopeId?: string; statement: string; kind?: 'FUNCTIONAL' | 'NON_FUNCTIONAL' | 'CONSTRAINT' }) => Promise<unknown> };
      setRequirementChecked: { mutate: (input: { id: string; checked: boolean }) => Promise<unknown> };
      deleteRequirement: { mutate: (input: { id: string }) => Promise<unknown> };
      linkPage: { mutate: (input: { featureId: string; pageId: string; scopeId?: string }) => Promise<unknown> };
      unlinkPage: { mutate: (input: { featureId: string; pageId: string }) => Promise<unknown> };
      listAreas: { query: (input: { productId: string }) => Promise<unknown[]> };
      createArea: { mutate: (input: { productId: string; name: string; description?: string }) => Promise<unknown> };
    };
    cycle: {
      list: { query: (input: { workspaceId: string; status?: 'PLANNED' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED'; autoCreate?: boolean }) => Promise<unknown[]> };
      getById: { query: (input: { id: string }) => Promise<unknown> };
      create: { mutate: (input: { workspaceId: string; name?: string; slug?: string; description?: string; startDate?: Date; endDate?: Date; cycleGoal?: string }) => Promise<unknown> };
      update: { mutate: (input: { id: string; name?: string; description?: string | null; status?: 'PLANNED' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED'; startDate?: Date | null; endDate?: Date | null; cycleGoal?: string | null; achievements?: string | null }) => Promise<unknown> };
      delete: { mutate: (input: { id: string }) => Promise<unknown> };
    };
    ticket: {
      list: { query: (input: { productId?: string; status?: string; type?: string; featureId?: string; epicId?: string; cycleId?: string; assigneeId?: string; prUrl?: string; branchName?: string }) => Promise<unknown[]> };
      getById: { query: (input: { id: string }) => Promise<unknown> };
      create: { mutate: (input: { productId: string; title: string; body?: string; type?: string; status?: string; priority?: number; points?: number; branchName?: string; prUrl?: string; designUrl?: string; specUrl?: string; links?: Record<string, string>; epicId?: string; featureId?: string; cycleId?: string; scopeId?: string; assigneeId?: string; templateId?: string }) => Promise<unknown> };
      update: { mutate: (input: { id: string; title?: string; body?: string; type?: string; status?: string; priority?: number | null; points?: number | null; branchName?: string | null; prUrl?: string | null; designUrl?: string | null; specUrl?: string | null; links?: Record<string, string> | null; epicId?: string | null; featureId?: string | null; cycleId?: string | null; scopeId?: string | null; assigneeId?: string | null }) => Promise<unknown> };
      delete: { mutate: (input: { id: string }) => Promise<unknown> };
      search: { query: (input: { productId: string; query?: string; excludeTicketId?: string; limit?: number }) => Promise<unknown[]> };
      addDependency: { mutate: (input: { ticketId: string; dependsOnId: string }) => Promise<unknown> };
      removeDependency: { mutate: (input: { ticketId: string; dependsOnId: string }) => Promise<unknown> };
      addComment: { mutate: (input: { ticketId: string; content: string }) => Promise<unknown> };
      updateComment: { mutate: (input: { id: string; content: string }) => Promise<unknown> };
      deleteComment: { mutate: (input: { id: string }) => Promise<unknown> };
      linkAction: { mutate: (input: { ticketId: string; actionId: string }) => Promise<unknown> };
      unlinkAction: { mutate: (input: { actionId: string }) => Promise<unknown> };
    };
  };
}

export function createClient(config: { token: string; apiUrl: string }): TrpcClient {
  const apiUrl = config.apiUrl.replace(/\/+$/, '');

  return createTRPCClient<any>({
    links: [
      httpBatchLink({
        url: `${apiUrl}/api/trpc`,
        headers() {
          return {
            Authorization: `Bearer ${config.token}`,
          };
        },
        transformer: superjson,
      }),
    ],
  }) as unknown as TrpcClient;
}

export function isTRPCError(error: unknown): error is TRPCClientError<any> {
  return error instanceof TRPCClientError;
}

export { TRPCClientError };
