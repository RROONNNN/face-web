import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { In, ObjectLiteral, Repository } from 'typeorm';

import dataSource from '../data-source';
import { CheckIn } from '../../modules/attendance/entities/check-in.entity';
import { CheckOut } from '../../modules/attendance/entities/check-out.entity';
import { AttendanceMethod } from '../../modules/attendance/enums/attendance-method.enum';
import { AccountRole } from '../../modules/auth/account-role.enum';
import { FaceData } from '../../modules/face/entities/face-data.entity';
import { LeaveRequest } from '../../modules/leave/entities/leave-request.entity';
import { LeaveStatus } from '../../modules/leave/enums/leave-status.enum';
import { Shift } from '../../modules/shifts/entities/shift.entity';
import { User } from '../../modules/users/entities/user.entity';

const OFFICE_LATITUDE = 10.776889;
const OFFICE_LONGITUDE = 106.700806;
const DEFAULT_EMPLOYEE_COUNT = 200;
const DEFAULT_WORKING_DAYS = 90;
const DEFAULT_END_DATE = '2026-06-16';
const LARGE_SEED_CODE_PREFIX = 'LRG';

type SeedConfig = {
  employeeCount: number;
  workingDays: number;
  endDate: string;
};

type AttendanceSeedInput = {
  employeeId: string;
  employeeCode: string;
  shiftId: string;
  workDate: string;
  checkInTime: Date;
  checkOutTime: Date | null;
  latitude: number;
  longitude: number;
  method: AttendanceMethod;
  isOutOfZone: boolean;
};

async function seedLarge() {
  const config = getSeedConfig();

  await dataSource.initialize();

  try {
    const userRepository = dataSource.getRepository(User);
    const shiftRepository = dataSource.getRepository(Shift);
    const checkInRepository = dataSource.getRepository(CheckIn);
    const checkOutRepository = dataSource.getRepository(CheckOut);
    const faceDataRepository = dataSource.getRepository(FaceData);
    const leaveRequestRepository = dataSource.getRepository(LeaveRequest);

    const admin = await upsertAdmin(userRepository);
    const shift = await upsertShift(shiftRepository);
    const employees = await seedEmployees(userRepository, config.employeeCount);
    const workDates = getRecentWorkingDates(config.endDate, config.workingDays);
    const attendanceRows = buildAttendanceRows(employees, shift.id, workDates);

    const [insertedCheckIns, insertedCheckOuts, upsertedFaces, upsertedLeaves] =
      await Promise.all([
        seedCheckIns(checkInRepository, attendanceRows, admin.id),
        seedCheckOuts(checkOutRepository, attendanceRows, admin.id),
        seedFaceData(faceDataRepository, employees, config.endDate),
        seedLeaveRequests(leaveRequestRepository, admin, employees, workDates),
      ]);

    console.log('Large seed completed.');
    console.log(`Employees available: ${employees.length}`);
    console.log(`Working days covered: ${workDates.length}`);
    console.log(`Check-ins inserted: ${insertedCheckIns}`);
    console.log(`Check-outs inserted: ${insertedCheckOuts}`);
    console.log(`Face rows upserted: ${upsertedFaces}`);
    console.log(`Leave rows upserted: ${upsertedLeaves}`);
  } finally {
    await dataSource.destroy();
  }
}

function getSeedConfig(): SeedConfig {
  return {
    employeeCount: getPositiveInt(
      process.env.LARGE_SEED_EMPLOYEE_COUNT,
      DEFAULT_EMPLOYEE_COUNT,
    ),
    workingDays: getPositiveInt(
      process.env.LARGE_SEED_WORKING_DAYS,
      DEFAULT_WORKING_DAYS,
    ),
    endDate: process.env.LARGE_SEED_END_DATE ?? DEFAULT_END_DATE,
  };
}

function getPositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

async function upsertAdmin(repository: Repository<User>) {
  const employeeCode = process.env.ADMIN_EMPLOYEE_CODE ?? 'ADMIN001';
  const existing = await repository.findOne({ where: { employeeCode } });

  if (existing) {
    return existing;
  }

  const passwordHash = await bcrypt.hash(employeeCode, 10);

  return repository.save(
    repository.create({
      employeeCode,
      name: process.env.ADMIN_NAME ?? 'System Admin',
      passwordHash,
      accountRole: AccountRole.Admin,
      department: 'Administration',
      jobTitle: 'Administrator',
      phone: null,
      email: 'admin@face-web.local',
      dateOfBirth: null,
    }),
  );
}

