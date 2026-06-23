export type HealthStatus = {
  status: 'ok';
};

export enum LeaveStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

export enum LeaveDayScope {
  FULL_DAY = 'full_day',
  WORK_PERIODS = 'work_periods',
}

export interface LeavePeriodSnapshot {
  workPeriodId: string;
  name: string;
  startTime: string;
  endTime: string;
  isCrossMidnight: boolean;
}

export interface LeaveDayResponse {
  id: string;
  workDate: string;
  scope: LeaveDayScope;
  shiftAssignmentId: string | null;
  requestedPeriods: LeavePeriodSnapshot[];
}

export interface LeaveEmployeeSummary {
  id: string;
  employeeCode: string;
  name: string;
  department: string | null;
  jobTitle: string | null;
}

export interface CreateLeaveRequest {
  startDate: string;
  endDate: string;
  reason: string;
  partialDays?: Array<{
    workDate: string;
    workPeriodIds: string[];
  }>;
}

export interface LeaveRequestResponse {
  id: string;
  employeeId: string;
  employee: LeaveEmployeeSummary | null;
  startDate: string;
  endDate: string;
  reason: string;
  status: LeaveStatus;
  days: LeaveDayResponse[];
  reviewedById: string | null;
  reviewedBy: LeaveEmployeeSummary | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: PaginationMeta;
}
