import { Injectable } from '@nestjs/common';

type PublicHolidayResponse = {
  date?: string;
};

const DEFAULT_VIETNAM_HOLIDAYS_URL =
  'https://date.nager.at/api/v3/PublicHolidays/{year}/VN';

@Injectable()
export class HolidayCalendarService {
  private readonly holidayCache = new Map<number, Set<string>>();

  async getVietnameseHolidays(year: number): Promise<Set<string>> {
    const cached = this.holidayCache.get(year);

    if (cached) {
      return cached;
    }

    const holidays = await this.fetchVietnameseHolidays(year);
    this.holidayCache.set(year, holidays);

    return holidays;
  }

  async countWorkingDays(startDate: string, endDate: string) {
    const start = this.parseDateOnly(startDate);
    const end = this.parseDateOnly(endDate);
    const holidaysByYear = new Map<number, Set<string>>();
    let count = 0;

    for (
      const cursor = new Date(start);
      cursor.getTime() <= end.getTime();
      cursor.setUTCDate(cursor.getUTCDate() + 1)
    ) {
      if (this.isWeekend(cursor)) {
        continue;
      }

      const year = cursor.getUTCFullYear();
      let holidays = holidaysByYear.get(year);

      if (!holidays) {
        holidays = await this.getVietnameseHolidays(year);
        holidaysByYear.set(year, holidays);
      }

      if (!holidays.has(this.formatDateOnly(cursor))) {
        count += 1;
      }
    }

    return count;
  }

  private async fetchVietnameseHolidays(year: number) {
    try {
      const url = (
        process.env.VIETNAM_HOLIDAYS_API_URL ?? DEFAULT_VIETNAM_HOLIDAYS_URL
      ).replace('{year}', String(year));
      const response = await fetch(url);

      if (!response.ok) {
        return new Set<string>();
      }

      const data = (await response.json()) as PublicHolidayResponse[];
      return new Set(
        data
          .map((holiday) => holiday.date)
          .filter((date): date is string => Boolean(date)),
      );
    } catch {
      return new Set<string>();
    }
  }

  private parseDateOnly(value: string) {
    return new Date(`${value}T00:00:00.000Z`);
  }

  private formatDateOnly(value: Date) {
    return value.toISOString().slice(0, 10);
  }

  private isWeekend(value: Date) {
    const day = value.getUTCDay();
    return day === 0 || day === 6;
  }
}
