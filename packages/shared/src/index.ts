export type HealthStatus = {
  status: 'ok';
};

export type ApiSuccessResponse<T> = {
  success: true;
  data: T;
  timestamp: string;
};

export type ApiErrorResponse = {
  success: false;
  statusCode: number;
  message: string | string[];
  timestamp: string;
  path: string;
};

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
};

export enum AccountRole {
  Admin = 'admin',
  Employee = 'employee',
}

export enum AttendanceStatus {
  Present = 'present',
  Partial = 'partial',
  Absent = 'absent',
}

export enum AttendanceMethod {
  Mobile = 'mobile',
  Sync = 'sync',
  Manual = 'manual',
}

export enum LeaveStatus {
  Pending = 'pending',
  Approved = 'approved',
  Rejected = 'rejected',
}

export type EmployeeSummary = {
  id: string;
  employeeCode: string;
  name: string;
  department: string | null;
  jobTitle: string | null;
};

export type AttendanceEventSummary = {
  id: string;
  shiftId: string;
  time: string;
  latitude: number | null;
  longitude: number | null;
  method: AttendanceMethod;
  imagePath: string | null;
  isOutOfZone: boolean;
};

export type AttendanceUpdatePayload = {
  eventType: 'checkIn' | 'checkOut';
  employeeId: string;
  workDate: string;
  event: AttendanceEventSummary;
};
