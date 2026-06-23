export type AccountRole = 'admin' | 'employee';

export type ApiSuccessEnvelope<T> = {
  success: true;
  data: T;
  timestamp: string;
};

export type ApiErrorEnvelope = {
  success: false;
  statusCode: number;
  message: string;
  timestamp: string;
  path: string;
};

export type ApiEnvelope<T> = ApiSuccessEnvelope<T> | ApiErrorEnvelope;

export type AuthUser = {
  id: string;
  employeeCode: string;
  name: string;
  accountRole: AccountRole;
};

export type AuthPayload = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};

export type LoginCredentials = {
  employeeCode: string;
  password: string;
};

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type PaginatedData<T> = {
  items: T[];
  meta: PaginationMeta;
};
