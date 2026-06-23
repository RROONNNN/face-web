import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
    Query,
    UploadedFile,
    UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CreateHolidayDto } from './dto/create-holiday.dto';
import { QueryHolidaysDto } from './dto/query-holidays.dto';
import { UpdateHolidayDto } from './dto/update-holiday.dto';
import { HolidaysService } from './holidays.service';

@Controller('holidays')
export class HolidaysController {
    constructor(private readonly holidaysService: HolidaysService) { }

    @Get()
    findAll(@Query() query: QueryHolidaysDto) {
        return this.holidaysService.findAll(query);
    }

    @Get('by-month')
    findByMonth(@Query('dateInMonth') dateInMonth: string) {
        return this.holidaysService.findByMonth(dateInMonth);
    }

    @Get(':id')
    findOne(@Param('id', ParseUUIDPipe) id: string) {
        return this.holidaysService.findOne(id);
    }

    @Post()
    create(@Body() dto: CreateHolidayDto) {
        return this.holidaysService.create(dto);
    }

    @Patch(':id')
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateHolidayDto,
    ) {
        return this.holidaysService.update(id, dto);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    remove(@Param('id', ParseUUIDPipe) id: string) {
        return this.holidaysService.remove(id);
    }

    /**
     * POST /holidays/import
     * Upload an Excel (.xlsx / .xls) file to bulk-import holidays.
     *
     * Expected sheet columns: date | name | description (optional)
     * Dates can be YYYY-MM-DD, dd/mm/yyyy, or Excel serial numbers.
     *
     * Returns:
     *   { created, updated, skipped, errors }
     */
    @Post('import')
    @UseInterceptors(
        FileInterceptor('file', {
            storage: memoryStorage(),
            fileFilter: (_req, file, cb) => {
                const allowed = [
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
                    'application/vnd.ms-excel', // .xls
                ];
                if (allowed.includes(file.mimetype)) {
                    cb(null, true);
                } else {
                    cb(new Error('Only .xlsx and .xls files are accepted.'), false);
                }
            },
            limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
        }),
    )
    importExcel(@UploadedFile() file: Express.Multer.File) {
        if (!file) {
            throw new Error('No file uploaded.');
        }
        return this.holidaysService.importFromExcel(file.buffer);
    }
}
