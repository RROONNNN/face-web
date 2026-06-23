import { getApiBaseUrl } from '@/lib/env';

type JsonBody = Record<string, unknown> | unknown[];

type ApiFetchOptions = Omit<RequestInit, 'body'> & {
  accessToken?: string;
  body?: BodyInit | JsonBody;
};

type ErrorPayload = {
  success?: boolean;
  statusCode?: number;
  message?: string;
  path?: string;
};

export class ApiRequestError extends Error {
  readonly statusCode: number;
  readonly path?: string;

  constructor(message: string, statusCode: number, path?: string) {
    super(message);
    this.name = 'ApiRequestError';
    this.statusCode = statusCode;
    this.path = path;
  }
}

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const { accessToken, body, headers, ...init } = options;
  const requestHeaders = new Headers(headers);
  let requestBody: BodyInit | undefined;

  if (accessToken) {
    requestHeaders.set('Authorization', `Bearer ${accessToken}`);
  }

  if (body !== undefined) {
    if (isBodyInit(body)) {
      requestBody = body;
    } else {
      requestHeaders.set('Content-Type', 'application/json');
      requestBody = JSON.stringify(body);
    }
  }

  const response = await fetch(toApiUrl(path), {
    cache: 'no-store',
    ...init,
    headers: requestHeaders,
    body: requestBody,
  });

  if (response.status === 204) {
    if (!response.ok) {
      throw new ApiRequestError(response.statusText, response.status);
    }

    return undefined as T;
  }

  const payload = await readJson(response);

  if (!response.ok) {
    throw toApiError(payload, response.status, response.statusText);
  }

  if (isApiEnvelope(payload)) {
    if (payload.success) {
      return payload.data as T;
    }

    throw toApiError(payload, response.status, response.statusText);
  }

  return payload as T;
}

export function getApiErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Something went wrong.';
}

function toApiUrl(path: string): string {
  if (/^https?:\/\//.test(path)) {
    return path;
  }

  return `${getApiBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
}

function isBodyInit(value: unknown): value is BodyInit {
  return (
    typeof value === 'string' ||
    value instanceof FormData ||
    value instanceof URLSearchParams ||
    value instanceof Blob ||
    value instanceof ArrayBuffer
  );
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ApiRequestError('Invalid API response.', response.status);
  }
}

function isApiEnvelope(payload: unknown): payload is { success: boolean; data?: unknown } {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'success' in payload &&
    typeof (payload as { success: unknown }).success === 'boolean'
  );
}

function toApiError(
  payload: unknown,
  fallbackStatus: number,
  fallbackMessage: string,
): ApiRequestError {
  const errorPayload = payload as ErrorPayload | null;

  return new ApiRequestError(
    errorPayload?.message ?? fallbackMessage,
    errorPayload?.statusCode ?? fallbackStatus,
    errorPayload?.path,
  );
}
