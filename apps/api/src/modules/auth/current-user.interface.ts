import { Role } from "./role.enum";

export interface CurrentUser {
    id: string;
    username: string;
    roles: Role[];
}