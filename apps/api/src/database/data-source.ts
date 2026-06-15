import { config } from 'dotenv';
import { resolve } from 'path';
import { DataSource } from 'typeorm';

import { RefreshToken } from '../modules/auth/entities/refresh-token.entity';
import { User } from '../modules/users/entities/user.entity';

config({ path: resolve(process.cwd(), '../../.env') });

export default new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST,
    port: Number(process.env.DATABASE_PORT ?? 5432),
    username: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,

    entities: [User, RefreshToken],
    migrations: ['src/database/migrations/*.ts'],

    synchronize: false,
});
