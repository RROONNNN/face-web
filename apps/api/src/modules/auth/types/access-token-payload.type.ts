import { AccountRole } from "../account-role.enum";

export type AccessTokenPayload = {
    sub: string;
    employeeCode: string;
    role: AccountRole;
};