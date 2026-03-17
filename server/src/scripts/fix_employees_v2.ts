import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.user.update({
    where: { employeeId: 'pegawai1' },
    data: { employeeStatus: 'Pegawai Tetap Yayasan(PTY)' }
  });
  await prisma.user.update({
    where: { employeeId: 'pegawai2' },
    data: { employeeStatus: 'Pegawai Tidak Tetap(PTT)' }
  });

  console.log(`Updated pegawai1 and pegawai2 status.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
