import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import { authenticate, AuthRequest } from '../middleware/auth';
import { calculateDistance, getTodayDate, getTodayDayOfWeek, parseTimeToMinutes, getCurrentMinutes } from '../lib/utils';
import crypto from 'crypto';

const router = Router();
const prisma = new PrismaClient();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, path.join(__dirname, '../../uploads')),
  filename: (_req, file, cb) => cb(null, `break-${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// GET /api/attendance/status - status hari ini
router.get('/status', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const today = getTodayDate();
    const dayOfWeek = getTodayDayOfWeek();

    // Get attendance hari ini
    const attendance = await (prisma.attendance as any).findUnique({
      where: { userId_date: { userId, date: new Date(today) } },
      include: { breaklog: { orderBy: { createdAt: 'desc' } } }
    });

    // Get jadwal hari ini
    const activeSchedule = await (prisma.scheduleSet as any).findFirst({ where: { isActive: true } });
    let todaySchedule = null;
    if (activeSchedule && req.user!.departmentId) {
      todaySchedule = await (prisma.scheduleEntry as any).findUnique({
        where: {
          scheduleSetId_departmentId_dayOfWeek: {
            scheduleSetId: activeSchedule.id,
            departmentId: req.user!.departmentId,
            dayOfWeek: dayOfWeek,
          }
        }
      });
    }

    // Get recent activities
    const activities = await (prisma.activityLog as any).findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Determine current status
    let status = 'belum_masuk';
    if (attendance) {
      if (attendance.clockOutTime) {
        status = 'sudah_pulang';
      } else {
        const activeBreak = ((attendance as any).breaklog || []).find((b: any) => !b.breakEnd);
        if (activeBreak) {
          status = 'istirahat';
        } else {
          status = attendance.isFieldDuty ? 'dinas_luar' : 'sudah_masuk';
        }
      }
    }

    return res.json({
      status,
      attendance,
      schedule: todaySchedule,
      activities,
    });
  } catch (error) {
    console.error('Status error:', error);
    return res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// POST /api/attendance/clock-in
router.post('/clock-in', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { latitude, longitude } = req.body;
    const today = getTodayDate();

    // Check if already clocked in
    const existing = await (prisma.attendance as any).findUnique({
      where: { userId_date: { userId, date: new Date(today) } }
    });
    if (existing) {
      return res.status(400).json({ error: 'Anda sudah absen masuk hari ini' });
    }

    // Validate GPS
    if (latitude !== undefined && longitude !== undefined) {
      const locations = await (prisma.locationSetting as any).findMany({ where: { isActive: true } });
      if (locations.length > 0) {
        const isInRadius = locations.some((loc: any) => {
          const dist = calculateDistance(latitude, longitude, loc.latitude, loc.longitude);
          return dist <= loc.radius;
        });
        if (!isInRadius) {
          return res.status(400).json({ error: 'Anda berada di luar radius kantor' });
        }
      }
    }

    // Calculate late minutes
    let lateMinutes = 0;
    const activeSchedule = await (prisma.scheduleSet as any).findFirst({ where: { isActive: true } });
    if (activeSchedule && req.user!.departmentId) {
      const todaySchedule = await (prisma.scheduleEntry as any).findUnique({
        where: {
          scheduleSetId_departmentId_dayOfWeek: {
            scheduleSetId: activeSchedule.id,
            departmentId: req.user!.departmentId,
            dayOfWeek: getTodayDayOfWeek(),
          }
        }
      });
      if (todaySchedule) {
        const scheduleStart = parseTimeToMinutes(todaySchedule.startTime);
        const currentMin = getCurrentMinutes();
        if (currentMin > scheduleStart) {
          lateMinutes = currentMin - scheduleStart;
        }
      }
    }

    const now = new Date();
    const attendance = await (prisma.attendance as any).create({
      data: {
        id: crypto.randomUUID(),
        userId,
        date: new Date(today),
        clockInTime: now,
        clockInLat: latitude,
        clockInLng: longitude,
        lateMinutes,
        status: 'HADIR',
        updatedAt: new Date(),
      }
    });

    // Log activity
    await (prisma.activityLog as any).create({
      data: {
        id: crypto.randomUUID(),
        userId,
        type: 'clock_in',
        label: 'Absen Masuk',
        desc: lateMinutes > 0 ? `Terlambat ${lateMinutes} menit` : 'Tepat waktu',
      }
    });

    return res.json({ message: 'Berhasil absen masuk', attendance });
  } catch (error) {
    console.error('Clock in error:', error);
    return res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// POST /api/attendance/dinas-masuk
router.post('/dinas-masuk', authenticate, upload.single('photo'), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { desc } = req.body;
    const today = getTodayDate();

    // Check if already clocked in
    const existing = await (prisma.attendance as any).findUnique({
      where: { userId_date: { userId, date: new Date(today) } }
    });
    if (existing) {
      return res.status(400).json({ error: 'Anda sudah absen masuk hari ini' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Foto bukti dinas luar wajib dilampirkan' });
    }
    const photoUrl = `/uploads/${req.file.filename}`;

    const now = new Date();
    const attendance = await (prisma.attendance as any).create({
      data: {
        id: crypto.randomUUID(),
        userId,
        date: new Date(today),
        clockInTime: now,
        isFieldDuty: true,
        clockInPhoto: photoUrl,
        status: 'HADIR',
        updatedAt: new Date(),
      }
    });

    await (prisma.activityLog as any).create({
      data: {
        id: crypto.randomUUID(),
        userId,
        type: 'dinas_masuk',
        label: 'Dinas Luar (Masuk)',
        desc: desc || 'Di luar kota / lapangan',
      }
    });

    return res.json({ message: 'Berhasil absen dinas masuk', attendance });
  } catch (error) {
    console.error('Dinas masuk error:', error);
    return res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// POST /api/attendance/clock-out
router.post('/clock-out', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { latitude, longitude } = req.body;
    const today = getTodayDate();

    const attendance = await (prisma.attendance as any).findUnique({
      where: { userId_date: { userId, date: new Date(today) } }
    });
    if (!attendance) {
      return res.status(400).json({ error: 'Anda belum absen masuk hari ini' });
    }
    if (attendance.clockOutTime) {
      return res.status(400).json({ error: 'Anda sudah absen pulang hari ini' });
    }

    // Validate GPS
    if (latitude !== undefined && longitude !== undefined) {
      const locations = await (prisma.locationSetting as any).findMany({ where: { isActive: true } });
      if (locations.length > 0) {
        const isInRadius = locations.some((loc: any) => {
          const dist = calculateDistance(latitude, longitude, loc.latitude, loc.longitude);
          return dist <= loc.radius;
        });
        if (!isInRadius) {
          return res.status(400).json({ error: 'Anda berada di luar radius kantor' });
        }
      }
    }

    // Calculate early leave
    let earlyLeaveMin = 0;
    const activeSchedule = await (prisma.scheduleSet as any).findFirst({ where: { isActive: true } });
    if (activeSchedule && req.user!.departmentId) {
      const todaySchedule = await (prisma.scheduleEntry as any).findUnique({
        where: {
          scheduleSetId_departmentId_dayOfWeek: {
            scheduleSetId: activeSchedule.id,
            departmentId: req.user!.departmentId,
            dayOfWeek: getTodayDayOfWeek(),
          }
        }
      });
      if (todaySchedule) {
        const scheduleEnd = parseTimeToMinutes(todaySchedule.endTime);
        const currentMin = getCurrentMinutes();
        if (currentMin < scheduleEnd) {
          earlyLeaveMin = scheduleEnd - currentMin;
        }
      }
    }

    const now = new Date();
    const updated = await (prisma.attendance as any).update({
      where: { id: attendance.id },
      data: {
        clockOutTime: now,
        clockOutLat: latitude,
        clockOutLng: longitude,
        earlyLeaveMin,
        updatedAt: new Date(),
      }
    });

    await (prisma.activityLog as any).create({
      data: {
        id: crypto.randomUUID(),
        userId,
        type: 'clock_out',
        label: 'Absen Pulang',
        desc: earlyLeaveMin > 0 ? `Pulang cepat ${earlyLeaveMin} menit` : 'Sesuai jadwal',
      }
    });

    return res.json({ message: 'Berhasil absen pulang', attendance: updated });
  } catch (error) {
    console.error('Clock out error:', error);
    return res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// POST /api/attendance/dinas-pulang
router.post('/dinas-pulang', authenticate, upload.single('photo'), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { desc } = req.body;
    const today = getTodayDate();

    const attendance = await (prisma.attendance as any).findUnique({
      where: { userId_date: { userId, date: new Date(today) } }
    });
    if (!attendance) {
      return res.status(400).json({ error: 'Anda belum absen masuk hari ini' });
    }
    if (attendance.clockOutTime) {
      return res.status(400).json({ error: 'Anda sudah absen pulang hari ini' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Foto bukti dinas luar wajib dilampirkan' });
    }
    const photoUrl = `/uploads/${req.file.filename}`;

    const now = new Date();
    const updated = await (prisma.attendance as any).update({
      where: { id: attendance.id },
      data: {
        clockOutTime: now,
        clockOutPhoto: photoUrl,
        updatedAt: new Date(),
      }
    });

    await (prisma.activityLog as any).create({
      data: {
        id: crypto.randomUUID(),
        userId,
        type: 'dinas_pulang',
        label: 'Dinas Luar (Pulang)',
        desc: desc || 'Selesai tugas lapangan',
      }
    });

    return res.json({ message: 'Berhasil absen dinas pulang', attendance: updated });
  } catch (error) {
    console.error('Dinas pulang error:', error);
    return res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// POST /api/attendance/break - mulai istirahat
router.post('/break', authenticate, upload.single('photo'), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const today = getTodayDate();

    const attendance = await (prisma.attendance as any).findUnique({
      where: { userId_date: { userId, date: new Date(today) } },
      include: { breaklog: true }
    });
    if (!attendance) {
      return res.status(400).json({ error: 'Anda belum absen masuk hari ini' });
    }
    if (attendance.clockOutTime) {
      return res.status(400).json({ error: 'Anda sudah absen pulang' });
    }

    // Check if already on break
    const activeBreak = (attendance.breaklog || []).find((b: any) => !b.breakEnd);
    if (activeBreak) {
      return res.status(400).json({ error: 'Anda masih dalam istirahat' });
    }

    const photoUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const breakLog = await (prisma.breakLog as any).create({
      data: {
        id: crypto.randomUUID(),
        attendanceId: attendance.id,
        userId,
        breakStart: new Date(),
        photoUrl,
      }
    });

    await (prisma.activityLog as any).create({
      data: {
        id: crypto.randomUUID(),
        userId,
        type: 'break_start',
        label: 'Mulai Istirahat',
        desc: photoUrl ? 'Dengan foto ijin' : null,
      }
    });

    return res.json({ message: 'Istirahat dimulai', breakLog });
  } catch (error) {
    console.error('Break error:', error);
    return res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// POST /api/attendance/return - kembali dari istirahat
router.post('/return', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const today = getTodayDate();

    const attendance = await (prisma.attendance as any).findUnique({
      where: { userId_date: { userId, date: new Date(today) } },
      include: { breaklog: true }
    });
    if (!attendance) {
      return res.status(400).json({ error: 'Anda belum absen masuk hari ini' });
    }

    const activeBreak = (attendance.breaklog || []).find((b: any) => !b.breakEnd);
    if (!activeBreak) {
      return res.status(400).json({ error: 'Anda tidak sedang istirahat' });
    }

    const now = new Date();
    const durationMin = Math.round((now.getTime() - activeBreak.breakStart.getTime()) / 60000);

    const updated = await (prisma.breakLog as any).update({
      where: { id: activeBreak.id },
      data: {
        breakEnd: now,
        durationMin,
      }
    });

    await (prisma.activityLog as any).create({
      data: {
        id: crypto.randomUUID(),
        userId,
        type: 'break_end',
        label: 'Kembali dari Istirahat',
        desc: `Durasi: ${durationMin} menit`,
      }
    });

    return res.json({ message: 'Selamat datang kembali', breakLog: updated });
  } catch (error) {
    console.error('Return error:', error);
    return res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

export default router;
