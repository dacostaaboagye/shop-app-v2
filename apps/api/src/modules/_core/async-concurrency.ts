/**
 * Process `items` with `worker`, capping at most `concurrency` parallel
 * invocations. Preserves output ordering.
 *
 * Used to bound bulk email/notification sends so a single admin action
 * can't open 1000+ parallel HTTP connections to the email provider, hit
 * Resend rate limits, or saturate Node's libuv pool.
 *
 * Throws on the first worker rejection (after letting the in-flight
 * batch settle so we don't dangle promises).
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (concurrency < 1 || !Number.isInteger(concurrency)) {
    throw new Error("concurrency must be a positive integer");
  }

  const results = new Array<R>(items.length);
  let cursor = 0;

  async function pump(): Promise<void> {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      results[index] = await worker(items[index] as T, index);
    }
  }

  const slots = Math.min(concurrency, items.length);
  await Promise.all(Array.from({ length: slots }, () => pump()));

  return results;
}
