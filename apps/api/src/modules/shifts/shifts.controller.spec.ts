import { Test, TestingModule } from '@nestjs/testing';
import { ShiftsController } from './shifts.controller';
import { ShiftAssignmentSchedulerService } from './shift-assignment-scheduler.service';
import { ShiftsService } from './shifts.service';

describe('ShiftsController', () => {
  let controller: ShiftsController;
  const shiftsService = {
    findAllShifts: jest.fn(),
    findDepartmentDefaultShift: jest.fn(),
    createShift: jest.fn(),
    updateShift: jest.fn(),
    deactivateShift: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ShiftsController],
      providers: [
        {
          provide: ShiftsService,
          useValue: shiftsService,
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
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates department default shift lookup by employee id', () => {
    controller.findDepartmentDefaultShift('employee-id');

    expect(shiftsService.findDepartmentDefaultShift).toHaveBeenCalledWith(
      'employee-id',
    );
  });
});
