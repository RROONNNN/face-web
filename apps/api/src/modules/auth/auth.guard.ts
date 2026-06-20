import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from 'express';
import { AuthenticatedRequest } from "./authenticated-req.type";
import { JwtService } from "@nestjs/jwt";
import { AccessTokenPayload } from "./types/access-token-payload.type";
// import { CurrentUser } from "./current-user.interface";

@Injectable()
export class AuthGuard implements CanActivate {
    constructor(private readonly reflector: Reflector
        , private readonly jwtService: JwtService
    ) { }
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
        const authHeader = request.headers.authorization;
        if (!authHeader) {
            throw new UnauthorizedException('Missing Authorization header');
        }
        const [type, token] = authHeader.split(' ');
        if (type !== 'Bearer' || !token) {
            throw new UnauthorizedException('Invalid Authorization format');
        }
        try {
            const payload =
                await this.jwtService.verifyAsync<AccessTokenPayload>(token);
            request.user = {
                id: payload.sub,
                employeeCode: payload.employeeCode,
                roles: [payload.role],
            };
        } catch {
            throw new UnauthorizedException('Invalid token');
        }

        return true;
    }
}