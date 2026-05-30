import cron from 'node-cron';
import { config } from '../config.js';
import { runDailyAiRecsBatch } from '../services/aiRecsQueue.js';

export function startAiRecsScheduler(): void {
  if (config.nodeEnv === 'test') return;
  if (!config.ai.batchEnabled) {
    console.log('[aiRecsScheduler] disabled (AI_RECS_BATCH_ENABLED=false)');
    return;
  }

  const expr = config.ai.batchCron;
  if (!cron.validate(expr)) {
    console.error(`[aiRecsScheduler] invalid cron: ${expr}`);
    return;
  }

  cron.schedule(
    expr,
    () => {
      runDailyAiRecsBatch().catch((err) => console.error('[aiRecsScheduler]', err));
    },
    { timezone: config.ai.batchTimezone }
  );

  console.log(`[aiRecsScheduler] daily batch scheduled (${expr}, ${config.ai.batchTimezone})`);
}
