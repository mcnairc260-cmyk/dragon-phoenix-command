import { config } from './config';

// Wording rules: a missed check-in is never described as an emergency, injury or death.
// Messages never say that an earlier message was recalled.
const GUIDANCE = 'Lifeline cannot tell you why the check-in was missed. Try to reach them directly. If you believe someone is in danger, contact your local emergency services. Lifeline does not contact emergency services.';
const dur = (s: number) => (s >= 172800 ? `${Math.round(s / 86400)} days` : s >= 7200 ? `${Math.round(s / 3600)} hours` : `${Math.max(1, Math.round(s / 60))} minutes`);
const when = (d: Date) => d.toUTCString();
const who = (name: string) => name || 'A Lifeline member';

export const tpl = {
  dur,
  verifyEmail: (token: string) => ({
    subject: 'Confirm your email for Lifeline',
    body: `Confirm your email address to finish setting up Lifeline:\n${config.appUrl}/verify-email/${token}\n\nIf you did not create a Lifeline account, ignore this message.`,
  }),
  passwordReset: (token: string) => ({
    subject: 'Reset your Lifeline password',
    body: `Use this link to set a new sign-in password. It works once and expires in 1 hour:\n${config.appUrl}/reset/${token}\n\nA password reset does not change your Lifelines, your schedule, your check-in passphrase or VaultLock.`,
  }),
  newDevice: (ua: string) => ({
    subject: 'New sign-in to your Lifeline account',
    body: `Your account was signed in to from a browser we have not seen before:\n${ua || 'unknown browser'}\n\nIf this was not you, change your password now.`,
  }),
  consentRequest: (user: string, contact: string, channels: string[], token: string) => ({
    subject: `${who(user)} asked you to be their Lifeline`,
    body: `Hello ${contact},\n\n${who(user)} uses Lifeline, a check-in service. They asked to list you as a trusted contact ("a Lifeline").\n\nIf they miss a scheduled check-in, Lifeline would send you an automated message by: ${channels.join(', ')}.\n\nYou decide. Accept or decline here. You can change your answer at any time with the same link:\n${config.appUrl}/consent/${token}\n\nNo messages are sent to you unless you accept.`,
  }),
  reminder: (deadline: Date, left: number) => ({
    subject: `Lifeline reminder: check in within ${dur(left)}`,
    body: `Your next Lifeline check-in is due by ${when(deadline)} (about ${dur(left)} from now).\n\nCheck in: ${config.appUrl}/app`,
  }),
  finalWarning: (deadline: Date, grace: number) => ({
    subject: 'Lifeline: your check-in is overdue',
    body: `Your check-in was due at ${when(deadline)} and was not completed.\n\n${grace > 0 ? `You have a grace period of ${dur(grace)}. After that, your Lifelines will be notified.` : 'Your Lifelines will now be notified.'}\n\nCheck in now: ${config.appUrl}/app`,
  }),
  escalationNotice: () => ({
    subject: 'Lifeline: your Lifelines are being notified',
    body: `You did not check in before your deadline and grace period ended. Lifeline is now notifying your Lifelines as you configured.\n\nIf you are OK, check in now to stop messages that are not sent yet. Messages already sent cannot be recalled: ${config.appUrl}/app`,
  }),
  alert: (user: string, contact: string, custom: string, deadline: Date, ackToken: string, consentToken?: string) => ({
    subject: `${who(user)} missed a scheduled Lifeline check-in`,
    body: `Hello ${contact},\n\n${who(user)} listed you as a Lifeline. They did not complete a scheduled check-in that was due at ${when(deadline)}.\n\nThis means only that the check-in was missed. ${GUIDANCE}${custom ? `\n\nMessage from ${who(user)}, written in advance:\n"${custom}"` : ''}\n\nPlease confirm you received this message:\n${config.appUrl}/ack/${ackToken}${consentToken ? `\n\nStop receiving these messages: ${config.appUrl}/consent/${consentToken}` : ''}`,
  }),
  alertSms: (user: string, ackToken: string) =>
    `Lifeline: ${who(user)} missed a scheduled check-in. This means only that the check-in was missed. Try to reach them. If you believe they are in danger, call emergency services. Confirm receipt: ${config.appUrl}/ack/${ackToken} Reply STOP to opt out.`,
  alertVoice: (user: string) =>
    `This is an automated message from Lifeline. ${who(user)} listed you as a trusted contact. They missed a scheduled check-in. This means only that the check-in was missed. Please try to reach them. If you believe they are in danger, call your local emergency services. Check your email for more information.`,
  allClear: (user: string, contact: string, at: Date) => ({
    subject: `${who(user)} completed a Lifeline check-in`,
    body: `Hello ${contact},\n\nEarlier, Lifeline told you that ${who(user)} missed a scheduled check-in. A verified check-in was completed on their account at ${when(at)}.\n\nLifeline cannot confirm their wellbeing. If you still have a concern, contact them directly.`,
  }),
  recoveryStartedUser: (effective: Date, cancelToken: string) => ({
    subject: 'Lifeline: a VaultLock recovery request was started',
    body: `A request to release VaultLock on your account was started with your recovery key.\n\nNothing has changed. Your protection stays active. The release can be completed after ${when(effective)}.\n\nIf you did not start this, cancel it now:\n${config.appUrl}/recover/cancel/${cancelToken}`,
  }),
  recoveryStartedContact: (user: string, contact: string, effective: Date) => ({
    subject: `Notice: ${who(user)} asked to change their sealed Lifeline settings`,
    body: `Hello ${contact},\n\nA request was started to unlock ${who(user)}'s sealed Lifeline settings. If it is not cancelled, the settings can be changed after ${when(effective)}.\n\nYou do not need to do anything. If this surprises you, contact ${who(user)} directly to check that they made this request.`,
  }),
  noRecipients: () => ({
    subject: 'Lifeline: nobody could be notified',
    body: `You missed a check-in, but none of your Lifelines have accepted notifications, so no one was notified.\n\nCheck in: ${config.appUrl}/app`,
  }),
};
