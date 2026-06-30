import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { AccountRole } from '../auth/account-role.enum';
import { LeaveController } from './leave.controller';
import { LeaveService } from './leave.service';

describe('LeaveController', () => {
  let controller: LeaveController;
  const leaveService = {
    create: jest.fn(),
    findMine: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    cancel: jest.fn(),
    approve: jest.fn(),
    reject: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LeaveController],
      providers: [
        { provide: LeaveService, useValue: leaveService },
        { provide: JwtService, useValue: {} },
      ],
    }).compile();
    controller = module.get(LeaveController);
    jest.clearAllMocks();
  });

  it('delegates employee creation using the authenticated user', async () => {
    const user = {
      id: 'employee',
      employeeCode: 'EMP1',
      roles: [AccountRole.Employee],
    };
    const input = {
      startDate: '2099-01-01',
      endDate: '2099-01-01',
      reason: 'Personal leave',
    };

    await controller.create(input, { user } as never);

    expect(leaveService.create).toHaveBeenCalledWith(input, user);
  });

  it('delegates admin creation with the requested employee id', async () => {
    const user = {
      id: 'admin',
      employeeCode: 'ADMIN',
      roles: [AccountRole.Admin],
    };
    const input = {
      employeeId: 'employee',
      startDate: '2099-01-01',
      endDate: '2099-01-01',
      reason: 'Admin-created leave',
    };

    await controller.create(input, { user } as never);

    expect(leaveService.create).toHaveBeenCalledWith(input, user);
  });
});
