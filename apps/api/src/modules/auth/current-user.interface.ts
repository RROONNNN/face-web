import { AccountRole } from './account-role.enum';

export interface CurrentUser {
    id: string;
    employeeCode: string;
    roles: AccountRole[];
}
