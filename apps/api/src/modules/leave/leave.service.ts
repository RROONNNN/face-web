import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { AccountRole } from '../auth/account-role.enum';
import { CurrentUser } from '../auth/current-user.interface';
import { User } from '../users/entities/user.entity';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { QueryLeaveRequestsDto } from './dto/query-leave-requests.dto';
import { RejectLeaveRequestDto } from './dto/reject-leave-request.dto';
import { LeaveRequest } from './entities/leave-request.entity';
import { LeaveStatus } from './enums/leave-status.enum';

@Injectable()
export class LeaveService {
  constructor(
    @InjectRepository(LeaveRequest)
    private readonly leaveRequestRepository: Repository<LeaveRequest>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(input: CreateLeaveRequestDto, currentUser?: CurrentUser) {
    if (!currentUser) {
      throw new ForbiddenException('Authenticated user is required');
    }

    if (currentUser.roles.includes(AccountRole.Admin)) {
      throw new ForbiddenException(
        'Admins cannot create employee leave requests',
      );
    }

    await this.ensureEmployee(currentUser.id);

    const startDate = this.normalizeDateOnly(input.startDate);
    const endDate = this.normalizeDateOnly(input.endDate);
    this.assertValidDateRange(startDate, endDate);

    const leaveRequest = this.leaveRequestRepository.create({
      employeeId: currentUser.id,
      startDate,
      endDate,
      reason: input.reason,
      status: LeaveStatus.Pending,
      reviewedById: null,
      reviewedAt: null,
      rejectionReason: null,
    });

    return this.leaveRequestRepository.save(leaveRequest);
  }

  async findAll(input: QueryLeaveRequestsDto) {
    const page = input.page ?? 1;
    const limit = Math.min(input.limit ?? 20, 100);
    const where: FindOptionsWhere<LeaveRequest> = {};

    if (input.status) {
      where.status = input.status;
    }
    if (input.empId) {
      where.employeeId = input.empId;
    }

    const [leaveRequests, total] =
      await this.leaveRequestRepository.findAndCount({
        where,
        relations: { employee: true, reviewedBy: true },
        order: { startDate: 'DESC', createdAt: 'DESC' },
        skip: (page - 1) * limit,
        take: limit,
      });

    return {
      items: leaveRequests.map((leaveRequest) =>
        this.toLeaveRequestResponse(leaveRequest),
      ),
      total,
      page,
      limit,
    };
  }

  async approve(id: string, currentUser?: CurrentUser) {
    const leaveRequest = await this.getLeaveRequest(id);

    leaveRequest.status = LeaveStatus.Approved;
    leaveRequest.reviewedById = currentUser?.id ?? null;
    leaveRequest.reviewedAt = new Date();
    leaveRequest.rejectionReason = null;

    const saved = await this.leaveRequestRepository.save(leaveRequest);
    return this.toLeaveRequestResponse(saved);
  }

  async reject(
    id: string,
    input: RejectLeaveRequestDto,
    currentUser?: CurrentUser,
  ) {
    const leaveRequest = await this.getLeaveRequest(id);

    leaveRequest.status = LeaveStatus.Rejected;
    leaveRequest.reviewedById = currentUser?.id ?? null;
    leaveRequest.reviewedAt = new Date();
    leaveRequest.rejectionReason = input.reason;

    const saved = await this.leaveRequestRepository.save(leaveRequest);
    return this.toLeaveRequestResponse(saved);
  }

  private async getLeaveRequest(id: string) {
    const leaveRequest = await this.leaveRequestRepository.findOne({
      where: { id },
      relations: { employee: true, reviewedBy: true },
    });

    if (!leaveRequest) {
      throw new NotFoundException(`Leave request with id "${id}" not found`);
    }

    return leaveRequest;
  }

  private async ensureEmployee(employeeId: string) {
    const employee = await this.userRepository.findOne({
      where: { id: employeeId, accountRole: AccountRole.Employee },
      select: { id: true },
    });

    if (!employee) {
      throw new NotFoundException(`Employee with id "${employeeId}" not found`);
    }
  }

  private normalizeDateOnly(value: string) {
    const date = new Date(`${value.slice(0, 10)}T00:00:00.000Z`);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invalid date');
    }

    return date.toISOString().slice(0, 10);
  }

  private assertValidDateRange(startDate: string, endDate: string) {
    if (startDate > endDate) {
      throw new BadRequestException(
        'startDate must be before or equal to endDate',
      );
    }
  }

  private toLeaveRequestResponse(leaveRequest: LeaveRequest) {
    return {
      id: leaveRequest.id,
      employeeId: leaveRequest.employeeId,
      employee: leaveRequest.employee
        ? this.toEmployeeSummary(leaveRequest.employee)
        : null,
      startDate: leaveRequest.startDate,
      endDate: leaveRequest.endDate,
      reason: leaveRequest.reason,
      status: leaveRequest.status,
      reviewedById: leaveRequest.reviewedById,
      reviewedBy: leaveRequest.reviewedBy
        ? this.toEmployeeSummary(leaveRequest.reviewedBy)
        : null,
      reviewedAt: leaveRequest.reviewedAt,
      rejectionReason: leaveRequest.rejectionReason,
      createdAt: leaveRequest.createdAt,
      updatedAt: leaveRequest.updatedAt,
    };
  }

  private toEmployeeSummary(employee: User) {
    return {
      id: employee.id,
      employeeCode: employee.employeeCode,
      name: employee.name,
      department: employee.department,
      jobTitle: employee.jobTitle,
    };
  }
}
