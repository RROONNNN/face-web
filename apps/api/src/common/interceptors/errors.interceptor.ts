import {
    BadGatewayException,
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor,
} from '@nestjs/common';
import { catchError, Observable, throwError } from 'rxjs';

@Injectable()
export class ErrorsInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        return next.handle().pipe(
            catchError((error: unknown) => {
                const message = error instanceof Error ? error.message : 'Unknown error';

                console.error('[Interceptor caught error]', message);

                return throwError(
                    () => new BadGatewayException('Something went wrong'),
                );
            }),
        );
    }
}
