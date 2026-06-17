export type PageSearchParams = Promise<
  Record<string, string | string[] | undefined>
>;

export function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function asInt(value: string | string[] | undefined, fallback = 1) {
  const parsed = Number(first(value));
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function asString(value: string | string[] | undefined) {
  const next = first(value);
  return next && next.length > 0 ? next : undefined;
}

export function buildReturnTo(
  pathname: string,
  params: Record<string, string | undefined>,
) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value && key !== 'message' && key !== 'error') {
      searchParams.set(key, value);
    }
  }

  const query = searchParams.toString();
  return query ? `${pathname}?${query}` : pathname;
}
