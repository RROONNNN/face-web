import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { In } from 'typeorm';

import dataSource from '../data-source';
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
import { EmployeeShiftAssignment } from '../../modules/shifts/entities/employee-shift-assignment.entity';
import { ShiftWorkPeriod } from '../../modules/shifts/entities/shift-work-period.entity';
import { Shift } from '../../modules/shifts/entities/shift.entity';
import { ShiftAssignmentSource } from '../../modules/shifts/enums/shift-assignment-source.enum';
import { User } from '../../modules/users/entities/user.entity';

const DEMO_PASSWORD = process.env.DEMO_USER_PASSWORD ?? 'Demo@123';
const DEMO_TIME_ZONE_OFFSET = process.env.DEMO_TIME_ZONE_OFFSET ?? '+07:00';

type ShiftSeed = {
  code: 'office' | 'support';
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
  shiftCode: ShiftSeed['code'];
};

type UserSeed = {
  employeeCode: string;
  name: string;
  departmentCode: string;
  jobTitle: string;
  phone: string;
  email: string;
  dateOfBirth: string;
};

type AttendanceVariant = {
  label: string;
  daysAgo: number;
  status: AttendanceStatus;
  checkInOffsetMinutes?: number;
  checkOutOffsetMinutes?: number;
  source?: AttendanceSource;
};

const shifts: ShiftSeed[] = [
  {
    code: 'office',
    name: 'Demo Office Shift',
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
    code: 'support',
    name: 'Demo Support Shift',
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
    name: 'Demo Engineering',
    description: 'Builds and maintains product features.',
    shiftCode: 'office',
  },
  {
    code: 'DEMO-HR',
    name: 'Demo People Operations',
    description: 'Handles employee lifecycle operations.',
    shiftCode: 'office',
  },
  {
    code: 'DEMO-FIN',
    name: 'Demo Finance',
    description: 'Owns payroll, billing, and reporting.',
    shiftCode: 'office',
  },
  {
    code: 'DEMO-CS',
    name: 'Demo Customer Support',
    description: 'Supports customers during business hours.',
    shiftCode: 'support',
  },
  {
    code: 'DEMO-OPS',
    name: 'Demo Operations',
    description: 'Coordinates facilities and daily operations.',
    shiftCode: 'support',
  },
];

const users: UserSeed[] = [
  {
    employeeCode: 'DEMO001',
    name: 'An Nguyen',
    departmentCode: 'DEMO-ENG',
    jobTitle: 'Frontend Engineer',
    phone: '0900000001',
    email: 'an.nguyen@example.com',
    dateOfBirth: '1994-02-12',
  },
  {
    employeeCode: 'DEMO002',
    name: 'Binh Tran',
    departmentCode: 'DEMO-ENG',
    jobTitle: 'Backend Engineer',
    phone: '0900000002',
    email: 'binh.tran@example.com',
    dateOfBirth: '1992-06-21',
  },
  {
    employeeCode: 'DEMO003',
    name: 'Chi Le',
    departmentCode: 'DEMO-HR',
    jobTitle: 'HR Specialist',
    phone: '0900000003',
    email: 'chi.le@example.com',
    dateOfBirth: '1995-09-08',
  },
  {
    employeeCode: 'DEMO004',
    name: 'Dung Pham',
    departmentCode: 'DEMO-HR',
    jobTitle: 'Recruiter',
    phone: '0900000004',
    email: 'dung.pham@example.com',
    dateOfBirth: '1991-11-19',
  },
  {
    employeeCode: 'DEMO005',
    name: 'Giang Hoang',
    departmentCode: 'DEMO-FIN',
    jobTitle: 'Accountant',
    phone: '0900000005',
    email: 'giang.hoang@example.com',
    dateOfBirth: '1990-04-03',
  },
  {
    employeeCode: 'DEMO006',
    name: 'Hanh Vu',
    departmentCode: 'DEMO-FIN',
    jobTitle: 'Finance Analyst',
    phone: '0900000006',
    email: 'hanh.vu@example.com',
    dateOfBirth: '1993-01-27',
  },
  {
    employeeCode: 'DEMO007',
    name: 'Khoa Do',
    departmentCode: 'DEMO-CS',
    jobTitle: 'Support Lead',
    phone: '0900000007',
    email: 'khoa.do@example.com',
    dateOfBirth: '1989-07-14',
  },
  {
    employeeCode: 'DEMO008',
    name: 'Linh Dang',
    departmentCode: 'DEMO-CS',
    jobTitle: 'Support Agent',
    phone: '0900000008',
    email: 'linh.dang@example.com',
    dateOfBirth: '1996-12-05',
  },
  {
    employeeCode: 'DEMO009',
    name: 'Minh Vo',
    departmentCode: 'DEMO-OPS',
    jobTitle: 'Operations Coordinator',
    phone: '0900000009',
    email: 'minh.vo@example.com',
    dateOfBirth: '1988-05-30',
  },
  {
    employeeCode: 'DEMO010',
    name: 'Ngoc Bui',
    departmentCode: 'DEMO-OPS',
    jobTitle: 'Facilities Officer',
    phone: '0900000010',
    email: 'ngoc.bui@example.com',
    dateOfBirth: '1997-10-16',
  },
];

