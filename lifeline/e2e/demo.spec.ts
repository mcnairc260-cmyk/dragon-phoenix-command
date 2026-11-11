import { expect, test, type Page } from '@playwright/test';

// The founder demonstration, end to end, in a real browser against the production build.
// A Chromium virtual authenticator performs real WebAuthn ceremonies (user verification on).

const shot = (page: Page, name: string) => page.screenshot({ path: `test-results/screens/${test.info().project.name}-${name}.png`, fullPage: true });
const noSidewaysScroll = async (page: Page) =>
  expect(await page.evaluate(() => document.scrollingElement!.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);

test('full demonstration: set-up, check-in, VaultLock, missed check-in, escalation, acknowledgment', async ({ page, context }) => {
  const cdp = await context.newCDPSession(page);
  await cdp.send('WebAuthn.enable');
  await cdp.send('WebAuthn.addVirtualAuthenticator', {
    options: { protocol: 'ctap2', transport: 'internal', hasResidentKey: true, hasUserVerification: true, isUserVerified: true, automaticPresenceSimulation: true },
  });
  const id = `${test.info().project.name}-${Date.now()}`;
  const email = `founder-${id}@example.test`, password = 'a long demo password', passphrase = 'blue kettle sunrise';

  // 1. Marketing site
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('how long would it take someone to notice');
  await noSidewaysScroll(page);
  await shot(page, '01-home');
  await page.goto('/pricing');
  await expect(page.getByText('$4.99')).toBeVisible();
  await expect(page.getByText('$9.99')).toBeVisible();

  // 2. Create a demonstration account
  await page.goto('/register');
  await page.getByLabel('Your name').fill('Demo Founder');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/onboarding/);

  // 3. Onboarding
  await page.getByRole('button', { name: 'Confirm it for me' }).click();
  await page.getByLabel('Check-in passphrase', { exact: true }).fill(passphrase);
  await page.getByLabel('Type it again').fill(passphrase);
  await page.getByRole('button', { name: 'Save passphrase' }).click();
  await page.getByRole('button', { name: 'Add this device', exact: true }).click(); // real passkey registration
  await expect(page.getByRole('button', { name: 'Add a Lifeline' })).toBeVisible(); // step 3 is done; step 4 opened
  for (const [name, mail] of [['Maya Rivera', 'maya@example.test'], ['Sam Okafor', 'sam@example.test']]) {
    await page.getByRole('button', { name: 'Add a Lifeline' }).click();
    await page.getByRole('textbox', { name: 'Name', exact: true }).fill(name);
    await page.getByRole('textbox', { name: 'Email' }).fill(mail);
    await page.getByRole('button', { name: 'Add and send request' }).click();
    await expect(page.getByText(mail)).toBeVisible();
  }
  await shot(page, '02-onboarding-lifelines');
  await page.getByRole('button', { name: 'accept for them now' }).click();
  await expect(page.getByText('Accepted')).toHaveCount(2);
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: '10 days' }).click();
  await page.getByLabel('Who is notified, and when').selectOption('sequential');
  await page.getByRole('button', { name: 'Save schedule' }).click();
  await expect(page.getByText('I understand what happens when I miss')).toBeVisible();
  await noSidewaysScroll(page);
  await shot(page, '03-onboarding-review');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Turn on my protection' }).click();

  // 4. Dashboard + a verified check-in (passphrase + passkey)
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByText('Protected', { exact: true })).toBeVisible();
  await expect(page.getByRole('timer')).toBeVisible();
  await expect(page.getByText('Confirm your email for Lifeline')).toBeVisible(); // recent messages have loaded
  await noSidewaysScroll(page);
  await shot(page, '04-dashboard');
  await page.getByRole('button', { name: 'Verify I’m OK' }).click();
  await page.getByRole('dialog').getByLabel('Check-in passphrase').fill('the wrong passphrase');
  await page.getByRole('button', { name: 'Verify', exact: true }).click();
  await expect(page.getByText('That passphrase is not correct.')).toBeVisible();
  await page.getByRole('dialog').getByLabel('Check-in passphrase').fill(passphrase);
  await page.getByRole('button', { name: 'Verify', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'You are checked in' })).toBeVisible();
  await page.getByRole('button', { name: 'Done' }).click();

  // 5. Activate VaultLock (identity confirmation: password + passphrase + passkey)
  await page.goto('/app/security');
  await page.getByRole('checkbox').first().check();
  await page.getByRole('button', { name: 'Seal my protection' }).click();
  const confirm = page.getByRole('dialog', { name: 'Confirm it is you' });
  await confirm.getByLabel('Sign-in password').fill(password);
  await confirm.getByLabel('Check-in passphrase').fill(passphrase);
  await confirm.getByRole('button', { name: 'Confirm' }).click();
  const key = await page.getByTestId('recovery-key').innerText();
  expect(key).toMatch(/^[0-9A-F-]{40,}$/);
  await shot(page, '05-recovery-key');
  await page.getByLabel('I saved my recovery key.').check();
  await page.getByRole('button', { name: 'Done' }).click();
  await expect(page.getByText('Sealed · version 1')).toBeVisible();
  await expect(page.getByText('sealed plan and live settings match')).toBeVisible();
  await noSidewaysScroll(page);
  await shot(page, '06-vaultlock-sealed');

  // 6. Sealed settings are view-only, and real change requests are refused by the server
  await page.goto('/app/lifelines');
  await expect(page.getByText('Sealed by VaultLock')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Edit' })).toHaveCount(0);
  await page.goto('/app/demo');
  await page.getByRole('button', { name: 'Attempt all changes' }).click();
  await expect(page.getByText('Blocked by VaultLock')).toHaveCount(7);
  await expect(page.getByText('ALLOWED')).toHaveCount(0);
  await noSidewaysScroll(page);
  await shot(page, '07-blocked-changes');

  // 7. Simulate countdown expiration and watch the escalation sequence
  await page.getByRole('button', { name: 'Go' }).nth(1).click(); // past the deadline
  await expect(page.getByText('Status now: grace')).toBeVisible();
  await page.getByRole('button', { name: 'Go' }).nth(2).click(); // past the grace period
  await expect(page.getByText('Status now: escalating')).toBeVisible();
  await expect(page.getByText('Demo Founder missed a scheduled Lifeline check-in')).toHaveCount(1); // sequential: first Lifeline only
  await expect(page.getByText('To: Maya Rivera').first()).toBeVisible();
  await page.getByRole('button', { name: 'Go' }).nth(3).click(); // next stage
  await expect(page.getByText('Demo Founder missed a scheduled Lifeline check-in')).toHaveCount(2);
  await expect(page.getByText('To: Sam Okafor').first()).toBeVisible();
  await noSidewaysScroll(page);
  await shot(page, '08-demo-inbox');

  // 8. A Lifeline acknowledges the (simulated) alert
  const ackHref = await page.locator('a[href^="/ack/"]').first().getAttribute('href');
  const lifeline = await context.newPage();
  await lifeline.goto(ackHref!);
  await expect(lifeline.getByRole('heading', { level: 1 })).toContainText('Demo Founder missed a scheduled check-in');
  await expect(lifeline.getByText('This means only that the check-in was missed.')).toBeVisible();
  await shot(lifeline, '09-lifeline-ack');
  await lifeline.getByRole('button', { name: 'I received this alert' }).click();
  await expect(lifeline.getByText(/does not mark Demo Founder as safe/)).toBeVisible();
  await lifeline.close();

  // 9. Dashboard during escalation, then the member checks in
  await page.goto('/app');
  await expect(page.getByText('Lifelines are being notified', { exact: true })).toBeVisible();
  await noSidewaysScroll(page);
  await shot(page, '10-dashboard-escalating');
  await page.getByRole('button', { name: 'Verify I’m OK' }).click();
  await page.getByRole('dialog').getByLabel('Check-in passphrase').fill(passphrase);
  await page.getByRole('button', { name: 'Verify', exact: true }).click();
  await expect(page.getByText(/Messages already sent cannot be recalled/)).toBeVisible();
  await page.getByRole('button', { name: 'Done' }).click();
  await expect(page.getByText('Protected', { exact: true })).toBeVisible();

  // 10. Activity history and the audit log
  await page.goto('/app/activity');
  await expect(page.getByText('Missed check-in alert').first()).toBeVisible();
  await expect(page.getByText('Receipt confirmed')).toHaveCount(1);
  await expect(page.getByText('Simulated').first()).toBeVisible();
  await noSidewaysScroll(page);
  await shot(page, '11-activity');
  await page.goto('/app/security');
  await expect(page.getByText(/Verified · \d+ records/)).toBeVisible();
  await expect(page.getByText('vaultlock.blocked_attempt · lifeline.add')).toBeVisible();
  await expect(page.getByText('incident.acknowledged')).toBeVisible();
  await noSidewaysScroll(page);
  await shot(page, '12-security-log');

  // 11. Tamper detection: the sealed plan no longer matches the live data
  await page.goto('/app/demo');
  await page.getByRole('button', { name: 'Rewrite a Lifeline’s email' }).click();
  await page.goto('/app');
  await expect(page.getByText('Integrity warning.')).toBeVisible();

  // 12. Sign out, then sign in again: password, then passkey
  await page.goto('/app/account');
  await noSidewaysScroll(page);
  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.waitForURL((u) => u.pathname === '/');
  await page.goto('/app');
  await expect(page).toHaveURL(/login/);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByRole('timer')).toBeVisible();
});

