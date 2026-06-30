import * as bcrypt from 'bcrypt';
import 'dotenv/config';
import { EntityManager } from 'typeorm';

import { AttendanceEvent } from '../../modules/attendance/entities/attendance-event.entity';
import {
  AttendanceRecord,
  AuditEntry,
} from '../../modules/attendance/entities/attendance-record.entity';
import { AttendanceEventType } from '../../modules/attendance/enums/attendance-event.type';
import { AttendanceSource } from '../../modules/attendance/enums/attendance-source.enum';
import { AttendanceStatus } from '../../modules/attendance/enums/attendance-status.enum';
import { AccountRole } from '../../modules/auth/account-role.enum';
import { Department } from '../../modules/departments/entities/department.entity';
import { LeaveRequestDay } from '../../modules/leave/entities/leave-request-day.entity';
import { LeaveRequest } from '../../modules/leave/entities/leave-request.entity';
import { LeaveDayScope } from '../../modules/leave/enums/leave-day-scope.enum';
import { LeaveStatus } from '../../modules/leave/enums/leave-status.enum';
import { EmployeeShiftAssignment } from '../../modules/shifts/entities/employee-shift-assignment.entity';
import { ShiftWorkPeriod } from '../../modules/shifts/entities/shift-work-period.entity';
import { Shift } from '../../modules/shifts/entities/shift.entity';
import { ShiftAssignmentSource } from '../../modules/shifts/enums/shift-assignment-source.enum';
import { User } from '../../modules/users/entities/user.entity';
import dataSource from '../data-source';

type SeedAction = 'created' | 'reused';

type SeedResult<T> = {
  entity: T;
  action: SeedAction;
};

type Counter = {
  created: number;
  reused: number;
};

type SeedSummary = {
  adminEmployeeCode: string | null;
  admin: Counter;
  departments: Counter;
  shifts: Counter;
  workPeriods: Counter;
  employees: Counter;
  shiftAssignments: Counter;
  attendanceRecords: Counter;
  attendanceEvents: Counter;
  leaveRequests: Counter;
  leaveRequestDays: Counter;
  warnings: string[];
};

type ShiftSeed = {
  key: 'office' | 'support';
  name: string;
  lateGraceMinutes: number;
  flexibleWindowMinutes: number;
  workPeriods: Array<{
    name: string;
    startTime: string;
    endTime: string;
    isCrossMidnight: boolean;
  }>;
};

type DepartmentSeed = {
  code: string;
  name: string;
  description: string;
  shiftKey: ShiftSeed['key'];
};

type EmployeeSeed = {
  employeeCode: string;
  name: string;
  departmentCode: DepartmentSeed['code'];
  jobTitle: string;
  phone: string;
  email: string;
  dateOfBirth: string;
};

type AttendanceScenario = 'normal' | 'late' | 'early' | 'absent' | 'leave';

const DEMO_TIME_ZONE_OFFSET = process.env.DEMO_TIME_ZONE_OFFSET ?? '+07:00';
const DEMO_EMPLOYEE_PASSWORD = process.env.DEMO_EMPLOYEE_PASSWORD ?? '123456';
const DEMO_ADMIN_EMPLOYEE_CODE =
  process.env.DEMO_ADMIN_EMPLOYEE_CODE ??
  process.env.ADMIN_EMPLOYEE_CODE ??
  'ADMIN001';
const DEMO_ADMIN_NAME =
  process.env.DEMO_ADMIN_NAME ?? process.env.ADMIN_NAME ?? 'Demo Admin';

type AdminSeedConfig = {
  employeeCode: string;
  name: string;
  email: string | null;
  password: string | null;
};

const shifts: ShiftSeed[] = [
  {
    key: 'office',
    name: 'Demo Standard Office Shift',
    lateGraceMinutes: 10,
    flexibleWindowMinutes: 0,
    workPeriods: [
      {
        name: 'Office Day',
        startTime: '08:30:00',
        endTime: '17:30:00',
        isCrossMidnight: false,
      },
    ],
  },
  {
    key: 'support',
    name: 'Demo Customer Support Shift',
    lateGraceMinutes: 5,
    flexibleWindowMinutes: 15,
    workPeriods: [
      {
        name: 'Support Day',
        startTime: '10:00:00',
        endTime: '19:00:00',
        isCrossMidnight: false,
      },
    ],
  },
];

