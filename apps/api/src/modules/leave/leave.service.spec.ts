import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AccountRole } from '../auth/account-role.enum';
import { Department } from '../departments/entities/department.entity';
import { Holiday } from '../holidays/entities/holiday.entity';
import { ShiftWorkPeriod } from '../shifts/entities/shift-work-period.entity';
import { User } from '../users/entities/user.entity';
import { LeaveRequestDay } from './entities/leave-request-day.entity';
import { LeaveRequest } from './entities/leave-request.entity';
import { LeaveStatus } from './enums/leave-status.enum';
import { LeaveReconciliationService } from './leave-reconciliation.service';
import { LeaveService } from './leave.service';

describe('LeaveService', () => {
  const reconciliation = {} as LeaveReconciliationService;

  it('rejects leave requests that start in the past before opening a transaction', async () => {
    const transaction = jest.fn();
    const dataSource = { transaction } as unknown as DataSource;
    const service = new LeaveService(dataSource, reconciliation);

    await expect(
      service.create(
        {
          startDate: '2000-01-01',
          endDate: '2000-01-01',
          reason: 'Invalid past request',
        },
        {
          id: 'employee',
          employeeCode: 'EMP1',
          roles: [AccountRole.Employee],
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(transaction).not.toHaveBeenCalled();
  });

  it('requires admins to choose an employee when creating leave', async () => {
    const transaction = jest.fn();
    const dataSource = { transaction } as unknown as DataSource;
    const service = new LeaveService(dataSource, reconciliation);

    await expect(
      service.create(
        {
          startDate: '2099-01-01',
          endDate: '2099-01-01',
          reason: 'Missing employee',
        },
        {
          id: 'admin',
          employeeCode: 'ADMIN',
          roles: [AccountRole.Admin],
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(transaction).not.toHaveBeenCalled();
  });

  it("uses the employee department's default shift for partial-day periods", async () => {
    const defaultShiftId = '00000000-0000-4000-8000-000000000001';
    const workPeriodId = '11111111-1111-4111-8111-111111111111';
    const employee = {
      id: 'employee',
      departmentId: 'department',
    };
    const leaveRequest = {
      id: 'leave',
      employeeId: employee.id,
      startDate: '2099-01-01',
      endDate: '2099-01-01',
      reason: 'Morning appointment',
      status: LeaveStatus.PENDING,
      days: [
        {
          id: 'day',
          workDate: '2099-01-01',
          scope: 'work_periods',
          shiftAssignmentId: null,
          requestedPeriods: [],
        },
      ],
      employee: null,
      reviewedBy: null,
      reviewedById: null,
      reviewedAt: null,
      rejectionReason: null,
      cancelledAt: null,
    };
    const shiftWorkPeriodRepository = {
      find: jest.fn().mockResolvedValue([
        {
          id: workPeriodId,
          name: 'Morning',
          startTime: '08:00:00',
          endTime: '12:00:00',
          isCrossMidnight: false,
        },
        {
          id: '22222222-2222-4222-8222-222222222222',
          name: 'Afternoon',
          startTime: '13:00:00',
          endTime: '17:00:00',
          isCrossMidnight: false,
        },
      ]),
    };
    const leaveRequestDayRepository = {
      create: jest.fn((value: unknown) => value),
      createQueryBuilder: jest.fn().mockReturnValue({
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      }),
      save: jest.fn().mockResolvedValue([]),
    };
    const leaveRequestRepository = {
      create: jest.fn((value: unknown) => value),
      findOne: jest.fn().mockResolvedValue(leaveRequest),
      save: jest.fn().mockResolvedValue({ id: leaveRequest.id }),
    };
    const repositories = new Map<unknown, unknown>([
      [
        User,
        {
          findOne: jest.fn().mockResolvedValue(employee),
        },
      ],
      [
        Department,
        {
          findOne: jest
            .fn()
            .mockResolvedValue({ id: employee.departmentId, defaultShiftId }),
        },
      ],
      [
        Holiday,
        {
          find: jest.fn().mockResolvedValue([]),
        },
      ],
      [ShiftWorkPeriod, shiftWorkPeriodRepository],
      [LeaveRequestDay, leaveRequestDayRepository],
      [LeaveRequest, leaveRequestRepository],
    ]);
    const manager = {
      getRepository: jest.fn((entity: unknown) => repositories.get(entity)),
    };
    const dataSource = {
      transaction: jest.fn(
        (_isolation: unknown, work: (manager: typeof manager) => unknown) =>
          work(manager),
      ),
    } as unknown as DataSource;
    const service = new LeaveService(dataSource, reconciliation);

    await service.create(
      {
        startDate: '2099-01-01',
        endDate: '2099-01-01',
        reason: 'Morning appointment',
        partialDays: [
          {
            workDate: '2099-01-01',
            workPeriodIds: [workPeriodId],
          },
        ],
      },
      {
        id: employee.id,
        employeeCode: 'EMP1',
        roles: [AccountRole.Employee],
      },
    );

    expect(shiftWorkPeriodRepository.find).toHaveBeenCalledWith({
      where: { shiftId: defaultShiftId },
    });
  });

  it('prevents employees from reading another employee request', async () => {
    const request = {
      id: 'leave',
      employeeId: 'another-employee',
      status: LeaveStatus.PENDING,
      days: [],
    } as unknown as LeaveRequest;
    const dataSource = {
      manager: {
        getRepository: jest.fn().mockReturnValue({
          findOne: jest.fn().mockResolvedValue(request),
        }),
      },
    } as unknown as DataSource;
    const service = new LeaveService(dataSource, reconciliation);

    await expect(
      service.findOne('leave', {
        id: 'employee',
        employeeCode: 'EMP1',
        roles: [AccountRole.Employee],
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
