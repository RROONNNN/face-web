import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from 'express';
import { AuthenticatedRequest } from "./authenticated-req.type";
import { Role } from "./role.enum";
import { CurrentUser } from "./current-user.interface";
@Injectable()
export class AuthGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) { }
    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
        const authHeader = request.headers.authorization;
        if (!authHeader) {
            throw new UnauthorizedException('Missing Authorization header');
        }
        const [type, token] = authHeader.split(' ');
        if (type !== 'Bearer' || !token) {
            throw new UnauthorizedException('Invalid Authorization format');
        }
        const user = this.validateToken(token);
        if (!user) {
            throw new UnauthorizedException('Invalid token');
        }
        request.user = user;
        return true;
    }
    private validateToken(token: string): CurrentUser | null {
        if (token === 'admin-token') {
            return {
                id: '1',
                username: 'Alice Admin',
                roles: [Role.Admin],
            };
        }

        if (token === 'user-token') {
            return {
                id: '2',
                username: 'Bob User',
                roles: [Role.User],
            };
        }

        return null;
    }
}