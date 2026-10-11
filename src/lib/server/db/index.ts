import { PrismaClient } from '../../../generated/prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { env } from '$env/dynamic/private';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const db =
	globalForPrisma.prisma ??
	new PrismaClient({
		adapter: new PrismaBetterSqlite3({ url: env.DATABASE_URL ?? 'file:./prisma/dev.db' })
	});

if (process.env.NODE_ENV !== 'production') {
	globalForPrisma.prisma = db;
}
