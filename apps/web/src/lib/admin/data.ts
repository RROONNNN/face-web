import { authenticatedApiFetch } from '@/lib/api/authenticated';
import { toQueryString } from '@/lib/api/query';
import type {
  AccountRole,
  Department,
  PaginatedData,
  Shift,
  ShiftAssignment,
  ShiftAssignmentSource,
  SortOrder,
  User,
  AttendanceStatus,
  AttendanceRecord,
  AttendanceDashboardData,
  EmployeeAttendanceData,
  LeaveStatus,
  LeaveRequest,
  GeofenceConfig,
} from '@/lib/api/types';

export type UsersQuery = {
  page?: number;
  limit?: number;
  search?: string;
  departmentId?: string;
  accountRole?: AccountRole;
  isActive?: boolean;
  sortBy?: 'name' | 'employeeCode' | 'createdAt';
  sortOrder?: SortOrder;
};

export type DepartmentsQuery = {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  sortBy?: 'name' | 'code' | 'createdAt';
  sortOrder?: SortOrder;
};

export type ShiftsQuery = {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  sortBy?: 'name' | 'code' | 'createdAt';
  sortOrder?: SortOrder;
};

export type ShiftAssignmentsQuery = {
  page?: number;
  limit?: number;
  employeeId?: string;
  employeeSearch?: string;
  shiftId?: string;
  workDate?: string;
  dateFrom?: string;
  dateTo?: string;
  source?: ShiftAssignmentSource;
  sortBy?: 'workDate' | 'createdAt';
  sortOrder?: SortOrder;
};

export function getUsers(query: UsersQuery = {}) {
  return authenticatedApiFetch<PaginatedData<User>>(
    `/api/users${toQueryString(query)}`,
  );
}

export function getUser(id: string) {
  return authenticatedApiFetch<User>(`/api/users/${id}`);
}

export function getDepartments(query: DepartmentsQuery = {}) {
  return authenticatedApiFetch<PaginatedData<Department>>(
    `/api/departments${toQueryString(query)}`,
  );
}

export function getDepartment(id: string) {
  return authenticatedApiFetch<Department>(`/api/departments/${id}`);
}

export function getShifts(query: ShiftsQuery = {}) {
  return authenticatedApiFetch<PaginatedData<Shift>>(
    `/api/shifts${toQueryString(query)}`,
  );
}

export async function getShift(id: string) {
  const shifts = await getShifts({ limit: 100, sortBy: 'name', sortOrder: 'ASC' });
  return shifts.items.find((shift) => shift.id === id) ?? null;
}

export function getShiftAssignments(query: ShiftAssignmentsQuery = {}) {
  return authenticatedApiFetch<PaginatedData<ShiftAssignment>>(
    `/api/shifts/assignments${toQueryString(query)}`,
  );
}

export type AttendanceQuery = {
  page?: number;
  limit?: number;
  employeeId?: string;
  date?: string;
  status?: AttendanceStatus;
};

export function getAttendance(query: AttendanceQuery = {}) {
  return authenticatedApiFetch<PaginatedData<AttendanceRecord>>(
    `/api/attendance${toQueryString(query)}`,
  );
}

export function getAttendanceRecord(id: string) {
  return authenticatedApiFetch<AttendanceRecord>(`/api/attendance/${id}`);
}

export type AttendanceDashboardQuery = {
  workDate?: string;
  departmentId?: string;
};

export function getAttendanceDashboard(query: AttendanceDashboardQuery = {}) {
  return authenticatedApiFetch<AttendanceDashboardData>(
    `/api/attendance/admin/dashboard${toQueryString(query)}`,
  );
}

export type EmployeeAttendanceQuery = {
  employeeId: string;
  startDate: string;
  endDate: string;
};

export function getEmployeeAttendance(query: EmployeeAttendanceQuery) {
  return authenticatedApiFetch<EmployeeAttendanceData>(
    `/api/attendance/query-by-employee${toQueryString(query)}`,
  );
}

export type LeaveRequestsQuery = {
  page?: number;
  limit?: number;
  employeeId?: string;
  status?: LeaveStatus;
  fromDate?: string;
  toDate?: string;
};

export function getLeaveRequests(query: LeaveRequestsQuery = {}) {
  return authenticatedApiFetch<PaginatedData<LeaveRequest>>(
    `/api/leave${toQueryString(query)}`,
  );
}

export function getLeaveRequest(id: string) {
  return authenticatedApiFetch<LeaveRequest>(`/api/leave/${id}`);
}

export function getGeofenceConfig() {
  return authenticatedApiFetch<GeofenceConfig | null>('/api/geofence');
}
