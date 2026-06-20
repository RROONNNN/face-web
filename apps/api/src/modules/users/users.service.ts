import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { AccountRole } from '../auth/account-role.enum';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User) private readonly usersRepository: Repository<User>,
    ) { }
    findByEmployeeCode(employeeCode: string): Promise<User | null> {
        return this.usersRepository.findOne({
            where: { employeeCode },
        });
    }
    async createAdmin(input: {
        employeeCode: string;
        name: string;
        passwordHash: string;
    }): Promise<User> {
        const user = this.usersRepository.create({
            employeeCode: input.employeeCode,
            name: input.name,
            passwordHash: input.passwordHash,
            accountRole: AccountRole.Admin,
        });
        return this.usersRepository.save(user);
    }
    async findById(id: string): Promise<User | null> {
        return this.usersRepository.findOne({
            where: { id },
        });

    }

}
