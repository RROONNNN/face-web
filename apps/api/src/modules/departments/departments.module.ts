import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Shift } from '../shifts/entities/shift.entity';
import { DepartmentsController } from './departments.controller';
import { DepartmentsService } from './departments.service';
import { Department } from './entities/department.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Department, Shift])],
    providers: [DepartmentsService],
    controllers: [DepartmentsController],
    exports: [DepartmentsService],
})
export class DepartmentsModule {}
