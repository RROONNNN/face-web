import 'dotenv/config';
import * as bcrypt from 'bcrypt';

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

type SeedUserInput = {
  employeeCode: string;
  name: string;
  accountRole: AccountRole;
  department?: string;
  jobTitle?: string;
  phone?: string;
  email?: string;
  dateOfBirth?: string;
};

const OFFICE_LATITUDE = 10.776889;
const OFFICE_LONGITUDE = 106.700806;

async function seedDemo() {
  await dataSource.initialize();

  try {
    const userRepository = dataSource.getRepository(User);
    const shiftRepository = dataSource.getRepository(Shift);
    const checkInRepository = dataSource.getRepository(CheckIn);
    const checkOutRepository = dataSource.getRepository(CheckOut);
    const faceDataRepository = dataSource.getRepository(FaceData);
    const leaveRequestRepository = dataSource.getRepository(LeaveRequest);

    const admin = await createUser(userRepository, {
      employeeCode: process.env.ADMIN_EMPLOYEE_CODE ?? 'ADMIN001',
      name: process.env.ADMIN_NAME ?? 'System Admin',
      accountRole: AccountRole.Admin,
      department: 'Administration',
      jobTitle: 'Administrator',
      email: 'admin@face-web.local',
    });

    const employees = await Promise.all([
      createUser(userRepository, {
        employeeCode: 'EMP00001',
        name: 'Nguyen Van An',
        accountRole: AccountRole.Employee,
        department: 'Engineering',
        jobTitle: 'Backend Developer',
        phone: '0901000001',
        email: 'an.nguyen@face-web.local',
        dateOfBirth: '1996-02-14',
      }),
      createUser(userRepository, {
        employeeCode: 'EMP00002',
        name: 'Tran Thi Binh',
        accountRole: AccountRole.Employee,
        department: 'Operations',
        jobTitle: 'Operations Specialist',
        phone: '0901000002',
        email: 'binh.tran@face-web.local',
        dateOfBirth: '1994-08-21',
      }),
      createUser(userRepository, {
        employeeCode: 'EMP00003',
        name: 'Le Minh Chau',
        accountRole: AccountRole.Employee,
        department: 'Sales',
        jobTitle: 'Sales Executive',
        phone: '0901000003',
        email: 'chau.le@face-web.local',
        dateOfBirth: '1998-11-03',
      }),
      createUser(userRepository, {
        employeeCode: 'EMP00004',
        name: 'Pham Quoc Dung',
        accountRole: AccountRole.Employee,
        department: 'People',
        jobTitle: 'HR Coordinator',
        phone: '0901000004',
        email: 'dung.pham@face-web.local',
        dateOfBirth: '1992-05-30',
      }),
    ]);

    const officeShift = await upsertShift(shiftRepository, {
      name: 'Office hours',
      startTime: '08:00',
      endTime: '17:00',
      isActive: true,
    });
    await upsertShift(shiftRepository, {
      name: 'Evening support',
      startTime: '14:00',
      endTime: '22:00',
      isActive: false,
    });

    await seedAttendance({
      checkInRepository,
      checkOutRepository,
      shift: officeShift,
      admin,
      employees,
    });
    await seedFaceData(faceDataRepository, employees);
    await seedLeaveRequests(leaveRequestRepository, admin, employees);

    console.log('Demo seed completed.');
    console.log(`Admin: ${admin.employeeCode}`);
    console.log(
      `Employees: ${employees.map((employee) => employee.employeeCode).join(', ')}`,
    );
  } finally {
    await dataSource.destroy();
  }
}

async function createUser(
  repository: ReturnType<typeof dataSource.getRepository<User>>,
  input: SeedUserInput,
) {
  const existing = await repository.findOne({
    where: { employeeCode: input.employeeCode },
  });

  if (existing) {
    return existing;
  }

  const password = input.employeeCode;
  const passwordHash = await bcrypt.hash(password, 10);

  const user = repository.create({
    employeeCode: input.employeeCode,
    name: input.name,
    passwordHash,
    accountRole: input.accountRole,
    department: input.department ?? null,
    jobTitle: input.jobTitle ?? null,
    phone: input.phone ?? null,
    email: input.email ?? null,
    dateOfBirth: input.dateOfBirth ?? null,
  });

  return repository.save(user);
}

