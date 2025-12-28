import type { Elysia } from 'elysia';
import { resolveProfile } from '../services/icp-resolver';
import { ProfileUrlError } from '../utils/profile-url';
import type { ResolveProfileRequest } from '../types/icp';
import { ICP_DATA } from '../icp-data';

export const registerIcpRoutes = (app: Elysia) =>
  app
    .get('/icps', () => ({
      data: ICP_DATA,
      metadata: {
        count: ICP_DATA.phases.length
      }
    }))
    .post('/icps/resolve', async ({ body, set }) => {
      const payload = body as ResolveProfileRequest;

      if (!payload?.url) {
        set.status = 400;
        return { error: 'url is required' };
      }

      try {
        return await resolveProfile(payload.url, {
          mock: payload.mock,
          mockDelay: payload.mockDelay
        });
      } catch (err) {
        if (err instanceof ProfileUrlError) {
          set.status = err.status;
          return { error: err.message };
        }

        set.status = 500;
        return { error: 'Unexpected error' };
      }
    });
