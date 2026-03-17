import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  try {
    const result = await prisma.$queryRawUnsafe(`DESCRIBE user`);
    console.log('User Table Structure:');
    console.log(JSON.stringify(result, null, 2));
    
    // Check if column joinDate exists
    if (Array.isArray(result) && result.some((col: any) => col.Field === 'joinDate')) {
      console.log('\nSUCCESS: joinDate column exists in database.');
    } else {
      console.log('\nFAILURE: joinDate column MISSING in database.');
    }
  } catch (error: any) {
    console.error('Error checking DB:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

check();
