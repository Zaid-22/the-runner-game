import http from "node:http";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";

const HOST = process.env.SMOKE_HOST || "127.0.0.1";
const PORT = Number(process.env.SMOKE_PORT || 4173);
const PREVIEW_URL = `http://${HOST}:${PORT}/`;
const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";

function httpGet(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        body += chunk;
      });
      res.on("end", () => {
        resolve({ statusCode: res.statusCode || 0, body });
      });
    });
    req.on("error", reject);
    req.setTimeout(3000, () => {
      req.destroy(new Error("HTTP request timed out"));
    });
  });
}

async function waitForPreview(maxAttempts = 40) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const result = await httpGet(PREVIEW_URL);
      if (result.statusCode === 200) {
        return result;
      }
    } catch {
      // Preview may still be starting.
    }
    await delay(500);
  }

  throw new Error(`Preview server did not become reachable at ${PREVIEW_URL}`);
}

async function stopProcess(child) {
  if (!child || child.killed) return;

  child.kill("SIGTERM");
  await delay(1200);
  if (!child.killed) {
    child.kill("SIGKILL");
  }
}

async function main() {
  if (!existsSync("dist/index.html")) {
    throw new Error(
      "dist/index.html not found. Run `npm run build` before smoke preview.",
    );
  }

  const preview = spawn(
    npmCmd,
    ["run", "preview", "--", "--host", HOST, "--port", String(PORT)],
    {
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, CI: "1" },
    },
  );

  let stderrOutput = "";
  preview.stderr.on("data", (chunk) => {
    stderrOutput += chunk.toString();
  });
  preview.stdout.on("data", () => {
    // Keep stdout stream drained to avoid process blocking.
  });

  try {
    const { statusCode, body } = await waitForPreview();

    if (statusCode !== 200) {
      throw new Error(`Preview returned unexpected status code: ${statusCode}`);
    }

    const requiredMarkers = [
      'id="main-menu"',
      'id="ui"',
      'id="game-over-screen"',
      'id="boss-health-bar"',
    ];

    for (const marker of requiredMarkers) {
      if (!body.includes(marker)) {
        throw new Error(`Preview HTML missing expected marker: ${marker}`);
      }
    }

    console.log("Smoke preview check passed.");
  } finally {
    await stopProcess(preview);
  }

  if (stderrOutput.includes("error when starting preview server")) {
    throw new Error(`Preview server error:\n${stderrOutput}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
