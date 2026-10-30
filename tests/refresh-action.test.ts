import { test } from "node:test";
import assert from "node:assert/strict";
import { guardrailViolations, summaryMessage } from "../scripts/lib/prices.mjs";
import { withRetry, isRetryable } from "../scripts/lib/retry.mjs";

// Guardrails and the commit message for the unattended weekly refresh
// (roadmap engineering item 4). The Action aborts without writing when a
// refresh looks like an API accident rather than a market move.

test("guardrailViolations flags a card that moved more than 5x either way", () => {
  const up = [{ id: "a", from: 10, to: 60 }];
  const down = [{ id: "b", from: 60, to: 10 }];
  const fine = [{ id: "c", from: 10, to: 49 }];
  assert.match(guardrailViolations(up, 300)[0], /a.*10\.00 -> 60\.00/);
  assert.match(guardrailViolations(down, 300)[0], /b.*60\.00 -> 10\.00/);
  assert.deepEqual(guardrailViolations(fine, 300), []);
});

test("guardrailViolations ignores first-time prices and tiny bases, and flags a mass change", () => {
  // A card priced for the first time has no ratio to judge.
  assert.deepEqual(guardrailViolations([{ id: "a", from: null, to: 60 }], 300), []);
  // Sub-euro commons jump between 0.02 and 0.30 routinely; ratios under 1 EUR are noise.
  assert.deepEqual(guardrailViolations([{ id: "a", from: 0.02, to: 0.3 }], 300), []);
  const many = Array.from({ length: 200 }, (_, i) => ({ id: `c${i}`, from: 10, to: 11 }));
  assert.match(guardrailViolations(many, 300)[0], /200 of 300/);
  assert.deepEqual(guardrailViolations(many, 400), []);
});

test("summaryMessage is a git commit message: title, blank line, top movers", () => {
  const msg = summaryMessage({
    date: "2026-10-29",
    changes: [{ id: "lugia", from: 78.72, to: 67.69 }, { id: "abra", from: 0.02, to: 0.03 }],
    skipped: 12,
  });
  assert.equal(
    msg,
    "Refresh Cardmarket prices 2026-10-29: 2 changes, 12 skipped\n\nTop movers:\n  lugia: 78.72 -> 67.69\n  abra: 0.02 -> 0.03\n"
  );
  assert.equal(
    summaryMessage({ date: "2026-10-29", changes: [], skipped: 0 }),
    "Refresh Cardmarket prices 2026-10-29: 0 changes, 0 skipped\n\nNo price changes.\n"
  );
});

test("isRetryable: 429 and 5xx yes, 404 and 400 no, network errors yes", () => {
  const http = (status: number) => Object.assign(new Error(`HTTP ${status}`), { status });
  assert.equal(isRetryable(http(429)), true);
  assert.equal(isRetryable(http(503)), true);
  assert.equal(isRetryable(http(404)), false);
  assert.equal(isRetryable(http(400)), false);
  assert.equal(isRetryable(new TypeError("fetch failed")), true);
});

test("withRetry retries retryable failures with the given delays and gives up after them", async () => {
  const slept: number[] = [];
  const sleep = async (ms: number) => { slept.push(ms); };
  let calls = 0;
  const flaky = async () => {
    calls++;
    if (calls < 3) throw Object.assign(new Error("HTTP 429"), { status: 429 });
    return "ok";
  };
  assert.equal(await withRetry(flaky, { delays: [1, 4, 16], sleep }), "ok");
  assert.equal(calls, 3);
  assert.deepEqual(slept, [1, 4]);

  const always = async () => { throw Object.assign(new Error("HTTP 500"), { status: 500 }); };
  await assert.rejects(withRetry(always, { delays: [1, 4, 16], sleep }), /HTTP 500/);

  let notFoundCalls = 0;
  const notFound = async () => { notFoundCalls++; throw Object.assign(new Error("HTTP 404"), { status: 404 }); };
  await assert.rejects(withRetry(notFound, { delays: [1, 4, 16], sleep }), /HTTP 404/);
  assert.equal(notFoundCalls, 1);
});
