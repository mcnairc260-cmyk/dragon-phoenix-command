# EMBERLOOP — iPhone app

The game is wrapped as a native iPhone app with **Capacitor 8**. The game code is the
same code as the web version. The Xcode project is in `ios/` (Swift Package Manager,
no CocoaPods).

## What is different in the app

| Item | Web / PWA | iPhone app |
|---|---|---|
| Haptics | None on iOS Safari | Taptic Engine (`@capacitor/haptics`) |
| Offline | Service worker | Game ships inside the app; no service worker |
| Orientation | Rotate overlay | Locked to portrait |
| Status bar | Browser chrome | Hidden, full screen |
| Devices | Any | iPhone only (`TARGETED_DEVICE_FAMILY = 1`) |

## Build on a Mac (needs Xcode 16+ and Node 22+)

```bash
cd games/emberloop
npm install
npm run ios:sync      # builds dist/ and copies it into ios/
npm run ios:open      # opens the project in Xcode
```

In Xcode:

1. Select target **App → Signing & Capabilities** and select your **Team**.
   A free Apple ID works for your own phone (app expires after 7 days).
2. Connect the iPhone with a cable, select it as the run target, press **Run (⌘R)**.
3. First time only: on the iPhone, **Settings → General → VPN & Device Management**
   → trust your developer certificate. On iOS 16+, also turn on
   **Settings → Privacy & Security → Developer Mode**.

## After you change the game

Run `npm run ios:sync` again, then Run in Xcode.

## Icons and launch screen

`npm run icons` writes the web icons **and** the iOS app icon (1024 px, no alpha
channel, as Apple requires) and the launch image into `ios/App/App/Assets.xcassets`.

## App Store (founder decision — not done)

Needs: Apple Developer Program ($99/year), bundle ID `com.dragonphoenixascension.emberloop`
registered (change it in `capacitor.config.ts` and Xcode if you want a different one),
a privacy policy URL, screenshots, and an age rating. Then in Xcode: **Product → Archive →
Distribute App → App Store Connect**, and test through TestFlight first.
The app collects no data (progress stays on the device), so the privacy label is
"Data Not Collected". `ITSAppUsesNonExemptEncryption` is already `false`.
