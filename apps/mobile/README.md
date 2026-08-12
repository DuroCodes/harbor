# harbor

expo personal finance app. native ui via [`@expo/ui`](https://docs.expo.dev/versions/latest/sdk/ui/).

## setup

> [!NOTE]
> needs **xcode 26.4+** (swift 6.3). expo sdk 57's `expo-modules-jsi` uses `weak let`, which fails on 26.0–26.3.

> [!NOTE]
> this is a **dev client** app — not expo go. after adding native modules, rebuild with `bun run ios`.

1. from the repo root, install workspaces

```bash
bun install
```

2. run the plaid proxy (see [`../plaid-proxy/README.md`](../plaid-proxy/README.md))

3. build + launch (simulator)

```bash
cd apps/mobile
bun run ios
```

physical iphone:

```bash
cd apps/mobile
bunx expo run:ios --device
```

if signing fails the first time, open the workspace once and enable automatic signing with your personal team:

```bash
open ios/Harbor.xcworkspace
```

then select the **Harbor** target → **Signing & Capabilities** → pick your **Personal Team** → re-run `bunx expo run:ios --device`.

or metro against an existing install:

```bash
bun run start
```

4. in settings: paste proxy url + api key, then connect a sandbox bank

5. enjoy

## layout

```
apps/mobile/
  src/
    app/           # expo-router
    components/
    context/
    data/
    lib/
    theme/
  assets/
```

bundle id: `me.durocodes.Harbor`

## releases

versions + changelogs come from [release-please](https://github.com/googleapis/release-please). sideload **android** builds are attached to each release — see the root [`README.md`](../../README.md) for install and build instructions (ios is diy from source for now).
