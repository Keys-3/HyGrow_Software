# HyGrow

Expo app, Express API and an optional Firebase disease function. Firmware lives
in the parent project's `HyGrow_IoT` repository.

## Run on a new computer

Use Node.js 22.13 or newer (Node 22 LTS is used in CI and Docker), npm, and Git.
From this directory:

```sh
npm ci
npm --prefix FrontEnd ci
npm --prefix BackEnd ci
npm run dev
```

Each directory has its own lockfile. Use `npm ci`, not dependency upgrades, for
reproducible installs. `FrontEnd/` is the only Expo app; the root only runs it
alongside the API. SDK 57, React 19.2.3 and React Native 0.86.3 must stay aligned.

Copy `FrontEnd/.env.example` and `BackEnd/.env.example` to their respective
`.env` files and configure your services. Encrypted `.env.age` backups use the
owner's age recipient; decrypt locally with your private key. Never commit the
plaintext, private keys, device secrets or Admin SDK credentials.

For a physical phone, `EXPO_PUBLIC_BACKEND_URL` must use your computer's reachable
LAN IP and port 3000, or a deployed HTTPS API URL. `localhost` on a phone points
to the phone. Keep devices on the same Wi-Fi and permit the API through your
computer firewall. Production requests require an explicitly configured HTTPS
backend. Backend Admin SDK writes need Application Default Credentials and
`FIREBASE_PROJECT_ID`; see `BackEnd/README.md`.

## Device integration

Set `EXPO_PUBLIC_DEVICE_ID` to the exact firmware Firestore document ID. The app
reads `devices/{deviceId}` using canonical firmware schema 1. Configure ownership
and security rules as described in `FrontEnd/SECURITY.md`. Optional
`EXPO_PUBLIC_LOCAL_STATUS_URL=http://<device-ip>/status` enables local polling.
No native UDP discovery is implemented. Nulls remain unavailable; TDS is ppm,
not EC. Pump control and CO2 readings are unavailable with this firmware.
Charts contain observed completed samples from the current session, not stored
24-hour/seven-day history. Disabled/failed/stale/simulated sensors are labelled.

Native local HTTP/permissions and browser mixed-content restrictions differ.
Use cloud transport for HTTPS web deployments when local HTTP is blocked.
Verify LAN behavior on physical devices; a successful bundle is not a radio test.

## Check and build

```sh
npm --prefix FrontEnd run typecheck
npm --prefix FrontEnd test
npm --prefix BackEnd test
npm --prefix FrontEnd run build:web
```

Native dependencies need a development build; Expo Go is not the full app.
Run `npx expo prebuild --clean` inside `FrontEnd/` when changing SDK/native config
(back up intentional native customizations first). iOS native compilation needs
macOS/Xcode. The mobile release workflow regenerates native projects, builds a
debug-key-signed Android test APK and unsigned iOS IPA; neither is a store release.
Set workflow repository variables `EXPO_PUBLIC_BACKEND_URL` and
`EXPO_PUBLIC_DEVICE_ID`. Fingerprinted OTA runtimes prevent incompatible native
and JavaScript updates from being mixed.

Firestore/Storage rules, indexes, server credentials and firmware uploads are
separate deployment steps. See the parent `docs/final-review.md` for validation
results and actions that still require live services or physical devices.
