import type { TrpcClient } from './client.js';
import type { Contact, ContactInteraction, ContactListOutput, InteractionType, InteractionDirection } from './types/contact.js';

export interface ContactsListOptions {
  workspaceId: string;
  search?: string;
  tags?: string[];
  organizationId?: string;
  limit?: number;
  cursor?: string;
}

export interface ContactCreateInput {
  workspaceId: string;
  firstName?: string;
  lastName?: string;
  email?: string | null;
  phone?: string;
  linkedIn?: string;
  telegram?: string;
  twitter?: string;
  github?: string;
  bluesky?: string;
  about?: string;
  profileType?: string;
  skills?: string[];
  tags?: string[];
  organizationId?: string;
  /** Link (or find-or-create) an organization by name. Ignored when organizationId is set. */
  organizationName?: string;
}

export interface ContactUpdateInput {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string | null;
  phone?: string | null;
  linkedIn?: string | null;
  telegram?: string | null;
  twitter?: string | null;
  github?: string | null;
  bluesky?: string | null;
  about?: string;
  profileType?: string;
  skills?: string[];
  tags?: string[];
  organizationId?: string | null;
  /** Link (or find-or-create) an organization by name. Ignored when organizationId is set. */
  organizationName?: string;
}

export interface AddInteractionInput {
  contactId: string;
  type: InteractionType;
  direction: InteractionDirection;
  subject?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
}

export class ContactsApi {
  constructor(private client: TrpcClient) {}

  async list(options: ContactsListOptions): Promise<ContactListOutput> {
    return await this.client.crmApi.contactList.query(options) as ContactListOutput;
  }

  async get(id: string, options?: { includeInteractions?: boolean }): Promise<Contact> {
    return await this.client.crmApi.contactGet.query({
      id,
      includeInteractions: options?.includeInteractions,
    }) as Contact;
  }

  async create(input: ContactCreateInput): Promise<Contact> {
    return await this.client.crmApi.contactCreate.mutate(input) as Contact;
  }

  async update(input: ContactUpdateInput): Promise<Contact> {
    return await this.client.crmApi.contactUpdate.mutate(input) as Contact;
  }

  async delete(id: string): Promise<void> {
    await this.client.crmApi.contactDelete.mutate({ id });
  }

  async addInteraction(input: AddInteractionInput): Promise<ContactInteraction> {
    return await this.client.crmApi.contactAddInteraction.mutate(input) as ContactInteraction;
  }
}
