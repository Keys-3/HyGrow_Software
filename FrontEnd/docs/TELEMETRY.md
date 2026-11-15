# Device telemetry integration

The app consumes firmware schema 1 over LAN and from the flat fields in Firestore. Firestore also carries a grouped schema 2 map under `telemetry`. [Firmware telemetry layout](https://github.com/Vaibhavsh0120/HyGrow_IoT/blob/main/README.md#firestore-telemetry-layout)

## Configuration

Set these public Expo environment variables before starting/exporting the app:

```dotenv
# Optional fallback when the account has no Device ID set in Settings.
EXPO_PUBLIC_DEVICE_ID=grow-01
# Optional known-address local transport. No UDP discovery is implemented.
EXPO_PUBLIC_LOCAL_STATUS_URL=http://192.168.0.42/status
# Optional expected physical board identifier; otherwise the first validated board
# is pinned for the current mounted session.
EXPO_PUBLIC_HARDWARE_ID=esp32-aabbccddeeff
```

Replace the example IDs/address with the board's actual configuration. Expo public environment variables are embedded in client builds and must contain no credentials. Changing them requires restarting the development bundler or producing another export/build.

Set the Device ID in the signed-in user's Settings, or use `EXPO_PUBLIC_DEVICE_ID` as the fallback. The selected ID must match the ESP32's configured Device ID. The app subscribes to one document at `devices/{deviceId}` under the signed-in Firebase user.

An owner can have multiple device documents with the same `owner_uid`. Each document also stores the Firebase Authentication UID for its ESP32 upload account in `device_auth_uid`. Select the device by its document ID in Settings. [Device provisioning and two-device example](https://github.com/Vaibhavsh0120/HyGrow_IoT/blob/main/README.md#device-identity-and-ownership)

`EXPO_PUBLIC_LOCAL_STATUS_URL` is optional and must be a complete plain-HTTP `/status` URL without credentials, query or fragment. Leave it absent for Firestore-only operation. It is an explicitly configured endpoint, not automatic discovery or trusted pairing. The app validates device ID, hardware ID, schema, timing and sensor metadata before accepting a response. A different board is rejected instead of silently replacing the selected board.

## Transport and availability

All screens share one reference-counted subscription/poller. The tab layout keeps it mounted while the session is open. Foreground entry retries the configured local endpoint; background entry cancels HTTP/timers and the cloud subscription. Signing into a different Firebase account and removing the final consumer clear the current sample and observation window.

Local requests have a two-second deadline and abort signal, with one request in flight. Successful requests poll at `max(2000, readIntervalMs)` milliseconds. Failures retry after 2, 4, 8 and then 15 seconds. Fresh local samples take priority; an authenticated cloud sample is the fallback. LAN reachability does not depend on an internet-connected flag. The app does not implement UDP discovery, subnet scans, Wi-Fi interface binding, automatic DHCP endpoint updates, or a dedicated Wi-Fi change listener. Update the explicitly configured URL when the address changes.

A one-second timer updates sample age even when Firestore emits nothing. Sample staleness uses `max(10000, 3 * readIntervalMs)` milliseconds. Cloud sample age adds elapsed time since the genuine Firestore `lastUpdated` timestamp to the uploaded `sampleAgeMs`; missing or future upload timestamps cannot establish freshness. Cloud reachability expires after `max(30000, 3 * readIntervalMs)` milliseconds; this is a recent-upload policy, not proof of a live socket to the board. A successful local response can establish transport reachability while its stalled sensor sample is stale. Sensor health and simulation remain independent of either transport status. Firmware `status: Online` never proves current online status or pump state.

## Readings and observations

The app maps TDS to `tds` in ppm, air temperature to degrees Celsius, humidity/water level to percent, light to lux, water temperature to degrees Celsius and VPD to kPa. Unsupported EC, CO2, pump and automation states remain null. No ppm-to-EC factor is assumed. Missing, disabled, waiting, failing or nonfinite measurements remain null; zero remains a valid reading. Simulation and the TDS 25-degree fallback compensation limitation appear beside measurements. Threshold notifications exclude stale, unavailable, simulated and fallback-compensated values.

History contains at most 100 actually observed completed samples, deduplicated by hardware ID, boot ID and sample sequence. Duplicate responses refresh transport timing without adding chart points. A new boot or simulation configuration starts another observation window. Chart time labels are observation times; the separately displayed estimated sample time is derived from response/upload time minus sample age. The window is in-memory session history, not a persisted 24-hour or weekly archive. Missing chart values leave gaps and are excluded from statistics.

Physical actuator switches are disabled. Command methods reject as unavailable until a real authenticated, acknowledged actuator protocol is implemented. They never claim success based on a request failure or update pump state optimistically.

## Platform limits and checks

The host tests use the production normalization helpers and production hook with simulated Firestore, lifecycle, clock and HTTP boundaries. They do not establish device sensor accuracy, physical radio reachability, deployed Firestore ownership rules, or signed mobile-app permissions.

On web, browser mixed-content/private-network restrictions can block HTTP from an HTTPS app even when firmware CORS permits it. On native platforms, validate local-network permissions and platform HTTP policy in the actual signed build. iOS local-network usage text and local-network ATS configuration do not establish the required UDP entitlement; UDP is not implemented here. Android local HTTP is an explicit native-build opt-in: when EXPO_PUBLIC_LOCAL_STATUS_URL is set during prebuild, plugins/withLocalTelemetry.js installs a network-security policy permitting cleartext only for that configured hostname, without subdomains; the base policy denies cleartext. There is no general cleartext exception. Changing the configured host requires another native prebuild/build, not just a JavaScript update. Target-dependent LAN permission handling, the generated native policy and HTTP behavior still require validation on a physical device. iOS uses NSAllowsLocalNetworking alongside its local-network usage description. This change does not claim native local transport is production-verified. Firestore remains the fallback when the platform rejects local HTTP.

Run from `FrontEnd`:

```powershell
npm test
npm run typecheck
npm run build:web
```

Use a real board to verify a router with WAN disconnected, missing/denied cloud access, null/failing/simulated sensors, a stalled sensor task with responsive HTTP, board reboot, wrong device/hardware IDs, phone background/foreground, and a changed IP. No device was flashed or commanded by these app checks.