async function upsertShift(
  repository: ReturnType<typeof dataSource.getRepository<Shift>>,
  input: Pick<Shift, 'name' | 'startTime' | 'endTime' | 'isActive'>,
) {
  let shift = await repository.findOne({ where: { name: input.name } });

  if (!shift) {
    shift = repository.create(input);
  } else {
    shift.startTime = input.startTime;
    shift.endTime = input.endTime;
  }

  if (input.isActive) {
    await repository.update({ isActive: true }, { isActive: false });
  }

  shift.isActive = input.isActive;
  return repository.save(shift);
}

async function seedAttendance(input: {
  checkInRepository: ReturnType<typeof dataSource.getRepository<CheckIn>>;
  checkOutRepository: ReturnType<typeof dataSource.getRepository<CheckOut>>;
  shift: Shift;
  admin: User;
  employees: User[];
}) {
  const [employeeOne, employeeTwo, employeeThree] = input.employees;

  await createCheckInIfMissing(input.checkInRepository, {
    employee: employeeOne,
    shift: input.shift,
    workDate: '2026-06-16',
    time: '2026-06-16T08:01:00+07:00',
    latitude: OFFICE_LATITUDE,
    longitude: OFFICE_LONGITUDE,
    method: AttendanceMethod.Mobile,
    imagePath: '/seed/check-ins/EMP00001-2026-06-16.jpg',
    isOutOfZone: false,
    createdById: null,
  });
  await createCheckOutIfMissing(input.checkOutRepository, {
    employee: employeeOne,
    shift: input.shift,
    workDate: '2026-06-16',
    time: '2026-06-16T17:05:00+07:00',
    latitude: OFFICE_LATITUDE,
    longitude: OFFICE_LONGITUDE,
    method: AttendanceMethod.Mobile,
    imagePath: '/seed/check-outs/EMP00001-2026-06-16.jpg',
    isOutOfZone: false,
    createdById: null,
  });

  await createCheckInIfMissing(input.checkInRepository, {
    employee: employeeTwo,
    shift: input.shift,
    workDate: '2026-06-16',
    time: '2026-06-16T08:35:00+07:00',
    latitude: 10.771,
    longitude: 106.705,
    method: AttendanceMethod.Sync,
    imagePath: '/seed/check-ins/EMP00002-2026-06-16.jpg',
    isOutOfZone: true,
    createdById: null,
  });
  await createCheckOutIfMissing(input.checkOutRepository, {
    employee: employeeTwo,
    shift: input.shift,
    workDate: '2026-06-16',
    time: '2026-06-16T16:40:00+07:00',
    latitude: 10.771,
    longitude: 106.705,
    method: AttendanceMethod.Sync,
    imagePath: '/seed/check-outs/EMP00002-2026-06-16.jpg',
    isOutOfZone: true,
    createdById: null,
  });

  await createCheckInIfMissing(input.checkInRepository, {
    employee: employeeThree,
    shift: input.shift,
    workDate: '2026-06-16',
    time: '2026-06-16T08:12:00+07:00',
    latitude: OFFICE_LATITUDE,
    longitude: OFFICE_LONGITUDE,
    method: AttendanceMethod.Manual,
    imagePath: null,
    isOutOfZone: false,
    createdById: input.admin.id,
  });
}

async function createCheckInIfMissing(
  repository: ReturnType<typeof dataSource.getRepository<CheckIn>>,
  input: AttendanceSeedInput,
) {
  const time = new Date(input.time);
  const existing = await repository.findOne({
    where: { employeeId: input.employee.id, time },
  });

  if (existing) {
    return existing;
  }

  const checkIn = repository.create({
    employeeId: input.employee.id,
    shiftId: input.shift.id,
    workDate: input.workDate,
    time,
    latitude: input.latitude,
    longitude: input.longitude,
    method: input.method,
    imagePath: input.imagePath,
    isOutOfZone: input.isOutOfZone,
    createdById: input.createdById,
  });

  return repository.save(checkIn);
}

