import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as XLSX from 'xlsx';
import { PaginatedResponse } from '../../common/interfaces/paginated-response.interface';
import { CreateHolidayDto } from './dto/create-holiday.dto';
import { QueryHolidaysDto } from './dto/query-holidays.dto';
import { UpdateHolidayDto } from './dto/update-holiday.dto';
import { Holiday } from './entities/holiday.entity';

@Injectable()
export class HolidaysService {
    constructor(
        @InjectRepository(Holiday)
        private readonly holidayRepo: Repository<Holiday>,
    ) { }

    // -------------------------------------------------------------------------
    // CRUD
    // -------------------------------------------------------------------------

    async findAll(query: QueryHolidaysDto): Promise<PaginatedResponse<Holiday>> {
        const { search, year, page = 1, limit = 20, sortBy = 'date', sortOrder = 'ASC' } = query;

        const qb = this.holidayRepo
            .createQueryBuilder('h')
            .orderBy(`h.${sortBy}`, sortOrder)
            .skip((page - 1) * limit)
            .take(limit);

        if (search) {
            qb.andWhere('LOWER(h.name) LIKE LOWER(:search)', { search: `%${search}%` });
        }

        if (year) {
            qb.andWhere("EXTRACT(YEAR FROM h.date::date) = :year", { year });
        }

        const [items, total] = await qb.getManyAndCount();
        return {
            items,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findOne(id: string): Promise<Holiday> {
        const holiday = await this.holidayRepo.findOne({ where: { id } });
        if (!holiday) {
            throw new NotFoundException(`Holiday with id "${id}" not found.`);
        }
        return holiday;
    }

    async create(dto: CreateHolidayDto): Promise<Holiday> {
        await this.checkDateConflict(dto.date);

        const holiday = this.holidayRepo.create({
            date: dto.date,
            name: dto.name.trim(),
            description: dto.description?.trim() ?? null,
        });

        return this.holidayRepo.save(holiday);
    }

    async update(id: string, dto: UpdateHolidayDto): Promise<Holiday> {
        const holiday = await this.findOne(id);

        if (dto.date !== undefined && dto.date !== holiday.date) {
            await this.checkDateConflict(dto.date, id);
            holiday.date = dto.date;
        }

        if (dto.name !== undefined) holiday.name = dto.name.trim();
        if (dto.description !== undefined) holiday.description = dto.description?.trim() ?? null;

        return this.holidayRepo.save(holiday);
    }

    async remove(id: string): Promise<void> {
        const holiday = await this.findOne(id);
        await this.holidayRepo.remove(holiday);
    }

    async findByMonth(dateInMonth: string): Promise<Holiday[]> {
        const date = new Date(dateInMonth);
        if (isNaN(date.getTime())) {
            throw new BadRequestException(`Invalid date "${dateInMonth}". Expected format: YYYY-MM-DD.`);
        }
        const year = date.getUTCFullYear();
        const month = date.getUTCMonth() + 1;

        return this.holidayRepo
            .createQueryBuilder('h')
            .where('EXTRACT(YEAR FROM h.date::date) = :year', { year })
            .andWhere('EXTRACT(MONTH FROM h.date::date) = :month', { month })
            .orderBy('h.date', 'ASC')
            .getMany();
    }

    // -------------------------------------------------------------------------
    // Excel Import
    // -------------------------------------------------------------------------

    /**
     * Parse an Excel file and upsert holidays.
     *
     * Expected columns (case-insensitive, in any order):
     *   - date   → string "YYYY-MM-DD" OR Excel serial date number
     *   - name   → string
     *   - description (optional)
     *
     * Returns { created, updated, skipped } counts.
     */
    async importFromExcel(
        fileBuffer: Buffer,
    ): Promise<{ created: number; updated: number; skipped: number; errors: string[] }> {
        const workbook = XLSX.read(fileBuffer, { type: 'buffer', cellDates: true });
        const sheetName = workbook.SheetNames[0];

        if (!sheetName) {
            throw new BadRequestException('Excel file contains no sheets.');
        }

        const sheet = workbook.Sheets[sheetName];
        const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, {
            defval: '',
            raw: false, // convert everything to formatted strings
        });

        if (rows.length === 0) {
            throw new BadRequestException('Excel sheet is empty.');
        }

        let created = 0;
        let updated = 0;
        let skipped = 0;
        const errors: string[] = [];

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowNum = i + 2; // 1-indexed + header row

            try {
                const date = this.normalizeDate(row);
                const name = this.normalizeString(row, 'name');

                if (!date) {
                    errors.push(`Row ${rowNum}: missing or invalid "date" value.`);
                    skipped++;
                    continue;
                }
                if (!name) {
                    errors.push(`Row ${rowNum}: missing "name" value.`);
                    skipped++;
                    continue;
                }

                const description = this.normalizeString(row, 'description') || null;

                const existing = await this.holidayRepo.findOne({ where: { date } });
                if (existing) {
                    existing.name = name;
                    if (description !== null) existing.description = description;
                    await this.holidayRepo.save(existing);
                    updated++;
                } else {
                    const holiday = this.holidayRepo.create({ date, name, description });
                    await this.holidayRepo.save(holiday);
                    created++;
                }
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : String(err);
                errors.push(`Row ${rowNum}: ${message}`);
                skipped++;
            }
        }

        return { created, updated, skipped, errors };
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /**
     * Throw ConflictException if another holiday already exists on `date`.
     * @param excludeId – exclude this record when checking (used during update).
     */
    private async checkDateConflict(date: string, excludeId?: string): Promise<void> {
        const qb = this.holidayRepo
            .createQueryBuilder('h')
            .where('h.date = :date', { date });

        if (excludeId) {
            qb.andWhere('h.id != :excludeId', { excludeId });
        }

        const existing = await qb.getOne();
        if (existing) {
            throw new ConflictException(
                `A holiday already exists on "${date}" ("${existing.name}").`,
            );
        }
    }

    /**
     * Try to read a "date" column value from a row and normalise it to "YYYY-MM-DD".
     * Accepts: JS Date, ISO strings, dd/mm/yyyy, mm/dd/yyyy, Excel serial numbers.
     */
    private normalizeDate(row: Record<string, unknown>): string | null {
        const key = Object.keys(row).find((k) => k.toLowerCase() === 'date');
        if (!key) return null;

        const raw = row[key];
        if (!raw) return null;

        // JS Date (cellDates: true may still give Date objects via raw:false strings)
        if (raw instanceof Date) {
            return raw.toISOString().slice(0, 10);
        }

        let str = '';
        if (typeof raw === 'string') {
            str = raw.trim();
        } else if (typeof raw === 'number') {
            str = String(raw);
        } else {
            return null;
        }

        // ISO format: YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
            return str;
        }

        // dd/mm/yyyy (Vietnamese convention)
        const ddmmyyyy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (ddmmyyyy) {
            const [, d, m, y] = ddmmyyyy;
            return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        }

        // Excel serial number (number as string)
        if (/^\d+$/.test(str)) {
            interface SSFDate { y: number; m: number; d: number; }
            interface SSFType { parse_date_code(v: number): SSFDate | undefined; }

            const ssf = XLSX.SSF as unknown as SSFType;
            if (ssf && typeof ssf.parse_date_code === 'function') {
                const excelDate = ssf.parse_date_code(Number(str));
                if (excelDate && excelDate.y && excelDate.m && excelDate.d) {
                    const m = String(excelDate.m).padStart(2, '0');
                    const d = String(excelDate.d).padStart(2, '0');
                    return `${excelDate.y}-${m}-${d}`;
                }
            }
        }

        return null;
    }

    /** Read a string column value by key (case-insensitive). */
    private normalizeString(row: Record<string, unknown>, colName: string): string {
        const key = Object.keys(row).find((k) => k.toLowerCase() === colName.toLowerCase());
        if (!key) return '';

        const val = row[key];
        if (typeof val === 'string') return val.trim();
        if (typeof val === 'number') return String(val).trim();

        return '';
    }
}
