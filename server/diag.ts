import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const depts = await prisma.department.findMany();
  const active = await prisma.scheduleSet.findFirst({
    where: { isActive: true },
    include: { entries: true }
  });

  console.log('=== Departments ===');
  depts.forEach(d => console.log(`${d.id} : ${d.name}`));

  console.log('\n=== Active Schedule: ' + (active?.name || 'NONE') + ' ===');
  if (active) {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    active.entries.forEach(e => {
      const dName = depts.find(d => d.id === e.departmentId)?.name || 'UNKNOWN';
      console.log(`Day ${e.dayOfWeek} (${days[e.dayOfWeek]}) - Dept: ${dName} - ${e.startTime} to ${e.endTime}`);
    });
  }

  const users = await prisma.user.findMany({ select: { id: true, name: true, employeeId: true, departmentId: true } });
  console.log('\n=== Users ===');
  users.forEach(u => {
    const dName = depts.find(d => d.id === u.departmentId)?.name || 'NONE';
    console.log(`User: ${u.name} (${u.employeeId}) - Dept: ${dName}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
