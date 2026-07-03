# Agri-Transportation & Market Logistics — Project Scaffold

Android-only React Native (Expo) + Firebase implementation of the Agri-Transportation
System Architecture. This is a working scaffold: real screens, real Firestore
service calls, real Cloud Functions — wire in your Firebase project and it runs.

## What's included

```
agri-logistics/
  App.js                     entry point
  app.json                   Expo config
  package.json
  firestore.rules            role-based security rules
  firestore.indexes.json     composite indexes the queries need
  firebase.json              Firebase CLI project config
  src/
    firebase/config.js       Firebase SDK init
    navigation/               role-based stacks (Root -> Farmer/TransportOwner/Driver/Sangam/ShopOwner)
    screens/                  one folder per role, functional screens wired to services
    services/                 Firestore read/write helpers (shipments, users, pin, marketOps, notifications)
    store/                    zustand stores (auth, active shipment)
    i18n/                     en / te / ta translation files
  functions/
    index.js                  exports all Cloud Functions
    src/
      onDriverAssigned.js      notifies Farmer + Driver on assignment
      onPickupSubmitted.js     generates PIN, notifies Farmer/Owner/Shop Owners
      verifyPin.js             server-side PIN check + retry/lockout logic
      expireOldPins.js         scheduled cleanup of stale shipments
      onSaleLogged.js          notifies Farmer/Driver/Owner on final sale
```

## Prerequisites

- Node.js 18+ and npm
- A Google account for Firebase Console
- Android Studio (for an emulator) or a physical Android device with Expo Go, or later a dev build
- `npm install -g eas-cli firebase-tools`

## Step 1 — Create the Firebase project

1. Go to [console.firebase.google.com](https://console.firebase.google.com) → **Add project**.
2. Once created, go to **Build → Authentication → Sign-in method** → enable **Phone**.
3. Go to **Build → Firestore Database** → **Create database** → start in **production mode**.
4. Go to **Build → Cloud Messaging** — no setup needed here yet, it activates automatically.
5. Go to **Project settings → Usage and billing** → upgrade to the **Blaze plan** (pay-as-you-go). This is required for Cloud Functions to make outbound calls (e.g. sending push notifications) — it stays free at MVP-level usage, you just need a billing account attached.

## Step 2 — Register your Android app

1. In Project settings → **Your apps** → **Add app** → Android.
2. Package name: use the same value as `app.json`'s `expo.android.package` (currently `com.yourcompany.agrilogistics` — change this to your real package name in `app.json` first).
3. Download `google-services.json` and place it in the project root (`/agri-logistics/google-services.json`).
4. Also copy the web config values shown (apiKey, authDomain, etc.) — you'll need these for `.env` in Step 4.

## Step 3 — Install dependencies

```bash
cd agri-logistics
npm install
```

## Step 4 — Configure environment variables

```bash
cp .env.example .env
```

Fill in the values from your Firebase project settings (Step 2.4).

## Step 5 — Deploy Firestore rules, indexes, and Cloud Functions

```bash
firebase login
cp .firebaserc.example .firebaserc
# edit .firebaserc and set your actual project id

firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes

cd functions
npm install
cd ..
firebase deploy --only functions
```

This deploys `verifyPin`, `onPickupSubmitted`, `onDriverAssigned`, `onSaleLogged`, and the scheduled `expireOldPins`.

## Step 6 — Seed initial user accounts

There's no self-service signup screen by design (see architecture doc — roles are
assigned, not chosen). For local testing, manually create a few documents in the
Firestore console under `users/{uid}`:

```
users/{uid}
  role: "transport_owner"
  phone: "+91XXXXXXXXXX"
  name: "Test Transport Owner"
  language: "te"
```

Get real `uid` values by first signing in once via the app's phone-OTP screen
(this creates the Firebase Auth user), then copying that uid into a matching
Firestore `users/{uid}` document with the role/details above. Repeat for one
test user per role (farmer, driver, sangam, shop_owner) to exercise the full flow.

> **Note on phone auth in Expo:** `firebase/auth`'s `signInWithPhoneNumber` (used in
> `LoginScreen.js`) needs additional native reCAPTCHA setup to work reliably on
> Expo-managed workflow. For a smoother path, switch to
> `@react-native-firebase/auth`'s native phone auth, which handles this without
> a visible reCAPTCHA challenge on Android. This is flagged directly in
> `LoginScreen.js` as a known follow-up.

## Step 7 — Run the app

```bash
npx expo start
```

Press `a` to open on an Android emulator, or scan the QR code with Expo Go on
a physical device. Note: `@react-native-firebase/messaging` requires a
**development build**, not the standard Expo Go app, once you're testing push
notifications — run `eas build --profile development --platform android` for that.

## Step 8 — Build for Google Play

```bash
eas build --platform android
```

Follow the prompts to log into your Expo account and configure the build.
Once built, submit the `.aab` to [Google Play Console](https://play.google.com/console)
(one-time $25 registration fee if you haven't already).

## How the pieces connect (quick reference)

| Architecture doc concept | Where it lives in this scaffold |
|---|---|
| Farmer/Transport Owner dual initiation | `services/shipments.js` → `requestPickup()`, called from `RequestPickupScreen.js` (Farmer) and `RaiseRequestScreen.js` (Transport Owner) |
| Driver assignment + notification | `AssignDriverScreen.js` → `assignDriver()` → triggers `functions/src/onDriverAssigned.js` |
| Pickup entry + PIN generation | `PickupEntryScreen.js` → `submitPickupEntry()` → triggers `functions/src/onPickupSubmitted.js` |
| PIN verification (server-side only) | `PinEntryScreen.js` → `services/pin.js` → `functions/src/verifyPin.js` |
| Retry limit + lockout | `functions/src/verifyPin.js` (5 attempts, 15-min lockout) |
| Shop Owner "own count only" visibility | Enforced in `firestore.rules` (`shopAllocations.hasAny(...)`) and mirrored in `InboundForecastScreen.js` |
| Partial sale logging | `SaleLoggingScreen.js` + `services/marketOps.js` → `logSale()` with `isFinal` flag |
| Farmer sees full price on close | `functions/src/onSaleLogged.js` fires only when `isFinal === true` |
| Discrepancy tickets | `DiscrepancyScreen.js` → `services/marketOps.js` → `raiseDiscrepancy()` |
| Multi-language (Telugu/Tamil/English) | `src/i18n/` — language set per-user in `users/{uid}.language`, applied on login in `LoginScreen.js` |

## Known follow-ups (intentionally left as scaffolding, not solved)

- **Phone auth reCAPTCHA**: see Step 6 note — swap to `@react-native-firebase/auth` for production.
- **Shop Owner query on `shopAllocations`**: `InboundForecastScreen.js` uses `array-contains`
  with a partial object, which Firestore doesn't reliably support. Add a denormalized
  `shopOwnerIds: [uid, ...]` array field on the shipment document (written alongside
  `shopAllocations` in `submitPickupEntry`) and query against that instead.
- **Driver/shop selection dropdowns**: `AssignDriverScreen.js` and `RaiseRequestScreen.js`
  currently use free-text ID entry. Replace with a proper picker populated from a
  `users` query filtered by role, once you have real onboarded users to select from.
- **Vehicle-number-to-shipment lookup**: `TruckArrivalScreen.js` takes a manual shipment
  ID for scaffold simplicity — wire this to an actual query matching the driver's
  vehicle number to their active `picked_up` shipment.
- **Discrepancy resolution UI**: `resolveDiscrepancy()` exists in `services/marketOps.js`
  but there's no Sangam-side screen consuming it yet — add one when you build out
  the dispute-handling flow.