async function upsertShift(repository: Repository<Shift>) {
  const input = {
    name: 'Large seed office hours',
    startTime: '08:00',
    endTime: '17:00',
    isActive: true,
  };
  let shift = await repository.findOne({ where: { name: input.name } });

  if (!shift) {
    shift = repository.create(input);
  } else {
    shift.startTime = input.startTime;
    shift.endTime = input.endTime;
  }

  await repository.update({ isActive: true }, { isActive: false });

  shift.isActive = input.isActive;
  return repository.save(shift);
}

async function seedEmployees(
  repository: Repository<User>,
  employeeCount: number,
) {
  const employeeCodes = Array.from({ length: employeeCount }, (_, index) =>
    buildEmployeeCode(index + 1),
  );
  const existingEmployees = await repository.find({
    where: { employeeCode: In(employeeCodes) },
  });
  const existingCodes = new Set(
    existingEmployees.map((employee) => employee.employeeCode),
  );
  const passwordHash = await bcrypt.hash('Password123!', 10);
  const usersToCreate = employeeCodes
    .filter((employeeCode) => !existingCodes.has(employeeCode))
    .map((employeeCode) => {
      const sequence = Number(employeeCode.replace(LARGE_SEED_CODE_PREFIX, ''));

      return repository.create({
        employeeCode,
        name: buildEmployeeName(sequence),
        passwordHash,
        accountRole: AccountRole.Employee,
        department: pickByIndex(DEPARTMENTS, sequence),
        jobTitle: pickByIndex(JOB_TITLES, sequence),
        phone: `09${String(70000000 + sequence).padStart(8, '0')}`,
        email: `${employeeCode.toLowerCase()}@face-web.local`,
        dateOfBirth: buildBirthDate(sequence),
      });
    });

  if (usersToCreate.length > 0) {
    await saveInChunks(repository, usersToCreate, 100);
  }

  return repository.find({
    where: { employeeCode: In(employeeCodes) },
    order: { employeeCode: 'ASC' },
  });
}

function buildAttendanceRows(
  employees: User[],
  shiftId: string,
  workDates: string[],
): AttendanceSeedInput[] {
  const rows: AttendanceSeedInput[] = [];

  for (const [employeeIndex, employee] of employees.entries()) {
    for (const [dateIndex, workDate] of workDates.entries()) {
      const pattern = stablePattern(employeeIndex, dateIndex);

      if (pattern % 23 === 0) {
        continue;
      }

      const lateMinutes = pattern % 7 === 0 ? 20 + (pattern % 35) : pattern % 6;
      const earlyLeaveMinutes =
        pattern % 11 === 0 ? 20 + (pattern % 30) : pattern % 8;
      const checkInTime = buildDateTime(workDate, 8, lateMinutes);
      const checkOutTime =
        pattern % 29 === 0
          ? null
          : buildDateTime(workDate, 16, 60 - earlyLeaveMinutes);
      const isOutOfZone = pattern % 17 === 0;

      rows.push({
        employeeId: employee.id,
        employeeCode: employee.employeeCode,
        shiftId,
        workDate,
        checkInTime,
        checkOutTime,
        latitude: OFFICE_LATITUDE + (isOutOfZone ? 0.018 : pattern * 0.00001),
        longitude: OFFICE_LONGITUDE + (isOutOfZone ? 0.018 : pattern * 0.00001),
        method: pickByIndex(
          [
            AttendanceMethod.Mobile,
            AttendanceMethod.Sync,
            AttendanceMethod.Manual,
          ],
          pattern,
        ),
        isOutOfZone,
      });
    }
  }

  return rows;
}

async function seedCheckIns(
  repository: Repository<CheckIn>,
  rows: AttendanceSeedInput[],
  adminId: string,
) {
  const missingRows = await filterMissingAttendanceRows(repository, rows);
  const checkIns = missingRows.map((row) =>
    repository.create({
      employeeId: row.employeeId,
      shiftId: row.shiftId,
      workDate: row.workDate,
      time: row.checkInTime,
      latitude: row.latitude,
      longitude: row.longitude,
      method: row.method,
      imagePath: `/seed/large/check-ins/${row.employeeCode}-${row.workDate}.jpg`,
      isOutOfZone: row.isOutOfZone,
      createdById: row.method === AttendanceMethod.Manual ? adminId : null,
    }),
  );

  await saveInChunks(repository, checkIns, 500);

  return checkIns.length;
}