const departments: DepartmentSeed[] = [
  {
    code: 'DEMO-ENG',
    name: 'Demo Product Engineering',
    description: 'Demo department for product and platform engineers.',
    shiftKey: 'office',
  },
  {
    code: 'DEMO-CX',
    name: 'Demo Customer Experience',
    description: 'Demo department for customer-facing operations.',
    shiftKey: 'support',
  },
];

const employees: EmployeeSeed[] = [
  {
    employeeCode: 'DEMO-EMP-001',
    name: 'An Nguyen',
    departmentCode: 'DEMO-ENG',
    jobTitle: 'Frontend Engineer',
    phone: '0901000001',
    email: 'demo.an.nguyen@example.com',
    dateOfBirth: '1994-02-12',
  },
  {
    employeeCode: 'DEMO-EMP-002',
    name: 'Binh Tran',
    departmentCode: 'DEMO-ENG',
    jobTitle: 'Backend Engineer',
    phone: '0901000002',
    email: 'demo.binh.tran@example.com',
    dateOfBirth: '1992-06-21',
  },
  {
    employeeCode: 'DEMO-EMP-003',
    name: 'Chi Le',
    departmentCode: 'DEMO-ENG',
    jobTitle: 'QA Analyst',
    phone: '0901000003',
    email: 'demo.chi.le@example.com',
    dateOfBirth: '1995-09-08',
  },
  {
    employeeCode: 'DEMO-EMP-004',
    name: 'Dung Pham',
    departmentCode: 'DEMO-CX',
    jobTitle: 'Support Lead',
    phone: '0901000004',
    email: 'demo.dung.pham@example.com',
    dateOfBirth: '1991-11-19',
  },
  {
    employeeCode: 'DEMO-EMP-005',
    name: 'Giang Hoang',
    departmentCode: 'DEMO-CX',
    jobTitle: 'Customer Success Specialist',
    phone: '0901000005',
    email: 'demo.giang.hoang@example.com',
    dateOfBirth: '1990-04-03',
  },
];

const leaveDatesByEmployeeCode = new Map<string, string[]>([
  ['DEMO-EMP-003', ['2026-05-18', '2026-05-19']],
  ['DEMO-EMP-005', ['2026-06-12']],
]);

const absentDatesByEmployeeCode = new Map<string, string[]>([
  ['DEMO-EMP-002', ['2026-05-22', '2026-06-15']],
  ['DEMO-EMP-004', ['2026-06-03']],
]);

function createCounter(): Counter {
  return { created: 0, reused: 0 };
}

function createSummary(): SeedSummary {
  return {
    adminEmployeeCode: null,
    admin: createCounter(),
    departments: createCounter(),
    shifts: createCounter(),
    workPeriods: createCounter(),
    employees: createCounter(),
    shiftAssignments: createCounter(),
    attendanceRecords: createCounter(),
    attendanceEvents: createCounter(),
    leaveRequests: createCounter(),
    leaveRequestDays: createCounter(),
    warnings: [],
  };
}

function count(counter: Counter, action: SeedAction): void {
  counter[action] += 1;
}

function optionalEnv(...names: string[]): string | null {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) {
      return value;
    }
  }

  return null;
}

function getAdminConfig(): AdminSeedConfig {
  return {
    employeeCode: DEMO_ADMIN_EMPLOYEE_CODE,
    name: DEMO_ADMIN_NAME,
    email: optionalEnv('DEMO_ADMIN_EMAIL', 'ADMIN_EMAIL'),
    password: optionalEnv('DEMO_ADMIN_PASSWORD', 'ADMIN_PASSWORD'),
  };
}

