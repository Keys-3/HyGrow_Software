# HyGrow

Expo app, Express API and an optional Firebase disease function. Firmware lives
in the parent project's `HyGrow_IoT` repository.

## Run locally

Install **Node.js 22 LTS (22.13+)**. From this directory:

```powershell
npm run install-all
npm start
```

This installs from all three lockfiles, then starts the web app and API together.
For later runs, use only `npm start`. Stop with **Ctrl+C**.

First-time environment setup (preserves existing files):

```powershell
if (!(Test-Path FrontEnd/.env)) { Copy-Item FrontEnd/.env.example FrontEnd/.env }
if (!(Test-Path BackEnd/.env)) { Copy-Item BackEnd/.env.example BackEnd/.env }
```

Fill in the settings for the services you use. In `FrontEnd/.env`, set
`EXPO_PUBLIC_BACKEND_URL` and `EXPO_PUBLIC_DEVICE_ID`. For phones, use your
computer's LAN IP instead of `localhost`, keep both devices on the same Wi-Fi,
and allow port 3000 through the computer firewall. Browser clients on another
computer also need their exact Expo origin in backend `ALLOWED_ORIGINS`.
Release builds require an explicitly configured HTTPS API URL.

Backend Firebase operations need Application Default Credentials; Firebase CLI
login alone is insufficient. Provider keys belong in `BackEnd/.env`. See
[backend configuration](BackEnd/README.md). Existing encrypted `.env.age` files
can be restored locally with the owner's private key; never commit the key or
plaintext environment. The separate Firebase Function uses Node 24.

For native development use `npm run dev` instead of `npm start`, then follow
Expo's device instructions. Native modules require a development build.
`FrontEnd/` is the sole Expo app; the root is only a command runner.

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
