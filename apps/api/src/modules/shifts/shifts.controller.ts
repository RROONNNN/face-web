import {
    Body,
    Controller,
    Get,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
    Query,
} from '@nestjs/common';
import { CreateShiftDto } from './dto/create-shift.dto';
import { QueryShiftsDto } from './dto/query-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';
import { ShiftsService } from './shifts.service';

@Controller('shifts')
export class ShiftsController {
    constructor(private readonly shiftsService: ShiftsService) {}

    @Get()
    findAll(@Query() query: QueryShiftsDto) {
        return this.shiftsService.findAllShifts(query);
    }

    @Post()
    create(@Body() createShiftDto: CreateShiftDto) {
        return this.shiftsService.createShift(createShiftDto);
    }

    @Patch(':id')
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() updateShiftDto: UpdateShiftDto,
    ) {
        return this.shiftsService.updateShift(id, updateShiftDto);
    }

    @Patch(':id/deactivate')
    deactivate(@Param('id', ParseUUIDPipe) id: string) {
        return this.shiftsService.deactivateShift(id);
    }
}
