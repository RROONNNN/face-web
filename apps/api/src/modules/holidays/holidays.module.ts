import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Holiday } from './entities/holiday.entity';
import { HolidaysController } from './holidays.controller';
import { HolidaysService } from './holidays.service';

@Module({
    imports: [TypeOrmModule.forFeature([Holiday])],
    providers: [HolidaysService],
    controllers: [HolidaysController],
    exports: [HolidaysService],
})
export class HolidaysModule {}
