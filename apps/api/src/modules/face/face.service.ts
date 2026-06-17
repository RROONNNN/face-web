import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccountRole } from '../auth/account-role.enum';
import { CurrentUser } from '../auth/current-user.interface';
import { User } from '../users/entities/user.entity';
import { FaceData } from './entities/face-data.entity';
import { UpdateFaceDataDto } from './dto/update-face-data.dto';
import { SyncFaceDataDto } from './dto/sync-face-data.dto';
import { QueryFaceDataDto } from './dto/query-face-data.dto';

@Injectable()
export class FaceService {
  constructor(
    @InjectRepository(FaceData)
    private readonly faceDataRepository: Repository<FaceData>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async updateEmployeeFace(
    employeeId: string,
    input: UpdateFaceDataDto,
    currentUser?: CurrentUser,
  ) {
    this.assertCanWriteEmployeeFace(employeeId, currentUser);
    this.assertEmbeddingMatrix(input.listFaceEmbedding);
    await this.ensureEmployee(employeeId);

    return this.upsertFaceData({
      employeeId,
      listFaceEmbedding: input.listFaceEmbedding,
      imageUrl: input.imageUrl,
      updatedTime: new Date(),
      onlyIfNewer: false,
    });
  }

  async sync(input: SyncFaceDataDto[], currentUser?: CurrentUser) {
    if (!currentUser) {
      throw new ForbiddenException('Authenticated user is required');
    }

    const submittedByEmployee = new Map<string, SyncFaceDataDto>();

    for (const item of input) {
      this.assertCanWriteEmployeeFace(item.employeeId, currentUser);
      this.assertEmbeddingMatrix(item.listFaceEmbedding);
      submittedByEmployee.set(item.employeeId, item);

      await this.ensureEmployee(item.employeeId);
      await this.upsertFaceData({
        employeeId: item.employeeId,
        listFaceEmbedding: item.listFaceEmbedding,
        imageUrl: item.imageUrl,
        updatedTime: this.parseDateTime(item.updatedTime),
        onlyIfNewer: true,
      });
    }

    if (!currentUser.roles.includes(AccountRole.Admin)) {
      return [];
    }

    const serverRecords = await this.faceDataRepository.find({
      relations: { employee: true },
      order: { updatedTime: 'DESC' },
    });

    return serverRecords
      .filter((record) => {
        const submitted = submittedByEmployee.get(record.employeeId);

        if (!submitted) {
          return true;
        }

        return (
          record.updatedTime.getTime() >
          this.parseDateTime(submitted.updatedTime).getTime()
        );
      })
      .map((record) => this.toFaceDataResponse(record));
  }

  async findAll(input: QueryFaceDataDto) {
    const page = input.page ?? 1;
    const limit = Math.min(input.limit ?? 20, 100);
    const [records, total] = await this.faceDataRepository.findAndCount({
      relations: { employee: true },
      order: { updatedTime: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items: records.map((record) => this.toFaceDataResponse(record)),
      total,
      page,
      limit,
    };
  }

  async deleteByEmployeeId(employeeId: string) {
    const result = await this.faceDataRepository.delete({ employeeId });

    if (!result.affected) {
      throw new NotFoundException(
        `Face data for employee "${employeeId}" not found`,
      );
    }

    return { employeeId };
  }

  private async upsertFaceData(input: {
    employeeId: string;
    listFaceEmbedding: number[][];
    imageUrl: string;
    updatedTime: Date;
    onlyIfNewer: boolean;
  }) {
    const existing = await this.faceDataRepository.findOne({
      where: { employeeId: input.employeeId },
    });

    if (existing) {
      if (
        input.onlyIfNewer &&
        existing.updatedTime.getTime() >= input.updatedTime.getTime()
      ) {
        return existing;
      }

      existing.listFaceEmbedding = input.listFaceEmbedding;
      existing.imageUrl = input.imageUrl;
      existing.updatedTime = input.updatedTime;
      return this.faceDataRepository.save(existing);
    }

    const faceData = this.faceDataRepository.create(input);
    return this.faceDataRepository.save(faceData);
  }

  private assertCanWriteEmployeeFace(
    employeeId: string,
    currentUser?: CurrentUser,
  ) {
    if (!currentUser) {
      throw new ForbiddenException('Authenticated user is required');
    }

    if (currentUser.roles.includes(AccountRole.Admin)) {
      return;
    }

    if (currentUser.id !== employeeId) {
      throw new ForbiddenException(
        'Employees can only update their own face data',
      );
    }
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

  private assertEmbeddingMatrix(value: number[][]) {
    const isValid =
      Array.isArray(value) &&
      value.every(
        (embedding) =>
          Array.isArray(embedding) &&
          embedding.every(
            (item) => typeof item === 'number' && Number.isFinite(item),
          ),
      );

    if (!isValid) {
      throw new BadRequestException('listFaceEmbedding must be a number[][]');
    }
  }

  private parseDateTime(value: string) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invalid updatedTime');
    }

    return date;
  }

  private toFaceDataResponse(faceData: FaceData) {
    return {
      id: faceData.id,
      employeeId: faceData.employeeId,
      employee: faceData.employee
        ? this.toEmployeeSummary(faceData.employee)
        : null,
      listFaceEmbedding: faceData.listFaceEmbedding,
      imageUrl: faceData.imageUrl,
      updatedTime: faceData.updatedTime,
      createdAt: faceData.createdAt,
      updatedAt: faceData.updatedAt,
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
