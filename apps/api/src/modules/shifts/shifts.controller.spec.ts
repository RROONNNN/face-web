import { Test, TestingModule } from '@nestjs/testing';
import { ShiftsController } from './shifts.controller';
import { ShiftAssignmentSchedulerService } from './shift-assignment-scheduler.service';
import { ShiftsService } from './shifts.service';

describe('ShiftsController', () => {
  let controller: ShiftsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ShiftsController],
      providers: [
        {
          provide: ShiftsService,
          useValue: {
            findAllShifts: jest.fn(),
            createShift: jest.fn(),
            updateShift: jest.fn(),
            deactivateShift: jest.fn(),
          },
        },
        {
          provide: ShiftAssignmentSchedulerService,
          useValue: {
            generateForDate: jest.fn(),
            tomorrowWorkDate: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ShiftsController>(ShiftsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
