import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import { authenticate, AuthRequest } from '../middleware/auth';
import crypto from 'crypto';

const router = Router();
const prisma = new PrismaClient();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, path.join(__dirname, '../../uploads')),
  filename: (_req, file, cb) => cb(null, `leave-${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// POST /api/leaves - submit izin
router.post('/', authenticate, upload.single('photo'), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { type, startDate, endDate, reason } = req.body;

    if (!type || !startDate) {
      return res.status(400).json({ error: 'Jenis izin dan tanggal wajib diisi' });
    }

    const photoUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const leave = await (prisma as any).leaveRequest.create({
      data: {
        id: crypto.randomUUID(),
        userId,
        type,
        startDate: new Date(startDate),
        endDate: new Date(endDate || startDate),
        reason,
        photoUrl,
        updatedAt: new Date(),
      }
    });

    await (prisma as any).activityLog.create({
      data: {
        id: crypto.randomUUID(),
        userId,
        type: 'leave_request',
        label: 'Pengajuan Izin',
        desc: `${type} - ${reason || 'Tanpa keterangan'}`,
      }
    });

    return res.json({ message: 'Izin berhasil diajukan', leave });
  } catch (error) {
    console.error('Leave error:', error);
    return res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// GET /api/leaves - list izin
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const where = req.user!.role === 'ADMIN' ? {} : { userId: req.user!.id };
    const leaves = await (prisma as any).leaveRequest.findMany({
      where,
      include: { user: { select: { name: true, employeeId: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(leaves);
  } catch (error: any) {
    console.error('GET /api/leaves Error:', error.message, error.stack);
    return res.status(500).json({ error: 'Terjadi kesalahan server', details: error.message });
  }
});

// PUT /api/leaves/:id/approve
router.put('/:id/approve', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Hanya admin' });
    }
    const leave = await (prisma as any).leaveRequest.update({
      where: { id: req.params.id as string },
      data: { 
        status: 'APPROVED',
        updatedAt: new Date()
      }
    });

    // Update attendance untuk tanggal izin
    const start = new Date(leave.startDate);
    const end = new Date(leave.endDate);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      await (prisma.attendance as any).upsert({
        where: { userId_date: { userId: leave.userId, date: new Date(dateStr) } },
        update: { 
          status: leave.type === 'SAKIT' ? 'SAKIT' : leave.type === 'CUTI' ? 'CUTI' : 'IZIN',
          updatedAt: new Date()
        },
        create: {
          id: crypto.randomUUID(),
          userId: leave.userId,
          date: new Date(dateStr),
          status: leave.type === 'SAKIT' ? 'SAKIT' : leave.type === 'CUTI' ? 'CUTI' : 'IZIN',
          updatedAt: new Date(),
        }
      });
    }

    return res.json({ message: 'Izin disetujui', leave });
  } catch (error) {
    return res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// PUT /api/leaves/:id/reject
router.put('/:id/reject', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Hanya admin' });
    }
    const leave = await (prisma as any).leaveRequest.update({
      where: { id: req.params.id as string },
      data: { 
        status: 'REJECTED',
        updatedAt: new Date()
      }
    });
    return res.json({ message: 'Izin ditolak', leave });
  } catch (error) {
    return res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

export default router;
