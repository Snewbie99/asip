import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrate() {
  try {
    console.log('Attempting to manually add joinDate column to user table...');
    await prisma.$executeRawUnsafe(`ALTER TABLE user ADD COLUMN joinDate DATETIME(3) NULL AFTER employeeStatus`);
    console.log('SUCCESS: Column joinDate added.');
  } catch (error: any) {
    if (error.message.includes('Duplicate column name')) {
      console.log('NOTE: Column joinDate already exists.');
    } else {
      console.error('ERROR adding column:', error.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

migrate();
