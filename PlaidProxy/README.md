# Harbor Plaid Proxy

Minimal Cloudflare Worker that keeps Plaid secrets and Item `access_token`s off the iPhone.

## Why this exists

Plaid requires `client_id` + `secret` for:

- `/link/token/create`
- `/item/public_token/exchange`
- `/accounts/get`
- `/transactions/sync`

Those credentials must not ship inside the iOS app. This worker is the smallest supported place to put them.

It is **not** a multi-user backend. There is no signup, no hosted ledger, and no SaaS database of your finances. After sync, Harbor stores accounts/transactions locally in SwiftData.

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/link/token/create` | Create Link `link_token` |
| POST | `/item/public_token/exchange` | Exchange `public_token`, store `access_token`, return accounts |
| POST | `/item/sync` | Refresh accounts + `/transactions/sync` |
| POST | `/item/remove` | Remove Item + delete stored token |
| GET | `/.well-known/apple-app-site-association` | Universal Links for OAuth |

All POSTs require `Authorization: Bearer <PROXY_API_KEY>`.

## Deploy

```bash
cd PlaidProxy
npm i -g wrangler
wrangler login
wrangler kv namespace create ITEMS
# paste the id into wrangler.toml

wrangler secret put PLAID_CLIENT_ID
wrangler secret put PLAID_SECRET
wrangler secret put PROXY_API_KEY

# optional
# wrangler secret put PLAID_REDIRECT_URI

wrangler deploy
```

Then in Harbor → Settings:

- Proxy URL: `https://harbor-plaid-proxy.<you>.workers.dev`
- Proxy API key: the same `PROXY_API_KEY`

## Local development

```bash
cp .dev.vars.example .dev.vars
# fill in sandbox credentials
wrangler dev
```

Use `http://127.0.0.1:8787` as the proxy URL in the iOS Simulator.

## Security notes

- Never commit `.dev.vars` or Plaid secrets
- Rotate `PROXY_API_KEY` if the device is lost
- KV stores only Item access tokens keyed by `item_id`
- Responses intentionally omit access tokens
