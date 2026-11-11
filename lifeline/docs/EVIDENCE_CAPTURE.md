# Emergency Evidence Capture — feasibility specification (NOT BUILT)

**Status: specification only. No capture, upload or storage code exists. There is no demonstration of it in the app, by decision: a fake "evidence preserved" screen could be mistaken for a working safety feature.**

Purpose: the member takes photos or short video in a dangerous situation; the media leaves the phone fast and is kept where taking or breaking the phone cannot destroy it. It is **evidence preservation**. It is not deterrence, not rescue, and not proof of anything by itself.

## 1. Feasibility by platform

| Capability | Mobile web (Safari/Chrome) | Native iOS / Android |
|---|---|---|
| User-initiated photo, front or rear | Yes (`getUserMedia`, `<input capture>`) | Yes |
| Short video | Yes (`MediaRecorder`; codec differences on iOS) | Yes |
| Fast access (one or two taps from lock screen) | No. Must unlock, open browser, load page | Partly: lock-screen widget, Action Button, App Shortcut. Still needs unlock for most capture paths |
| Upload continues if the app is closed or the screen locks | **No.** Upload stops when the page is suspended | Yes, with background upload sessions (iOS `URLSession` background, Android `WorkManager`) — timing is decided by the OS |
| Capture with screen off or hidden | No | No. **The OS shows a camera indicator and this must not be bypassed** |
| Encrypted offline queue | Weak (IndexedDB; can be cleared) | Yes (file protection + Keychain/Keystore keys) |

Conclusion: **a reliable version needs native apps.** A web version can exist only as a clearly limited "capture while the page is open" tool.

## 2. Proposed architecture

```
Capture (native API, OS indicator visible)
  → chunk (~256 KB) → encrypt each chunk on device (AES-256-GCM, per-capture key)
  → upload chunks as they are produced (resumable; each chunk acknowledged)
  → server stores chunks in write-once object storage (object lock / retention mode)
  → server records: chunk hashes, capture hash, server receive time, uploader session   → audit chain (existing audit.ts)
  → only after the FIRST chunk is safely stored: status "partly preserved"; after the last: "preserved"
  → notify authorised Lifelines with a link (existing outbox + consent model), never the media itself
  → Lifeline opens link → authenticates (email code at minimum) → time-limited view; every access audited
```

Key decisions to make:
- **Who can decrypt?** Option A: server holds keys (simple; Lifelines can view; the company can be compelled to produce). Option B: keys wrapped to Lifelines' public keys (stronger privacy; Lifelines need accounts and key management). Start with A, state it plainly.
- **Streaming chunks** matter more than total upload time: if the phone is taken after five seconds, five seconds are already off the device.
- Media is never sent by SMS/MMS or as an email attachment.

Reuse from the MVP: outbox, consent records, acknowledgment tokens, audit chain, escalation stages, VaultLock (recipients of evidence are part of the sealed policy).

## 3. Truthfulness rules (requirements, not suggestions)

- Show "preserved" **only** after the server confirmed storage of the final chunk. Show "partly preserved (N seconds)" for partial uploads. Show "not uploaded" plainly when offline.
- The optional warning text ("Emergency evidence has been securely preserved and designated contacts have been notified") may appear **only** when both facts are true at that moment, **only** if the member turned it on, and **never** automatically. It can raise the danger in some situations; the set-up screen must say so.
- No claim that media is admissible in court, or that it proves identity or wrongdoing. Offer: original file kept unmodified, cryptographic hash, server receive time, access log. Device clock and location are not trusted facts. C2PA provenance metadata can be added where the device supports it.

## 4. Legal and safety review needed before any build

- Audio recording consent laws (several US states and many countries require all-party consent). Photo/video without audio is treated differently. The default may need to be video without audio.
- Privacy of bystanders and of the person recorded; minors.
- Retention, deletion and legal holds; responding to subpoenas; what happens to evidence when an account is deleted.
- Content risk: the service will hold violent or intimate images. Needs storage policy, staff access rules, and reporting duties review.
- Retaliation risk; review by domestic-violence specialists.
- App store review rules for recording features.

## 5. Test plan (future — **no test here has been written or run**)

| Area | Cases |
|---|---|
| Camera permission | First-use prompt; denied; revoked in settings mid-session; restricted by parental controls; indicator visible in every capture path |
| Media encryption | Each chunk decrypts only with the capture key; nonce never reused; tampered chunk rejected; key never written to logs |
| Interrupted uploads | Airplane mode at 0 %, 50 %, 99 %; app killed; phone powered off; resume after hours; duplicate chunk upload; out-of-order chunks; expired session during upload |
| Remote integrity | Stored hash equals device hash; object-lock prevents overwrite and delete; audit chain entry for every chunk and every view |
| Recipient authorization | Link without authentication shows nothing; expired link; revoked Lifeline; Lifeline who opted out; forwarded link opened by a stranger; rate limits |
| Accidental activation | Pocket activation; confirmation design that is fast but not accidental; cancel window; clear way to mark a capture as a mistake **without** deleting the audit record |
| Privacy controls | Audio off by default where required; location off by default; member can see who viewed what |
| Deletion and retention | Scheduled expiry; member-requested deletion; deletion blocked under legal hold; account deletion |
| Duress-flow behaviour (ShadowMode) | Duress check-in screen identical to normal (pixel and timing comparison); no trace in settings, export or member-visible log; mistyped-passphrase false positive path; stand-down path |
| Visible warning risks | Warning never shown before server confirmation; never shown when the option is off; never shown automatically; copy reviewed by safety specialists |
| Platform limits | iOS background upload budget; Android Doze; low storage; low battery mode; iOS Lockdown Mode; old OS versions |