const attendanceVariants: AttendanceVariant[] = [
  {
    label: 'on time completed',
    daysAgo: 6,
    status: AttendanceStatus.COMPLETED,
    checkInOffsetMinutes: -5,
    checkOutOffsetMinutes: 2,
    source: AttendanceSource.MOBILE_FACE_RECOGNITION,
  },
  {
    label: 'late completed',
    daysAgo: 5,
    status: AttendanceStatus.COMPLETED,
    checkInOffsetMinutes: 18,
    checkOutOffsetMinutes: 0,
    source: AttendanceSource.FINGERPRINT_DEVICE,
  },
  {
    label: 'checked in only',
    daysAgo: 4,
    status: AttendanceStatus.CHECKED_IN,
    checkInOffsetMinutes: 3,
    source: AttendanceSource.MOBILE_FACE_RECOGNITION,
  },
  {
    label: 'missing checkout',
    daysAgo: 3,
    status: AttendanceStatus.MISSING_CHECK_OUT,
    checkInOffsetMinutes: 0,
    source: AttendanceSource.ADMIN_MANUAL,
  },
  {
    label: 'absent',
    daysAgo: 2,
    status: AttendanceStatus.ABSENT,
  },
  {
    label: 'pending',
    daysAgo: 1,
    status: AttendanceStatus.PENDING,
  },
  {
    label: 'invalid out of zone',
    daysAgo: 0,
    status: AttendanceStatus.INVALID,
    checkInOffsetMinutes: 42,
    source: AttendanceSource.MOBILE_FACE_RECOGNITION,
  },
];

