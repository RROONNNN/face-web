import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { Request } from 'express';
import { Observable, tap } from 'rxjs';

const SENSITIVE_HEADER_NAMES = new Set(['authorization', 'cookie', 'set-cookie']);
const SENSITIVE_BODY_KEYS = new Set(['password', 'accessToken', 'refreshToken', 'token']);

function shellQuote(value: unknown): string {
    return `'${String(value).replaceAll("'", "'\\''")}'`;
}

function redactValue(key: string, value: unknown): unknown {
    return SENSITIVE_BODY_KEYS.has(key.toLowerCase()) ? '[REDACTED]' : value;
}

function redactBody(body: unknown): unknown {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return body;
    }

    return Object.fromEntries(
        Object.entries(body).map(([key, value]) => [key, redactValue(key, value)]),
    );
}

function stringifyBody(body: unknown): string | undefined {
    if (!body || typeof body !== 'object' || Object.keys(body).length === 0) {
        return undefined;
    }

    return JSON.stringify(redactBody(body));
}

function buildCurlCommand(request: Request): string {
    const url = `${request.protocol}://${request.get('host')}${request.originalUrl}`;
    const headerParts = Object.entries(request.headers)
        .filter(([name]) => !['host', 'connection', 'content-length'].includes(name.toLowerCase()))
        .map(([name, value]) => {
            const headerValue = SENSITIVE_HEADER_NAMES.has(name.toLowerCase())
                ? '[REDACTED]'
                : Array.isArray(value)
                    ? value.join(',')
                    : value;

            return `-H ${shellQuote(`${name}: ${headerValue ?? ''}`)}`;
        });
    const body = stringifyBody(request.body);
    const bodyPart = body ? [`--data-raw ${shellQuote(body)}`] : [];

    return [`curl -X ${request.method}`, shellQuote(url), ...headerParts, ...bodyPart].join(' ');
}

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        const request = context.switchToHttp().getRequest<Request>();
        const method = request.method;
        const url = request.originalUrl;
        const now = Date.now();

        console.log('\n[Request]');
        console.log(buildCurlCommand(request));

        return next.handle().pipe(
            tap((response) => {
                const duration = Date.now() - now;
                console.log('[Response]');
                console.log(JSON.stringify(response, null, 2));
                console.log(`[Done] ${method} ${url} - ${duration}ms\n`);
            }),
        );
    }

}
