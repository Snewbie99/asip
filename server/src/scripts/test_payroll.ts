import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  const month = 2;
  const year = 2026;

  try {
    const config = await (prisma as any).payrollConfig.findUnique({ where: { id: 'default' } });
    const periodStartDay = config?.periodStartDay ?? 21;
    const wifeAllowancePercent = config?.wifeAllowancePercent ?? 10;
    const childAllowancePercent = config?.childAllowancePercent ?? 5;
    const maxChildren = config?.maxChildren ?? 2;

    const lateLowThreshold = config?.lateLowThreshold ?? 1;
    const lateHighThreshold = config?.lateHighThreshold ?? 5;
    const lateLowPenaltyPercent = config?.lateLowPenaltyPercent ?? 50;
    const lateLowPenaltySource = config?.lateLowPenaltySource ?? "workDiligence";
    const lateHighPenaltyPercent = config?.lateHighPenaltyPercent ?? 100;
    const lateHighPenaltySource = config?.lateHighPenaltySource ?? "workDiligence";

    const breakThreshold = config?.breakThreshold ?? 60;
    const breakLowPenaltyPercent = config?.breakLowPenaltyPercent ?? 0;
    const breakLowPenaltySource = config?.breakLowPenaltySource ?? "workDiligence";
    const breakHighPenaltyPercent = config?.breakHighPenaltyPercent ?? 100;
    const breakHighPenaltySource = config?.breakHighPenaltySource ?? "workDiligence";

    let startDate = new Date(year, month - 1, 1);
    let endDate = new Date(year, month, 0, 23, 59, 59);

    const employees = await prisma.user.findMany({
      where: { role: 'PEGAWAI', employeeId: { in: ['pegawai1', 'pegawai2'] } }
    });
    const rates = await (prisma as any).payrollRate.findMany();

    console.log(`Found ${employees.length} employees and ${rates.length} rates.`);

    const results = [];

    for (let emp of employees) {
      const anyEmp = emp as any;
      const rate = rates.find((r: any) => r.categoryName === anyEmp.employeeStatus);
      if (!rate) {
        console.log(`Skipping ${emp.employeeId} - no rate found for status ${anyEmp.employeeStatus}`);
        continue;
      }

      const attendance = await prisma.attendance.findMany({
        where: {
          userId: anyEmp.id,
          date: { gte: startDate, lte: endDate }
        },
        include: { breaklog: true }
      });

      console.log(`Found ${attendance.length} attendance for ${emp.employeeId}`);

      let daysPresent = 0;
      let totalBasicSalaryPenalty = 0;
      let totalEatingTransportPenalty = 0;
      let totalWorkDiligencePenalty = 0;

      for (const day of attendance) {
        if (day.clockInTime) {
          daysPresent++;
          const dailyPenalties = { basicSalary: 0, eatingTransport: 0, workDiligence: 0 };

          if (day.lateMinutes > lateHighThreshold) {
            const amount = (lateHighPenaltyPercent / 100) * (rate as any)[lateHighPenaltySource];
            (dailyPenalties as any)[lateHighPenaltySource] = Math.max((dailyPenalties as any)[lateHighPenaltySource] || 0, amount);
          } else if (day.lateMinutes > lateLowThreshold) {
            const amount = (lateLowPenaltyPercent / 100) * (rate as any)[lateLowPenaltySource];
            (dailyPenalties as any)[lateLowPenaltySource] = Math.max((dailyPenalties as any)[lateLowPenaltySource] || 0, amount);
          }

          const totalBreakMin = (day.breaklog || []).reduce((acc: number, b: any) => acc + (b.durationMin || 0), 0);
          if (totalBreakMin >= breakThreshold) {
            const amount = (breakHighPenaltyPercent / 100) * (rate as any)[breakHighPenaltySource];
            (dailyPenalties as any)[breakHighPenaltySource] = Math.max((dailyPenalties as any)[breakHighPenaltySource] || 0, amount);
          } else if (totalBreakMin > 0) {
            const amount = (breakLowPenaltyPercent / 100) * (rate as any)[breakLowPenaltySource];
            (dailyPenalties as any)[breakLowPenaltySource] = Math.max((dailyPenalties as any)[breakLowPenaltySource] || 0, amount);
          }

          totalBasicSalaryPenalty += dailyPenalties.basicSalary;
          totalEatingTransportPenalty += dailyPenalties.eatingTransport;
          totalWorkDiligencePenalty += dailyPenalties.workDiligence;
        }
      }

      const basicSalaryTotal = (daysPresent * rate.basicSalary) - totalBasicSalaryPenalty;
      const eatingTransportTotal = (daysPresent * rate.eatingTransport) - totalEatingTransportPenalty;
      const workDiligenceTotal = (daysPresent * rate.workDiligence) - totalWorkDiligencePenalty;
      const totalPenalty = totalBasicSalaryPenalty + totalEatingTransportPenalty + totalWorkDiligencePenalty;

      const familyAllowance = (anyEmp.hasSpouse ? wifeAllowancePercent / 100 : 0) * basicSalaryTotal +
                            (Math.min(anyEmp.childCount, maxChildren) * (childAllowancePercent / 100)) * basicSalaryTotal;
      const serviceAllowance = (anyEmp.serviceAllowancePercent / 100) * basicSalaryTotal;
      const positionAllowance = anyEmp.positionAllowance || 0;
      const totalAllowance = familyAllowance + serviceAllowance + positionAllowance + eatingTransportTotal;
      const netSalary = basicSalaryTotal + totalAllowance + workDiligenceTotal;

      console.log(`Upserting payroll for ${emp.employeeId}...`);
      const payroll = await (prisma.payroll as any).upsert({
        where: {
          userId_month_year: {
            userId: emp.id,
            month,
            year
          }
        },
        update: {
          basicSalary: basicSalaryTotal,
          allowance: totalAllowance,
          deduction: totalPenalty,
          netSalary: netSalary
        },
        create: {
          id: crypto.randomUUID(),
          userId: emp.id,
          month,
          year,
          basicSalary: basicSalaryTotal,
          allowance: totalAllowance,
          deduction: totalPenalty,
          netSalary: netSalary
        }
      });
      console.log(`Success for ${emp.employeeId}`);
    }
  } catch (err: any) {
    console.error('ERROR IN TEST:', err);
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
