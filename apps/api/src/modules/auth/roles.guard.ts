import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AccountRoles } from './roles.decorator';
import { AuthenticatedRequest } from './authenticated-req.type';
import { AccountRole } from './account-role.enum';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles =
      this.reflector.get<AccountRole[]>(AccountRoles, context.getHandler()) ??
      this.reflector.get<AccountRole[]>(AccountRoles, context.getClass());

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
