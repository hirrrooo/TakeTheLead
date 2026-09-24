import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '../src/generated/prisma/client';

const prisma = new PrismaClient({
	adapter: new PrismaBetterSqlite3({ url: 'file:./prisma/dev.db' })
});

async function main() {
	console.log('Database seed script ready.');
	// Add initial seed data here when ready
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
