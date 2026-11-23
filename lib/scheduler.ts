import cron from 'node-cron';
import { listWorkspaces, log, kvSet } from './db';
import { runPipeline, scrubExistingPosts } from './pipeline';

const g = globalThis as any;

export function startScheduler() {
  if (g.__gnsScheduler) return;
  const mins = Number(process.env.FETCH_INTERVAL_MINUTES ?? 5);
  if (!mins) { console.log('[scheduler] disabled (FETCH_INTERVAL_MINUTES=0)'); return; }
  const tick = async (trigger: 'schedule' | 'boot') => {
    kvSet('last_tick', String(Date.now()));
    kvSet('next_tick', String(Date.now() + mins * 60e3));
    for (const ws of listWorkspaces()) await runPipeline(ws.id, trigger);
  };
  g.__gnsScheduler = cron.schedule(`*/${mins} * * * *`, () => { tick('schedule').catch((e) => console.error(e)); });
  log(null, 'info', `In-app scheduler started: every ${mins} min`);
  // Free hosts (e.g. Render) sleep after ~15 min without inbound traffic. Ping our own public URL so the
  // scheduler keeps running. Render sets RENDER_EXTERNAL_URL automatically; elsewhere set KEEPALIVE_URL.
  const self = process.env.KEEPALIVE_URL || process.env.RENDER_EXTERNAL_URL;
  if (self && process.env.KEEPALIVE !== '0') {
    const ping = () => fetch(`${self.replace(/\/$/, '')}/api/health`, { cache: 'no-store' }).catch(() => {});
    g.__gnsKeepAlive = setInterval(ping, Number(process.env.KEEPALIVE_MINUTES || 10) * 60e3);
    log(null, 'info', `Keep-alive ping every ${process.env.KEEPALIVE_MINUTES || 10} min`);
  }
  setTimeout(() => scrubExistingPosts().catch((e) => console.error(e)).then(() => tick('boot')).catch((e) => console.error(e)), 8000);
}
