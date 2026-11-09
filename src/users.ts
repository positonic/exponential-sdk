import type { TrpcClient } from './client.js';
import type { CurrentUser } from './types/user.js';

export class UsersApi {
  constructor(private client: TrpcClient) {}

  /**
   * The account this client's token signs in as. For an External agent's key
   * the result is the agent's shadow user: `isAgent` is true and `agent`
   * carries the agent's name and owner — the identity to grant access to when
   * a command comes back FORBIDDEN.
   */
  async me(): Promise<CurrentUser> {
    return await this.client.user.getCurrentUser.query() as CurrentUser;
  }
}
