/**
 * Helpers for mapping this project's card codes to tcgdex (api.tcgdex.net)
 * Japanese card ids, plus thin fetchers.
 */
const API = "https://api.tcgdex.net/v2/ja";
const UA = "pokemon-cards-portfolio";
const PAUSE_MS = 150;

/** "sv2a 063" -> { setCode: "sv2a", number: "063" }; null when not "<set> <number>". */
export function parseCode(code) {
  const m = /^(\S+)\s+(\S+)$/.exec(code.trim());
  if (!m) return null;
  return { setCode: m[1], number: m[2] };
}

/** Trailing digit run of the number token: "S-P SWSH194" -> 194; null when absent. */
export function parseSetNumber(code) {
  const parsed = parseCode(code);
  if (!parsed) return null;
  const m = /(\d+)$/.exec(parsed.number);
  return m ? Number(m[1]) : null;
}

/** "sv2a 063" + ["SV2a", ...] -> "SV2a-063"; null when the set is unknown. */
export function toTcgdexId(code, setIds) {
  const parsed = parseCode(code);
  if (!parsed) return null;
  const want = parsed.setCode.toLowerCase();
  const setId = setIds.find((s) => s.toLowerCase() === want);
  return setId ? `${setId}-${parsed.number}` : null;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  await sleep(PAUSE_MS);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

/** All Japanese set ids known to tcgdex. */
export async function fetchJaSetIds() {
  const sets = await getJson(`${API}/sets`);
  return (sets ?? []).map((s) => s.id);
}

/** Full card record, or null on 404. */
export async function fetchCard(tcgdexId) {
  return getJson(`${API}/cards/${tcgdexId}`);
}

/** Set record including its `cards` summary list, or null on 404. */
export async function fetchSet(setId) {
  return getJson(`${API}/sets/${setId}`);
}
