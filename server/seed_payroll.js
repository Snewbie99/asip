const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const prisma = new PrismaClient();

async function seed() {
  const rates = [
    // Pegawai
    { categoryName: 'Kepala Sekolah', basicSalary: 116500, eatingTransport: 45500, workDiligence: 34000, type: 'PEGAWAI' },
    { categoryName: 'Pegawai Tetap Yayasan(PTY)', basicSalary: 115500, eatingTransport: 40000, workDiligence: 34000, type: 'PEGAWAI' },
    { categoryName: 'Pegawai Tetap(pt)', basicSalary: 105000, eatingTransport: 35000, workDiligence: 34000, type: 'PEGAWAI' },
    { categoryName: 'Pegawai Tidak Tetap(PTT)', basicSalary: 97500, eatingTransport: 33500, workDiligence: 34000, type: 'PEGAWAI' },
    { categoryName: 'PTT magang', basicSalary: 48750, eatingTransport: 16750, workDiligence: 17000, type: 'PEGAWAI' },
    
    // Karyawan
    { categoryName: 'Kepala Tata Usaha', basicSalary: 0, eatingTransport: 40000, workDiligence: 34000, type: 'KARYAWAN' },
    { categoryName: 'Karyawan Tetap Yayasan(KTY)', basicSalary: 110000, eatingTransport: 37000, workDiligence: 34000, type: 'KARYAWAN' },
    { categoryName: 'Karyawan Tetap(KT)', basicSalary: 104000, eatingTransport: 34500, workDiligence: 34000, type: 'KARYAWAN' },
    { categoryName: 'Karyawan Tidak Tetap(KTT)', basicSalary: 92500, eatingTransport: 32000, workDiligence: 34000, type: 'KARYAWAN' },
    { categoryName: 'KTT magang', basicSalary: 46250, eatingTransport: 16000, workDiligence: 17000, type: 'KARYAWAN' },
    { categoryName: 'kontrak', basicSalary: 86500, eatingTransport: 0, workDiligence: 0, type: 'KARYAWAN' },
  ];

  for (const r of rates) {
    await prisma.payrollrate.upsert({
      where: { categoryName: r.categoryName },
      update: r,
      create: { id: crypto.randomUUID(), ...r }
    });
  }
  
  await prisma.payrollconfig.upsert({
    where: { id: 'default' },
    update: {},
    create: { id: 'default', periodStartDay: 21 }
  });

  console.log('Seeding payroll rates complete');
}

seed().catch(e => console.error(e)).finally(() => prisma.$disconnect());
