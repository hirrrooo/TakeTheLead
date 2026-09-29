import { PrismaLibSql } from '@prisma/adapter-libsql';
import { PrismaClient } from '../../../../generated/prisma/client';
import { env } from '$env/dynamic/private';

if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

const adapter = new PrismaLibSql({ url: env.DATABASE_URL });

export const db = new PrismaClient({ adapter });
