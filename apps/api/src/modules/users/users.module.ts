import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Department } from '../departments/entities/department.entity';
import { EmployeeShiftAssignment } from '../shifts/entities/employee-shift-assignment.entity';
import { User } from './entities/user.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([User, Department, EmployeeShiftAssignment]),
    ],
    providers: [UsersService],
    controllers: [UsersController],
    exports: [UsersService],
})
export class UsersModule {}
