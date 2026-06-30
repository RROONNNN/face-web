import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AttendanceRecord } from '../attendance/entities/attendance-record.entity';
import { Department } from '../departments/entities/department.entity';
import { LeaveReconciliationService } from '../leave/leave-reconciliation.service';
import { User } from '../users/entities/user.entity';
import { EmployeeShiftAssignment } from './entities/employee-shift-assignment.entity';
import { ShiftWorkPeriod } from './entities/shift-work-period.entity';
import { Shift } from './entities/shift.entity';
import { ShiftsService } from './shifts.service';

describe('ShiftsService', () => {
  let service: ShiftsService;
  let shiftRepository: { findOne: jest.Mock };
  let userRepository: { findOne: jest.Mock };
  let departmentRepository: { findOne: jest.Mock };

  beforeEach(async () => {
    shiftRepository = { findOne: jest.fn() };
    userRepository = { findOne: jest.fn() };
    departmentRepository = { findOne: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShiftsService,
        {
          provide: getRepositoryToken(Shift),
          useValue: shiftRepository,
        },
        {
          provide: getRepositoryToken(ShiftWorkPeriod),
          useValue: {},
        },
        {
          provide: getRepositoryToken(EmployeeShiftAssignment),
          useValue: {},
        },
        {
          provide: getRepositoryToken(AttendanceRecord),
          useValue: {},
        },
        {
          provide: getRepositoryToken(User),
          useValue: userRepository,
        },
        {
          provide: getRepositoryToken(Department),
          useValue: departmentRepository,
        },
        {
          provide: DataSource,
          useValue: {},
        },
        {
          provide: LeaveReconciliationService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<ShiftsService>(ShiftsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it("returns the employee department's default shift", async () => {
    const shift = {
      id: 'shift-id',
      name: 'Office',
      workPeriods: [],
    } as Shift;
    userRepository.findOne.mockResolvedValue({
      id: 'employee-id',
      departmentId: 'department-id',
    });
    departmentRepository.findOne.mockResolvedValue({
      id: 'department-id',
      defaultShiftId: shift.id,
    });
    shiftRepository.findOne.mockResolvedValue(shift);

    await expect(
      service.findDepartmentDefaultShift('employee-id'),
    ).resolves.toBe(shift);
    expect(shiftRepository.findOne).toHaveBeenCalledWith({
      where: { id: shift.id },
      relations: { workPeriods: true },
      order: { workPeriods: { startTime: 'ASC' } },
    });
  });
});
