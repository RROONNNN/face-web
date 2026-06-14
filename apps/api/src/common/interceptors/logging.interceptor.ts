import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable, tap } from "rxjs";
import type { Request } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler<any>): Observable<unknown> {
        const request = context.switchToHttp().getRequest<Request>();
        const method = request.method;
        const url = request.url;
        const now = Date.now();
        console.log(`[Before] ${method} ${url}`);

        return next.handle().pipe(
            tap(() => {
                const duration = Date.now() - now;
                console.log(`[After] ${method} ${url} - ${duration}ms`);
            }),
        );
    }

}