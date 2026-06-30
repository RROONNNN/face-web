import { AccountRole } from '../auth/account-role.enum';
import { FaceController } from './face.controller';
import { FaceService } from './face.service';

describe('FaceController', () => {
  const faceService = {
    findUpdatedAfter: jest.fn(),
  } as unknown as jest.Mocked<FaceService>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('delegates sync reads using the authenticated user', () => {
    const controller = new FaceController(faceService);
    const input = { from_date: '2026-01-01T00:00:00.000Z' };
    const user = {
      id: 'employee-1',
      employeeCode: 'EMP1',
      roles: [AccountRole.Employee],
    };

    controller.findUpdatedAfter(input, { user } as never);

    expect(faceService.findUpdatedAfter).toHaveBeenCalledWith(input, user);
  });
});
