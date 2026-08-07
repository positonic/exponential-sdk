import { createClient, isTRPCError, TRPCClientError, type TrpcClient } from './client.js';
import { ActionsApi } from './actions.js';
import { CalendarApi } from './calendar.js';
import { ActionCommentsApi } from './actionComments.js';
import { FeatureCommentsApi } from './featureComments.js';
import { PageCommentsApi } from './pageComments.js';
import { GoalCommentsApi } from './goalComments.js';
import { GoalsApi } from './goals.js';
import { KeyResultsApi } from './keyResults.js';
import { ProjectsApi } from './projects.js';
import { WorkspacesApi } from './workspaces.js';
import { ContactsApi } from './contacts.js';
import { OrganizationsApi } from './organizations.js';
import { PipelinesApi } from './pipelines.js';
import { TicketsApi } from './tickets.js';
import { ProductsApi } from './products.js';
import { FeaturesApi } from './features.js';
import { UserStoriesApi } from './userStories.js';
import { EpicsApi } from './epics.js';
import { CyclesApi } from './cycles.js';
import { LabelsApi } from './labels.js';
import { AreasApi } from './areas.js';
import { PagesApi } from './pages.js';
import { RequirementsApi } from './requirements.js';
import { ScopesApi } from './scopes.js';
import { SearchApi } from './search.js';

export class ExponentialClient {
  private client: TrpcClient;
  actions: ActionsApi;
  calendar: CalendarApi;
  actionComments: ActionCommentsApi;
  featureComments: FeatureCommentsApi;
  pageComments: PageCommentsApi;
  goalComments: GoalCommentsApi;
  goals: GoalsApi;
  /** Same instance as `goals.keyResults`. */
  keyResults: KeyResultsApi;
  projects: ProjectsApi;
  workspaces: WorkspacesApi;
  contacts: ContactsApi;
  organizations: OrganizationsApi;
  pipelines: PipelinesApi;
  tickets: TicketsApi;
  products: ProductsApi;
  features: FeaturesApi;
  userStories: UserStoriesApi;
  epics: EpicsApi;
  cycles: CyclesApi;
  labels: LabelsApi;
  areas: AreasApi;
  pages: PagesApi;
  requirements: RequirementsApi;
  scopes: ScopesApi;
  search: SearchApi;

  constructor(private config: { token: string; apiUrl: string }) {
    this.client = createClient(this.config);
    this.actions = new ActionsApi(this.client);
    this.calendar = new CalendarApi(this.client);
    this.actionComments = new ActionCommentsApi(this.client);
    this.featureComments = new FeatureCommentsApi(this.client);
    this.pageComments = new PageCommentsApi(this.client);
    this.goalComments = new GoalCommentsApi(this.client);
    this.keyResults = new KeyResultsApi(this.client);
    this.goals = new GoalsApi(this.client, this.keyResults);
    this.projects = new ProjectsApi(this.client);
    this.workspaces = new WorkspacesApi(this.client);
    this.contacts = new ContactsApi(this.client);
    this.organizations = new OrganizationsApi(this.client);
    this.pipelines = new PipelinesApi(this.client);
    this.tickets = new TicketsApi(this.client);
    this.products = new ProductsApi(this.client);
    this.features = new FeaturesApi(this.client);
    this.userStories = new UserStoriesApi(this.client);
    this.epics = new EpicsApi(this.client);
    this.cycles = new CyclesApi(this.client);
    this.labels = new LabelsApi(this.client);
    this.areas = new AreasApi(this.client);
    this.pages = new PagesApi(this.client);
    this.requirements = new RequirementsApi(this.client);
    this.scopes = new ScopesApi(this.client);
    this.search = new SearchApi(this.client);
  }
}

export {
  createConfigStore,
  loadConfig,
  saveConfig,
  clearConfig,
  isAuthenticated,
  getConfigPath,
} from './config.js';