test('a Lifeline can decline, and the consent page explains what they agree to', async ({ page, request }) => {
  const email = `consent-${test.info().project.name}-${Date.now()}@example.test`;
  const origin = { origin: test.info().project.use.baseURL! };
  await request.post('/api/auth/register', { data: { email, password: 'a long demo password', name: 'Consent Tester' }, headers: origin });
  await request.post('/api/contacts', { data: { name: 'Lee Park', email: 'lee@example.test', channels: ['email'] }, headers: origin });
  const hist = await (await request.get('/api/history')).json();
  const link = hist.notifications.find((n: any) => n.kind === 'consent_request').body.match(/(\/consent\/\S+)/)[1];
  await page.goto(link);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Consent Tester asked you to be their Lifeline');
  await expect(page.getByText(/Lifeline is not an emergency service/)).toBeVisible();
  await page.getByRole('button', { name: 'Decline' }).click();
  await expect(page.getByText('You declined. Lifeline will not contact you.')).toBeVisible();
  await page.getByRole('button', { name: 'Accept' }).click();
  await expect(page.getByText(/You accepted/)).toBeVisible();
  await page.getByRole('button', { name: 'Opt out' }).click();
  await expect(page.getByText('You opted out. Lifeline will not contact you.')).toBeVisible();
});

test('public pages have titles, landmarks and no sideways scroll', async ({ page }) => {
  for (const path of ['/', '/pricing', '/security', '/terms', '/privacy', '/login', '/register', '/reset', '/recover']) {
    await page.goto(path);
    await expect(page).toHaveTitle(/Lifeline/);
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await noSidewaysScroll(page);
    const unlabeled = await page.evaluate(() => [...document.querySelectorAll('input, select, textarea')].filter((el) => !(el as HTMLInputElement).labels?.length && !el.getAttribute('aria-label')).length);
    expect(unlabeled, `unlabelled form fields on ${path}`).toBe(0);
  }
  const robots = await page.request.get('/robots.txt');
  expect(await robots.text()).toContain('Disallow: /app');
  const res = await page.request.get('/');
  expect(res.headers()['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(res.headers()['x-content-type-options']).toBe('nosniff');
});
