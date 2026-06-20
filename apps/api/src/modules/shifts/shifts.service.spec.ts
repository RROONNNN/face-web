import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Shift } from './entities/shift.entity';
import { ShiftsService } from './shifts.service';

describe('ShiftsService', () => {
  let service: ShiftsService;
  let shiftRepository: { findOne: jest.Mock };

  beforeEach(async () => {
    shiftRepository = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShiftsService,
        {
          provide: getRepositoryToken(Shift),
          useValue: shiftRepository,
        },
        {
          provide: DataSource,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<ShiftsService>(ShiftsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCurrentShiftActive', () => {
    it('returns the active shift', async () => {
      const activeShift = {
        id: 'e50a4e83-9db8-4644-b8b3-97dd0629613f',
        name: 'Office',
        startTime: '08:00:00',
        endTime: '17:00:00',
        isActive: true,
      } as Shift;

      shiftRepository.findOne.mockResolvedValue(activeShift);

      await expect(service.getCurrentShiftActive()).resolves.toBe(activeShift);
      expect(shiftRepository.findOne).toHaveBeenCalledWith({
        where: { isActive: true },
      });
    });

    it('throws when no active shift is configured', async () => {
      shiftRepository.findOne.mockResolvedValue(null);

      await expect(service.getCurrentShiftActive()).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
