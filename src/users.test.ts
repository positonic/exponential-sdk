import { describe, it, expect, vi } from 'vitest';
import { UsersApi } from './users.js';
import type { TrpcClient } from './client.js';

describe('UsersApi', () => {
  it('me() asks user.getCurrentUser and returns the account as is', async () => {
    const me = {
      id: 'cmsfscxn70000jy04iyppvkp0',
      name: 'Claude Desktop',
      email: null,
      image: null,
      isAgent: true,
      agent: { id: 'ext-1', name: 'Claude Desktop', owner: { id: 'u-james', name: 'James' } },
    };
    const query = vi.fn().mockResolvedValue(me);
    const client = { user: { getCurrentUser: { query } } } as unknown as TrpcClient;

    const result = await new UsersApi(client).me();

    expect(query).toHaveBeenCalledWith();
    expect(result).toEqual(me);
  });
});
