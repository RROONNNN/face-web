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

    @Get('department-default')
    findDepartmentDefaultShift(
        @Query('employeeId', ParseUUIDPipe) employeeId: string,
    ) {
        return this.shiftsService.findDepartmentDefaultShift(employeeId);
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
     * Manually trigger department_default assignment generation for a date range.
     *
     * @query startDate  YYYY-MM-DD — start of range (inclusive), defaults to tomorrow.
     * @query endDate    YYYY-MM-DD — end of range (inclusive), defaults to startDate.
     *
     * @example POST /shifts/assignments/generate
     * @example POST /shifts/assignments/generate?startDate=2026-06-24&endDate=2026-06-30
     */
    @Post('assignments/generate')
    generateAssignments(
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('employeeId') employeeId?: string,
    ) {
        const start = startDate ?? this.schedulerService.tomorrowWorkDate();
        const end = endDate ?? start;
        return this.schedulerService.generateForDates(start, end, employeeId);
    }
}
