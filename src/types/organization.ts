export type OrganizationSize =
  | '1-10'
  | '11-50'
  | '51-200'
  | '201-500'
  | '501-1000'
  | '1000+';

export interface Organization {
  id: string;
  workspaceId: string;
  name: string;
  websiteUrl: string | null;
  logoUrl: string | null;
  description: string | null;
  industry: string | null;
  size: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  } | null;
  _count?: {
    contacts: number;
  };
}

export interface OrganizationListOutput {
  organizations: Organization[];
  nextCursor?: string;
}
