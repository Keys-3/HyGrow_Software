# HyGrow app

Use Node 22 LTS (22.13+) and `npm ci` in this directory. Copy `.env.example` to
`.env`, configure the backend and device ID, then run `npm start` or `npm run web`.
For complete setup, device/network caveats and mobile release instructions, see
[the software guide](../README.md). Security rules and provisioning are described
in [SECURITY.md](SECURITY.md).

Checks: `npm run typecheck`, `npm test`, `npm run build:web`, and
`npx expo install --check`. Native builds must use dependencies aligned to Expo
SDK 57. Firmware sensor status is real; unsupported controls stay disabled.

## Frontend structure

- `app/`: Expo Router screens and route layouts. `(tabs)/_layout.js` owns the
  responsive navigation and top/side safe areas: bottom tabs below 768px,
  an icon sidebar from 768px, and a full sidebar from 1024px.
- `src/components/layout/`: shared page layout. Use `PageScrollView` for tab
  pages with scrolling content; it provides mobile gutters, a 1200px content
  limit and consistent vertical spacing. Pass scroll props through as usual.
- `src/components/`: reusable cards, charts, navigation and feedback.
- `src/hooks/`, `src/services/`, `src/store/`: data subscriptions, platform/API
  integrations, and application state respectively.
- `src/theme/`: shared colors, spacing and typography. `src/utils/layout.ts`
  contains pure grid sizing; measure the containing view instead of the window
  when sizing cards and charts inside a sidebar or another card.
