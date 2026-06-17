import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { DataSource, EntityManager, ILike, Repository } from 'typeorm';
import { AccountRole } from '../auth/account-role.enum';
import * as bcrypt from 'bcrypt';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { QueryEmployeesDto } from './dto/query-employees.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}
  findByEmployeeCode(employeeCode: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { employeeCode },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async createEmployee(input: CreateEmployeeDto) {
    return this.dataSource.transaction(async (manager) => {
      const employeeCode = await this.generateEmployeeCode(manager);
      const passwordHash = await bcrypt.hash(employeeCode, 10);
      const employee = manager.create(User, {
        employeeCode,
        name: input.name,
        passwordHash,
        accountRole: AccountRole.Employee,
        department: input.department ?? null,
        jobTitle: input.jobTitle ?? null,
        phone: input.phone ?? null,
        email: input.email ?? null,
        dateOfBirth: input.dateOfBirth
          ? this.normalizeDateOnly(input.dateOfBirth)
          : null,
      });

      return this.toEmployeeResponse(await manager.save(User, employee));
    });
  }

  async findEmployees(input: QueryEmployeesDto) {
    const page = input.page ?? 1;
    const limit = input.limit ?? 20;
    const where = [
      {
        accountRole: AccountRole.Employee,
        ...(input.department ? { department: input.department } : {}),
        ...(input.search ? { name: ILike(`%${input.search}%`) } : {}),
      },
      ...(input.search
        ? [
            {
              accountRole: AccountRole.Employee,
              ...(input.department ? { department: input.department } : {}),
              employeeCode: ILike(`%${input.search}%`),
            },
          ]
        : []),
    ];

    const [employees, total] = await this.usersRepository.findAndCount({
      where,
      order: { employeeCode: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items: employees.map((employee) => this.toEmployeeResponse(employee)),
      total,
      page,
      limit,
    };
  }

  async findEmployee(id: string) {
    const employee = await this.usersRepository.findOne({
      where: { id, accountRole: AccountRole.Employee },
    });

    if (!employee) {
      throw new NotFoundException(`Employee with id "${id}" not found`);
    }

    return this.toEmployeeResponse(employee);
  }

  async updateEmployee(id: string, input: UpdateEmployeeDto) {
    const employee = await this.usersRepository.findOne({
      where: { id, accountRole: AccountRole.Employee },
    });

    if (!employee) {
      throw new NotFoundException(`Employee with id "${id}" not found`);
    }

    if (input.name !== undefined) employee.name = input.name;
    if (input.department !== undefined) employee.department = input.department;
    if (input.jobTitle !== undefined) employee.jobTitle = input.jobTitle;
    if (input.phone !== undefined) employee.phone = input.phone;
    if (input.email !== undefined) employee.email = input.email;
    if (input.dateOfBirth !== undefined) {
      employee.dateOfBirth = input.dateOfBirth
        ? this.normalizeDateOnly(input.dateOfBirth)
        : null;
    }

    return this.toEmployeeResponse(await this.usersRepository.save(employee));
  }
  async createAdmin(input: {
    employeeCode: string;
    name: string;
    passwordHash: string;
  }): Promise<User> {
    const user = this.usersRepository.create({
      employeeCode: input.employeeCode,
      name: input.name,
      passwordHash: input.passwordHash,
      accountRole: AccountRole.Admin,
    });
    return this.usersRepository.save(user);
  }

  private async generateEmployeeCode(manager: EntityManager) {
    const rows = (await manager.query(
      `SELECT nextval('employee_code_seq') AS value`,
    )) as { value: string | number }[];
    const nextValue = Number(rows[0]?.value);

    if (!Number.isInteger(nextValue) || nextValue < 1) {
      throw new BadRequestException('Employee code sequence is invalid');
    }

    return `EMP${String(nextValue).padStart(5, '0')}`;
  }

  private normalizeDateOnly(value: string) {
    const date = new Date(`${value.slice(0, 10)}T00:00:00.000Z`);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invalid date');
    }

    return date.toISOString().slice(0, 10);
  }

  private toEmployeeResponse(user: User) {
    return {
      id: user.id,
      employeeCode: user.employeeCode,
      name: user.name,
      accountRole: user.accountRole,
      department: user.department,
      jobTitle: user.jobTitle,
      phone: user.phone,
      email: user.email,
      dateOfBirth: user.dateOfBirth,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