async function createCheckOutIfMissing(
  repository: ReturnType<typeof dataSource.getRepository<CheckOut>>,
  input: AttendanceSeedInput,
) {
  const time = new Date(input.time);
  const existing = await repository.findOne({
    where: { employeeId: input.employee.id, time },
  });

  if (existing) {
    return existing;
  }

  const checkOut = repository.create({
    employeeId: input.employee.id,
    shiftId: input.shift.id,
    workDate: input.workDate,
    time,
    latitude: input.latitude,
    longitude: input.longitude,
    method: input.method,
    imagePath: input.imagePath,
    isOutOfZone: input.isOutOfZone,
    createdById: input.createdById,
  });

  return repository.save(checkOut);
}

type AttendanceSeedInput = {
  employee: User;
  shift: Shift;
  workDate: string;
  time: string;
  latitude: number;
  longitude: number;
  method: AttendanceMethod;
  imagePath: string | null;
  isOutOfZone: boolean;
  createdById: string | null;
};

async function seedFaceData(
  repository: ReturnType<typeof dataSource.getRepository<FaceData>>,
  employees: User[],
) {
  for (const [index, employee] of employees.entries()) {
    const existing = await repository.findOne({
      where: { employeeId: employee.id },
    });
    const faceData = existing ?? repository.create({ employeeId: employee.id });

    faceData.listFaceEmbedding = [
      [0.11 + index, 0.22 + index, 0.33 + index],
      [0.44 + index, 0.55 + index, 0.66 + index],
    ];
    faceData.imageUrl = `https://example.local/faces/${employee.employeeCode}.jpg`;
    faceData.updatedTime = new Date('2026-06-16T09:00:00+07:00');

    await repository.save(faceData);
  }
}

async function seedLeaveRequests(
  repository: ReturnType<typeof dataSource.getRepository<LeaveRequest>>,
  admin: User,
  employees: User[],
) {
  await upsertLeaveRequest(repository, {
    employee: employees[3],
    startDate: '2026-06-16',
    endDate: '2026-06-16',
    reason: 'Family appointment',
    status: LeaveStatus.Approved,
    reviewedById: admin.id,
    reviewedAt: new Date('2026-06-15T10:00:00+07:00'),
    rejectionReason: null,
  });
  await upsertLeaveRequest(repository, {
    employee: employees[1],
    startDate: '2026-06-20',
    endDate: '2026-06-21',
    reason: 'Personal leave',
    status: LeaveStatus.Pending,
    reviewedById: null,
    reviewedAt: null,
    rejectionReason: null,
  });
  await upsertLeaveRequest(repository, {
    employee: employees[2],
    startDate: '2026-06-23',
    endDate: '2026-06-23',
    reason: 'Travel request',
    status: LeaveStatus.Rejected,
    reviewedById: admin.id,
    reviewedAt: new Date('2026-06-15T11:00:00+07:00'),
    rejectionReason: 'Insufficient notice',
  });
}

async function upsertLeaveRequest(
  repository: ReturnType<typeof dataSource.getRepository<LeaveRequest>>,
  input: {
    employee: User;
    startDate: string;
    endDate: string;
    reason: string;
    status: LeaveStatus;
    reviewedById: string | null;
    reviewedAt: Date | null;
    rejectionReason: string | null;
  },
) {
  const existing = await repository.findOne({
    where: {
      employeeId: input.employee.id,
      startDate: input.startDate,
      endDate: input.endDate,
    },
  });
  const leaveRequest =
    existing ?? repository.create({ employeeId: input.employee.id });

  leaveRequest.reason = input.reason;
  leaveRequest.status = input.status;
  leaveRequest.reviewedById = input.reviewedById;
  leaveRequest.reviewedAt = input.reviewedAt;
  leaveRequest.rejectionReason = input.rejectionReason;
  leaveRequest.startDate = input.startDate;
  leaveRequest.endDate = input.endDate;

  return repository.save(leaveRequest);
}

void seedDemo();
