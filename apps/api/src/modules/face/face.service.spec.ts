import { BadRequestException } from '@nestjs/common';
import { MoreThan, Repository } from 'typeorm';
import { AccountRole } from '../auth/account-role.enum';
import { CurrentUser } from '../auth/current-user.interface';
import { User } from '../users/entities/user.entity';
import { FaceData } from './entities/face-data.entity';
import { FaceService } from './face.service';

describe('FaceService', () => {
  let service: FaceService;
  let faceDataRepository: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let userRepository: { findOne: jest.Mock };

  const adminUser: CurrentUser = {
    id: '48cd074f-22df-41c4-9256-847298198a47',
    employeeCode: 'ADMIN',
    roles: [AccountRole.Admin],
  };

  beforeEach(() => {
    faceDataRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((input: Partial<FaceData>) => input),
      save: jest.fn((input: FaceData) => Promise.resolve(input)),
    };
    userRepository = {
      findOne: jest.fn(),
    };

    service = new FaceService(
      faceDataRepository as unknown as Repository<FaceData>,
      userRepository as unknown as Repository<User>,
    );
  });

  describe('syncFromJsonFile', () => {
    it('imports uploaded face data and skips stale records', async () => {
      const newEmployeeId = 'e50a4e83-9db8-4644-b8b3-97dd0629613f';
      const existingEmployeeId = 'c234b944-68b3-46e4-9886-f91c3db59b12';
      const existingFaceData = {
        id: '6a07737f-05d7-4798-b5fc-c9504ae9f870',
        employeeId: existingEmployeeId,
        listFaceEmbedding: [[0.4]],
        imageUrl: 'https://example.test/old.png',
        updatedTime: new Date('2026-01-02T00:00:00.000Z'),
      } as FaceData;
      const file = {
        buffer: Buffer.from(
          JSON.stringify([
            {
              empId: newEmployeeId,
              updatedTime: '2026-01-03T00:00:00.000Z',
              listFaceEmbeddingg: [[0.1, 0.2]],
            },
            {
              empId: existingEmployeeId,
              updatedTime: '2026-01-01T00:00:00.000Z',
              listFaceEmbeddingg: [[0.3]],
            },
          ]),
        ),
      };

      userRepository.findOne.mockResolvedValue({ id: newEmployeeId });
      faceDataRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(existingFaceData);

      await expect(service.syncFromJsonFile(file, adminUser)).resolves.toEqual({
        total: 2,
        created: 1,
        updated: 0,
        skipped: [existingEmployeeId],
        imported: 1,
      });
      expect(faceDataRepository.create).toHaveBeenCalledWith({
        employeeId: newEmployeeId,
        listFaceEmbedding: [[0.1, 0.2]],
        imageUrl: '',
        updatedTime: new Date('2026-01-03T00:00:00.000Z'),
      });
      expect(faceDataRepository.save).toHaveBeenCalledTimes(1);
    });

    it('rejects invalid JSON without saving', async () => {
      await expect(
        service.syncFromJsonFile({ buffer: Buffer.from('{') }, adminUser),
      ).rejects.toThrow(BadRequestException);
      expect(faceDataRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('findUpdatedAfter', () => {
    it('returns compact face data updated after from_date', async () => {
      const employeeId = 'e50a4e83-9db8-4644-b8b3-97dd0629613f';
      const updatedTime = new Date('2026-06-18T10:00:00.000Z');
      const faceData = {
        employeeId,
        updatedTime,
        listFaceEmbedding: [
          [0.1, 0.2],
          [0.3, 0.4],
        ],
        employee: {
          name: 'Nguyen Van A',
        } as User,
      } as FaceData;

      faceDataRepository.find.mockResolvedValue([faceData]);

      await expect(
        service.findUpdatedAfter({
          from_date: '2026-06-18T09:00:00.000Z',
        }),
      ).resolves.toEqual([
        {
          empId: employeeId,
          updatedTime,
          listFaceEmbedding: [
            [0.1, 0.2],
            [0.3, 0.4],
          ],
          personName: 'Nguyen Van A',
        },
      ]);
      expect(faceDataRepository.find).toHaveBeenCalledWith({
        relations: { employee: true },
        where: {
          updatedTime: MoreThan(new Date('2026-06-18T09:00:00.000Z')),
        },
        order: { updatedTime: 'ASC' },
      });
    });
  });
});
