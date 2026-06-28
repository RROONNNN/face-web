import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { AccountRole } from '../auth/account-role.enum';
import { CurrentUser } from '../auth/current-user.interface';
import { User } from '../users/entities/user.entity';
import { QueryFaceDataDto } from './dto/query-face-data.dto';
import { QueryUpdatedFaceDataDto } from './dto/query-updated-face-data.dto';
import { SyncFaceDataDto } from './dto/sync-face-data.dto';
import { UpdateFaceDataDto } from './dto/update-face-data.dto';
import { FaceData } from './entities/face-data.entity';

type UploadedJsonFile = {
  buffer?: Buffer;
  originalname?: string;
};

type UploadedFaceDataItem = {
  employeeId: string;
  updatedTime: Date;
  listFaceEmbedding: number[][];
  imageUrl?: string;
};

type UpsertFaceDataResult = {
  record: FaceData;
  action: 'created' | 'updated' | 'skipped';
};

@Injectable()
export class FaceService {
  constructor(
    @InjectRepository(FaceData)
    private readonly faceDataRepository: Repository<FaceData>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) { }

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
    }).then((result) => result.record);
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

  async syncFromJsonFile(file?: UploadedJsonFile, currentUser?: CurrentUser) {
    if (!currentUser) {
      throw new ForbiddenException('Authenticated user is required');
    }

    const items = this.parseUploadedFaceDataFile(file);

    for (const item of items) {
      this.assertCanWriteEmployeeFace(item.employeeId, currentUser);
      await this.ensureEmployee(item.employeeId);
    }

    const summary = {
      total: items.length,
      created: 0,
      updated: 0,
      skipped: [] as string[],
    };

    for (const item of items) {
      const result = await this.upsertFaceData({
        employeeId: item.employeeId,
        listFaceEmbedding: item.listFaceEmbedding,
        imageUrl: item.imageUrl ?? '',
        updatedTime: item.updatedTime,
        onlyIfNewer: true,
      });

      if (result.action === 'skipped') {
        summary.skipped.push(item.employeeId);
      } else {
        summary[result.action] += 1;
      }
    }

    return {
      ...summary,
      imported: summary.created + summary.updated,
    };
  }

  async findUpdatedAfter(input: QueryUpdatedFaceDataDto) {
    if (!input.from_date) {
      const records = await this.faceDataRepository.find({
        relations: { employee: true },
        order: { updatedTime: 'ASC' },
      });
      return records.map((record) => this.toFaceDataSyncResponse(record));
    }
    const fromDate = this.parseDateTime(input.from_date);
    const records = await this.faceDataRepository.find({
      relations: { employee: true },
      where: { updatedTime: MoreThan(fromDate) },
      order: { updatedTime: 'ASC' },
    });

    return records.map((record) => this.toFaceDataSyncResponse(record));
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
  }): Promise<UpsertFaceDataResult> {
    const existing = await this.faceDataRepository.findOne({
      where: { employeeId: input.employeeId },
    });

    if (existing) {
      if (
        input.onlyIfNewer &&
        existing.updatedTime.getTime() >= input.updatedTime.getTime()
      ) {
        return { record: existing, action: 'skipped' };
      }

      existing.listFaceEmbedding = input.listFaceEmbedding;
      existing.imageUrl = input.imageUrl || existing.imageUrl;
      existing.updatedTime = input.updatedTime;
      return {
        record: await this.faceDataRepository.save(existing),
        action: 'updated',
      };
    }

    const faceData = this.faceDataRepository.create({
      employeeId: input.employeeId,
      listFaceEmbedding: input.listFaceEmbedding,
      imageUrl: input.imageUrl,
      updatedTime: input.updatedTime,
    });
    return {
      record: await this.faceDataRepository.save(faceData),
      action: 'created',
    };
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

  private parseUploadedFaceDataFile(file?: UploadedJsonFile) {
    if (!file?.buffer) {
      throw new BadRequestException('JSON file is required');
    }

    let payload: unknown;

    try {
      payload = JSON.parse(file.buffer.toString('utf8')) as unknown;
    } catch {
      throw new BadRequestException('Uploaded file must contain valid JSON');
    }

    if (!Array.isArray(payload)) {
      throw new BadRequestException('Uploaded JSON must be an array');
    }

    return payload.map((item, index) =>
      this.parseUploadedFaceDataItem(item, index),
    );
  }

  private parseUploadedFaceDataItem(
    item: unknown,
    index: number,
  ): UploadedFaceDataItem {
    if (!this.isRecord(item)) {
      throw new BadRequestException(`Item at index ${index} must be an object`);
    }

    const employeeId = item.empId ?? item.employeeId;
    const updatedTime = item.updatedTime ?? item.updateTime;
    const listFaceEmbedding = item.listFaceEmbeddingg ?? item.listFaceEmbedding;
    const imageUrl = item.imageUrl;

    if (typeof employeeId !== 'string' || !this.isUuid(employeeId)) {
      throw new BadRequestException(`Item at index ${index} has invalid empId`);
    }

    const parsedUpdatedTime = this.parseDateTime(updatedTime);
    this.assertEmbeddingMatrix(listFaceEmbedding as number[][]);

    if (imageUrl !== undefined && typeof imageUrl !== 'string') {
      throw new BadRequestException(
        `Item at index ${index} has invalid imageUrl`,
      );
    }

    return {
      employeeId,
      updatedTime: parsedUpdatedTime,
      listFaceEmbedding: listFaceEmbedding as number[][],
      imageUrl,
    };
  }

  private parseDateTime(value: unknown) {
    if (
      typeof value !== 'string' &&
      typeof value !== 'number' &&
      !(value instanceof Date)
    ) {
      throw new BadRequestException('Invalid updatedTime');
    }

    const date =
      value instanceof Date ? new Date(value.getTime()) : new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invalid updatedTime');
    }

    return date;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private isUuid(value: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );
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

  private toFaceDataSyncResponse(faceData: FaceData) {
    return {
      empId: faceData.employeeId,
      updatedTime: faceData.updatedTime,
      listFaceEmbedding: faceData.listFaceEmbedding,
      personName: faceData.employee?.name ?? null,
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
