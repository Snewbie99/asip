import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest, requireAdmin } from '../middleware/auth';
import crypto from 'crypto';

const router = Router();
const prisma = new PrismaClient();

// GET /api/payroll/admin/ping
router.get('/admin/ping', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  return res.json({ message: 'Payroll Admin API is reachable', user: req.user });
});

// GET /api/payroll/admin/list
router.get('/admin/list', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { month, year } = req.query;
    if (!month || !year) return res.status(400).json({ error: 'Bulan dan tahun wajib diisi' });

    const payrolls = await (prisma.payroll as any).findMany({
      where: {
        month: parseInt(month as string),
        year: parseInt(year as string)
      },
      include: {
        user: {
          select: { name: true, employeeId: true, joinDate: true }
        }
      },
      orderBy: { user: { name: 'asc' } }
    });
    return res.json(payrolls);
  } catch (error) {
    return res.status(500).json({ error: 'Gagal mengambil data payroll' });
  }
});

// GET /api/payroll/current
router.get('/current', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const now = new Date();
    const payroll = await (prisma.payroll as any).findUnique({
      where: {
        userId_month_year: {
          userId: req.user!.id,
          month: now.getMonth() + 1,
          year: now.getFullYear(),
        }
      },
      include: {
        user: { select: { name: true, employeeId: true, joinDate: true, department: { select: { name: true } } } }
      }
    });
    return res.json(payroll);
  } catch (error) {
    return res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// GET /api/payroll/history
router.get('/history', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const payrolls = await (prisma.payroll as any).findMany({
      where: { userId: req.user!.id },
      include: {
        user: { select: { name: true, employeeId: true, joinDate: true, department: { select: { name: true } } } }
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
    return res.json(payrolls);
  } catch (error) {
    return res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// POST /api/payroll/generate
router.post('/generate', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { month, year } = req.body;
    if (!month || !year) return res.status(400).json({ error: 'Bulan dan tahun wajib diisi' });

    // 1. Get Config
    const config = await (prisma as any).payrollConfig.findUnique({ where: { id: 'default' } });
    const periodStartDay        = config?.periodStartDay        ?? 21;
    const wifeAllowancePercent  = config?.wifeAllowancePercent  ?? 10;
    const childAllowancePercent = config?.childAllowancePercent ?? 5;
    const maxChildren           = config?.maxChildren           ?? 2;
    
    // Advanced Deductions
    const lateLowThreshold        = config?.lateLowThreshold        ?? 1;
    const lateHighThreshold       = config?.lateHighThreshold       ?? 5;
    const lateLowPenaltyPercent   = config?.lateLowPenaltyPercent   ?? 50;
    const lateLowPenaltySource    = config?.lateLowPenaltySource    ?? "workDiligence";
    const lateHighPenaltyPercent  = config?.lateHighPenaltyPercent  ?? 100;
    const lateHighPenaltySource   = config?.lateHighPenaltySource   ?? "workDiligence";
    
    const breakThreshold          = config?.breakThreshold          ?? 60;
    const breakLowPenaltyPercent  = config?.breakLowPenaltyPercent  ?? 0;
    const breakLowPenaltySource   = config?.breakLowPenaltySource   ?? "workDiligence";
    const breakHighPenaltyPercent = config?.breakHighPenaltyPercent ?? 100;
    const breakHighPenaltySource  = config?.breakHighPenaltySource  ?? "workDiligence";

    // 2. Determine Date Range
    let startDate: Date;
    let endDate: Date;

    if (periodStartDay === 21) {
      // If month is 3 (March) 2026, period is 21 Feb 2026 - 20 Mar 2026
      startDate = new Date(year, month - 2, 21);
      endDate = new Date(year, month - 1, 20, 23, 59, 59);
    } else {
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0, 23, 59, 59);
    }

    // 3. Fetch Employees & Rates
    const employees = await prisma.user.findMany({
      where: { role: 'PEGAWAI' }
    });
    const rates = await (prisma as any).payrollRate.findMany();

    const results = [];

    for (let emp of employees) {
      const anyEmp = emp as any;
      const rate = rates.find((r: any) => r.categoryName === anyEmp.employeeStatus);
      if (!rate) continue;

      // 4. Fetch Attendance in range
      const attendance = await prisma.attendance.findMany({
        where: {
          userId: anyEmp.id,
          date: { gte: startDate, lte: endDate }
        },
        include: { breaklog: true }
      });

      let daysPresent = 0;
      let totalBasicSalaryPenalty = 0;
      let totalEatingTransportPenalty = 0;
      let totalWorkDiligencePenalty = 0;

      for (const day of attendance) {
        // Only count if they clocked in (Hadir)
        if (day.clockInTime) {
          daysPresent++;

          const dailyPenalties = {
            basicSalary: 0,
            eatingTransport: 0,
            workDiligence: 0
          };

          // Late Penalty
          if (day.lateMinutes > lateHighThreshold) {
            const amount = (lateHighPenaltyPercent / 100) * (rate as any)[lateHighPenaltySource];
            dailyPenalties[lateHighPenaltySource as keyof typeof dailyPenalties] = Math.max(dailyPenalties[lateHighPenaltySource as keyof typeof dailyPenalties], amount);
          } else if (day.lateMinutes > lateLowThreshold) {
            const amount = (lateLowPenaltyPercent / 100) * (rate as any)[lateLowPenaltySource];
            dailyPenalties[lateLowPenaltySource as keyof typeof dailyPenalties] = Math.max(dailyPenalties[lateLowPenaltySource as keyof typeof dailyPenalties], amount);
          }

          // Break Penalty
          const totalBreakMin = ((day as any).breaklog || []).reduce((acc: number, b: any) => acc + (b.durationMin || 0), 0);
          if (totalBreakMin >= breakThreshold) {
            const amount = (breakHighPenaltyPercent / 100) * (rate as any)[breakHighPenaltySource];
            dailyPenalties[breakHighPenaltySource as keyof typeof dailyPenalties] = Math.max(dailyPenalties[breakHighPenaltySource as keyof typeof dailyPenalties], amount);
          } else if (totalBreakMin > 0) {
            const amount = (breakLowPenaltyPercent / 100) * (rate as any)[breakLowPenaltySource];
            dailyPenalties[breakLowPenaltySource as keyof typeof dailyPenalties] = Math.max(dailyPenalties[breakLowPenaltySource as keyof typeof dailyPenalties], amount);
          }

          totalBasicSalaryPenalty += dailyPenalties.basicSalary;
          totalEatingTransportPenalty += dailyPenalties.eatingTransport;
          totalWorkDiligencePenalty += dailyPenalties.workDiligence;
        }
      }

      // 5. Calculations
      const basicSalaryTotal = ((anyEmp.salaryIndex || 1) * rate.basicSalary) - totalBasicSalaryPenalty;
      const eatingTransportTotal = (daysPresent * rate.eatingTransport) - totalEatingTransportPenalty;
      const workDiligenceTotal = (daysPresent * rate.workDiligence) - totalWorkDiligencePenalty;
      
      const totalPenalty = totalBasicSalaryPenalty + totalEatingTransportPenalty + totalWorkDiligencePenalty;

      const familyAllowance = (anyEmp.hasSpouse ? wifeAllowancePercent / 100 : 0) * basicSalaryTotal +
                            (Math.min(anyEmp.childCount, maxChildren) * (childAllowancePercent / 100)) * basicSalaryTotal;
      const serviceAllowance = (anyEmp.serviceAllowancePercent / 100) * basicSalaryTotal;
      const positionAllowance = anyEmp.positionAllowance || 0;
      const extraAllowance = anyEmp.extraAllowance || 0;
      const attendanceAllowance = eatingTransportTotal + workDiligenceTotal;

      const totalAllowance = familyAllowance + serviceAllowance + positionAllowance + extraAllowance;
      const netSalary = basicSalaryTotal + totalAllowance + attendanceAllowance;

      const details = {
        breakdown: {
          basicSalary: ((anyEmp.salaryIndex || 1) * rate.basicSalary),
          basicSalaryPenalty: totalBasicSalaryPenalty,
          familyAllowance,
          serviceAllowance,
          positionAllowance,
          extraAllowance,
          eatingTransport: eatingTransportTotal,
          workDiligence: workDiligenceTotal,
          totalPenalty
        }
      };

      // 6. Save Payroll
      const id = crypto.randomUUID();
      const payroll = await (prisma.payroll as any).upsert({
        where: {
          userId_month_year: {
            userId: emp.id,
            month: parseInt(month),
            year: parseInt(year)
          }
        },
        update: {
          basicSalary: basicSalaryTotal,
          allowance: totalAllowance,
          attendanceAllowance: attendanceAllowance,
          deduction: totalPenalty,
          netSalary: netSalary,
          details: details
        } as any,
        create: {
          id,
          userId: emp.id,
          month: parseInt(month),
          year: parseInt(year),
          basicSalary: basicSalaryTotal,
          allowance: totalAllowance,
          attendanceAllowance: attendanceAllowance,
          deduction: totalPenalty,
          netSalary: netSalary,
          details: details
        }
      });

      results.push({
        employeeId: emp.employeeId,
        name: emp.name,
        daysPresent,
        netSalary
      });
    }

    return res.json({ message: `Berhasil generate payroll untuk ${results.length} karyawan`, results });
  } catch (error: any) {
    console.error('GENERATE ERROR:', error);
    return res.status(500).json({ error: error.message || 'Gagal generate payroll' });
  }
});

// PATCH /api/payroll/admin/process-pay/:id
router.patch('/admin/process-pay/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    console.log(`PAYMENT REQUEST FOR ID: ${id}`);
    
    const payroll = await prisma.payroll.update({
      where: { id },
      data: { paidAt: new Date() }
    });
    
    console.log(`PAYMENT SUCCESS FOR ID: ${id}`);
    return res.json(payroll);
  } catch (error: any) {
    console.error('PAYMENT ERROR:', error);
    if (error.code === 'P2025') {
       return res.status(404).json({ error: 'Data payroll tidak ditemukan di database' });
    }
    return res.status(500).json({ error: 'Gagal memproses pembayaran: ' + error.message });
  }
});

export default router;
