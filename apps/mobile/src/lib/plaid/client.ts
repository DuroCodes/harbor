import type {
  CreateLinkTokenResponse,
  ExchangePublicTokenRequest,
  ExchangePublicTokenResponse,
  RemoveItemRequest,
  SyncItemRequest,
  SyncItemResponse,
} from '@harbor/plaid-proxy';

import { storage } from '@/lib/storage';
import { PlaidProxyError } from '@/lib/plaid/error';

const PROXY_URL_KEY = 'harbor.proxy.url';
const PROXY_KEY_KEY = 'harbor.proxy.apikey';

export const loadProxyConfig = async (): Promise<{
  baseURL: string;
  apiKey: string;
}> => {
  const [baseURL, apiKey] = await Promise.all([
    storage.getItem(PROXY_URL_KEY),
    storage.getItem(PROXY_KEY_KEY),
  ]);
  return {
    baseURL: (baseURL ?? '').trim().replace(/\/$/, ''),
    apiKey: (apiKey ?? '').trim(),
  };
};

export const isProxyConfigured = (baseURL: string, apiKey: string): boolean =>
  baseURL.length > 0 && apiKey.length > 0;

const post = async <T>(
  path: string,
  body: unknown,
  baseURL?: string,
  apiKey?: string
): Promise<T> => {
  const config =
    baseURL !== undefined && apiKey !== undefined
      ? { baseURL: baseURL.replace(/\/$/, ''), apiKey }
      : await loadProxyConfig();

  if (!isProxyConfigured(config.baseURL, config.apiKey)) {
    throw new PlaidProxyError(
      'Plaid proxy is not configured. Add your proxy URL and API key in Settings.',
      'notConfigured'
    );
  }

  let url: URL;
  try {
    url = new URL(path, config.baseURL.endsWith('/') ? config.baseURL : `${config.baseURL}/`);
  } catch {
    throw new PlaidProxyError('Invalid proxy URL.', 'invalidURL');
  }

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(body ?? {}),
  });

  const text = await response.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    if (!response.ok) {
      throw new PlaidProxyError(`Proxy request failed (${response.status}).`, 'http');
    }
    throw new PlaidProxyError('Could not read proxy response.', 'decoding');
  }

  if (!response.ok) {
    const message =
      json && typeof json === 'object' && 'error' in json
        ? String((json as { error: unknown }).error)
        : `Proxy request failed (${response.status}).`;
    throw new PlaidProxyError(message, 'http');
  }

  return json as T;
};

export const plaidProxy = {
  createLinkToken: (baseURL?: string, apiKey?: string) =>
    post<CreateLinkTokenResponse>('/link/token/create', {}, baseURL, apiKey),
  exchangePublicToken: (request: ExchangePublicTokenRequest, baseURL?: string, apiKey?: string) =>
    post<ExchangePublicTokenResponse>('/item/public_token/exchange', request, baseURL, apiKey),
  syncItem: (request: SyncItemRequest, baseURL?: string, apiKey?: string) =>
    post<SyncItemResponse>('/item/sync', request, baseURL, apiKey),
  removeItem: (request: RemoveItemRequest, baseURL?: string, apiKey?: string) =>
    post<{ ok?: boolean }>('/item/remove', request, baseURL, apiKey),
};
