export interface Workspace {
  id: string;
  name: string;
  slug: string;
  type: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * A member of a workspace, from `workspaces.listMembers()`.
 *
 * `source` is how they reach the workspace: `workspace` for a direct
 * membership, `team` for access inherited from a linked team. It matters for
 * mentions — name-only `@[Name]` markup only resolves against direct members,
 * so team-based members must be mentioned by id. Use `mentionSyntax`, which is
 * always the id form and therefore always works.
 */
export interface WorkspaceMember {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: string;
  source: 'workspace' | 'team';
  /** Teams in this workspace the member belongs to. Empty for direct-only members. */
  teams: { id: string; name: string }[];
  /** Ready-to-paste mention token, e.g. `@[Andi Stanner](clx123...)`. */
  mentionSyntax: string;
}

export interface WorkspaceOutput {
  id: string;
  name: string;
  slug: string;
  type: string;
}

export interface WorkspacesListOutput {
  workspaces: WorkspaceOutput[];
  total: number;
}
