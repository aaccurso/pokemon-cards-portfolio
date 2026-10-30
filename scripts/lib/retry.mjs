/**
 * Retry for the unattended refresh: tcgdex occasionally answers 429 or 5xx,
 * and a GitHub runner's network can hiccup. Pure apart from the injectable
 * sleep so the backoff is unit-testable.
 */

/** HTTP 429 and 5xx, plus network-level failures (no status), are worth retrying. */
export function isRetryable(err) {
  const status = err && typeof err.status === "number" ? err.status : null;
  if (status == null) return true;
  return status === 429 || status >= 500;
}

const realSleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Call fn until it resolves. After a retryable failure, wait delays[i] ms and
 * try again; one attempt per delay plus the first, so delays [1, 4, 16]
 * means up to four calls. A non-retryable error, or exhausting the delays,
 * rethrows the last error.
 */
export async function withRetry(fn, { delays = [1000, 4000, 16000], sleep = realSleep } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isRetryable(err) || attempt === delays.length) throw err;
      await sleep(delays[attempt]);
    }
  }
  throw lastErr;
}
