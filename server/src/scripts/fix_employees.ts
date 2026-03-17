import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.user.updateMany({
    where: {
      OR: [
        { employeeId: 'pegawai1' },
        { employeeId: 'pegawai2' }
      ]
    },
    data: {
      employeeStatus: 'PEGAWAI'
    }
  });

  console.log(`Updated ${result.count} users.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