async function seedCheckOuts(
  repository: Repository<CheckOut>,
  rows: AttendanceSeedInput[],
  adminId: string,
) {
  const rowsWithCheckOut = rows.filter((row) => row.checkOutTime !== null);
  const missingRows = await filterMissingAttendanceRows(
    repository,
    rowsWithCheckOut,
  );
  const checkOuts = missingRows.map((row) =>
    repository.create({
      employeeId: row.employeeId,
      shiftId: row.shiftId,
      workDate: row.workDate,
      time: row.checkOutTime as Date,
      latitude: row.latitude,
      longitude: row.longitude,
      method: row.method,
      imagePath: `/seed/large/check-outs/${row.employeeCode}-${row.workDate}.jpg`,
      isOutOfZone: row.isOutOfZone,
      createdById: row.method === AttendanceMethod.Manual ? adminId : null,
    }),
  );

  await saveInChunks(repository, checkOuts, 500);

  return checkOuts.length;
}

async function filterMissingAttendanceRows<T extends CheckIn | CheckOut>(
  repository: Repository<T>,
  rows: AttendanceSeedInput[],
) {
  if (rows.length === 0) {
    return [];
  }

  const employeeIds = Array.from(new Set(rows.map((row) => row.employeeId)));
  const workDates = rows.map((row) => row.workDate).sort();
  const existingEvents = await repository
    .createQueryBuilder('event')
    .select('event.employee_id', 'employeeId')
    .addSelect('event.work_date', 'workDate')
    .where('event.employee_id IN (:...employeeIds)', { employeeIds })
    .andWhere('event.work_date BETWEEN :startDate AND :endDate', {
      startDate: workDates[0],
      endDate: workDates[workDates.length - 1],
    })
    .getRawMany<{ employeeId: string; workDate: string | Date }>();
  const existingKeys = new Set(
    existingEvents.map((event) =>
      buildAttendanceKey(event.employeeId, normalizeWorkDate(event.workDate)),
    ),
  );

  return rows.filter(
    (row) =>
      !existingKeys.has(buildAttendanceKey(row.employeeId, row.workDate)),
  );
}

async function seedFaceData(
  repository: Repository<FaceData>,
  employees: User[],
  endDate: string,
) {
  const employeeIds = employees.map((employee) => employee.id);
  const existingFaces = await repository.find({
    where: { employeeId: In(employeeIds) },
  });
  const facesByEmployeeId = new Map(
    existingFaces.map((faceData) => [faceData.employeeId, faceData]),
  );
  const faces = employees.map((employee, index) => {
    const faceData =
      facesByEmployeeId.get(employee.id) ??
      repository.create({ employeeId: employee.id });

    faceData.listFaceEmbedding = buildFaceEmbedding(index);
    faceData.imageUrl = `https://example.local/large-seed/faces/${employee.employeeCode}.jpg`;
    faceData.updatedTime = new Date(`${endDate}T09:00:00+07:00`);

    return faceData;
  });

  await saveInChunks(repository, faces, 200);

  return faces.length;
}

async function seedLeaveRequests(
  repository: Repository<LeaveRequest>,
  admin: User,
  employees: User[],
  workDates: string[],
) {
  const leaveInputs = employees
    .filter((_, index) => index % 8 === 0)
    .map((employee, index) => {
      const startDate = workDates[(index * 7) % workDates.length];
      const status = pickByIndex(
        [LeaveStatus.Approved, LeaveStatus.Pending, LeaveStatus.Rejected],
        index,
      );

      return {
        employee,
        startDate,
        endDate: startDate,
        reason: pickByIndex(LEAVE_REASONS, index),
        status,
        reviewedById: status === LeaveStatus.Pending ? null : admin.id,
        reviewedAt:
          status === LeaveStatus.Pending
            ? null
            : new Date(`${startDate}T10:00:00+07:00`),
        rejectionReason:
          status === LeaveStatus.Rejected
            ? 'Request overlaps with team coverage plan'
            : null,
      };
    });

  const leaveRequests: LeaveRequest[] = [];

  for (const input of leaveInputs) {
    const existing = await repository.findOne({
      where: {
        employeeId: input.employee.id,
        startDate: input.startDate,
        endDate: input.endDate,
      },
    });
    const leaveRequest =
      existing ?? repository.create({ employeeId: input.employee.id });

    leaveRequest.startDate = input.startDate;
    leaveRequest.endDate = input.endDate;
    leaveRequest.reason = input.reason;
    leaveRequest.status = input.status;
    leaveRequest.reviewedById = input.reviewedById;
    leaveRequest.reviewedAt = input.reviewedAt;
    leaveRequest.rejectionReason = input.rejectionReason;

    leaveRequests.push(leaveRequest);
  }

  await saveInChunks(repository, leaveRequests, 100);

  return leaveRequests.length;
}

