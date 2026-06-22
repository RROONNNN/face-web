import {
    Body,
    Controller,
    Get,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
    Query,
    Req,
} from '@nestjs/common';
import { Request } from 'express';
import { CreateShiftDto } from './dto/create-shift.dto';
import { QueryShiftAssignmentsDto } from './dto/query-shift-assignments.dto';
import { QueryShiftsDto } from './dto/query-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';
import { UpsertShiftAssignmentDto } from './dto/upsert-shift-assignment.dto';
import { ShiftAssignmentSchedulerService } from './shift-assignment-scheduler.service';
import { ShiftsService } from './shifts.service';

@Controller('shifts')
export class ShiftsController {
    constructor(
        private readonly shiftsService: ShiftsService,
        private readonly schedulerService: ShiftAssignmentSchedulerService,
    ) { }

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

    // -------------------------------------------------------------------------
    // Assignments
    // -------------------------------------------------------------------------

    @Get('assignments')
    findAllAssignments(@Query() query: QueryShiftAssignmentsDto) {
        return this.shiftsService.findAllAssignments(query);
    }

    /**
     * Upsert a shift assignment for a single employee on a specific date.
     * TODO: Replace req.user?.id with a proper Auth guard/decorator once auth is applied to this route.
     */
    @Post('assignments')
    upsertAssignment(
        @Body() dto: UpsertShiftAssignmentDto,
        @Req() req: Request & { user?: { id: string } },
    ) {
        // assignedByUserId is the admin performing the action.
        // Falls back to employeeId if no auth context yet (development convenience).
        const assignedByUserId = req.user?.id ?? dto.employeeId;
        return this.shiftsService.upsertAssignment(dto, assignedByUserId);
    }

    /**
     * Manually trigger department_default assignment generation for a given date.
     *
     * @query workDate  YYYY-MM-DD — defaults to tomorrow (same as the nightly cron).
     *
     * @example POST /shifts/assignments/generate
     * @example POST /shifts/assignments/generate?workDate=2026-06-24
     */
    @Post('assignments/generate')
    generateAssignments(@Query('workDate') workDate?: string) {
        return this.schedulerService.generateForDate(
            workDate ?? this.schedulerService.tomorrowWorkDate(),
        );
    }
}
