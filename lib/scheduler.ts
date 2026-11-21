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
  setTimeout(() => scrubExistingPosts().catch((e) => console.error(e)).then(() => tick('boot')).catch((e) => console.error(e)), 8000);
}
