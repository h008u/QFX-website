import { serve } from "@hono/node-server";
import { getEnv } from "./env";
import { createApp } from "./server";

const env = getEnv();
const app = createApp();

const server = serve({ fetch: app.fetch, port: env.port }, (info) => {
  console.log(`[qfx-bot] listening on :${info.port}`);
  if (!env.adminIds.size) console.warn("[qfx-bot] TELEGRAM_ADMIN_IDS is empty — admin commands are disabled");
});

for (const sig of ["SIGINT", "SIGTERM"] as const) {
  process.on(sig, () => {
    server.close(() => process.exit(0));
  });
}
