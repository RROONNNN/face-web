import { ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Roles } from "./roles.decorator";
import { Role } from "./role.enum";
import { AuthenticatedRequest } from "./authenticated-req.type";

@Injectable()
export class RolesGuard {
    constructor(private readonly reflector: Reflector) { }
    canActivate(context: ExecutionContext): boolean {
        const classes = context.getClass();
        console.log('classes', classes);
        console.log('context', context);
        console.log('reflector', this.reflector);
        const requiredRoles = this.reflector.get<Role[]>(Roles, context.getHandler());

        if (!requiredRoles || requiredRoles.length === 0) {
            return true;
        }
        const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
        const user = request.user;

        if (!user) {
            return false;
        }

        return requiredRoles.some((role) => user.roles.includes(role));

    }
}