import { CurrentUser } from "./current-user.interface";
import { Request } from "express";

export type AuthenticatedRequest = Request & {
    user?: CurrentUser;
};