function workDateDaysAgo(daysAgo: number): string {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

function addDays(workDate: string, days: number): string {
  const date = new Date(`${workDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function minutesBetween(start: Date, end: Date): number {
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 60000));
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60000);
}

function dateTimeFor(workDate: string, time: string): Date {
  return new Date(`${workDate}T${time}${DEMO_TIME_ZONE_OFFSET}`);
}

function buildExpectedTimes(
  workDate: string,
  period: ShiftWorkPeriod,
): {
  expectedCheckInAt: Date;
  expectedCheckOutAt: Date;
} {
  const expectedCheckInAt = dateTimeFor(workDate, period.startTime);
  const endDate = period.isCrossMidnight ? addDays(workDate, 1) : workDate;
  const expectedCheckOutAt = dateTimeFor(endDate, period.endTime);
  return { expectedCheckInAt, expectedCheckOutAt };
}

function buildAuditEntry(
  occurredAt: Date,
  source: AttendanceSource,
  index: number,
  isOutOfZone = false,
): AuditEntry {
  return {
    occurredAt,
    source,
    deviceId: `demo-device-${String(index + 1).padStart(2, '0')}`,
    latitude: isOutOfZone ? 10.905 : 10.7769,
    longitude: isOutOfZone ? 106.702 : 106.7009,
    isOutOfZone,
  };
}

async function upsertShift(seed: ShiftSeed): Promise<Shift> {
  const shiftRepo = dataSource.getRepository(Shift);
  const periodRepo = dataSource.getRepository(ShiftWorkPeriod);

  let shift = await shiftRepo.findOne({ where: { name: seed.name } });
  if (!shift) {
    shift = shiftRepo.create({ name: seed.name });
  }

  shift.name = seed.name;
  shift.lateGraceMinutes = seed.lateGraceMinutes;
  shift.flexibleWindowMinutes = seed.flexibleWindowMinutes;
  shift.isActive = true;
  shift = await shiftRepo.save(shift);

  await periodRepo.delete({ shiftId: shift.id });
  await periodRepo.save(
    seed.workPeriods.map((period) =>
      periodRepo.create({
        shiftId: shift.id,
        name: period.name,
        startTime: period.startTime,
        endTime: period.endTime,
        isCrossMidnight: period.isCrossMidnight,
      }),
    ),
  );

  return shift;
}

async function upsertDepartment(
  seed: DepartmentSeed,
  shiftsByCode: Map<ShiftSeed['code'], Shift>,
): Promise<Department> {
  const departmentRepo = dataSource.getRepository(Department);
  const defaultShift = shiftsByCode.get(seed.shiftCode);

  if (!defaultShift) {
    throw new Error(`Missing shift for department ${seed.code}.`);
  }

  let department = await departmentRepo.findOne({ where: { code: seed.code } });
  if (!department) {
    department = departmentRepo.create({ code: seed.code });
  }

  department.name = seed.name;
  department.description = seed.description;
  department.defaultShiftId = defaultShift.id;
  department.isActive = true;

  return departmentRepo.save(department);
}

async function upsertUser(
  seed: UserSeed,
  departmentsByCode: Map<string, Department>,
  passwordHash: string,
): Promise<User> {
  const userRepo = dataSource.getRepository(User);
  const department = departmentsByCode.get(seed.departmentCode);

  if (!department) {
    throw new Error(`Missing department for user ${seed.employeeCode}.`);
  }

  let user = await userRepo.findOne({
    where: { employeeCode: seed.employeeCode },
  });
  if (!user) {
    user = userRepo.create({
      employeeCode: seed.employeeCode,
      passwordHash,
    });
  }

  user.name = seed.name;
  user.passwordHash = passwordHash;
  user.accountRole = AccountRole.Employee;
  user.isActive = true;
  user.departmentId = department.id;
  user.department = department.name;
  user.jobTitle = seed.jobTitle;
  user.phone = seed.phone;
  user.email = seed.email;
  user.dateOfBirth = seed.dateOfBirth;

  return userRepo.save(user);
}

async function upsertAssignment(
  user: User,
  department: Department,
  workDate: string,
  note: string,
): Promise<EmployeeShiftAssignment> {
  const assignmentRepo = dataSource.getRepository(EmployeeShiftAssignment);

  let assignment = await assignmentRepo.findOne({
    where: { employeeId: user.id, workDate },
  });
  if (!assignment) {
    assignment = assignmentRepo.create({
      employeeId: user.id,
      workDate,
    });
  }

  assignment.shiftId = department.defaultShiftId;
  assignment.source = ShiftAssignmentSource.DEPARTMENT_DEFAULT;
  assignment.assignedByUserId = null;
  assignment.note = note;
  assignment.leaveShiftWorkPeriodIds = [];

  return assignmentRepo.save(assignment);
}

async function upsertAttendanceRecord(
  user: User,
  assignment: EmployeeShiftAssignment,
  shift: Shift,
  period: ShiftWorkPeriod,
  variant: AttendanceVariant,
  userIndex: number,
): Promise<AttendanceRecord> {
  const recordRepo = dataSource.getRepository(AttendanceRecord);
  const eventRepo = dataSource.getRepository(AttendanceEvent);
  const { expectedCheckInAt, expectedCheckOutAt } = buildExpectedTimes(
    assignment.workDate,
    period,
  );
  const source = variant.source ?? AttendanceSource.MOBILE_FACE_RECOGNITION;
  const checkedInAt =
    variant.checkInOffsetMinutes === undefined
      ? null
      : addMinutes(
          expectedCheckInAt,
          variant.checkInOffsetMinutes + (userIndex % 3),
        );
  const checkedOutAt =
    variant.checkOutOffsetMinutes === undefined
      ? null
      : addMinutes(
          expectedCheckOutAt,
          variant.checkOutOffsetMinutes - (userIndex % 2),
        );
  const isInvalid = variant.status === AttendanceStatus.INVALID;
  const auditCheckIn = checkedInAt
    ? [buildAuditEntry(checkedInAt, source, userIndex, isInvalid)]
    : [];
  const auditCheckOut = checkedOutAt
    ? [buildAuditEntry(checkedOutAt, source, userIndex, false)]
    : [];

  let record = await recordRepo.findOne({
    where: { shiftAssignmentId: assignment.id },
  });
  if (!record) {
    record = recordRepo.create({
      employeeId: user.id,
      shiftAssignmentId: assignment.id,
      workDate: assignment.workDate,
    });
  }

  record.employeeId = user.id;
  record.shiftAssignmentId = assignment.id;
  record.workDate = assignment.workDate;
  record.status = variant.status;
  record.expectedCheckInAt = expectedCheckInAt;
  record.expectedCheckOutAt = expectedCheckOutAt;
  record.checkedInAt = checkedInAt;
  record.checkedOutAt = checkedOutAt;
  record.auditCheckIn = auditCheckIn;
  record.auditCheckOut = auditCheckOut;
  record.checkInSource = checkedInAt ? source : null;
  record.checkOutSource = checkedOutAt ? source : null;
  record.lateMinutes = checkedInAt
    ? Math.max(
        0,
        minutesBetween(expectedCheckInAt, checkedInAt) - shift.lateGraceMinutes,
      )
    : 0;

  record = await recordRepo.save(record);

  await eventRepo.delete({ attendanceRecordId: record.id });
  const events: AttendanceEvent[] = [];
  if (checkedInAt) {
    events.push(
      eventRepo.create({
        attendanceRecordId: record.id,
        type: AttendanceEventType.CHECK_IN,
        occurredAt: checkedInAt,
        source,
        faceSimilarity:
          source === AttendanceSource.MOBILE_FACE_RECOGNITION
            ? 0.92 - userIndex * 0.005
            : null,
        latitude: auditCheckIn[0]?.latitude ?? null,
        longitude: auditCheckIn[0]?.longitude ?? null,
        isOutOfZone: auditCheckIn[0]?.isOutOfZone ?? null,
        deviceId: auditCheckIn[0]?.deviceId ?? null,
      }),
    );
  }
  if (checkedOutAt) {
    events.push(
      eventRepo.create({
        attendanceRecordId: record.id,
        type: AttendanceEventType.CHECK_OUT,
        occurredAt: checkedOutAt,
        source,
        faceSimilarity:
          source === AttendanceSource.MOBILE_FACE_RECOGNITION
            ? 0.9 - userIndex * 0.004
            : null,
        latitude: auditCheckOut[0]?.latitude ?? null,
        longitude: auditCheckOut[0]?.longitude ?? null,
        isOutOfZone: auditCheckOut[0]?.isOutOfZone ?? null,
        deviceId: auditCheckOut[0]?.deviceId ?? null,
      }),
    );
  }
  if (events.length > 0) {
    await eventRepo.save(events);
  }

  return record;
}

async function seedDemo() {
  await dataSource.initialize();

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const shiftsByCode = new Map<ShiftSeed['code'], Shift>();
  const shiftsById = new Map<string, Shift>();
  const departmentsByCode = new Map<string, Department>();
  const shiftWorkPeriodsByShiftId = new Map<string, ShiftWorkPeriod>();

  for (const shiftSeed of shifts) {
    const shift = await upsertShift(shiftSeed);
    shiftsByCode.set(shiftSeed.code, shift);
    shiftsById.set(shift.id, shift);
  }

  for (const departmentSeed of departments) {
    departmentsByCode.set(
      departmentSeed.code,
      await upsertDepartment(departmentSeed, shiftsByCode),
    );
  }

  const shiftIds = Array.from(shiftsByCode.values()).map((shift) => shift.id);
  const workPeriods = await dataSource.getRepository(ShiftWorkPeriod).find({
    where: { shiftId: In(shiftIds) },
    order: { startTime: 'ASC' },
  });
  for (const workPeriod of workPeriods) {
    if (!shiftWorkPeriodsByShiftId.has(workPeriod.shiftId)) {
      shiftWorkPeriodsByShiftId.set(workPeriod.shiftId, workPeriod);
    }
  }

  const savedUsers: User[] = [];
  for (const userSeed of users) {
    savedUsers.push(
      await upsertUser(userSeed, departmentsByCode, passwordHash),
    );
  }

  for (const [userIndex, user] of savedUsers.entries()) {
    const department = Array.from(departmentsByCode.values()).find(
      (item) => item.id === user.departmentId,
    );
    if (!department) {
      throw new Error(
        `Missing saved department for user ${user.employeeCode}.`,
      );
    }

    const period = shiftWorkPeriodsByShiftId.get(department.defaultShiftId);
    const shift = shiftsById.get(department.defaultShiftId);
    if (!shift) {
      throw new Error(`Missing saved shift ${department.defaultShiftId}.`);
    }
    if (!period) {
      throw new Error(
        `Missing work period for shift ${department.defaultShiftId}.`,
      );
    }

    for (const variant of attendanceVariants) {
      const assignment = await upsertAssignment(
        user,
        department,
        workDateDaysAgo(variant.daysAgo),
        `Demo attendance: ${variant.label}`,
      );
      await upsertAttendanceRecord(
        user,
        assignment,
        shift,
        period,
        variant,
        userIndex,
      );
    }
  }

  console.log('Demo seed completed.');
  console.log(`- shifts: ${shifts.length}`);
  console.log(`- departments: ${departments.length}`);
  console.log(`- users: ${users.length}`);
  console.log(
    `- attendance records: ${users.length * attendanceVariants.length}`,
  );
  console.log(`Demo user password: ${DEMO_PASSWORD}`);
}

void seedDemo()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });
