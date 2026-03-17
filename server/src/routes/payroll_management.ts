import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest, requireAdmin } from '../middleware/auth';
import crypto from 'crypto';

const router = Router();
const prisma = new PrismaClient();

// GET /api/payroll/rates
router.get('/rates', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const rates = await (prisma as any).payrollRate.findMany({
      orderBy: { categoryName: 'asc' }
    });
    return res.json(rates);
  } catch (error) {
    return res.status(500).json({ error: 'Gagal mengambil data rate' });
  }
});

// POST /api/payroll/rates
router.post('/rates', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { categoryName, basicSalary, eatingTransport, workDiligence, type } = req.body;
    const rate = await (prisma as any).payrollRate.create({
      data: {
        id: crypto.randomUUID(),
        categoryName,
        basicSalary: parseFloat(basicSalary),
        eatingTransport: parseFloat(eatingTransport),
        workDiligence: parseFloat(workDiligence),
        type
      }
    });
    return res.json(rate);
  } catch (error) {
    return res.status(500).json({ error: 'Gagal menambah data rate' });
  }
});

// PUT /api/payroll/rates/:id
router.put('/rates/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { categoryName, basicSalary, eatingTransport, workDiligence, type } = req.body;
    const rate = await (prisma as any).payrollRate.update({
      where: { id: req.params.id },
      data: {
        categoryName,
        basicSalary: parseFloat(basicSalary),
        eatingTransport: parseFloat(eatingTransport),
        workDiligence: parseFloat(workDiligence),
        type
      }
    });
    return res.json(rate);
  } catch (error) {
    return res.status(500).json({ error: 'Gagal mempebarui data rate' });
  }
});

// DELETE /api/payroll/rates/:id
router.delete('/rates/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await (prisma as any).payrollRate.delete({
      where: { id: req.params.id }
    });
    return res.json({ message: 'Berhasil dihapus' });
  } catch (error) {
    return res.status(500).json({ error: 'Gagal menghapus data rate' });
  }
});

// CONFIG ROUTES
// GET /api/payroll/config
router.get('/config', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    let config = await (prisma as any).payrollConfig.findUnique({
      where: { id: 'default' }
    });
    if (!config) {
      config = await (prisma as any).payrollConfig.create({
        data: {
          id: 'default',
          periodStartDay: 21,
          wifeAllowancePercent: 10,
          childAllowancePercent: 5,
          maxChildren: 2,
          lateLowThreshold: 1,
          lateHighThreshold: 5,
          lateLowPenaltyPercent: 50,
          lateLowPenaltySource: "workDiligence",
          lateHighPenaltyPercent: 100,
          lateHighPenaltySource: "workDiligence",
          breakThreshold: 60,
          breakLowPenaltyPercent: 0,
          breakLowPenaltySource: "workDiligence",
          breakHighPenaltyPercent: 100,
          breakHighPenaltySource: "workDiligence"
        }
      });
    }
    return res.json(config);
  } catch (error) {
    return res.status(500).json({ error: 'Gagal mengambil konfigurasi' });
  }
});

// POST /api/payroll/config
router.post('/config', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { 
      periodStartDay, wifeAllowancePercent, childAllowancePercent, maxChildren,
      lateLowThreshold, lateHighThreshold, lateLowPenaltyPercent, lateLowPenaltySource,
      lateHighPenaltyPercent, lateHighPenaltySource,
      breakThreshold, breakLowPenaltyPercent, breakLowPenaltySource,
      breakHighPenaltyPercent, breakHighPenaltySource
    } = req.body;

    const config = await (prisma as any).payrollConfig.upsert({
      where: { id: 'default' },
      update: {
        periodStartDay: parseInt(periodStartDay),
        wifeAllowancePercent: parseFloat(wifeAllowancePercent) || 10,
        childAllowancePercent: parseFloat(childAllowancePercent) || 5,
        maxChildren: parseInt(maxChildren) || 2,
        lateLowThreshold: parseInt(lateLowThreshold) || 1,
        lateHighThreshold: parseInt(lateHighThreshold) || 5,
        lateLowPenaltyPercent: parseFloat(lateLowPenaltyPercent) || 0,
        lateLowPenaltySource: lateLowPenaltySource || "workDiligence",
        lateHighPenaltyPercent: parseFloat(lateHighPenaltyPercent) || 0,
        lateHighPenaltySource: lateHighPenaltySource || "workDiligence",
        breakThreshold: parseInt(breakThreshold) || 60,
        breakLowPenaltyPercent: parseFloat(breakLowPenaltyPercent) || 0,
        breakLowPenaltySource: breakLowPenaltySource || "workDiligence",
        breakHighPenaltyPercent: parseFloat(breakHighPenaltyPercent) || 0,
        breakHighPenaltySource: breakHighPenaltySource || "workDiligence",
      },
      create: {
        id: 'default',
        periodStartDay: parseInt(periodStartDay),
        wifeAllowancePercent: parseFloat(wifeAllowancePercent) || 10,
        childAllowancePercent: parseFloat(childAllowancePercent) || 5,
        maxChildren: parseInt(maxChildren) || 2,
        lateLowThreshold: parseInt(lateLowThreshold) || 1,
        lateHighThreshold: parseInt(lateHighThreshold) || 5,
        lateLowPenaltyPercent: parseFloat(lateLowPenaltyPercent) || 0,
        lateLowPenaltySource: lateLowPenaltySource || "workDiligence",
        lateHighPenaltyPercent: parseFloat(lateHighPenaltyPercent) || 0,
        lateHighPenaltySource: lateHighPenaltySource || "workDiligence",
        breakThreshold: parseInt(breakThreshold) || 60,
        breakLowPenaltyPercent: parseFloat(breakLowPenaltyPercent) || 0,
        breakLowPenaltySource: breakLowPenaltySource || "workDiligence",
        breakHighPenaltyPercent: parseFloat(breakHighPenaltyPercent) || 0,
        breakHighPenaltySource: breakHighPenaltySource || "workDiligence",
      }
    });
    return res.json(config);
  } catch (error) {
    return res.status(500).json({ error: 'Gagal menyimpan konfigurasi' });
  }
});

export default router;
