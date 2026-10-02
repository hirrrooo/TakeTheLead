import 'dotenv/config';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { PrismaClient } from '../generated/prisma/client.ts';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');
const db = new PrismaClient({ adapter: new PrismaLibSql({ url }) });

const probes = await db.user.findMany({ where: { email: { endsWith: '@takethelead.dev' } , NOT: { id: { startsWith: 'seed_' } }, AND: { id: { not: 'system' } } } });
for (const u of probes) {
	await db.account.deleteMany({ where: { userId: u.id } });
	await db.session.deleteMany({ where: { userId: u.id } });
	await db.user.delete({ where: { id: u.id } });
	console.log('Removed probe user', u.email);
}
console.log('Cleanup done. users=' + (await db.user.count()));
await db.$disconnect();
