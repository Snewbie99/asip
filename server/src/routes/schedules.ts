import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest, requireAdmin } from '../middleware/auth';
import crypto from 'crypto';

const router = Router();
const prisma = new PrismaClient();

// GET /api/schedules
router.get('/', authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    const schedules = await (prisma.scheduleSet as any).findMany({
      include: {
        scheduleentry: {
          include: { department: true },
          orderBy: [{ departmentId: 'asc' }, { dayOfWeek: 'asc' }],
        }
      },
      orderBy: { createdAt: 'asc' },
    });

    const mappedSchedules = schedules.map((s: any) => ({
      ...s,
      entries: s.scheduleentry || []
    }));
    return res.json(mappedSchedules);
  } catch (error) {
    return res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// POST /api/schedules
router.post('/', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Nama jadwal wajib diisi' });

    const schedule = await (prisma.scheduleSet as any).create({ 
      data: { 
        id: crypto.randomUUID(),
        name 
      } 
    });
    return res.json({ message: 'Jadwal berhasil dibuat', schedule });
  } catch (error) {
    return res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// POST /api/schedules/:id/entries - add/update entries
router.post('/:id/entries', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { entries } = req.body; // Array of { departmentId, dayOfWeek, startTime, endTime, breakStart?, breakEnd? }

    if (!entries || !Array.isArray(entries)) {
      return res.status(400).json({ error: 'Data jadwal tidak valid' });
    }

    const results = [];
    for (const entry of entries) {
      const result = await (prisma.scheduleEntry as any).upsert({
        where: {
          scheduleSetId_departmentId_dayOfWeek: {
            scheduleSetId: req.params.id as string,
            departmentId: entry.departmentId,
            dayOfWeek: entry.dayOfWeek,
          }
        },
        update: {
          startTime: entry.startTime,
          endTime: entry.endTime,
          breakStart: entry.breakStart || null,
          breakEnd: entry.breakEnd || null,
        },
        create: {
          id: crypto.randomUUID(),
          scheduleSetId: req.params.id as string,
          departmentId: entry.departmentId,
          dayOfWeek: entry.dayOfWeek,
          startTime: entry.startTime,
          endTime: entry.endTime,
          breakStart: entry.breakStart || null,
          breakEnd: entry.breakEnd || null,
        }
      });
      results.push(result);
    }

    return res.json({ message: 'Jadwal berhasil disimpan', entries: results });
  } catch (error: any) {
    console.error('Schedule upsert error:', error);
    return res.status(500).json({ error: error?.message || 'Terjadi kesalahan server' });
  }
});

// PUT /api/schedules/:id/activate
router.put('/:id/activate', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    // Deactivate all
    await (prisma.scheduleSet as any).updateMany({ data: { isActive: false } });
    // Activate the selected one
    const schedule = await (prisma.scheduleSet as any).update({
      where: { id: req.params.id as string },
      data: { isActive: true }
    });
    return res.json({ message: 'Jadwal diaktifkan', schedule });
  } catch (error) {
    return res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// DELETE /api/schedules/:id
router.delete('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await (prisma.scheduleSet as any).delete({ where: { id: req.params.id as string } });
    return res.json({ message: 'Jadwal berhasil dihapus' });
  } catch (error) {
    return res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

export default router;
