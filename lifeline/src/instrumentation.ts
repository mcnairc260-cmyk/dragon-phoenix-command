// Local and self-hosted scheduler: one pass every 15 seconds inside the server
// process, so the countdown runs with no browser open. On Vercel (serverless)
// this timer does not exist; an external scheduler calls /api/cron/tick instead.
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs' || process.env.VERCEL || process.env.LIFELINE_DISABLE_LOCAL_SCHEDULER === '1') return;
  const g = globalThis as unknown as { __lifelineTimer?: ReturnType<typeof setInterval> };
  if (g.__lifelineTimer) return;
  const { getDb } = await import('./server/db');
  const { tick } = await import('./server/engine');
  let busy = false;
  g.__lifelineTimer = setInterval(async () => {
    if (busy) return;
    busy = true;
    try {
      const report = await tick(await getDb());
      if (report.errors.length) console.error('[lifeline] scheduler errors', report.errors);
    } catch (e) {
      console.error('[lifeline] scheduler pass failed', e);
    } finally {
      busy = false;
    }
  }, 15000);
  g.__lifelineTimer.unref?.();
}
