/**
 * The account a token signs in as (`user.getCurrentUser`).
 *
 * An External agent's `exp_agent_…` key resolves to the agent's own shadow
 * user, so `isAgent` is true and `agent` names the agent and the person who
 * owns it. That is the account to add to a workspace or a restricted project
 * when the agent is refused.
 */
export interface CurrentUser {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  isAgent: boolean;
  agent: {
    id: string;
    name: string;
    owner: { id: string; name: string | null };
  } | null;
}
