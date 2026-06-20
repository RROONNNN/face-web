import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ShiftsController } from './shifts.controller';
import { ShiftsService } from './shifts.service';

describe('ShiftsController', () => {
  let controller: ShiftsController;
  let shiftsService: { getCurrentShiftActive: jest.Mock };

  beforeEach(async () => {
    shiftsService = {
      getCurrentShiftActive: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ShiftsController],
      providers: [
        {
          provide: ShiftsService,
          useValue: shiftsService,
        },
        {
          provide: JwtService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<ShiftsController>(ShiftsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('gets the current active shift', () => {
    const activeShift = {
      id: 'e50a4e83-9db8-4644-b8b3-97dd0629613f',
      name: 'Office',
      startTime: '08:00:00',
      endTime: '17:00:00',
      isActive: true,
    };

    shiftsService.getCurrentShiftActive.mockReturnValue(activeShift);

    expect(controller.getCurrentShiftActive()).toBe(activeShift);
    expect(shiftsService.getCurrentShiftActive).toHaveBeenCalledTimes(1);
  });
});
