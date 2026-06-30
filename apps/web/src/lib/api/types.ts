export type AccountRole = 'admin' | 'employee';
export type SortOrder = 'ASC' | 'DESC';
export type ShiftAssignmentSource = 'department_default' | 'admin_manual';

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

export type User = {
  id: string;
  employeeCode: string;
  name: string;
  accountRole: AccountRole;
  isActive: boolean;
  department: string | null;
  departmentId: string | null;
  jobTitle: string | null;
  phone: string | null;
  email: string | null;
  dateOfBirth: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ShiftWorkPeriod = {
  id?: string;
  shiftId?: string;
  name: string;
  startTime: string;
  endTime: string;
  isCrossMidnight: boolean;
};

export type Shift = {
  id: string;
  name: string;
  lateGraceMinutes: number;
  flexibleWindowMinutes?: number;
  isActive: boolean;
  workPeriods: ShiftWorkPeriod[];
  createdAt: string;
  updatedAt: string;
};

export type Department = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  defaultShiftId: string;
  defaultShift?: Shift;
  createdAt: string;
  updatedAt: string;
};

export type GeofenceConfig = {
  id: string;
  centerLat: number | null;
  centerLon: number | null;
  radiusMeters: number | null;
  createdAt: string;
  updatedAt: string;
};

export type FaceEmployeeSummary = {
  id: string;
  employeeCode: string;
  name: string;
  department: string | null;
  jobTitle: string | null;
};

export type EmployeeFace = {
  id: string;
  employeeId: string;
  employee: FaceEmployeeSummary | null;
  listFaceEmbedding: number[][];
  imageUrl: string;
  updatedTime: string;
  createdAt: string;
  updatedAt: string;
};

export type EmployeeFacesResponse = {
  items: EmployeeFace[];
  total: number;
  page: number;
  limit: number;
};

export type FaceImportSummary = {
  total: number;
  created: number;
  updated: number;
  skipped: string[];
  imported: number;
};

export type ShiftAssignment = {
  id: string;
  employeeId: string;
  employee?: User;
  shiftId: string;
  shift?: Shift;
  workDate: string;
  source: ShiftAssignmentSource;
  assignedByUserId?: string | null;
  assignedByUser?: User | null;
  note?: string | null;
  leaveShiftWorkPeriodIds?: string[];
  createdAt: string;
  updatedAt: string;
};

export type AttendanceSource =
  | 'mobile_face_recognition'
  | 'admin_manual'
  | 'fingerprint_device';

export type AttendanceStatus =
  | 'pending'
  | 'checked_in'
  | 'completed'
  | 'missing_check_out'
  | 'absent'
  | 'on_leave'
  | 'invalid';

export type DashboardAttendanceStatus = AttendanceStatus | 'no_record';
export type DashboardRecommendedAction =
  | 'manual_check_in'
  | 'manual_check_out'
  | 'review_absence'
  | 'none';

export type AttendanceEventType = 'check_in' | 'check_out';

export type AttendanceEvent = {
  id: string;
  attendanceRecordId: string;
  type: AttendanceEventType;
  occurredAt: string;
  source: AttendanceSource;
  faceSimilarity?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  isOutOfZone?: boolean | null;
  deviceId?: string | null;
  imageUrl?: string | null;
  createdAt: string;
  lateMinutes?: number | null;
  user?: {
    userName: string;
    employeeCode: string;
    department: string | null;
    jobTitle: string | null;
  };
};

export type AuditEntry = {
  id?: string;
  occurredAt: string;
  source: AttendanceSource;
  deviceId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  isOutOfZone?: boolean | null;
};

export type AttendanceRecord = {
  id: string;
  employeeId: string;
  employee?: User;
  shiftAssignmentId: string;
  shiftAssignment?: ShiftAssignment;
  workDate: string;
  status: AttendanceStatus;
  expectedCheckInAt: string;
  expectedCheckOutAt: string;
  checkedInAt?: string | null;
  checkedOutAt?: string | null;
  auditCheckIn: AuditEntry[];
  auditCheckOut: AuditEntry[];
  checkInSource?: AttendanceSource | null;
  checkOutSource?: AttendanceSource | null;
  lateMinutes: number;
};

export type AttendanceDashboardTotals = {
  scheduled: number;
  pending: number;
  checkedIn: number;
  completed: number;
  late: number;
  absent: number;
  missingCheckOut: number;
  onLeave: number;
  invalid: number;
  noRecord: number;
};

export type AttendanceDashboardRates = {
  attendanceRate: number;
  completionRate: number;
  lateRate: number;
};

export type AttendanceDashboardDepartment = {
  id: string | null;
  name: string;
  scheduled: number;
  checkedIn: number;
  completed: number;
  late: number;
  absent: number;
  missingCheckOut: number;
  onLeave: number;
  pending: number;
};

export type AttendanceDashboardAttention = {
  recordId: string | null;
  shiftAssignmentId: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  departmentId: string | null;
  departmentName: string | null;
  shiftName: string;
  status: DashboardAttendanceStatus;
  expectedCheckInAt: string;
  expectedCheckOutAt: string;
  checkedInAt: string | null;
  checkedOutAt: string | null;
  lateMinutes: number;
  recommendedAction: DashboardRecommendedAction;
};

export type AttendanceDashboardData = {
  workDate: string;
  generatedAt: string;
  timezone: string;
  totals: AttendanceDashboardTotals;
  rates: AttendanceDashboardRates;
  departments: AttendanceDashboardDepartment[];
  attention: AttendanceDashboardAttention[];
  actions: {
    canFinalizeDay: boolean;
    finalizablePendingCount: number;
    finalizableCheckedInCount: number;
  };
};

export type Holiday = {
  id: string;
  date: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EmployeeAttendanceSummary = {
  presentCount: number;
  leaveCount: number;
  absentCount: number;
  missingCheckOutCount: number;
  holidays: Holiday[];
};

export type EmployeeAttendanceData = {
  items: AttendanceRecord[];
  metaData: EmployeeAttendanceSummary;
};

export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export type LeaveRequestDay = {
  id: string;
  leaveRequestId: string;
  date: string;
  isPartialDay: boolean;
  departmentShiftId: string;
  shiftWorkPeriodId?: string | null;
};

export type LeaveRequest = {
  id: string;
  employeeId: string;
  employee?: User;
  startDate: string;
  endDate: string;
  reason: string;
  status: LeaveStatus;
  reviewedById?: string | null;
  reviewedBy?: User | null;
  reviewedAt?: string | null;
  rejectionReason?: string | null;
  cancelledAt?: string | null;
  days: LeaveRequestDay[];
  createdAt: string;
  updatedAt: string;
};
