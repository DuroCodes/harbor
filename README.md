# Harbor

A native, local-first personal finance app for iPhone — SwiftUI, SwiftData, and Plaid (Sandbox).

## Architecture verdict: Plaid requires a minimal server

Plaid’s supported model **cannot** be implemented securely entirely inside the iOS app.

| Credential / token | Where it must live | Why |
| --- | --- | --- |
| `client_id` + `secret` | Server only | Required on every Plaid API call; must never ship in the app binary |
| `link_token` | Created on server → passed to app | Initializes LinkKit |
| `public_token` | App → server (one-time) | Exchanged for `access_token` |
| `access_token` | Server only | Long-lived; used to pull accounts/transactions |
| Account balances, transactions, categories | **On device (SwiftData)** | Local-first product data |

Required server calls:

1. `POST /link/token/create`
2. `POST /item/public_token/exchange`
3. `POST /accounts/get` (and/or balance)
4. `POST /transactions/sync`
5. (Optional) `POST /item/remove`

OAuth institutions also need a **Universal Link** redirect URI and a hosted `apple-app-site-association` file.

### What we are *not* building

- No multi-user SaaS
- No hosted financial database of record
- No Firebase/Supabase auth
- No custom REST API for app business logic beyond the Plaid proxy

### Minimum viable “backend”

A tiny **Plaid proxy** (Cloudflare Worker in `PlaidProxy/`) that:

- Holds Plaid secrets in Worker secrets / env
- Stores Item `access_token`s in KV (not in the phone)
- Authenticates the single personal client with a shared API key (Keychain on device)
- Returns only account/transaction payloads to the app

The iPhone remains the system of record for your finances after sync.

## Platform

| Item | Choice |
| --- | --- |
| Language / UI | Swift + SwiftUI |
| Persistence | SwiftData |
| Charts | Swift Charts |
| Bank linking | Plaid LinkKit 7 via SPM (`plaid-link-ios-spm`) |
| Min iOS | **18.0** (SwiftData + modern SwiftUI; LinkKit supports 15+) |
| Xcode | 16.1+ (this machine has Xcode 26) |

## App structure

```
Harbor/
  App/                 # Entry, tabs, environment
  Features/            # Dashboard, Accounts, Transactions, Settings
  Domain/              # Pure financial calculations + enums
  Data/                # SwiftData models + repositories
  Integration/Plaid/   # LinkKit + proxy client + mappers
  Integration/Security # Keychain, Face ID lock
  Services/            # Sync orchestration
PlaidProxy/            # Minimal Cloudflare Worker
```

Views never talk to Plaid or SwiftData directly — they go through view models / services / repositories.

## Setup

### 1. Plaid Sandbox

1. Create a [Plaid Dashboard](https://dashboard.plaid.com/) account
2. Copy Sandbox `client_id` and `secret`
3. Configure an Allowed Redirect URI (needed for OAuth banks), e.g. `https://harbor.example.com/plaid/`

### 2. Deploy the proxy

See `PlaidProxy/README.md`. Set secrets:

- `PLAID_CLIENT_ID`
- `PLAID_SECRET`
- `PLAID_ENV=sandbox`
- `PROXY_API_KEY` (long random string)
- `PLAID_REDIRECT_URI` (must match Dashboard)

### 3. Configure the iOS app

In Settings (or `Config.plist` locally, gitignored):

- Proxy base URL
- Proxy API key → stored in Keychain

### 4. Run

Open `Harbor.xcodeproj` in Xcode, select an iPhone simulator, Run.

Without proxy credentials, Harbor stays empty until you configure the proxy and connect a Sandbox institution.

## Privacy

- Financial data stays in on-device SwiftData
- No logging of balances, account numbers, or tokens
- Secrets and proxy API key in Keychain
- Optional Face ID / device passcode gate on launch
- Only the Plaid proxy receives tokens required for sync
