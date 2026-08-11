/**
 * Harbor Plaid Proxy — minimal Cloudflare Worker.
 *
 * Holds Plaid secrets + Item access_tokens.
 * The iOS app never sees client_secret or access_token.
 *
 * Endpoints:
 *   POST /link/token/create
 *   POST /item/public_token/exchange
 *   POST /item/sync
 *   POST /item/remove
 *   GET  /.well-known/apple-app-site-association  (for OAuth Universal Links)
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/.well-known/apple-app-site-association") {
      return json(aasa(env), 200, { "Content-Type": "application/json" });
    }

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    if (request.method !== "POST") {
      return error("Method not allowed", 405);
    }

    if (!authorize(request, env)) {
      return error("Unauthorized", 401);
    }

    try {
      switch (url.pathname) {
        case "/link/token/create":
          return await createLinkToken(env);
        case "/item/public_token/exchange":
          return await exchangePublicToken(request, env);
        case "/item/sync":
          return await syncItem(request, env);
        case "/item/remove":
          return await removeItem(request, env);
        default:
          return error("Not found", 404);
      }
    } catch (err) {
      // Never include secrets or access tokens in error payloads.
      const message = err instanceof Error ? err.message : "Proxy failure";
      return error(message, 500);
    }
  },
};

function authorize(request, env) {
  const header = request.headers.get("Authorization") || "";
  const expected = `Bearer ${env.PROXY_API_KEY}`;
  return env.PROXY_API_KEY && header === expected;
}

function plaidHost(env) {
  switch ((env.PLAID_ENV || "sandbox").toLowerCase()) {
    case "production":
      return "https://production.plaid.com";
    case "development":
      return "https://development.plaid.com";
    default:
      return "https://sandbox.plaid.com";
  }
}

async function plaid(env, path, body) {
  const response = await fetch(`${plaidHost(env)}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "PLAID-CLIENT-ID": env.PLAID_CLIENT_ID,
      "PLAID-SECRET": env.PLAID_SECRET,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  if (!response.ok) {
    const message = data?.error_message || data?.error_code || "Plaid request failed";
    throw new Error(message);
  }
  return data;
}

async function createLinkToken(env) {
  const body = {
    client_name: "Harbor",
    language: "en",
    country_codes: ["US"],
    user: { client_user_id: "harbor-personal" },
    products: ["transactions"],
  };

  if (env.PLAID_REDIRECT_URI) {
    body.redirect_uri = env.PLAID_REDIRECT_URI;
  }

  const data = await plaid(env, "/link/token/create", body);
  return json({
    linkToken: data.link_token,
    expiration: data.expiration,
  });
}

async function exchangePublicToken(request, env) {
  const { publicToken, institutionName } = await request.json();
  if (!publicToken) return error("publicToken required", 400);

  const exchanged = await plaid(env, "/item/public_token/exchange", {
    public_token: publicToken,
  });

  const itemID = exchanged.item_id;
  const accessToken = exchanged.access_token;

  await env.ITEMS.put(
    itemKey(itemID),
    JSON.stringify({
      accessToken,
      institutionName: institutionName || null,
      createdAt: new Date().toISOString(),
    })
  );

  const accountsData = await plaid(env, "/accounts/get", {
    access_token: accessToken,
  });

  return json({
    itemID,
    accounts: (accountsData.accounts || []).map(mapAccount),
  });
}

async function syncItem(request, env) {
  const { itemID, cursor } = await request.json();
  if (!itemID) return error("itemID required", 400);

  const item = await loadItem(env, itemID);
  if (!item) {
    return error(
      `Unknown item "${itemID}". Connect via Plaid Link first so the proxy can store the access token.`,
      404
    );
  }

  const accountsData = await plaid(env, "/accounts/get", {
    access_token: item.accessToken,
  });

  const syncBody = {
    access_token: item.accessToken,
    count: 500,
  };
  if (cursor) syncBody.cursor = cursor;

  const txData = await plaid(env, "/transactions/sync", syncBody);

  return json({
    accounts: (accountsData.accounts || []).map(mapAccount),
    added: (txData.added || []).map(mapTransaction),
    modified: (txData.modified || []).map(mapTransaction),
    removed: (txData.removed || []).map((r) => ({
      transactionID: r.transaction_id,
    })),
    nextCursor: txData.next_cursor,
    hasMore: !!txData.has_more,
  });
}

async function removeItem(request, env) {
  const { itemID } = await request.json();
  if (!itemID) return error("itemID required", 400);

  const item = await loadItem(env, itemID);
  if (item) {
    try {
      await plaid(env, "/item/remove", { access_token: item.accessToken });
    } catch (_) {
      // Still delete local token even if Plaid remove fails.
    }
    await env.ITEMS.delete(itemKey(itemID));
  }

  return json({ ok: true });
}

async function loadItem(env, itemID) {
  const raw = await env.ITEMS.get(itemKey(itemID));
  return raw ? JSON.parse(raw) : null;
}

function itemKey(itemID) {
  return `item:${itemID}`;
}

function mapAccount(account) {
  return {
    accountID: account.account_id,
    name: account.name,
    officialName: account.official_name,
    type: account.type,
    subtype: account.subtype,
    mask: account.mask,
    balances: {
      current: account.balances?.current ?? null,
      available: account.balances?.available ?? null,
      limit: account.balances?.limit ?? null,
      isoCurrencyCode: account.balances?.iso_currency_code ?? "USD",
    },
  };
}

function mapTransaction(txn) {
  return {
    transactionID: txn.transaction_id,
    accountID: txn.account_id,
    amount: txn.amount,
    isoCurrencyCode: txn.iso_currency_code ?? "USD",
    date: txn.date,
    authorizedDate: txn.authorized_date ?? null,
    name: txn.name,
    merchantName: txn.merchant_name ?? null,
    pending: !!txn.pending,
    pendingTransactionID: txn.pending_transaction_id ?? null,
    personalFinanceCategory: txn.personal_finance_category
      ? {
          primary: txn.personal_finance_category.primary ?? null,
          detailed: txn.personal_finance_category.detailed ?? null,
        }
      : null,
  };
}

function aasa(env) {
  const appID = env.IOS_APP_ID || "TEAMID.me.durocodes.Harbor";
  return {
    applinks: {
      details: [
        {
          appIDs: [appID],
          components: [{ "/": "/plaid/*", comment: "Plaid OAuth redirect" }],
        },
      ],
    },
  };
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  };
}

function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(),
      ...extraHeaders,
    },
  });
}

function error(message, status) {
  return json({ error: message }, status);
}
