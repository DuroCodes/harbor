import { mapAccount, mapTransaction } from '@harbor/plaid-proxy';

type Env = {
  ITEMS: KVNamespace;
  PLAID_CLIENT_ID: string;
  PLAID_SECRET: string;
  PROXY_API_KEY: string;
  PLAID_ENV?: string;
  PLAID_REDIRECT_URI?: string;
  PLAID_DAYS_REQUESTED?: string;
  IOS_APP_ID?: string;
};

type StoredItem = {
  accessToken: string;
  institutionName: string | null;
  createdAt: string;
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/.well-known/apple-app-site-association') {
      return json(aasa(env), 200, { 'Content-Type': 'application/json' });
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    if (request.method !== 'POST') {
      return error('Method not allowed', 405);
    }

    if (!authorize(request, env)) {
      return error('Unauthorized', 401);
    }

    try {
      switch (url.pathname) {
        case '/link/token/create':
          return await createLinkToken(env);
        case '/item/public_token/exchange':
          return await exchangePublicToken(request, env);
        case '/item/sync':
          return await syncItem(request, env);
        case '/item/remove':
          return await removeItem(request, env);
        default:
          return error('Not found', 404);
      }
    } catch (err) {
      // Never include secrets or access tokens in error payloads.
      const message = err instanceof Error ? err.message : 'Proxy failure';
      return error(message, 500);
    }
  },
};

const authorize = (request: Request, env: Env) => {
  const header = request.headers.get('Authorization') || '';
  const expected = `Bearer ${env.PROXY_API_KEY}`;
  return Boolean(env.PROXY_API_KEY && header === expected);
};

const plaidHost = (env: Env) => {
  switch ((env.PLAID_ENV || 'sandbox').toLowerCase()) {
    case 'production':
      return 'https://production.plaid.com';
    case 'development':
      return 'https://development.plaid.com';
    default:
      return 'https://sandbox.plaid.com';
  }
};

const plaid = async (env: Env, path: string, body: Record<string, unknown>) => {
  const response = await fetch(`${plaidHost(env)}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'PLAID-CLIENT-ID': env.PLAID_CLIENT_ID,
      'PLAID-SECRET': env.PLAID_SECRET,
    },
    body: JSON.stringify(body),
  });

  const data = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    const message =
      (data?.error_message as string) ||
      (data?.error_code as string) ||
      'Plaid request failed';
    throw new Error(message);
  }
  return data;
};

const createLinkToken = async (env: Env) => {
  const daysRequested = Math.min(
    Math.max(Number(env.PLAID_DAYS_REQUESTED) || 730, 30),
    730
  );

  const body: Record<string, unknown> = {
    client_name: 'Harbor',
    language: 'en',
    country_codes: ['US'],
    user: { client_user_id: 'harbor-personal' },
    products: ['transactions'],
    // Max historical lookback (default without this is 90 days). Only applies the
    // first time Transactions is initialized on an Item — re-link to change it.
    transactions: { days_requested: daysRequested },
  };

  if (env.PLAID_REDIRECT_URI) {
    body.redirect_uri = env.PLAID_REDIRECT_URI;
  }

  const data = await plaid(env, '/link/token/create', body);
  return json({
    linkToken: data.link_token,
    expiration: data.expiration,
  });
};

const exchangePublicToken = async (request: Request, env: Env) => {
  const { publicToken, institutionName } = (await request.json()) as {
    publicToken?: string;
    institutionName?: string | null;
  };
  if (!publicToken) return error('publicToken required', 400);

  const exchanged = await plaid(env, '/item/public_token/exchange', {
    public_token: publicToken,
  });

  const itemID = exchanged.item_id as string;
  const accessToken = exchanged.access_token as string;

  await env.ITEMS.put(
    itemKey(itemID),
    JSON.stringify({
      accessToken,
      institutionName: institutionName || null,
      createdAt: new Date().toISOString(),
    } satisfies StoredItem)
  );

  const accountsData = await plaid(env, '/accounts/get', {
    access_token: accessToken,
  });

  const accounts = (accountsData.accounts as unknown[]) || [];
  return json({
    itemID,
    accounts: accounts.map((a) =>
      mapAccount(a as Parameters<typeof mapAccount>[0])
    ),
  });
};

const syncItem = async (request: Request, env: Env) => {
  const { itemID, cursor } = (await request.json()) as {
    itemID?: string;
    cursor?: string | null;
  };
  if (!itemID) return error('itemID required', 400);

  const item = await loadItem(env, itemID);
  if (!item) {
    return error(
      `Unknown item "${itemID}". Connect via Plaid Link first so the proxy can store the access token.`,
      404
    );
  }

  const accountsData = await plaid(env, '/accounts/get', {
    access_token: item.accessToken,
  });

  const syncBody: Record<string, unknown> = {
    access_token: item.accessToken,
    count: 500,
  };
  if (cursor) syncBody.cursor = cursor;

  const txData = await plaid(env, '/transactions/sync', syncBody);

  const accounts = (accountsData.accounts as unknown[]) || [];
  const added = (txData.added as unknown[]) || [];
  const modified = (txData.modified as unknown[]) || [];
  const removed = (txData.removed as { transaction_id: string }[]) || [];

  return json({
    accounts: accounts.map((a) =>
      mapAccount(a as Parameters<typeof mapAccount>[0])
    ),
    added: added.map((t) =>
      mapTransaction(t as Parameters<typeof mapTransaction>[0])
    ),
    modified: modified.map((t) =>
      mapTransaction(t as Parameters<typeof mapTransaction>[0])
    ),
    removed: removed.map((r) => ({ transactionID: r.transaction_id })),
    nextCursor: txData.next_cursor,
    hasMore: !!txData.has_more,
  });
};

const removeItem = async (request: Request, env: Env) => {
  const { itemID } = (await request.json()) as { itemID?: string };
  if (!itemID) return error('itemID required', 400);

  const item = await loadItem(env, itemID);
  if (item) {
    try {
      await plaid(env, '/item/remove', { access_token: item.accessToken });
    } catch {
      // Still delete local token even if Plaid remove fails.
    }
    await env.ITEMS.delete(itemKey(itemID));
  }

  return json({ ok: true });
};

const loadItem = async (
  env: Env,
  itemID: string
): Promise<StoredItem | null> => {
  const raw = await env.ITEMS.get(itemKey(itemID));
  return raw ? (JSON.parse(raw) as StoredItem) : null;
};

const itemKey = (itemID: string) => `item:${itemID}`;

const aasa = (env: Env) => {
  const appID = env.IOS_APP_ID || 'TEAMID.me.durocodes.harbor';
  return {
    applinks: {
      details: [
        {
          appIDs: [appID],
          components: [{ '/': '/plaid/*', comment: 'Plaid OAuth redirect' }],
        },
      ],
    },
  };
};

const corsHeaders = () => ({
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
});

const json = (
  body: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {}
) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(),
      ...extraHeaders,
    },
  });

const error = (message: string, status: number) =>
  json({ error: message }, status);
