// src/database/seeds/seed-admin.ts
import * as bcrypt from 'bcrypt';
import 'dotenv/config';

import { AccountRole } from '../../modules/auth/account-role.enum';
import { Department } from '../../modules/departments/entities/department.entity';
import { ShiftWorkPeriod } from '../../modules/shifts/entities/shift-work-period.entity';
import { Shift } from '../../modules/shifts/entities/shift.entity';
import { User } from '../../modules/users/entities/user.entity';
import dataSource from '../data-source';

const DEFAULT_ADMIN_EMPLOYEE_CODE = 'ADMIN001';
const DEFAULT_ADMIN_NAME = 'System Admin';
const DEFAULT_COMMON_DEPARTMENT_CODE = 'COMMON';
const DEFAULT_COMMON_DEPARTMENT_NAME = 'Common';
const DEFAULT_COMMON_SHIFT_NAME = 'Common Office Shift';

async function ensureCommonShift(): Promise<Shift> {
  const shiftRepository = dataSource.getRepository(Shift);
  const workPeriodRepository = dataSource.getRepository(ShiftWorkPeriod);
  const name = process.env.ADMIN_SHIFT_NAME ?? DEFAULT_COMMON_SHIFT_NAME;

  let shift = await shiftRepository.findOne({ where: { name } });

  if (!shift) {
    shift = shiftRepository.create({ name });
  }

  shift.name = name;
  shift.lateGraceMinutes = Number(
    process.env.ADMIN_SHIFT_LATE_GRACE_MINUTES ?? 10,
  );
  shift.flexibleWindowMinutes = Number(
    process.env.ADMIN_SHIFT_FLEXIBLE_WINDOW_MINUTES ?? 0,
  );
  shift.isActive = true;
  shift = await shiftRepository.save(shift);

  const existingWorkPeriod = await workPeriodRepository.findOne({
    where: { shiftId: shift.id, name: 'Office Day' },
  });

  if (!existingWorkPeriod) {
    await workPeriodRepository.save(
      workPeriodRepository.create({
        shiftId: shift.id,
        name: 'Office Day',
        startTime: process.env.ADMIN_SHIFT_START_TIME ?? '08:30:00',
        endTime: process.env.ADMIN_SHIFT_END_TIME ?? '17:30:00',
        isCrossMidnight: false,
      }),
    );
  }

  return shift;
}

async function ensureCommonDepartment(
  defaultShift: Shift,
): Promise<Department> {
  const departmentRepository = dataSource.getRepository(Department);
  const code =
    process.env.ADMIN_DEPARTMENT_CODE ?? DEFAULT_COMMON_DEPARTMENT_CODE;

  let department = await departmentRepository.findOne({ where: { code } });

  if (!department) {
    department = departmentRepository.create({ code });
  }

  department.code = code;
  department.name =
    process.env.ADMIN_DEPARTMENT_NAME ?? DEFAULT_COMMON_DEPARTMENT_NAME;
  department.description =
    process.env.ADMIN_DEPARTMENT_DESCRIPTION ??
    'Default department for system and admin accounts.';
  department.defaultShiftId = defaultShift.id;
  department.isActive = true;

  return departmentRepository.save(department);
}

async function seedAdmin() {
  await dataSource.initialize();

  const userRepository = dataSource.getRepository(User);
  const commonShift = await ensureCommonShift();
  const commonDepartment = await ensureCommonDepartment(commonShift);

  const employeeCode =
    process.env.ADMIN_EMPLOYEE_CODE ?? DEFAULT_ADMIN_EMPLOYEE_CODE;
  const name = process.env.ADMIN_NAME ?? DEFAULT_ADMIN_NAME;
  const password = process.env.ADMIN_PASSWORD ?? employeeCode;

  let admin = await userRepository.findOne({
    where: { employeeCode },
  });

  if (admin) {
    admin.name = name;
    admin.accountRole = AccountRole.Admin;
    admin.isActive = true;
    admin.department = commonDepartment.name;
    admin.departmentId = commonDepartment.id;
    await userRepository.save(admin);

    console.log(`Admin already exists and was updated: ${employeeCode}`);
    console.log(`Common department ready: ${commonDepartment.code}`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  admin = userRepository.create({
    employeeCode,
    name,
    passwordHash,
    accountRole: AccountRole.Admin,
    isActive: true,
    department: commonDepartment.name,
    departmentId: commonDepartment.id,
  });

  await userRepository.save(admin);

  console.log(`Admin created successfully: ${employeeCode}`);
  console.log(`Common department ready: ${commonDepartment.code}`);
}

void seedAdmin()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });
