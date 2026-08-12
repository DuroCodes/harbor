# harbor plaid proxy

tiny cloudflare worker that holds plaid secrets + item `access_token`s so the phone never sees them.

shared wire types live in [`../../packages/plaid-proxy`](../../packages/plaid-proxy).

## setup

> [!NOTE]
> you need a [plaid](https://dashboard.plaid.com/) account (`client_id` + `secret`)

1. from the repo root

```bash
bun install
```

2. copy env and fill in secrets

```bash
cd apps/plaid-proxy
cp .dev.vars.example .dev.vars
```

```bash
PLAID_CLIENT_ID=...
PLAID_SECRET=...
PROXY_API_KEY=replace-with-a-long-random-string
PLAID_ENV=sandbox | development | production
```

3. run locally

```bash
bun run dev
```

4. point the app at `http://localhost:8787` (or your machine lan ip) with the same `PROXY_API_KEY`

## deploy

```bash
bunx wrangler kv namespace create ITEMS
# paste the ids into wrangler.toml

bunx wrangler secret put PLAID_CLIENT_ID
bunx wrangler secret put PLAID_SECRET
bunx wrangler secret put PROXY_API_KEY
bun run deploy
```

## endpoints

- `POST /link/token/create`
- `POST /item/public_token/exchange`
- `POST /item/sync`
- `POST /item/remove`
- `GET /.well-known/apple-app-site-association`
