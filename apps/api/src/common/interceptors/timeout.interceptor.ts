import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { catchError, Observable, throwError, timeout, TimeoutError } from "rxjs";

@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler<any>): Observable<unknown> {
        return next.handle().pipe(
            timeout(2000),
            catchError((err) => {
                if (err instanceof TimeoutError) {
                    return throwError(() => new Error('Request timed out'));
                }
                return throwError(() => err instanceof Error ? err : new Error('Unknown error'));
            })
        );
    }


}