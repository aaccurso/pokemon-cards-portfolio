#!/usr/bin/env node
/**
 * Smoke test: render the real pages in headless Chrome and assert on the DOM.
 *
 * The server-rendered HTML is only a Suspense shell (useSearchParams bails to
 * client rendering), so curl cannot see the h1, the counts, or the tabs. A
 * real browser can. Expectations are derived from data/*.json by
 * scripts/lib/smoke.mjs, never from literals.
 *
 *   npm run smoke                       # start next start on SMOKE_PORT (default 3000)
 *   SMOKE_PORT=3102 npm run smoke       # same, on another port (parallel runs)
 *   SMOKE_URL=http://localhost:3000 npm run smoke   # reuse a running server
 *   npm run smoke -- --base http://localhost:3000   # same as SMOKE_URL
 *   npm run smoke -- --require-chrome   # fail instead of SKIP when Chrome is missing (CI)
 *
 * Without SMOKE_URL the script needs .next/BUILD_ID (run npm run build); if
 * there is none it falls back to next dev, which is slower but needs no build.
 * Chrome is found via CHROME_BIN, the macOS app bundle, or PATH. Exit codes:
 * 0 pass or SKIP, 1 assertion failures, 2 setup errors.
 */
import fs from "node:fs";
import path from "node:path";
import { spawn, execFile, execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { buildPlan, checkPage } from "./lib/smoke.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const opt = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? null : args[i + 1] ?? null;
};

const requireChrome = flag("--require-chrome");
const baseArg = opt("--base") ?? process.env.SMOKE_URL ?? null;
const port = Number(process.env.SMOKE_PORT ?? 3000);

function findChrome() {
  const candidates = [
    process.env.CHROME_BIN,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ].filter(Boolean);
  for (const c of candidates) if (fs.existsSync(c)) return c;
  for (const name of ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser"]) {
    try {
      const found = execFileSync("which", [name], { encoding: "utf8" }).trim();
      if (found) return found;
    } catch {
      // not on PATH
    }
  }
  return null;
}

function chromeVersion(bin) {
  try {
    return execFileSync(bin, ["--version"], { encoding: "utf8" }).trim();
  } catch {
    return "unknown version";
  }
}

function dumpDom(bin, url) {
  return new Promise((resolve, reject) => {
    execFile(
      bin,
      ["--headless=new", "--disable-gpu", "--no-sandbox", "--virtual-time-budget=10000", "--dump-dom", url],
      { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, timeout: 60_000 },
      (err, stdout) => (err ? reject(err) : resolve(stdout))
    );
  });
}

async function render(bin, url) {
  try {
    const html = await dumpDom(bin, url);
    if (/<h1\b/i.test(html)) return html;
    // Suspense shell or blank: give the page one more chance.
  } catch {
    // Chrome failure: retry once.
  }
  return dumpDom(bin, url);
}

async function waitFor(url, ms) {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`server at ${url} did not answer 200 within ${ms / 1000}s`);
}

let server = null;
let finished = false;
function stopServer() {
  if (!server || server.exitCode != null) return;
  try {
    process.kill(-server.pid, "SIGTERM");
  } catch {
    server.kill("SIGTERM");
  }
}
process.on("exit", stopServer);
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => process.exit(2));

async function startServer() {
  const built = fs.existsSync(path.join(root, ".next", "BUILD_ID"));
  const mode = built ? "start" : "dev";
  if (!built) console.log("no .next/BUILD_ID: run npm run build first for a production smoke; falling back to next dev");
  const next = path.join(root, "node_modules", ".bin", "next");
  server = spawn(next, [mode, "-p", String(port)], {
    cwd: root,
    stdio: ["ignore", "ignore", "inherit"],
    detached: true,
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
  });
  server.on("exit", (code) => {
    if (code != null && code !== 0 && !finished) {
      console.error(`next ${mode} exited with code ${code}`);
      process.exit(2);
    }
  });
  const base = `http://localhost:${port}`;
  await waitFor(base, built ? 30_000 : 90_000);
  console.log(`next ${mode} listening on ${base}`);
  return base;
}

async function main() {
  const chrome = findChrome();
  if (!chrome) {
    const msg = "SKIP: no Chrome found (set CHROME_BIN or install Google Chrome / Chromium)";
    if (requireChrome) {
      console.error(`FAIL: ${msg.slice(6)} and --require-chrome was passed`);
      return 2;
    }
    console.log(`\n==== ${msg} ====\n`);
    return 0;
  }
  console.log(`chrome: ${chrome} (${chromeVersion(chrome)})`);

  const read = (p) => JSON.parse(fs.readFileSync(path.join(root, p), "utf8"));
  const plan = buildPlan({ cards: read("data/cards.json"), purchases: read("data/purchases.json"), binders: read("data/binders.json") });

  const base = (baseArg ?? (await startServer())).replace(/\/$/, "");
  console.log(`base: ${base}\n`);

  let failed = 0;
  for (const page of plan) {
    const url = base + page.path;
    let failures;
    try {
      failures = checkPage(page, await render(chrome, url));
    } catch (err) {
      failures = [`render failed: ${err.message}`];
    }
    if (failures.length === 0) {
      console.log(`ok   ${page.path}`);
    } else {
      failed++;
      console.log(`FAIL ${page.path}`);
      for (const f of failures) console.log(`     - ${f}`);
    }
  }
  console.log(`\n${plan.length - failed}/${plan.length} pages passed`);
  return failed === 0 ? 0 : 1;
}

main()
  .catch((err) => {
    console.error(err.message ?? err);
    return 2;
  })
  .then((code) => {
    finished = true;
    stopServer();
    process.exit(code);
  });
