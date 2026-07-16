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

export interface TrpcClient {
  action: {
    getAll: { query: (input?: ActionInput) => Promise<unknown[]> };
    getKanbanActions: { query: (input?: KanbanInput) => Promise<unknown[]> };
    getToday: { query: (input?: TodayInput) => Promise<unknown[]> };
    getByDateRange: { query: (input: DateRangeInput) => Promise<unknown[]> };
    getProjectActions: { query: (input: { projectId: string; assigneeId?: string }) => Promise<unknown[]> };
    create: { mutate: (input: ActionCreateInput) => Promise<unknown> };
    update: { mutate: (input: ActionUpdateInput) => Promise<unknown> };
  };
  project: {
    getAll: { query: (input?: ProjectInput) => Promise<unknown[]> };
  };
  workspace: {
    list: { query: () => Promise<unknown[]> };
  };
  crmApi: {
    contactList: { query: (input: { workspaceId: string; search?: string; tags?: string[]; organizationId?: string; limit?: number; cursor?: string }) => Promise<unknown> };
    contactGet: { query: (input: { id: string; includeInteractions?: boolean }) => Promise<unknown> };
    contactCreate: { mutate: (input: { workspaceId: string; firstName?: string; lastName?: string; email?: string | null; phone?: string; linkedIn?: string; telegram?: string; twitter?: string; github?: string; bluesky?: string; about?: string; profileType?: string; skills?: string[]; tags?: string[]; organizationId?: string; organizationName?: string }) => Promise<unknown> };
    contactUpdate: { mutate: (input: { id: string; firstName?: string; lastName?: string; email?: string | null; phone?: string | null; linkedIn?: string | null; telegram?: string | null; twitter?: string | null; github?: string | null; bluesky?: string | null; about?: string; profileType?: string; skills?: string[]; tags?: string[]; organizationId?: string | null; organizationName?: string }) => Promise<unknown> };
    contactDelete: { mutate: (input: { id: string }) => Promise<unknown> };
    contactAddInteraction: { mutate: (input: { contactId: string; type: string; direction: string; subject?: string; notes?: string; metadata?: unknown }) => Promise<unknown> };
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
