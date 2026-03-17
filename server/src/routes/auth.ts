import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { employeeId, password } = req.body;

    if (!employeeId || !password) {
      return res.status(400).json({ error: 'ID Karyawan dan password wajib diisi' });
    }

    const user = await prisma.user.findUnique({
      where: { employeeId },
      include: { department: true }
    });

    if (!user) {
      return res.status(401).json({ error: 'ID Karyawan atau password salah' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'ID Karyawan atau password salah' });
    }

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        employeeId: user.employeeId,
        name: user.name,
        email: user.email,
        photoUrl: user.photoUrl,
        role: user.role,
        departmentName: user.department?.name || null,
        joinDate: (user as any).joinDate || null,
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { department: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User tidak ditemukan' });
    }

    return res.json({
      id: user.id,
      employeeId: user.employeeId,
      name: user.name,
      email: user.email,
      photoUrl: user.photoUrl,
      role: user.role,
      departmentName: user.department?.name || null,
      joinDate: (user as any).joinDate || null,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

export default router;