function addDays(workDate: string, days: number): string {
  const date = new Date(`${workDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function dateTimeFor(workDate: string, time: string): Date {
  return new Date(`${workDate}T${time}${DEMO_TIME_ZONE_OFFSET}`);
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

function minutesBetween(start: Date, end: Date): number {
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 60_000));
}

function enumerateWeekdays(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const cursor = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);

  while (cursor <= end) {
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) {
      dates.push(cursor.toISOString().slice(0, 10));
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
}

function buildPeriodBounds(
  workDate: string,
  periods: ShiftWorkPeriod[],
): {
  expectedCheckInAt: Date;
  expectedCheckOutAt: Date;
} {
  const bounds = periods.map((period) => {
    const start = dateTimeFor(workDate, period.startTime);
    const endDate = period.isCrossMidnight ? addDays(workDate, 1) : workDate;
    const end = dateTimeFor(endDate, period.endTime);
    return { start, end };
  });

  return {
    expectedCheckInAt: new Date(
      Math.min(...bounds.map((bound) => bound.start.getTime())),
    ),
    expectedCheckOutAt: new Date(
      Math.max(...bounds.map((bound) => bound.end.getTime())),
    ),
  };
}

function auditEntry(
  occurredAt: Date,
  source: AttendanceSource,
  employeeIndex: number,
): AuditEntry {
  return {
    occurredAt,
    source,
    deviceId: `demo-web-${String(employeeIndex + 1).padStart(2, '0')}`,
    latitude: 10.7769,
    longitude: 106.7009,
    isOutOfZone: false,
  };
}

function scenarioFor(
  employee: EmployeeSeed,
  employeeIndex: number,
  workDate: string,
): AttendanceScenario {
  if (leaveDatesByEmployeeCode.get(employee.employeeCode)?.includes(workDate)) {
    return 'leave';
  }

  if (
    absentDatesByEmployeeCode.get(employee.employeeCode)?.includes(workDate)
  ) {
    return 'absent';
  }

  const dayOfMonth = Number(workDate.slice(8, 10));
  if (dayOfMonth % 11 === employeeIndex + 1) {
    return 'late';
  }

  if (dayOfMonth % 13 === employeeIndex + 2) {
    return 'early';
  }

  return 'normal';
}

async function ensureShift(
  manager: EntityManager,
  seed: ShiftSeed,
  summary: SeedSummary,
): Promise<SeedResult<Shift>> {
  const shiftRepository = manager.getRepository(Shift);
  let shift = await shiftRepository.findOne({ where: { name: seed.name } });
  let action: SeedAction = 'reused';

  if (!shift) {
    shift = await shiftRepository.save(
      shiftRepository.create({
        name: seed.name,
        lateGraceMinutes: seed.lateGraceMinutes,
        flexibleWindowMinutes: seed.flexibleWindowMinutes,
        isActive: true,
      }),
    );
    action = 'created';
  }

  count(summary.shifts, action);

  const periodRepository = manager.getRepository(ShiftWorkPeriod);
  for (const periodSeed of seed.workPeriods) {
    const existingPeriod = await periodRepository.findOne({
      where: { shiftId: shift.id, name: periodSeed.name },
    });

    if (existingPeriod) {
      count(summary.workPeriods, 'reused');
      continue;
    }

    await periodRepository.save(
      periodRepository.create({
        shiftId: shift.id,
        name: periodSeed.name,
        startTime: periodSeed.startTime,
        endTime: periodSeed.endTime,
        isCrossMidnight: periodSeed.isCrossMidnight,
      }),
    );
    count(summary.workPeriods, 'created');
  }

  return { entity: shift, action };
}

async function ensureDepartment(
  manager: EntityManager,
  seed: DepartmentSeed,
  shift: Shift,
  summary: SeedSummary,
): Promise<SeedResult<Department>> {
  const departmentRepository = manager.getRepository(Department);
  let department = await departmentRepository.findOne({
    where: { code: seed.code },
  });

  if (department) {
    count(summary.departments, 'reused');
    return { entity: department, action: 'reused' };
  }

  department = await departmentRepository.save(
    departmentRepository.create({
      code: seed.code,
      name: seed.name,
      description: seed.description,
      defaultShiftId: shift.id,
      isActive: true,
    }),
  );

  count(summary.departments, 'created');
  return { entity: department, action: 'created' };
}

async function ensureAdmin(
  manager: EntityManager,
  department: Department,
  config: AdminSeedConfig,
  summary: SeedSummary,
): Promise<User> {
  const userRepository = manager.getRepository(User);
  const existingByCode = await userRepository.findOne({
    where: { employeeCode: config.employeeCode },
  });

  if (existingByCode) {
    if (existingByCode.accountRole !== AccountRole.Admin) {
      throw new Error(
        `Refusing to reuse ${config.employeeCode}: existing account is not an admin.`,
      );
    }

    if (config.email && existingByCode.email !== config.email) {
      summary.warnings.push(
        `Admin ${config.employeeCode} already exists with email ${existingByCode.email ?? '(empty)'}; left unchanged.`,
      );
    }

    count(summary.admin, 'reused');
    summary.adminEmployeeCode = existingByCode.employeeCode;
    return existingByCode;
  }

  if (!config.password) {
    throw new Error(
      'DEMO_ADMIN_PASSWORD or ADMIN_PASSWORD is required when the demo admin account does not already exist.',
    );
  }

  if (config.email) {
    const usersWithEmail = await userRepository.find({
      where: { email: config.email },
    });
    if (usersWithEmail.length > 0) {
      const matchingAdmin = usersWithEmail.find(
        (user) =>
          user.accountRole === AccountRole.Admin &&
          user.employeeCode === config.employeeCode,
      );

      if (!matchingAdmin || usersWithEmail.length > 1) {
        throw new Error(
          `Refusing to create demo admin: email ${config.email} already belongs to an existing account.`,
        );
      }

      count(summary.admin, 'reused');
      summary.adminEmployeeCode = matchingAdmin.employeeCode;
      return matchingAdmin;
    }
  }

  const passwordHash = await bcrypt.hash(config.password, 10);
  const admin = await userRepository.save(
    userRepository.create({
      employeeCode: config.employeeCode,
      name: config.name,
      passwordHash,
      accountRole: AccountRole.Admin,
      isActive: true,
      department: department.name,
      departmentId: department.id,
      jobTitle: 'System Administrator',
      phone: null,
      email: config.email,
      dateOfBirth: null,
    }),
  );

  count(summary.admin, 'created');
  summary.adminEmployeeCode = admin.employeeCode;
  return admin;
}

async function ensureEmployee(
  manager: EntityManager,
  seed: EmployeeSeed,
  department: Department,
  passwordHash: string,
  summary: SeedSummary,
): Promise<User> {
  const userRepository = manager.getRepository(User);
  const existing = await userRepository.findOne({
    where: { employeeCode: seed.employeeCode },
  });

  if (existing) {
    if (existing.accountRole !== AccountRole.Employee) {
      throw new Error(
        `Refusing to reuse ${seed.employeeCode}: existing account is not an employee.`,
      );
    }

    count(summary.employees, 'reused');
    return existing;
  }

  const usersWithEmail = await userRepository.find({
    where: { email: seed.email },
  });
  if (usersWithEmail.length > 0) {
    throw new Error(
      `Refusing to create ${seed.employeeCode}: email ${seed.email} already exists.`,
    );
  }

  const employee = await userRepository.save(
    userRepository.create({
      employeeCode: seed.employeeCode,
      name: seed.name,
      passwordHash,
      accountRole: AccountRole.Employee,
      isActive: true,
      department: department.name,
      departmentId: department.id,
      jobTitle: seed.jobTitle,
      phone: seed.phone,
      email: seed.email,
      dateOfBirth: seed.dateOfBirth,
    }),
  );

  count(summary.employees, 'created');
  return employee;
}

async function ensureShiftAssignment(
  manager: EntityManager,
  employee: User,
  shift: Shift,
  workDate: string,
  scenario: AttendanceScenario,
  summary: SeedSummary,
): Promise<SeedResult<EmployeeShiftAssignment>> {
  const assignmentRepository = manager.getRepository(EmployeeShiftAssignment);
  const existing = await assignmentRepository.findOne({
    where: { employeeId: employee.id, workDate },
  });

  if (existing) {
    count(summary.shiftAssignments, 'reused');
    return { entity: existing, action: 'reused' };
  }

  const assignment = await assignmentRepository.save(
    assignmentRepository.create({
      employeeId: employee.id,
      shiftId: shift.id,
      workDate,
      source: ShiftAssignmentSource.DEPARTMENT_DEFAULT,
      assignedByUserId: null,
      note: `Demo attendance scenario: ${scenario}`,
      leaveShiftWorkPeriodIds: [],
    }),
  );

  count(summary.shiftAssignments, 'created');
  return { entity: assignment, action: 'created' };
}

async function getShiftPeriods(
  manager: EntityManager,
  shiftId: string,
): Promise<ShiftWorkPeriod[]> {
  const periods = await manager.getRepository(ShiftWorkPeriod).find({
    where: { shiftId },
    order: { startTime: 'ASC' },
  });

  if (periods.length === 0) {
    throw new Error(`Shift ${shiftId} has no work periods.`);
  }

  return periods;
}

async function ensureApprovedLeave(
  manager: EntityManager,
  employee: User,
  admin: User,
  workDate: string,
  periods: ShiftWorkPeriod[],
  summary: SeedSummary,
): Promise<void> {
  const requestRepository = manager.getRepository(LeaveRequest);
  const dayRepository = manager.getRepository(LeaveRequestDay);
  const reason = `Demo approved leave: ${employee.employeeCode} ${workDate}`;
  let request = await requestRepository.findOne({
    where: {
      employeeId: employee.id,
      startDate: workDate,
      endDate: workDate,
      reason,
    },
  });

  if (request) {
    count(summary.leaveRequests, 'reused');
    if (request.status !== LeaveStatus.APPROVED) {
      summary.warnings.push(
        `Leave request ${reason} exists with status ${request.status}; left unchanged.`,
      );
      return;
    }
  } else {
    request = await requestRepository.save(
      requestRepository.create({
        employeeId: employee.id,
        startDate: workDate,
        endDate: workDate,
        reason,
        status: LeaveStatus.APPROVED,
        reviewedById: admin.id,
        reviewedAt: dateTimeFor(workDate, '09:00:00'),
        rejectionReason: null,
        cancelledAt: null,
      }),
    );
    count(summary.leaveRequests, 'created');
  }

  const existingDay = await dayRepository.findOne({
    where: { leaveRequestId: request.id, workDate },
  });

  if (existingDay) {
    count(summary.leaveRequestDays, 'reused');
    return;
  }

  await dayRepository.save(
    dayRepository.create({
      leaveRequestId: request.id,
      workDate,
      scope: LeaveDayScope.FULL_DAY,
      shiftAssignmentId: null,
      requestedPeriods: [],
    }),
  );
  count(summary.leaveRequestDays, 'created');
}

async function createAttendanceEvents(
  manager: EntityManager,
  record: AttendanceRecord,
  checkInAt: Date | null,
  checkOutAt: Date | null,
  employeeIndex: number,
  summary: SeedSummary,
): Promise<void> {
  const eventRepository = manager.getRepository(AttendanceEvent);
  const events: AttendanceEvent[] = [];

  if (checkInAt) {
    events.push(
      eventRepository.create({
        attendanceRecordId: record.id,
        type: AttendanceEventType.CHECK_IN,
        occurredAt: checkInAt,
        source: AttendanceSource.MOBILE_FACE_RECOGNITION,
        faceSimilarity: 0.94 - employeeIndex * 0.01,
        latitude: 10.7769,
        longitude: 106.7009,
        isOutOfZone: false,
        deviceId: `demo-web-${String(employeeIndex + 1).padStart(2, '0')}`,
        imageUrl: null,
      }),
    );
  }

  if (checkOutAt) {
    events.push(
      eventRepository.create({
        attendanceRecordId: record.id,
        type: AttendanceEventType.CHECK_OUT,
        occurredAt: checkOutAt,
        source: AttendanceSource.MOBILE_FACE_RECOGNITION,
        faceSimilarity: 0.91 - employeeIndex * 0.01,
        latitude: 10.7769,
        longitude: 106.7009,
        isOutOfZone: false,
        deviceId: `demo-web-${String(employeeIndex + 1).padStart(2, '0')}`,
        imageUrl: null,
      }),
    );
  }

  if (events.length === 0) {
    return;
  }

  await eventRepository.save(events);
  summary.attendanceEvents.created += events.length;
}

async function ensureAttendanceRecord(
  manager: EntityManager,
  assignment: EmployeeShiftAssignment,
  periods: ShiftWorkPeriod[],
  scenario: AttendanceScenario,
  employeeIndex: number,
  summary: SeedSummary,
): Promise<AttendanceRecord> {
  const recordRepository = manager.getRepository(AttendanceRecord);
  const existing = await recordRepository.findOne({
    where: { shiftAssignmentId: assignment.id },
  });

  if (existing) {
    count(summary.attendanceRecords, 'reused');
    return existing;
  }

  const { expectedCheckInAt, expectedCheckOutAt } = buildPeriodBounds(
    assignment.workDate,
    periods,
  );
  const assignedShift = await manager.getRepository(Shift).findOneOrFail({
    where: { id: assignment.shiftId },
  });
  const checkedInAt =
    scenario === 'absent' || scenario === 'leave'
      ? null
      : addMinutes(
          expectedCheckInAt,
          scenario === 'late' ? 25 + employeeIndex : -4 + (employeeIndex % 3),
        );
  const checkedOutAt =
    scenario === 'absent' || scenario === 'leave'
      ? null
      : addMinutes(expectedCheckOutAt, scenario === 'early' ? -75 : 5);
  const status =
    scenario === 'absent'
      ? AttendanceStatus.ABSENT
      : scenario === 'leave'
        ? AttendanceStatus.ON_LEAVE
        : AttendanceStatus.COMPLETED;
  const source = AttendanceSource.MOBILE_FACE_RECOGNITION;

  const record = await recordRepository.save(
    recordRepository.create({
      employeeId: assignment.employeeId,
      shiftAssignmentId: assignment.id,
      workDate: assignment.workDate,
      status,
      expectedCheckInAt,
      expectedCheckOutAt,
      checkedInAt,
      checkedOutAt,
      auditCheckIn: checkedInAt
        ? [auditEntry(checkedInAt, source, employeeIndex)]
        : [],
      auditCheckOut: checkedOutAt
        ? [auditEntry(checkedOutAt, source, employeeIndex)]
        : [],
      checkInSource: checkedInAt ? source : null,
      checkOutSource: checkedOutAt ? source : null,
      lateMinutes: checkedInAt
        ? Math.max(
            0,
            minutesBetween(expectedCheckInAt, checkedInAt) -
              assignedShift.lateGraceMinutes,
          )
        : 0,
    }),
  );

  count(summary.attendanceRecords, 'created');
  await createAttendanceEvents(
    manager,
    record,
    checkedInAt,
    checkedOutAt,
    employeeIndex,
    summary,
  );

  return record;
}

async function seedDemoData(): Promise<SeedSummary> {
  const adminConfig = getAdminConfig();
  const summary = createSummary();

  await dataSource.initialize();

  return dataSource.transaction(async (manager) => {
    const shiftsByKey = new Map<ShiftSeed['key'], Shift>();

    for (const shiftSeed of shifts) {
      const shift = await ensureShift(manager, shiftSeed, summary);
      shiftsByKey.set(shiftSeed.key, shift.entity);
    }

    const departmentsByCode = new Map<string, Department>();
    for (const departmentSeed of departments) {
      const shift = shiftsByKey.get(departmentSeed.shiftKey);
      if (!shift) {
        throw new Error(`Missing shift for ${departmentSeed.code}.`);
      }

      const department = await ensureDepartment(
        manager,
        departmentSeed,
        shift,
        summary,
      );
      departmentsByCode.set(departmentSeed.code, department.entity);
    }

    const adminDepartment = departmentsByCode.get('DEMO-ENG');
    if (!adminDepartment) {
      throw new Error('Missing DEMO-ENG department for admin.');
    }

    const admin = await ensureAdmin(
      manager,
      adminDepartment,
      adminConfig,
      summary,
    );
    const employeePasswordHash = await bcrypt.hash(DEMO_EMPLOYEE_PASSWORD, 10);
    const savedEmployees: User[] = [];

    for (const employeeSeed of employees) {
      const department = departmentsByCode.get(employeeSeed.departmentCode);
      if (!department) {
        throw new Error(`Missing department for ${employeeSeed.employeeCode}.`);
      }

      savedEmployees.push(
        await ensureEmployee(
          manager,
          employeeSeed,
          department,
          employeePasswordHash,
          summary,
        ),
      );
    }

    const workDates = enumerateWeekdays('2026-05-04', '2026-06-26');
    for (const [employeeIndex, employee] of savedEmployees.entries()) {
      const employeeSeed = employees[employeeIndex];
      const departmentSeed = departments.find(
        (item) => item.code === employeeSeed.departmentCode,
      );
      if (!departmentSeed) {
        throw new Error(
          `Missing seed department for ${employee.employeeCode}.`,
        );
      }

      const shift = shiftsByKey.get(departmentSeed.shiftKey);
      if (!shift) {
        throw new Error(`Missing shift for ${employee.employeeCode}.`);
      }

      for (const workDate of workDates) {
        const scenario = scenarioFor(employeeSeed, employeeIndex, workDate);
        const assignment = await ensureShiftAssignment(
          manager,
          employee,
          shift,
          workDate,
          scenario,
          summary,
        );
        const periods = await getShiftPeriods(
          manager,
          assignment.entity.shiftId,
        );

        if (scenario === 'leave') {
          await ensureApprovedLeave(
            manager,
            employee,
            admin,
            workDate,
            periods,
            summary,
          );
        }

        await ensureAttendanceRecord(
          manager,
          assignment.entity,
          periods,
          scenario,
          employeeIndex,
          summary,
        );
      }
    }

    return summary;
  });
}

function printCounter(label: string, counter: Counter): void {
  console.log(
    `- ${label}: ${counter.created} created, ${counter.reused} reused`,
  );
}

function printSummary(summary: SeedSummary): void {
  console.log('Demo data seed completed.');
  console.log(
    `Admin email: ${optionalEnv('DEMO_ADMIN_EMAIL', 'ADMIN_EMAIL') ?? '(not set)'}`,
  );
  console.log(
    `Admin employee code: ${summary.adminEmployeeCode ?? DEMO_ADMIN_EMPLOYEE_CODE}`,
  );
  console.log(`Employee default password: ${DEMO_EMPLOYEE_PASSWORD}`);
  printCounter('admin accounts', summary.admin);
  printCounter('departments', summary.departments);
  printCounter('shifts', summary.shifts);
  printCounter('shift work periods', summary.workPeriods);
  printCounter('employees', summary.employees);
  printCounter('shift assignments', summary.shiftAssignments);
  printCounter('attendance records', summary.attendanceRecords);
  printCounter('attendance events', summary.attendanceEvents);
  printCounter('leave requests', summary.leaveRequests);
  printCounter('leave request days', summary.leaveRequestDays);

  if (summary.warnings.length > 0) {
    console.log('Warnings:');
    for (const warning of summary.warnings) {
      console.log(`- ${warning}`);
    }
  }

  console.log('Run command: npm run seed:demo-data -w @face-web/api');
  console.log(
    'Optional overrides: DEMO_ADMIN_EMAIL, DEMO_ADMIN_PASSWORD, DEMO_ADMIN_EMPLOYEE_CODE, DEMO_EMPLOYEE_PASSWORD',
  );
}

void seedDemoData()
  .then(printSummary)
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });
