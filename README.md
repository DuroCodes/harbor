# harbor

local-first personal finance. connect your banks with plaid, keep balances and transactions on your device, and glance at net worth, cash flow, budgets, and activity in one place.

| platform | how to install                                                                         |
| -------- | -------------------------------------------------------------------------------------- |
| android  | install a ready-made apk from [releases](https://github.com/DuroCodes/Harbor/releases) |
| ios      | build yourself — mac + usb (free apple id) or eas cloud (no mac; paid apple developer) |

privacy defaults: data stays on device, the plaid secret never ships in the app (a small proxy holds it), and you can lock the app with face id / a passcode.

---

## install on android

1. open the latest [github release](https://github.com/DuroCodes/Harbor/releases)
2. download **`harbor-android.apk`**
3. on your phone, allow installs from the browser/file manager if prompted, then open the apk

that's it. releases are built automatically for android.

---

## install on ios

harbor isn't on the app store yet. two ways to get it on your iphone:

|                 | mac? | apple account                                                                                         |
| --------------- | ---- | ----------------------------------------------------------------------------------------------------- |
| **local (usb)** | yes  | free personal team works (~7 day installs)                                                            |
| **eas cloud**   | no   | [apple developer program](https://developer.apple.com/programs/) ($99/yr) — eas builds on expo's macs |

optional but recommended either way: a running [plaid proxy](apps/plaid-proxy/README.md) so you can link banks.

### with a mac (usb)

- **xcode 26.4+**, [bun](https://bun.sh), usb cable

```bash
bun install
cd apps/mobile
bunx expo run:ios --device
```

1. unlock your iphone, plug it in, and trust the computer
2. turn on **developer mode** (settings → privacy & security) if ios asks
3. when signing prompts, choose your **personal team**
4. day-to-day js: `cd apps/mobile && bun start`

> re-run `bunx expo run:ios --device` when the free profile expires (~7 days) or native deps change.

### without a mac (eas)

expo builds the ipa in the cloud — any machine with bun is enough.

```bash
bun install
cd apps/mobile
bunx eas-cli login
bunx eas-cli build --profile development --platform ios
```

follow the prompts to sign in with your apple developer account. when the build finishes, open the install link on your iphone (or scan the qr from the eas build page).

register the device first if eas asks:

```bash
bunx eas-cli device:create
```

---

## build android yourself

you can also produce an apk without waiting for a release:

```bash
bun install
cd apps/mobile
bunx eas-cli login
bunx eas-cli build --profile sideload --platform android
```

or run on a device/emulator from source:

```bash
cd apps/mobile
bun run android
```

---

## develop

bun monorepo:

| path                                            | what                                                  |
| ----------------------------------------------- | ----------------------------------------------------- |
| [`apps/mobile`](apps/mobile/)                   | expo app                                              |
| [`apps/plaid-proxy`](apps/plaid-proxy/)         | cloudflare worker — keeps plaid secrets off the phone |
| [`packages/plaid-proxy`](packages/plaid-proxy/) | shared api types                                      |

```bash
bun install
bun run typecheck
bun run format
```

app + proxy setup: [`apps/mobile/README.md`](apps/mobile/README.md) · [`apps/plaid-proxy/README.md`](apps/plaid-proxy/README.md)

---

## releases (maintainers)

merging a [release-please](https://github.com/googleapis/release-please) pr on `main` cuts a github release and attaches a sideload **android apk**. ios artifacts aren't in ci yet (apple developer program required for shareable ipas).

manual apk build: **actions → release → run workflow** (defaults to android).

one-time expo setup for that pipeline:

```bash
cd apps/mobile
bunx eas-cli login
bunx eas-cli init
bunx eas-cli credentials   # android signing
```

add github secret `EXPO_TOKEN` from [expo.dev/settings/access-tokens](https://expo.dev/settings/access-tokens).
