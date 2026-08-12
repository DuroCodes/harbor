# harbor

local-first personal finance — expo + a tiny plaid proxy.

## apps

| path                                             | what                                                  |
| ------------------------------------------------ | ----------------------------------------------------- |
| [`apps/mobile/`](apps/mobile/)                   | the app (`@expo/ui`, expo router)                     |
| [`apps/plaid-proxy/`](apps/plaid-proxy/)         | cloudflare worker — keeps plaid secrets off the phone |
| [`packages/plaid-proxy/`](packages/plaid-proxy/) | shared wire types + mappers                           |

## setup

> [!NOTE]
> plaid needs a tiny server. the phone never sees `client_secret` or item `access_token`s.

1. clone the repo
2. install deps from the root

```bash
bun install
```

3. run the plaid proxy — see [`apps/plaid-proxy/README.md`](apps/plaid-proxy/README.md)
4. run the app — see [`apps/mobile/README.md`](apps/mobile/README.md)

## scripts

```bash
bun run format          # prettier write
bun run format:check    # prettier check (ci)
bun run typecheck
```

## releases / sideload builds

[release-please](https://github.com/googleapis/release-please) opens a release PR from conventional commits on `main`. when that PR merges, ci:

1. cuts a github release (`vX.Y.Z`)
2. runs **eas** `sideload` builds (apk + ipa)
3. attaches `harbor-android.apk` / `harbor-ios.ipa` to the release

you can also run **Actions → release → Run workflow** to build without cutting a release.

### one-time eas setup

```bash
cd apps/mobile
bunx eas-cli login
bunx eas-cli init          # writes projectId into app.json
bunx eas-cli credentials   # apple + android signing
bunx eas-cli device:create # register ios devices for ad-hoc install
```

add a github secret:

- `EXPO_TOKEN` — from [expo.dev/settings/access-tokens](https://expo.dev/settings/access-tokens)

> [!NOTE]
> android apk installs on any device (unknown sources). ios ipa is **ad-hoc** — each device udid must be registered first.

## privacy

- balances / transactions stay on device
- secrets + proxy api key live in keychain
- optional face id / passcode lock on launch
