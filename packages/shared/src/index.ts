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

export type AdminUser = {
  id: string;
  employeeCode: string;
  name: string;
  accountRole: AccountRole;
};

export type LoginPayload = {
  accessToken: string;
  refreshToken: string;
  user: AdminUser;
};

export type EmployeeSummary = {
  id: string;
  employeeCode: string;
  name: string;
  department: string | null;
  jobTitle: string | null;
};

export type Employee = EmployeeSummary & {
  accountRole: AccountRole;
  phone: string | null;
  email: string | null;
  dateOfBirth: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Shift = {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
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

export type AttendanceRow = {
  employee: EmployeeSummary;
  workDate: string;
  status: AttendanceStatus;
  checkIn: AttendanceEventSummary | null;
  checkOut: AttendanceEventSummary | null;
  late: boolean;
  early: boolean;
  outOfZone: boolean;
  totalWorkHours: number;
};

export type AttendanceUpdatePayload = {
  eventType: 'checkIn' | 'checkOut';
  employeeId: string;
  workDate: string;
  event: AttendanceEventSummary;
};

export type PresentEmployee = {
  employee: EmployeeSummary;
  checkIn: AttendanceEventSummary;
  workDate: string;
  late: boolean;
  outOfZone: boolean;
};

export type LeaveRequest = {
  id: string;
  employeeId: string;
  employee: EmployeeSummary | null;
  startDate: string;
  endDate: string;
  reason: string;
  status: LeaveStatus;
  reviewedById: string | null;
  reviewedBy: EmployeeSummary | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type FaceData = {
  id: string;
  employeeId: string;
  employee: EmployeeSummary | null;
  listFaceEmbedding: number[][];
  imageUrl: string;
  updatedTime: string;
  createdAt: string;
  updatedAt: string;
};

export type GeoConfig = {
  id: string;
  centerLat: number;
  centerLon: number;
  radiusMeters: number;
  createdAt: string;
  updatedAt: string;
};

export type MonthlyReportItem = {
  employee: EmployeeSummary;
  totalWorkDays: number;
  totalWorkHours: number;
  leaveDays: number;
  lateCount: number;
  earlyLeaveCount: number;
  outOfZoneCount: number;
};

export type MonthlyReport = {
  month: string;
  items: MonthlyReportItem[];
  total: number;
  page: number;
  limit: number;
};
