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
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { QueryDepartmentsDto } from './dto/query-departments.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@Controller('departments')
export class DepartmentsController {
    constructor(private readonly departmentsService: DepartmentsService) {}

    @Get()
    findAll(@Query() query: QueryDepartmentsDto) {
        return this.departmentsService.findAll(query);
    }

    @Get(':id')
    findOne(@Param('id', ParseUUIDPipe) id: string) {
        return this.departmentsService.findOne(id);
    }

    @Post()
    create(@Body() dto: CreateDepartmentDto) {
        return this.departmentsService.create(dto);
    }

    @Patch(':id')
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateDepartmentDto,
    ) {
        return this.departmentsService.update(id, dto);
    }
}
