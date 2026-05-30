import { config } from './config.js';
import { createApp } from './app.js';
import { startAiRecsScheduler } from './jobs/aiRecsScheduler.js';

const app = createApp();

app.listen(config.port, () => {
  console.log(`[api] Binger gateway listening on :${config.port} (${config.nodeEnv})`);
  startAiRecsScheduler();
});
