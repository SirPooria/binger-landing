import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  API_BASE_URL,
  authGoogleUrl,
  authMagicLinkVerifyUrl,
  setTokens,
  getAccessToken,
  getRefreshToken,
  clearTokens,
  apiGet,
} from '@/lib/api';

describe('api url builders', () => {
  it('builds the Google auth URL with an encoded redirect', () => {
    const url = authGoogleUrl('binger://auth/callback');
    expect(url).toBe(`${API_BASE_URL}/api/v1/auth/google?redirect_uri=${encodeURIComponent('binger://auth/callback')}`);
  });

  it('builds the magic-link verify URL with encoded token + redirect', () => {
    const url = authMagicLinkVerifyUrl('tok 123', 'http://x/cb');
    expect(url).toContain('/api/v1/auth/magic-link/verify?token=tok%20123');
    expect(url).toContain(`redirect_uri=${encodeURIComponent('http://x/cb')}`);
  });
});

describe('token storage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('sets, reads and clears tokens', async () => {
    await setTokens('access-1', 'refresh-1');
    expect(await getAccessToken()).toBe('access-1');
    expect(await getRefreshToken()).toBe('refresh-1');
    await clearTokens();
    expect(await getAccessToken()).toBeNull();
    expect(await getRefreshToken()).toBeNull();
  });
});

describe('request() refresh-on-401', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.restoreAllMocks();
  });

  it('refreshes the access token after a 401 and retries the request', async () => {
    await setTokens('stale-access', 'good-refresh');

    const fetchMock = jest
      .spyOn(globalThis, 'fetch' as any)
      // 1) original call -> 401
      .mockResolvedValueOnce({ status: 401, ok: false, json: async () => ({ error: 'unauthorized' }) } as any)
      // 2) refresh call -> new tokens
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({ data: { access_token: 'fresh-access', refresh_token: 'fresh-refresh' } }),
      } as any)
      // 3) retried original call -> success
      .mockResolvedValueOnce({ status: 200, ok: true, json: async () => ({ data: { value: 42 } }) } as any);

    const result = await apiGet<{ value: number }>('/some/path');
    expect(result).toEqual({ value: 42 });
    expect(fetchMock).toHaveBeenCalledTimes(3);

    // The refreshed tokens were persisted.
    expect(await getAccessToken()).toBe('fresh-access');
    expect(await getRefreshToken()).toBe('fresh-refresh');
  });

  it('clears tokens when the refresh also fails', async () => {
    await setTokens('stale-access', 'bad-refresh');
    jest
      .spyOn(globalThis, 'fetch' as any)
      .mockResolvedValueOnce({ status: 401, ok: false, json: async () => ({ error: 'unauthorized' }) } as any)
      .mockResolvedValueOnce({ status: 401, ok: false, json: async () => ({ error: 'invalid_refresh' }) } as any)
      // final read of the (still 401) response body inside request()
      .mockResolvedValueOnce({ status: 401, ok: false, json: async () => ({ error: 'unauthorized' }) } as any);

    await expect(apiGet('/some/path')).rejects.toThrow();
    expect(await getAccessToken()).toBeNull();
  });
});
