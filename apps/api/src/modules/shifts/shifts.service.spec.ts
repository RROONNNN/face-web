import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AttendanceRecord } from '../attendance/entities/attendance-record.entity';
import { LeaveReconciliationService } from '../leave/leave-reconciliation.service';
import { User } from '../users/entities/user.entity';
import { EmployeeShiftAssignment } from './entities/employee-shift-assignment.entity';
import { ShiftWorkPeriod } from './entities/shift-work-period.entity';
import { Shift } from './entities/shift.entity';
import { ShiftsService } from './shifts.service';

describe('ShiftsService', () => {
  let service: ShiftsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShiftsService,
        {
          provide: getRepositoryToken(Shift),
          useValue: {},
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
          useValue: {},
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
});
