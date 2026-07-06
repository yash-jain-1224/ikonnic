/**
 * Query params arrive from `@Query()` as strings, and with the global
 * ValidationPipe's `enableImplicitConversion` an *absent* numeric param is
 * coerced to `NaN` (not `undefined`), so a service's `page = 1` default never
 * applies. `NaN` then flows into Prisma's `skip`/`take` and throws at runtime.
 * These helpers normalise any shape (undefined, NaN, string, float) into a
 * safe positive integer.
 */
export function normalizePage(page?: number | string, def = 1): number {
  const n = Math.trunc(Number(page));
  return Number.isFinite(n) && n >= 1 ? n : def;
}

export function normalizeLimit(limit?: number | string, def = 20, max = 100): number {
  const n = Math.trunc(Number(limit));
  if (!Number.isFinite(n) || n < 1) return def;
  return Math.min(n, max);
}
