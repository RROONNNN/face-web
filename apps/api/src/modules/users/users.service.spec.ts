import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AccountRole } from '../auth/account-role.enum';
import { Department } from '../departments/entities/department.entity';
import { EmployeeShiftAssignment } from '../shifts/entities/employee-shift-assignment.entity';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let usersRepository: { createQueryBuilder: jest.Mock };

  beforeEach(async () => {
    usersRepository = {
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: usersRepository },
        { provide: getRepositoryToken(Department), useValue: {} },
        { provide: getRepositoryToken(EmployeeShiftAssignment), useValue: {} },
        { provide: DataSource, useValue: {} },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('limits employee findAll results to the current user', async () => {
    const qb = createUsersQueryBuilderMock();
    usersRepository.createQueryBuilder.mockReturnValue(qb);

    await service.findAll(
      {},
      {
        id: 'employee-1',
        employeeCode: 'EMP001',
        roles: [AccountRole.Employee],
      },
    );

    expect(qb.andWhere).toHaveBeenCalledWith('user.id = :currentUserId', {
      currentUserId: 'employee-1',
    });
  });

  it('does not limit admin findAll results to the current user', async () => {
    const qb = createUsersQueryBuilderMock();
    usersRepository.createQueryBuilder.mockReturnValue(qb);

    await service.findAll(
      {},
      {
        id: 'admin-1',
        employeeCode: 'ADMIN001',
        roles: [AccountRole.Admin],
      },
    );

    expect(qb.andWhere).not.toHaveBeenCalledWith('user.id = :currentUserId', {
      currentUserId: 'admin-1',
    });
  });
});

function createUsersQueryBuilderMock() {
  const qb = {
    select: jest.fn(),
    orderBy: jest.fn(),
    skip: jest.fn(),
    take: jest.fn(),
    andWhere: jest.fn(),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
  };
  qb.select.mockReturnValue(qb);
  qb.orderBy.mockReturnValue(qb);
  qb.skip.mockReturnValue(qb);
  qb.take.mockReturnValue(qb);
  qb.andWhere.mockReturnValue(qb);
  return qb;
}
