const DEFAULT_API_URL = 'http://localhost:3001';

export function getApiBaseUrl(): string {
  const rawUrl =
    process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? DEFAULT_API_URL;

  return rawUrl.replace(/\/+$/, '');
}
