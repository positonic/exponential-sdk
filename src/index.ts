import { createClient, isTRPCError, TRPCClientError, type TrpcClient } from './client.js';
import { ActionsApi } from './actions.js';
import { ActionCommentsApi } from './actionComments.js';
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
import { LabelsApi } from './labels.js';

export class ExponentialClient {
  private client: TrpcClient;
  actions: ActionsApi;
  actionComments: ActionCommentsApi;
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
  labels: LabelsApi;

  constructor(private config: { token: string; apiUrl: string }) {
    this.client = createClient(this.config);
    this.actions = new ActionsApi(this.client);
    this.actionComments = new ActionCommentsApi(this.client);
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
    this.labels = new LabelsApi(this.client);
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
} from './actions.js';
export type { Project, ProjectOutput, ProjectsListOutput } from './types/project.js';
export type { Workspace, WorkspaceOutput, WorkspacesListOutput } from './types/workspace.js';
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
  CommentAuthor,
} from './types/comment.js';
export type {
  ActionCommentAddInput,
  ActionCommentUpdateInput,
} from './actionComments.js';
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
} from './features.js';
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
  TicketSearchOptions,
} from './tickets.js';
export type { Epic, EpicStatus, EpicPriority } from './types/epic.js';
export type {
  EpicCreateInput,
  EpicUpdateInput,
  EpicListOptions,
} from './epics.js';
export type { Tag, TagEntityType, TagListResult } from './types/tag.js';
export type {
  LabelListOptions,
  LabelCreateInput,
  SetEntityTagsInput,
  ListForEntityInput,
  SetEntityTagsResult,
} from './labels.js';
export { isTRPCError, TRPCClientError };
