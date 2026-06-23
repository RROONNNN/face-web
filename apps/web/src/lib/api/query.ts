type QueryValue = boolean | number | string | null | undefined;

export function toQueryString(values: Record<string, QueryValue>): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }

    params.set(key, String(value));
  }

  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
}

export function firstParam(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function numberParam(
  value: string | string[] | undefined,
  fallback: number,
): number {
  const parsed = Number(firstParam(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
