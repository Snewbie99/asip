import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'path';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, path.join(__dirname, '../../uploads')),
  filename: (_req, file, cb) => cb(null, `profile-${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// GET /api/profile
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { department: true },
    });
    if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });

    return res.json({
      id: user.id,
      employeeId: user.employeeId,
      name: user.name,
      email: user.email,
      photoUrl: user.photoUrl,
      role: user.role,
      departmentName: user.department?.name || null,
      createdAt: user.createdAt,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// PUT /api/profile
router.put('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { name, email } = req.body;
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: { name, email },
    });
    return res.json({ message: 'Profil berhasil diperbarui', user });
  } catch (error) {
    return res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// PUT /api/profile/photo
router.put('/photo', authenticate, upload.single('photo'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'File foto wajib diunggah' });
    const photoUrl = `/uploads/${req.file.filename}`;
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: { photoUrl },
    });
    return res.json({ message: 'Foto profil berhasil diperbarui', photoUrl: user.photoUrl });
  } catch (error) {
    return res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// PUT /api/profile/password
router.put('/password', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Password lama dan baru wajib diisi' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return res.status(400).json({ error: 'Password lama salah' });

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { password: hashed },
    });

    return res.json({ message: 'Password berhasil diubah' });
  } catch (error) {
    return res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

export default router;
