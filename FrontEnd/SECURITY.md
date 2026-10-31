# Prototype Firebase access controls

The full `firestore.rules` and `storage.rules` remain reviewable prototypes.
On 31 October 2026, a scoped device-path fix was deployed from
`firestore.live.rules`, preserving the existing rules for other collections.
Its Google Rules compilation returned no issues, and an authenticated read using
the configured firmware credentials returned HTTP 404 for the missing
`devices/ESP32S3_001` document, rather than permission denied. The deployment
receipt is `docs/firebase-device-rules-release.json`.

The live device rule permits signed-in single-document checks for missing IDs,
so the app can explain missing provisioning. Existing device documents remain
readable only by their owner, device credential, or a signed admin claim.
Listing and client creation/deletion are denied; telemetry updates require the
provisioned device credential and canonical schema. No telemetry or ownership
documents were fabricated. This deployment does not migrate legacy firmware,
provision device ownership, or deploy the broader prototype rules below.

The proposed rules use signed Firebase `admin: true` custom claims for administrators, account ownership for private profiles, server-managed orders/payment state, and a provisioned device credential for telemetry. Clients cannot assign admin privileges, change profile ownership, write paid orders, cancel orders directly, or decrement another seller's stock.

## Required trusted provisioning and migration

- Audit existing users before granting administrator custom claims using the Admin SDK. A `users/{uid}.role` string does not confer administrator privileges. New self-service profiles can only be `farmer` or `customer`; profile uid/email/role/createdAt are immutable.
- Before a device uploads, use a trusted Admin SDK process to create `devices/{EXPO_PUBLIC_DEVICE_ID}` with `owner_uid` (the app owner's Firebase UID) and `device_auth_uid` (the device's distinct Firebase email/password account UID). Never reuse a human account for device authentication. Do not ship Admin SDK credentials to the app or firmware.
- Firmware writes canonical telemetry version 1 with Firestore `updateMask` and a server timestamp transform. The mask deliberately excludes `owner_uid` and `device_auth_uid`, preserving both fields. The first upload must include the complete canonical telemetry schema. An unprovisioned document is denied. The default rules cover the `devices` collection only; a custom firmware collection needs an explicitly reviewed matching rule.
- Existing device documents with extra legacy fields need trusted migration to the documented schema. Client writes cannot add unexpected keys, transfer ownership, or update other devices.
- Backfill `orders.seller_ids` from authoritative `order_items` before expecting sellers to see historical orders. The backend creates all new orders, items, tracking and stock mutations atomically. Historical `PAY:ONLINE`/`TXN:` text in notes is not proof of payment; reconcile historical payments against the gateway.
- Normalize historical inventory/listing currency to `INR` through a trusted migration after confirming the actual currency. New client writes use `INR`; invalid or ambiguous legacy currency is not accepted by the validators.
- AI result documents require server-supplied `owner_uid`. Existing globally scoped results are intentionally inaccessible to ordinary users. Current prediction APIs return results directly; they do not need to write these collections.
- Marketplace listing documents already contain seller display name/location. Customer clients do not read private seller profiles. The email service resolves the seller address on the server from the listing; callers cannot pick arbitrary recipients.
- Account deletion and broad data cleanup require an audited server process with reauthentication, identity deletion and order/payment reconciliation. The app no longer performs destructive multi-document loops or an email-allowlist-based data purge.
- Storage is private to `users/{uid}/...`, with images limited to JPEG, PNG or WebP and 10 MiB. There is no public image bucket in this prototype. A future public marketplace image workflow needs an explicit separate policy.

## Local verification

Unit regression tests run with `npm test`; TypeScript checks run with `npm run typecheck`.

Run Firestore rules tests with a local emulator; the suite refuses non-loopback hosts and uses only the synthetic `demo-hygrow-security` project:

```powershell
# Terminal 1 (uses the project's firestore.rules)
firebase emulators:start --only firestore --project demo-hygrow-security
# Terminal 2
$env:FIRESTORE_EMULATOR_HOST = '127.0.0.1:8787'
node --test tests/firebaseRules.emulator.mjs
```

The rules suite uses the installed Firebase SDK's emulator mock tokens. It does not require a service account or an additional testing package. Seeding uses only the emulator's special `owner` token and is not usable against a live project.

This environment blocked localhost sockets (`EACCES` / Java `Unable to establish loopback connection`), so the Firestore emulator could not start and the rules attack suite could not execute here. The rules are not claimed to have passed emulator compilation or execution. Storage rules also still require emulator validation. Do not deploy these prototypes until compilation, positive access paths, negative attacks, and existing data migrations have been reviewed successfully.

## Attack coverage

The executable suite includes positive controls and denial assertions for:

| Boundary | Attacks exercised |
| --- | --- |
| Private profiles | Unauthenticated list, another account's read, unrestricted authenticated list |
| Signup and updates | Self-assigned admin, spoofed UID/email, unknown privilege fields, immutable timestamps/roles, missing required fields, wrong types, oversized text, invalid preference maps |
| Inventory and listings | Another owner's mutation, ownership transfer, negative quantity/price, schema pollution, inactive listing leaks, unauthenticated marketplace access |
| Orders and payments | Forged orders/items/tracking/consumption; direct paid/status/total mutation, including signed admin clients |
| Device telemetry | App writes, wrong device credential, unprovisioned creates, ownership transfer, credential replacement, malformed sensor health, out-of-range readings |
| AI results | Unscoped latest-result queries, forged results, unknown collections |

The final fallback rule denies every unmatched path, including legacy global sensor histories. The app reads only its explicitly selected provisioned device document.
