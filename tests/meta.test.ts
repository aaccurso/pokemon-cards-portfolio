import { test } from "node:test";
import assert from "node:assert/strict";
import { latestCardmarketDate, fmtRefreshed, metaProblems } from "../lib/meta.ts";

// data/meta.json is the one tiny file the UI reads for freshness: the date of
// the last Cardmarket refresh. prices.json knows it too but is large and must
// stay out of the client bundle, so the refresh script writes meta.json and a
// data test keeps the two in step.

test("latestCardmarketDate is the newest cardmarket snapshot across every card", () => {
  const prices = {
    a: [
      { date: "2026-10-23", source: "manual", price: 1 },
      { date: "2026-10-23", source: "cardmarket", trend: 1 },
    ],
    b: [
      { date: "2026-10-29", source: "cardmarket", trend: 2 },
      { date: "2026-10-23", source: "cardmarket", trend: 1 },
    ],
  };
  assert.equal(latestCardmarketDate(prices), "2026-10-29");
});

test("latestCardmarketDate ignores manual seeds and is null with no cardmarket snapshot", () => {
  assert.equal(latestCardmarketDate({ a: [{ date: "2026-12-01", source: "manual", price: 1 }] }), null);
  assert.equal(latestCardmarketDate({}), null);
});

test("fmtRefreshed prints the day, short month and year without touching time zones", () => {
  assert.equal(fmtRefreshed("2026-10-29"), "29 Oct 2026");
  assert.equal(fmtRefreshed("2027-01-05"), "5 Jan 2027");
});

test("metaProblems accepts an ISO date and names anything else", () => {
  assert.deepEqual(metaProblems({ pricesRefreshed: "2026-10-29" }), []);
  assert.equal(metaProblems({ pricesRefreshed: "29/10/2026" }).length, 1);
  assert.equal(metaProblems({ pricesRefreshed: "" }).length, 1);
});
