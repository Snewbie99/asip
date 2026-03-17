import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest, requireAdmin } from '../middleware/auth';
import crypto from 'crypto';

const router = Router();
const prisma = new PrismaClient();

// GET /api/locations
router.get('/', authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    const locations = await (prisma.locationSetting as any).findMany({
      orderBy: { createdAt: 'asc' },
    });
    return res.json(locations);
  } catch (error) {
    return res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// POST /api/locations
router.post('/', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { name, latitude, longitude, radius } = req.body;
    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'Koordinat wajib diisi' });
    }

    const location = await (prisma.locationSetting as any).create({
      data: { 
        id: crypto.randomUUID(),
        name: name || 'Lokasi Baru', 
        latitude, 
        longitude, 
        radius: radius || 150 
      }
    });
    return res.json({ message: 'Lokasi berhasil ditambahkan', location });
  } catch (error) {
    return res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// PUT /api/locations/:id
router.put('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { name, latitude, longitude, radius } = req.body;
    const location = await (prisma.locationSetting as any).update({
      where: { id: req.params.id as string },
      data: { name, latitude, longitude, radius },
    });
    return res.json({ message: 'Lokasi berhasil diperbarui', location });
  } catch (error) {
    return res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// PUT /api/locations/:id/toggle
router.put('/:id/toggle', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const loc = await (prisma.locationSetting as any).findUnique({ where: { id: req.params.id as string } });
    if (!loc) return res.status(404).json({ error: 'Lokasi tidak ditemukan' });

    const updated = await (prisma.locationSetting as any).update({
      where: { id: req.params.id as string },
      data: { isActive: !loc.isActive },
    });
    return res.json({ message: `Lokasi ${updated.isActive ? 'diaktifkan' : 'dinonaktifkan'}`, location: updated });
  } catch (error) {
    return res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// DELETE /api/locations/:id
router.delete('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await (prisma.locationSetting as any).delete({ where: { id: req.params.id as string } });
    return res.json({ message: 'Lokasi berhasil dihapus' });
  } catch (error) {
    return res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

export default router;
