# HyGrow app

Use Node 22 LTS (22.13+) and `npm ci` in this directory. Copy `.env.example` to
`.env`, configure the backend and device ID, then run `npm start` or `npm run web`.
For complete setup, device/network caveats and mobile release instructions, see
[the software guide](../README.md). Security rules and provisioning are described
in [SECURITY.md](SECURITY.md).

Checks: `npm run typecheck`, `npm test`, `npm run build:web`, and
`npx expo install --check`. Native builds must use dependencies aligned to Expo
SDK 57. Firmware sensor status is real; unsupported controls stay disabled.

Farmers and admins can select a device under **Settings > Sensor device** without
rebuilding the app. Saving creates or updates `users/{uid}.preferences.deviceId`
in Firestore and syncs it across signed-in devices. A local cache overrides
`EXPO_PUBLIC_DEVICE_ID`. Saving switches subscriptions and clears previous-device
readings. This selects an existing device; it does not grant access or provision
ownership. Current firmware must upload schema 1 to `devices/{deviceId}` with
ownership provisioned as described in SECURITY.md. Legacy `sensor_readings`
documents do not contain the required freshness and sensor health metadata.

After changing `.env`, restart Expo; web exports must be rebuilt because Expo
embeds public environment values at build time. Encrypted `.env.age` files are
backups, not runtime configuration, and need decrypting before a build.

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

## Local monitoring without internet

Set `EXPO_PUBLIC_LOCAL_STATUS_URL` to the board's LAN `/status` endpoint and
restart Expo (or rebuild the web export). The frontend and ESP32 must share a
reachable network. After one successful farmer sign-in, the local dashboard can
reload using the existing Firebase Auth session and a minimal account-matched
farmer profile cache. First-time sign-in, marketplace services and AI still need
internet. Serve/open the frontend locally before disconnecting internet; this
change does not install an offline website service worker.

Verified on 31 October with real ESP32 readings: external browser requests were
blocked while LAN requests remained allowed; a full page reload passed and
Local HTTP samples advanced from sequence 155 to 158. The PC network and router
WAN were not disconnected. See the IoT hardware verification receipt.
