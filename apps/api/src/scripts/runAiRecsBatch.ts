import 'dotenv/config';
import { runDailyAiRecsBatch } from '../services/aiRecsQueue.js';

runDailyAiRecsBatch()
  .then(() => {
    console.log('[runAiRecsBatch] done');
    process.exit(0);
  })
  .catch((err) => {
    console.error('[runAiRecsBatch]', err);
    process.exit(1);
  });
