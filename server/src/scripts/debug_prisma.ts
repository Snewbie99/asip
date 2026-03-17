import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const att = await prisma.attendance.findFirst({
    include: { breaklog: true }
  });
  console.log('--- ATTENDANCE ---');
  console.log(JSON.stringify(att, null, 2));
  console.log('Keys:', Object.keys(att || {}));
}

main()
  .catch(e => {
    console.error('FAILED TO FETCH:', e.message);
    // If it fails, try with breakLog
    prisma.attendance.findFirst({
      include: { breakLog: true } as any
    }).then(att2 => {
        console.log('--- ATTENDANCE (WITH breakLog) ---');
        console.log(JSON.stringify(att2, null, 2));
    }).catch(e2 => {
        console.error('FAILED WITH breakLog TOO:', e2.message);
    });
  })
  .finally(async () => {
    // wait a bit for the second catch if it triggered
    setTimeout(async () => {
        await prisma.$disconnect();
    }, 2000);
  });