export type { ExponentialConfig } from './config.js';
export type {
  Action,
  ActionOutput,
  ActionsListOutput,
  KanbanStatus,
  Priority,
} from './types/action.js';
export type {
  ActionCreateInput,
  ActionUpdateInput,
  ActionStatus,
  TodaysActions,
  TodaysActionsGroup,
  TodaysActionRow,
  OverdueTriage,
  OverdueCohort,
  OverdueTriageRow,
} from './actions.js';
export type {
  CalendarAccount,
  CalendarConnectionStatus,
  CalendarConnectionStatuses,
  CalendarEvent,
  CalendarEventAttendee,
  CalendarEventTime,
  CalendarEventWithSource,
  CalendarInfo,
  CalendarPreferences,
  CalendarProviderName,
  CreatedCalendarEvent,
} from './types/calendar.js';
export type {
  CalendarAccountSelector,
  CalendarCreateEventInput,
  CalendarListEventsOptions,
  CalendarSelectCalendarsInput,
} from './calendar.js';
export { CALENDAR_MAX_RESULTS, CALENDAR_MAX_SELECTED } from './calendar.js';
export type { Project, ProjectOutput, ProjectsListOutput } from './types/project.js';
export type {
  Workspace,
  WorkspaceMember,
  WorkspaceOutput,
  WorkspacesListOutput,
} from './types/workspace.js';
export type {
  Contact,
  ContactInteraction,
  ContactListOutput,
  InteractionType,
  InteractionDirection,
} from './types/contact.js';
export type {
  ContactCreateInput,
  ContactUpdateInput,
  AddInteractionInput,
  ContactsListOptions,
  EnrichContactResult,
} from './contacts.js';
export type {
  Organization,
  OrganizationListOutput,
  OrganizationSize,
} from './types/organization.js';
export type {
  OrganizationCreateInput,
  OrganizationsListOptions,
} from './organizations.js';
export type {
  Pipeline,
  PipelineStage,
  Deal,
  DealActivity,
} from './types/pipeline.js';
export type {
  DealCreateInput,
  DealUpdateInput,
  DealMoveInput,
} from './pipelines.js';
export type {
  ActionComment,
  TicketComment,
  FeatureComment,
  PageComment,
  GoalComment,
  CommentAuthor,
} from './types/comment.js';
export type {
  ActionCommentAddInput,
  ActionCommentUpdateInput,
} from './actionComments.js';
export type {
  FeatureCommentCreateInput,
  FeatureCommentReplyInput,
  FeatureCommentUpdateInput,
  FeatureCommentThreadInput,
} from './featureComments.js';
export type {
  PageCommentCreateInput,
  PageCommentUpdateInput,
} from './pageComments.js';
export type {
  GoalCommentAddInput,
  GoalCommentUpdateInput,
} from './goalComments.js';
export type {
  Goal,
  GoalChildSummary,
  GoalHealth,
  GoalKeyResultSummary,
  GoalLifeDomain,
  GoalPeriod,
  GoalProjectSummary,
  GoalStats,
  GoalStatus,
  GoalTreeNode,
  GoalUserSummary,
  GoalWritableStatus,
} from './types/goal.js';
export type {
  GoalListOptions,
  GoalTreeOptions,
  GoalCreateInput,
  GoalUpdateInput,
  GoalSetStatusInput,
  GoalSetParentInput,
  GoalStatsOptions,
} from './goals.js';
export type {
  KeyResult,
  KeyResultCheckIn,
  KeyResultFeatureLink,
  KeyResultProjectLink,
  KeyResultStatus,
  KeyResultUnit,
  ObjectiveWithKeyResults,
} from './types/keyResult.js';
export type {
  KeyResultListOptions,
  KeyResultByObjectiveOptions,
  KeyResultCreateInput,
  KeyResultUpdateInput,
  KeyResultCheckInInput,
  KeyResultStatsOptions,
} from './keyResults.js';
export type { Product } from './types/product.js';
export type { ProductCreateInput, ProductUpdateInput } from './products.js';
export type {
  Feature,
  FeatureScope,
  FeatureScopeStatus,
  FeatureStatus,
} from './types/feature.js';
export type {
  FeatureCreateInput,
  FeatureUpdateInput,
  FeatureListOptions,
  FeatureLinkPageInput,
} from './features.js';
export type { Area, AreaListOptions, AreaCreateInput } from './areas.js';
export type { KnowledgePage } from './types/page.js';
export type {
  PageListOptions,
  PageCreateInput,
  PageUpdateInput,
} from './pages.js';
export type { Requirement, RequirementKind } from './types/requirement.js';
export type {
  RequirementListOptions,
  RequirementCreateInput,
} from './requirements.js';
export type {
  ScopeListOptions,
  ScopeCreateInput,
  ScopeUpdateInput,
} from './scopes.js';
export type { UserStory } from './types/userStory.js';
export type {
  UserStoryCreateInput,
  UserStoryUpdateInput,
  UserStoryListOptions,
} from './userStories.js';
export type {
  Ticket,
  TicketDetail,
  TicketAssignee,
  TicketDependencyEdge,
  TicketStatus,
  TicketType,
} from './types/ticket.js';
export type {
  TicketListOptions,
  TicketCreateInput,
  TicketUpdateInput,
  TicketCommentAddInput,
  TicketCommentUpdateInput,
  TicketSearchOptions,
} from './tickets.js';
export type { Epic, EpicStatus, EpicPriority } from './types/epic.js';
export type {
  EpicCreateInput,
  EpicUpdateInput,
  EpicListOptions,
} from './epics.js';
export type { Cycle, CycleDetail, CycleStatus } from './types/cycle.js';
export type {
  CycleListOptions,
  CycleCreateInput,
  CycleUpdateInput,
} from './cycles.js';
export type {
  SearchResult,
  SearchResultType,
  SearchResultWorkspace,
  GlobalSearchOptions,
  GlobalSearchOutput,
} from './types/search.js';
export type { Tag, TagEntityType, TagListResult } from './types/tag.js';
export type {
  LabelListOptions,
  LabelCreateInput,
  SetEntityTagsInput,
  ListForEntityInput,
  SetEntityTagsResult,
} from './labels.js';
export { isTRPCError, TRPCClientError };
