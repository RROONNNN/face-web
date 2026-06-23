import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateLeaveRequestDto } from './create-leave-request.dto';

describe('CreateLeaveRequestDto', () => {
  it('accepts a mixed full-day and partial-period request', async () => {
    const dto = plainToInstance(CreateLeaveRequestDto, {
      startDate: '2099-01-01',
      endDate: '2099-01-02',
      reason: 'Family appointment',
      partialDays: [
        {
          workDate: '2099-01-02',
          workPeriodIds: ['11111111-1111-4111-8111-111111111111'],
        },
      ],
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects timestamp dates, blank reasons, and invalid period IDs', async () => {
    const dto = plainToInstance(CreateLeaveRequestDto, {
      startDate: '2099-01-01T00:00:00.000Z',
      endDate: '2099-01-02',
      reason: '   ',
      partialDays: [{ workDate: '2099-01-02', workPeriodIds: ['not-a-uuid'] }],
    });

    expect(await validate(dto)).not.toHaveLength(0);
  });
});
