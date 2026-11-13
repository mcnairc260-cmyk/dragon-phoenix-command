# DEV post draft - Presage SmartSpectra SDK Challenge

**Status: DRAFT. Not published.** The official DEV template could not be opened from the build machine. Open the template on DEV, then paste each part below under the matching heading. Tag: `#presagechallenge`. Deadline: November 22, 2026, 11:59 PM PST. One entry per person, no teams, 18+.

Do not publish before the checklist at the end of this file is complete.

---

**Title:** IGNITION: your breath lights the fire before you start the work

**Tags:** `presagechallenge` `devchallenge` `electron` `javascript`

## What I Built

IGNITION is a 3-minute start ritual for the hardest moment of work: the start.

You sit in front of your laptop camera. A dashed ring on screen moves at a slow pace: 4 seconds in, 6 seconds out. A second ring shows your own chest movement, live, from the Presage SmartSpectra SDK. Your job is to make the two rings move as one. While your real breath follows the pace, a fire grows. If you stop, it cools. The glow of the fire beats at your measured pulse.

You cannot press a button to grow the fire. You cannot click through it. The only controller is your breath, and the camera is the only sensor. No wearable.

When the 3 minutes end, the camera turns off. You see your start-to-end breathing rate, pulse and HRV. Then the app asks one question: what is the one small first action? You write it, and a 10-minute timer starts. The ritual ends with you at work.

I built it because I know the feeling of a task that will not start. A breathing app tells you to breathe and then trusts you. IGNITION can see if you did it, and it gives the result back to you as fire.

It is not a medical device and it makes no health claims. It shows you your readings. It does not tell you what they mean.

## Demo

[VIDEO LINK HERE]

[SCREENSHOTS HERE: consent screen, kindle screen with both rings, result screen]

## Code

Repository: https://github.com/mcnairc260-cmyk/dragon-phoenix-command/tree/main/apps/ignition

Setup: `npm install`, `npm start`, paste a Presage API key. Full instructions are in the README.

## How I Used SmartSpectra

The app is an Electron desktop app made from the official Node.js starting point. It uses `@smartspectra/node-sdk` 3.5.0 with the breathing and cardio metric bundles.

- **Chest breathing trace** (`breathing.upperTrace`) is the main controller. It draws the live breath ring and moves the flame. The app also compares the last 20 seconds of the trace with the pacer wave to get a "breath sync" score. It tries a range of time shifts, because the SDK output has a small delay.
- **Breathing rate** (`breathing.rate`) is the second half of the sync score. The nearer you are to 6 breaths per minute, the higher the score.
- **Pulse rate** (`cardio.pulseRate`) sets the beat of the fire's glow.
- **HRV** (`cardio.hrv`, RMSSD) shows live and in the start-to-end result.
- **Validation status** becomes plain instructions: "Too dark. Add light in front of you."

The fire grows only when the sync score is above a threshold. So the reward follows the measured signal, not a timer.

If the API key is not enabled for cardio metrics, the app says so and runs on breathing only.

All SDK calls are in `src/renderer.js` and marked with `SDK:`. The signal logic is in `src/engine.js` and has unit tests.

## Consent and Data Handling

- **Consent before camera.** The first screen says in plain words what the camera does, what leaves the computer and what is saved. The camera cannot start until the person ticks the consent box. This screen shows on each launch.
- **The camera state is always visible.** A CAMERA ON / CAMERA OFF light is in the window at all times, with a small mirror of the picture. A stop button is there during the full session. The camera stops by itself when the session ends.
- **Camera only.** No microphone permission.
- **Video.** The app does not record, store or transmit video. Frames go to the SmartSpectra SDK on the same computer. Presage states that the SDK computes the vitals on the device.
- **Storage.** Nothing is stored by default. After a session the person can press Save. Then the date, start/end breathing rate, pulse, HRV, sync time and the first-action text are written to local storage on that computer only.
- **Retention and deletion.** Saved sessions stay until the person deletes them. One row or all rows can be deleted in the app. The API key is stored only if the person ticks "Remember", and can be deleted in the app.
- **Sharing.** None. No account, no cloud, no analytics. The page's Content Security Policy blocks all network connections from the page.
- **What the SDK sends to Presage.** The SDK connects to Presage servers to check the API key, register the device, check usage and metric authorization, and download its models. This is necessary for the SDK to operate.
- **SDK telemetry.** The SDK default is on. IGNITION sets it to **off**. The person can turn it on in the consent screen, where the app says what it contains: device and performance reports, no video, no readings, linked to the API key account, with retention set by Presage.
- **AI services.** None. The app does not use LLM Insights or any other AI service.
- **Self-use only.** The app is for the person in front of the camera. It is not a monitoring tool. If more than one face is in view, it asks for one person only.
- **No medical use.** General wellness and information only. Not cleared by the FDA. No diagnosis, no treatment, no health advice.

## Prize Categories

- **Most Creative or Delightful Use:** breath is the only game controller, and the fire cannot be cheated.
- **Best Thoughtful Real-World Use:** a clear need (starting a task), consent first, telemetry off by default, nothing stored without a choice, delete in one click.

---

## Demo video shot list (about 2 minutes)

Record the screen and your voice. Good light on your face. Sit still.

1. (10 s) The consent screen. Read one line: "The camera cannot start until I agree." Show the telemetry box is off. Tick consent. Press Begin.
2. (20 s) Settle. Show the CAMERA ON light, the mirror picture, and the live breathing rate and pulse tiles. Say: "These are live from the Presage SmartSpectra SDK."
3. (50 s) Kindle. Follow the pace. Say: "The solid ring is my chest, live. The dashed ring is the pace." Then **breathe fast for 10 seconds** to show the sync falls and the fire cools. Then return to the pace. This proves the signal is live.
4. (10 s) Cover the camera for 3 seconds to show the app instruction change.
5. (20 s) Result screen. Show CAMERA OFF. Show the start-to-end readings. Type a first action. Start the timer.
6. (10 s) Save. Open "My saved sessions". Delete the row.

Use the 1-minute session length for the video.

## Checklist before you publish

- [ ] The app runs on your computer with your own Presage key, and the readings move when you change your breathing.
- [ ] The video is recorded and uploaded. The link is in the post.
- [ ] The repository link works when you are logged out of GitHub.
- [ ] You opened the official DEV template and each required heading has text.
- [ ] You read the official rules and the Telemetry and Privacy page one time.
- [ ] The post has the tag `presagechallenge`.
