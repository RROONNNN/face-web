import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from "@nestjs/common";
import { HttpAdapterHost } from "@nestjs/core";
import { ExpressAdapter } from "@nestjs/platform-express/adapters";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    private readonly logger = new Logger(AllExceptionsFilter.name);
    constructor(private readonly httpAdapterHost: HttpAdapterHost<ExpressAdapter>

    ) {
    }

    catch(exception: unknown, host: ArgumentsHost) {
        const { httpAdapter } = this.httpAdapterHost;
        const ctx = host.switchToHttp();
        const request = ctx.getRequest<Request>();
        const statusCode = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
        const message = this.getErrorMessage(exception);
        const path = httpAdapter.getRequestUrl(request);
        const responseBody = {
            success: false,
            statusCode,
            message,
            timestamp: new Date().toISOString(),
            path: path,
        }
        this.logger.error(
            `${request.method} ${path} ${statusCode} - ${message}`,
        );
        httpAdapter.reply(ctx.getResponse(), responseBody, statusCode);

    }
    private getErrorMessage(exception: unknown): string {
        if (exception instanceof HttpException) {
            const response = exception.getResponse();
            if (typeof response === 'string') {
                return response;
            } else if (typeof response === 'object' && response !== null && 'message' in response) {
                const message = response.message;

                if (Array.isArray(message)) {
                    return message.join(', ');
                }

                if (typeof message === 'string') {
                    return message;
                }
            }
            return exception.message;

        }
        return 'Internal server error';

    }

}