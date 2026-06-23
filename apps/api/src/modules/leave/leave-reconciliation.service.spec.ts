import { ConflictException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { ShiftWorkPeriod } from '../shifts/entities/shift-work-period.entity';
import { LeaveRequestDay } from './entities/leave-request-day.entity';
import { LeaveDayScope } from './enums/leave-day-scope.enum';
import { LeaveReconciliationService } from './leave-reconciliation.service';

describe('LeaveReconciliationService', () => {
  const dataSource = {} as DataSource;
  const service = new LeaveReconciliationService(dataSource);

  const managerWithDays = (days: Partial<LeaveRequestDay>[]) => {
    const queryBuilder = {
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(days),
    };
    return {
      getRepository: jest.fn().mockReturnValue({
        createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      }),
    } as unknown as EntityManager;
  };

  const period = (
    id: string,
    startTime: string,
    endTime: string,
  ): ShiftWorkPeriod =>
    ({ id, startTime, endTime, isCrossMidnight: false }) as ShiftWorkPeriod;

  it('maps full-day leave to every target work period', async () => {
    const manager = managerWithDays([{ scope: LeaveDayScope.FULL_DAY }]);
    const periods = [
      period('morning', '08:00', '12:00'),
      period('afternoon', '13:00', '17:00'),
    ];

    await expect(
      service.resolveLeavePeriodIds(manager, 'employee', '2099-01-01', periods),
    ).resolves.toEqual(['morning', 'afternoon']);
  });

  it('maps a saved leave interval to every overlapping period in a new shift', async () => {
    const manager = managerWithDays([
      {
        scope: LeaveDayScope.WORK_PERIODS,
        requestedPeriods: [
          {
            workPeriodId: 'old',
            name: 'Morning',
            startTime: '08:00',
            endTime: '12:00',
            isCrossMidnight: false,
          },
        ],
      },
    ]);
    const periods = [
      period('first', '07:00', '09:00'),
      period('second', '09:00', '13:00'),
    ];

    await expect(
      service.resolveLeavePeriodIds(manager, 'employee', '2099-01-01', periods),
    ).resolves.toEqual(['first', 'second']);
  });

  it('rejects a shift mapping with no overlapping period', async () => {
    const manager = managerWithDays([
      {
        scope: LeaveDayScope.WORK_PERIODS,
        requestedPeriods: [
          {
            workPeriodId: 'old',
            name: 'Morning',
            startTime: '08:00',
            endTime: '12:00',
            isCrossMidnight: false,
          },
        ],
      },
    ]);

    await expect(
      service.resolveLeavePeriodIds(manager, 'employee', '2099-01-01', [
        period('night', '18:00', '22:00'),
      ]),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
