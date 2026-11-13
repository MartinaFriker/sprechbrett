// Runs an async operation; on failure calls reset() once and tries again.
export async function withRetry(fn, reset) {
  try {
    return await fn();
  } catch {
    reset();
    return fn();
  }
}
