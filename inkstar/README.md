# Inkstar

iOS app (Expo SDK 58, expo-router). A twelve-palace Chinese star chart, drawn for a phone screen, in English, Korean, Japanese and Traditional Chinese.

```bash
npm install
npx expo start --ios      # Expo Go on the simulator
npx tsc --noEmit && npx eslint src
```

## Layout

- `src/lib/chart.ts` — wraps the `iztro` engine; produces the board, today's focus, and the chart facts sent to the reader
- `src/components/star-board.tsx` — the portrait 4×4 board
- `src/app/` — onboarding, tabs (today / chart / ask / me), paywall
- `src/i18n/` — one file per language; `en.ts` defines the shape
- `src/lib/purchases.ts` — StoreKit via `expo-iap`; any of the three products grants Plus
- Backend route: `apps/nextjs/src/app/api/app/chat/route.ts` in this repo

## Plans

| | Product ID | Price (US) |
|---|---|---|
| Yearly, 7-day trial | `inkstar_plus_yearly` | $39.99 |
| Monthly | `inkstar_plus_monthly` | $6.99 |
| Lifetime | `inkstar_plus_lifetime` | $79.99 |

Free: full chart, all palace notes, daily focus, 3 answered questions a day. Plus: unlimited questions. Nothing is sold à la carte.

This lives outside the bun workspaces (`apps/*`) on purpose: the root `check-deps` step requires one React version across workspaces.
