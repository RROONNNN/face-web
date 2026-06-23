import 'dotenv/config';

import dataSource from '../data-source';

async function deleteUnassignedUsers() {
    await dataSource.initialize();

    const preview = await dataSource.query<{ id: string; name: string }[]>(
        `SELECT id, name FROM users WHERE department_id IS NULL`,
    );

    if (!preview.length) {
        console.log('No users with null department_id found.');
        await dataSource.destroy();
        return;
    }

    console.log(`Found ${preview.length} user(s) with null department_id:`);
    preview.forEach((u) => console.log(`  - ${u.id}  ${u.name}`));

    const result = await dataSource.query(
        `DELETE FROM users WHERE department_id IS NULL`,
    );

    console.log(`Deleted ${result[1] ?? preview.length} user(s).`);
    await dataSource.destroy();
}

void deleteUnassignedUsers();
