/**
 * PM2 process definitions for WA Automations.
 *
 * Ports 3300 (web) and 4300 (api) are chosen to avoid colliding with the
 * other apps already running on this VPS (interviewaceai, wedding-api,
 * wedding-web). Check `pm2 list` and adjust PORT in each app's .env if either
 * is already taken.
 *
 * Usage (from the repo root on the VPS):
 *   pm2 start deploy/ecosystem.config.js
 *   pm2 save
 */
module.exports = {
  apps: [
    {
      name: "wa-automation-api",
      cwd: "./apps/api",
      // Run via tsx (not `node dist/server.js`) — the @wa/types workspace
      // package ships raw .ts source with no build step, and plain Node's
      // native TS execution requires explicit file extensions on relative
      // imports that this codebase doesn't use. tsx's resolver handles this
      // correctly, matching how `pnpm dev` already runs it locally.
      // Point at tsx's actual JS entry file, not the .bin/tsx shell shim —
      // PM2 runs "script" with Node directly, and Node can't parse a shell
      // script.
      script: "node_modules/tsx/dist/cli.mjs",
      args: "src/server.ts",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
      },
      max_memory_restart: "300M",
      out_file: "../../logs/wa-automation-api.out.log",
      error_file: "../../logs/wa-automation-api.err.log",
      time: true,
    },
    {
      name: "wa-automation-web",
      cwd: "./apps/web",
      // Point at Next's actual JS entry file, not the .bin/next shell shim —
      // same reason as the api app above: PM2 runs "script" with Node
      // directly, and Node can't parse a shell script.
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3300",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
      },
      max_memory_restart: "400M",
      out_file: "../../logs/wa-automation-web.out.log",
      error_file: "../../logs/wa-automation-web.err.log",
      time: true,
    },
  ],
};
