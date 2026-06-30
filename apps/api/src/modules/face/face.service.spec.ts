import { ForbiddenException } from '@nestjs/common';
import { AccountRole } from '../auth/account-role.enum';
import { FaceService } from './face.service';

describe('FaceService', () => {
  const userRepository = {} as never;

  function createService(faceDataRepository: { find: jest.Mock }) {
    return new FaceService(faceDataRepository as never, userRepository);
  }

  it('requires an authenticated user when finding updated face data', async () => {
    const faceDataRepository = { find: jest.fn() };
    const service = createService(faceDataRepository);

    await expect(service.findUpdatedAfter({})).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(faceDataRepository.find).not.toHaveBeenCalled();
  });

  it('returns all updated face data for admins', async () => {
    const updatedTime = new Date('2026-01-01T00:00:00.000Z');
    const faceDataRepository = {
      find: jest.fn().mockResolvedValue([
        {
          employeeId: 'employee-1',
          updatedTime,
          listFaceEmbedding: [[1, 2, 3]],
          employee: { name: 'Alice' },
        },
      ]),
    };
    const service = createService(faceDataRepository);

    await expect(
      service.findUpdatedAfter(
        {},
        {
          id: 'admin-1',
          employeeCode: 'ADMIN',
          roles: [AccountRole.Admin],
        },
      ),
    ).resolves.toEqual([
      {
        empId: 'employee-1',
        updatedTime,
        listFaceEmbedding: [[1, 2, 3]],
        personName: 'Alice',
      },
    ]);
    expect(faceDataRepository.find).toHaveBeenCalledWith({
      relations: { employee: true },
      order: { updatedTime: 'ASC' },
    });
  });

  it('only returns the current employee face data for employee users', async () => {
    const faceDataRepository = { find: jest.fn().mockResolvedValue([]) };
    const service = createService(faceDataRepository);

    await service.findUpdatedAfter(
      {},
      {
        id: 'employee-1',
        employeeCode: 'EMP1',
        roles: [AccountRole.Employee],
      },
    );

    expect(faceDataRepository.find).toHaveBeenCalledWith({
      relations: { employee: true },
      order: { updatedTime: 'ASC' },
      where: { employeeId: 'employee-1' },
    });
  });

  it('keeps employee scoping when from_date is provided', async () => {
    const faceDataRepository = { find: jest.fn().mockResolvedValue([]) };
    const service = createService(faceDataRepository);

    await service.findUpdatedAfter(
      { from_date: '2026-01-01T00:00:00.000Z' },
      {
        id: 'employee-1',
        employeeCode: 'EMP1',
        roles: [AccountRole.Employee],
      },
    );

    expect(faceDataRepository.find).toHaveBeenCalledWith({
      relations: { employee: true },
      order: { updatedTime: 'ASC' },
      where: {
        employeeId: 'employee-1',
        updatedTime: expect.any(Object),
      },
    });
  });
});
