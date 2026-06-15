import { Reflector } from '@nestjs/core';
import { AccountRole } from './account-role.enum';

export const AccountRoles = Reflector.createDecorator<AccountRole[]>();