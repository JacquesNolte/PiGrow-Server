// 1. CHANGE THIS IMPORT: Point directly to your schema output path instead of @prisma/client
import { PrismaClient } from './generated/client/client.js'; 

import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is missing!');
}

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);

// Instantiate your client using the local module types
export const prisma = new PrismaClient({ adapter });