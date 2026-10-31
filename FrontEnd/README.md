# HyGrow app

Use Node 22 LTS (22.13+) and `npm ci` in this directory. Copy `.env.example` to
`.env`, configure the backend and device ID, then run `npm start` or `npm run web`.
For complete setup, device/network caveats and mobile release instructions, see
[the software guide](../README.md). Security rules and provisioning are described
in [SECURITY.md](SECURITY.md).

Checks: `npm run typecheck`, `npm test`, `npm run build:web`, and
`npx expo install --check`. Native builds must use dependencies aligned to Expo
SDK 57. Firmware sensor status is real; unsupported controls stay disabled.
