// src/database/seeds/seed-admin.ts
import 'dotenv/config';
import * as bcrypt from 'bcrypt';

import dataSource from '../data-source';
import { User } from '../../modules/users/entities/user.entity';
import { AccountRole } from '../../modules/auth/account-role.enum';

async function seedAdmin() {
    await dataSource.initialize();

    const userRepository = dataSource.getRepository(User);

    const employeeCode = process.env.ADMIN_EMPLOYEE_CODE ?? 'ADMIN001';
    const name = process.env.ADMIN_NAME ?? 'System Admin';
    const password = process.env.ADMIN_PASSWORD ?? employeeCode;

    const existingAdmin = await userRepository.findOne({
        where: { employeeCode },
    });

    if (existingAdmin) {
        console.log(`Admin already exists: ${employeeCode}`);
        await dataSource.destroy();
        return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const admin = userRepository.create({
        employeeCode,
        name,
        passwordHash,
        accountRole: AccountRole.Admin,
    });

    await userRepository.save(admin);

    console.log(`Admin created successfully: ${employeeCode}`);
    await dataSource.destroy();
}

void seedAdmin();