async function saveInChunks<T extends ObjectLiteral>(
  repository: Repository<T>,
  records: T[],
  chunkSize: number,
) {
  for (let index = 0; index < records.length; index += chunkSize) {
    await repository.save(records.slice(index, index + chunkSize));
  }
}

function getRecentWorkingDates(endDate: string, workingDays: number) {
  const dates: string[] = [];
  const cursor = parseDateOnly(endDate);

  while (dates.length < workingDays) {
    const day = cursor.getUTCDay();

    if (day !== 0 && day !== 6) {
      dates.push(formatDateOnly(cursor));
    }

    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return dates.reverse();
}

function parseDateOnly(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatDateOnly(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function buildDateTime(workDate: string, hour: number, minute: number) {
  return new Date(
    `${workDate}T${String(hour).padStart(2, '0')}:${String(minute).padStart(
      2,
      '0',
    )}:00+07:00`,
  );
}

function buildEmployeeCode(sequence: number) {
  return `${LARGE_SEED_CODE_PREFIX}${String(sequence).padStart(5, '0')}`;
}

function buildEmployeeName(sequence: number) {
  return `${pickByIndex(FAMILY_NAMES, sequence)} ${pickByIndex(
    MIDDLE_NAMES,
    sequence * 3,
  )} ${pickByIndex(GIVEN_NAMES, sequence * 7)}`;
}

function buildBirthDate(sequence: number) {
  const year = 1985 + (sequence % 18);
  const month = String((sequence % 12) + 1).padStart(2, '0');
  const day = String((sequence % 27) + 1).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function buildFaceEmbedding(seed: number) {
  return Array.from({ length: 3 }, (_, groupIndex) =>
    Array.from({ length: 8 }, (_, vectorIndex) =>
      Number(
        (seed * 0.013 + groupIndex * 0.07 + vectorIndex * 0.011).toFixed(6),
      ),
    ),
  );
}

function buildAttendanceKey(employeeId: string, workDate: string) {
  return `${employeeId}:${workDate}`;
}

function normalizeWorkDate(workDate: string | Date) {
  if (workDate instanceof Date) {
    return formatDateOnly(workDate);
  }

  return workDate;
}

function stablePattern(employeeIndex: number, dateIndex: number) {
  return (employeeIndex * 31 + dateIndex * 17 + 13) % 97;
}

function pickByIndex<T>(values: T[], index: number) {
  return values[index % values.length];
}

const DEPARTMENTS = [
  'Engineering',
  'Operations',
  'Sales',
  'People',
  'Finance',
  'Customer Success',
  'Security',
  'Product',
];

const JOB_TITLES = [
  'Frontend Developer',
  'Backend Developer',
  'QA Engineer',
  'Operations Specialist',
  'Sales Executive',
  'HR Coordinator',
  'Accountant',
  'Product Analyst',
];

const FAMILY_NAMES = [
  'Nguyen',
  'Tran',
  'Le',
  'Pham',
  'Hoang',
  'Phan',
  'Vu',
  'Dang',
  'Bui',
  'Do',
];

const MIDDLE_NAMES = [
  'Van',
  'Thi',
  'Minh',
  'Quoc',
  'Thanh',
  'Gia',
  'Hoai',
  'Duc',
  'Bao',
  'Anh',
];

const GIVEN_NAMES = [
  'An',
  'Binh',
  'Chau',
  'Dung',
  'Giang',
  'Hanh',
  'Khanh',
  'Linh',
  'Nam',
  'Phuc',
  'Quan',
  'Thao',
  'Trang',
  'Tuan',
  'Vy',
];

const LEAVE_REASONS = [
  'Annual leave',
  'Family appointment',
  'Medical appointment',
  'Personal leave',
  'Travel request',
];

void seedLarge();
