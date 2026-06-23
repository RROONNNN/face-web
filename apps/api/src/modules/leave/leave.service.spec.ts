import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AccountRole } from '../auth/account-role.enum';
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
