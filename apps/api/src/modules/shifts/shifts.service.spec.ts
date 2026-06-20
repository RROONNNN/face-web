import { Test, TestingModule } from '@nestjs/testing';
import { ShiftsService } from './shifts.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ShiftEntity } from './entities/shift.entity';
import { ShiftWorkPeriodEntity } from './entities/shift-work-period.entity';
import { DataSource } from 'typeorm';

describe('ShiftsService', () => {
  let service: ShiftsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShiftsService,
        {
          provide: getRepositoryToken(ShiftEntity),
          useValue: {},
        },
        {
          provide: getRepositoryToken(ShiftWorkPeriodEntity),
          useValue: {},
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
});
