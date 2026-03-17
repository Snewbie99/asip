import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing data
  await prisma.activityLog.deleteMany();
  await prisma.breakLog.deleteMany();
  await prisma.payroll.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.scheduleEntry.deleteMany();
  await prisma.scheduleSet.deleteMany();
  await prisma.user.deleteMany();
  await prisma.locationSetting.deleteMany();
  await prisma.department.deleteMany();

  // 1. Departments
  const deptIT = await prisma.department.create({ data: { name: 'IT' } });
  const deptHRD = await prisma.department.create({ data: { name: 'HRD' } });
  const deptProduksi = await prisma.department.create({ data: { name: 'Produksi' } });

  console.log('✅ Departments created');

  // 2. Schedule Sets
  const scheduleNormal = await prisma.scheduleSet.create({
    data: { name: 'Jadwal Normal', isActive: true }
  });
  const scheduleRamadhan = await prisma.scheduleSet.create({
    data: { name: 'Jadwal Ramadhan', isActive: false }
  });

  // Normal schedule entries (Senin-Jumat) for each department
  const departments = [deptIT, deptHRD, deptProduksi];
  const normalTimes: Record<string, { start: string; end: string; bStart: string; bEnd: string }> = {
    [deptIT.id]: { start: '08:00', end: '17:00', bStart: '12:00', bEnd: '13:00' },
    [deptHRD.id]: { start: '07:30', end: '16:30', bStart: '12:00', bEnd: '13:00' },
    [deptProduksi.id]: { start: '07:00', end: '16:00', bStart: '12:00', bEnd: '13:00' },
  };

  for (const dept of departments) {
    const t = normalTimes[dept.id];
    for (let day = 1; day <= 5; day++) { // Senin-Jumat
      await prisma.scheduleEntry.create({
        data: {
          scheduleSetId: scheduleNormal.id,
          departmentId: dept.id,
          dayOfWeek: day,
          startTime: t.start,
          endTime: t.end,
          breakStart: t.bStart,
          breakEnd: t.bEnd,
        }
      });
    }
    // Sabtu (half day for Produksi)
    if (dept.id === deptProduksi.id) {
      await prisma.scheduleEntry.create({
        data: {
          scheduleSetId: scheduleNormal.id,
          departmentId: dept.id,
          dayOfWeek: 6,
          startTime: '07:00',
          endTime: '12:00',
        }
      });
    }
  }

  // Ramadhan schedule entries
  const ramadhanTimes: Record<string, { start: string; end: string }> = {
    [deptIT.id]: { start: '08:00', end: '15:30' },
    [deptHRD.id]: { start: '07:30', end: '15:00' },
    [deptProduksi.id]: { start: '07:00', end: '14:30' },
  };

  for (const dept of departments) {
    const t = ramadhanTimes[dept.id];
    for (let day = 1; day <= 5; day++) {
      await prisma.scheduleEntry.create({
        data: {
          scheduleSetId: scheduleRamadhan.id,
          departmentId: dept.id,
          dayOfWeek: day,
          startTime: t.start,
          endTime: t.end,
        }
      });
    }
  }

  console.log('✅ Schedules created');

  // 3. Location Setting
  await prisma.locationSetting.create({
    data: {
      name: 'Kantor Utama',
      latitude: -6.200000,
      longitude: 106.816666,
      radius: 150,
      isActive: true,
    }
  });

  console.log('✅ Location setting created');

  // 4. Users
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const hashedPegawai = await bcrypt.hash('pegawai123', 10);

  await prisma.user.create({
    data: {
      employeeId: 'admin',
      name: 'Administrator',
      email: 'admin@asipp.com',
      password: hashedPassword,
      role: Role.ADMIN,
    }
  });

  const employees = [
    { employeeId: 'pegawai1', name: 'Alex Johnson', email: 'alex@asipp.com', deptId: deptIT.id },
    { employeeId: 'pegawai2', name: 'Budi Santoso', email: 'budi@asipp.com', deptId: deptHRD.id },
    { employeeId: 'pegawai3', name: 'Citra Dewi', email: 'citra@asipp.com', deptId: deptProduksi.id },
    { employeeId: 'pegawai4', name: 'Dani Pratama', email: 'dani@asipp.com', deptId: deptIT.id },
    { employeeId: 'pegawai5', name: 'Eka Suryani', email: 'eka@asipp.com', deptId: deptHRD.id },
  ];

  for (const emp of employees) {
    await prisma.user.create({
      data: {
        employeeId: emp.employeeId,
        name: emp.name,
        email: emp.email,
        password: hashedPegawai,
        role: Role.PEGAWAI,
        departmentId: emp.deptId,
      }
    });
  }

  console.log('✅ Users created (admin + 5 pegawai)');

  // 5. Sample Payroll
  const allUsers = await prisma.user.findMany({ where: { role: Role.PEGAWAI } });
  for (const user of allUsers) {
    // Payroll bulan lalu
    await prisma.payroll.create({
      data: {
        userId: user.id,
        month: 2,
        year: 2026,
        basicSalary: 5000000,
        allowance: 1500000,
        deduction: 250000,
        netSalary: 6250000,
        paidAt: new Date('2026-02-28'),
      }
    });
    // Payroll bulan ini
    await prisma.payroll.create({
      data: {
        userId: user.id,
        month: 3,
        year: 2026,
        basicSalary: 5000000,
        allowance: 1500000,
        deduction: 200000,
        netSalary: 6300000,
      }
    });
  }

  console.log('✅ Payroll data created');
  console.log('🎉 Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
