# IGNITION

**Breathe to light the forge.** A 3-minute start ritual for the moment before hard work. Your breath is the controller. A camera reads your breathing and pulse through the [Presage SmartSpectra SDK](https://github.com/Presage-Security/SmartSpectra). The fire on screen grows only while your *measured* breath follows a slow pace.

Entry for the DEV "Presage SmartSpectra SDK Challenge" (November 2026). The post draft is in [SUBMISSION.md](SUBMISSION.md).

> Not a medical device. General wellness and information only. Not cleared by the FDA. No diagnosis, no treatment, no health advice.

## What it does

1. **Consent.** The first screen says what the camera does, what leaves the computer, and what is saved. The camera cannot start until you tick the box.
2. **Settle (30 s).** Sit still. The SDK reads your starting breathing rate, pulse and HRV.
3. **Kindle (3 min).** A dashed ring shows a slow pace (4 s in, 6 s out). A solid ring shows your chest movement, live. Match the rings. When your real breath follows the pace, the fire grows. If you stop, it cools. The glow beats at your measured pulse.
4. **Result.** The camera turns off. You see start-to-end readings. You write one small first action and start a 10-minute timer on it.
5. **Keep or discard.** Nothing is saved unless you press Save. Saved sessions stay on your computer and you can delete them.

## Live Presage signals used

| Signal | SDK field | What the app does with it |
| --- | --- | --- |
| Chest breathing trace | `metrics.breathing.upperTrace` | Drives the live breath ring and the flame, and is compared with the pacer to get breath sync |
| Breathing rate | `metrics.breathing.rate` | Second half of the sync score, live tile, start/end result |
| Pulse rate | `metrics.cardio.pulseRate` | The fire glow beats at this rate, live tile, start/end result |
| HRV (RMSSD) | `metrics.cardio.hrv` | Live tile, start/end result |
| Validation status | `validationStatus` event | Plain instructions ("Too dark. Add light in front of you.") |

If the API key is not enabled for pulse and HRV, the app tells you and runs on breathing only.

## Where the SDK is in the code

| File | What to look at |
| --- | --- |
| [`main.js`](main.js) | `bindSmartSpectraIpc(win)` and the camera-only permission rule |
| [`preload.js`](preload.js) | `require('@smartspectra/node-sdk/preload')` |
| [`src/renderer.js`](src/renderer.js) | Search for `SDK:`. `new SmartSpectraSDK(...)`, `sdk.start()`, the `metrics`, `validationStatus`, `streamAvailable` and `error` events, `decodeMetrics(buf)`, `sdk.stop()`, `sdk.destroy()` |
| [`src/engine.js`](src/engine.js) | How the decoded metrics become breath level, breath sync, fire heat and start/end results |
| [`src/flame.js`](src/flame.js) | Canvas drawing |
| [`src/sim.js`](src/sim.js) | Simulation for development only. Not Presage data. Not used in `npm start` |

## Setup

You need: Node.js 22.12 or newer, a camera, an internet connection, and a Presage API key from <https://physiology.presagetech.com>. Supported by the SDK: macOS on Apple Silicon, Windows x64, Linux x64/arm64 (glibc 2.35+).

```bash
git clone https://github.com/mcnairc260-cmyk/dragon-phoenix-command.git
cd dragon-phoenix-command/apps/ignition
npm install      # large: the SDK downloads its native runtime for all platforms
npm start
```

Paste the API key on the first screen. Or give it as an environment variable, and the app hides the key field:

```bash
SMARTSPECTRA_API_KEY=your_key npm start
```

In a VS Code terminal use `env -u ELECTRON_RUN_AS_NODE npm start`.

For a good reading: face a light, keep your face and chest in view, sit still.

Other commands:

```bash
npm test         # unit tests for the signal engine (Node built-in test runner)
npm run sim      # the screens with a SIMULATED signal. No camera, no key, no Presage data
```

## Consent and data handling

- **Consent first.** The camera cannot start before the consent box is ticked. The consent screen shows on each launch.
- **Camera state is always visible.** A "CAMERA ON / CAMERA OFF" light is at the top of the window, with a small mirror of the picture. "Stop and turn camera off" is there during the full session. The camera also stops by itself when the session ends.
- **Camera only.** The app permits the camera permission only. No microphone.
- **Video.** This app does not record, save or send video frames. Frames go to the SmartSpectra SDK process on the same computer. Presage states that the SDK computes the vitals on the device.
- **Readings.** Shown live. Kept in memory during the session. Saved only if you press Save, in the app's local storage on your computer (`localStorage`: date, start/end breathing rate, pulse, HRV, sync time, and your first-action text). Delete one row or all rows in "My saved sessions". No account, no cloud, no analytics, no sharing.
- **API key.** Kept in memory. Saved (as plain text in the app's local storage) only if you tick "Remember". "Forget the saved API key" deletes it.
- **What the SDK sends to Presage.** To operate, the SDK connects to Presage servers to check the API key, register the device, check account usage and metric authorization, and download its models. We saw these calls in the SDK log. These are necessary for the SDK and this app cannot turn them off.
- **SDK telemetry.** The SDK default is ON. **This app sets it to OFF** (`enableTelemetry: false`). You can turn it on in the consent screen. If on, Presage receives session summaries and device-readiness reports: SDK build, platform, OS version, device model, performance counts, validation counts, error codes, time. Presage states that no raw video and no measured vitals are in telemetry, that reports can be linked to the API key account (so it is not anonymous), and that no automatic expiration is set for them. See Presage's [Telemetry and Privacy](https://github.com/Presage-Security/SmartSpectra/blob/main/docs/telemetry-and-privacy.md) page and [Privacy Policy](https://api.physiology.presagetech.com/privacypolicy).
- **No AI service.** The app does not use the SDK's LLM Insights or any other AI service.
- **No network from the page.** The page's Content Security Policy has `connect-src 'none'`. No fonts, scripts or trackers are loaded from the internet.
- **Self-use only.** The app is for the person in front of the camera. The SDK also reports when more than one face is in view, and the app then asks for one person only.
- **No medical claims.** The app shows your readings and never tells you what they mean for your health.

## What is tested, and what is not

- Tested: the signal engine (`npm test`, 8 tests); the full screen flow with the simulated signal in a headless browser; the real Electron app with the real SDK on Linux with a test-pattern camera and an invalid key (the SDK loaded, the camera opened at 1280x720, the SDK contacted Presage, the error path stopped the camera and showed a clear message).
- **Not tested yet: a live reading from a real person with a valid key.** The build machine had no camera and no access to Presage servers. Do this first on your own computer.

## License and credits

App code: see the repository. The SmartSpectra SDK is proprietary software of Presage Technologies, used under Presage's Terms of Service.
