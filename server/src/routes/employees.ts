import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { authenticate, AuthRequest, requireAdmin } from '../middleware/auth';
import crypto from 'crypto';
import multer from 'multer';
import XLSX from 'xlsx';

const router = Router();
const prisma = new PrismaClient();

// multer memory storage for import (no disk write needed)
const importUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const RAW_EXCEL_DATE_OFFSET = 25569; // Excel date offset for JS Date conversion

function parseSafeDate(dateStr: any): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}


// GET /api/employees
router.get('/', authenticate, requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const employees = await (prisma.user as any).findMany({
      include: { department: true },
      orderBy: { name: 'asc' },
    });
    return res.json(employees.map((u: any) => ({
      id: u.id,
      employeeId: u.employeeId,
      name: u.name,
      email: u.email,
      photoUrl: u.photoUrl,
      role: u.role,
      departmentId: u.departmentId,
      departmentName: u.department?.name || null,
      employeeStatus: u.employeeStatus,
      joinDate: u.joinDate ? u.joinDate.toISOString() : null,
      hasSpouse: u.hasSpouse,
      childCount: u.childCount,
      positionAllowance: u.positionAllowance,
      serviceAllowancePercent: u.serviceAllowancePercent,
      salaryIndex: u.salaryIndex,
      extraAllowance: u.extraAllowance,
      createdAt: u.createdAt,
    })));
  } catch (error) {
    return res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// GET /api/employees/departments/list
router.get('/departments/list', authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    const departments = await prisma.department.findMany({ orderBy: { name: 'asc' } });
    return res.json(departments);
  } catch (error) {
    return res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// POST /api/employees/departments
router.post('/departments', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Nama departemen wajib diisi' });

    const existing = await prisma.department.findUnique({ where: { name } });
    if (existing) return res.status(400).json({ error: 'Departemen sudah ada' });

    const department = await prisma.department.create({ 
      data: { 
        id: crypto.randomUUID(),
        name 
      } 
    });
    return res.json({ message: 'Departemen berhasil ditambahkan', department });
  } catch (error) {
    return res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// PUT /api/employees/departments/:id
router.put('/departments/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Nama departemen wajib diisi' });

    const department = await prisma.department.update({
      where: { id: req.params.id as string },
      data: { name },
    });
    return res.json({ message: 'Departemen berhasil diperbarui', department });
  } catch (error) {
    return res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// DELETE /api/employees/departments/:id
router.delete('/departments/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    // Check if there are employees mapped to this department
    const users = await prisma.user.count({ where: { departmentId: req.params.id as string } });
    if (users > 0) return res.status(400).json({ error: 'Tidak dapat menghapus departemen yang masih memiliki karyawan' });

    await prisma.department.delete({ where: { id: req.params.id as string } });
    return res.json({ message: 'Departemen berhasil dihapus' });
  } catch (error) {
    return res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// GET /api/employees/:id
router.get('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const user = await (prisma.user as any).findUnique({
      where: { id: req.params.id as string },
      include: { department: true },
    });
    if (!user) return res.status(404).json({ error: 'Karyawan tidak ditemukan' });
    return res.json(user);
  } catch (error) {
    return res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// POST /api/employees
router.post('/', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { 
      employeeId, name, email, password, role, departmentId,
      employeeStatus, joinDate, hasSpouse, childCount, positionAllowance, serviceAllowancePercent, salaryIndex
    } = req.body;

    if (!employeeId || !name || !password) {
      return res.status(400).json({ error: 'ID Karyawan, nama, dan password wajib diisi' });
    }

    const existing = await (prisma.user as any).findUnique({ where: { employeeId } });
    if (existing) {
      return res.status(400).json({ error: 'ID Karyawan sudah terdaftar' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await (prisma.user as any).create({
      data: {
        id: crypto.randomUUID(),
        employeeId,
        name,
        email,
        password: hashedPassword,
        role: role || 'PEGAWAI',
        departmentId,
        employeeStatus,
        joinDate: parseSafeDate(joinDate),
        hasSpouse: !!hasSpouse,
        childCount: parseInt(childCount) || 0,
        positionAllowance: parseFloat(positionAllowance) || 0,
        serviceAllowancePercent: parseFloat(serviceAllowancePercent) || 0,
        salaryIndex: parseFloat(salaryIndex) || 1.0,
        extraAllowance: parseFloat(req.body.extraAllowance) || 0,
        updatedAt: new Date(),
      },
      include: { department: true },
    });

    return res.json({ message: 'Karyawan berhasil ditambahkan', user });
  } catch (error) {
    return res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// PUT /api/employees/:id
router.put('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { 
      name, email, role, departmentId, password,
      employeeStatus, joinDate, hasSpouse, childCount, positionAllowance, serviceAllowancePercent, salaryIndex
    } = req.body;
    
    const data: any = { 
      name, email, role, departmentId,
      employeeStatus,
      joinDate: parseSafeDate(joinDate),
      hasSpouse: hasSpouse !== undefined ? !!hasSpouse : undefined,
      childCount: childCount !== undefined ? parseInt(childCount) || 0 : undefined,
      positionAllowance: positionAllowance !== undefined ? parseFloat(positionAllowance) || 0 : undefined,
      serviceAllowancePercent: serviceAllowancePercent !== undefined ? parseFloat(serviceAllowancePercent) || 0 : undefined,
      salaryIndex: salaryIndex !== undefined ? parseFloat(salaryIndex) || 1.0 : undefined,
      extraAllowance: req.body.extraAllowance !== undefined ? parseFloat(req.body.extraAllowance) || 0 : undefined,
      updatedAt: new Date()
    };

    if (password) {
      data.password = await bcrypt.hash(password, 10);
    }

    const user = await (prisma.user as any).update({
      where: { id: req.params.id as string },
      data,
      include: { department: true },
    });

    return res.json({ message: 'Data karyawan berhasil diperbarui', user });
  } catch (error) {
    return res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// DELETE /api/employees/:id
router.delete('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.user.delete({ where: { id: req.params.id as string } });
    return res.json({ message: 'Karyawan berhasil dihapus' });
  } catch (error) {
    return res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
});

// POST /api/employees/import - import from excel
router.post('/import', authenticate, requireAdmin, importUpload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'File Excel wajib diunggah' });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet);

    if (rows.length === 0) {
      return res.status(400).json({ error: 'File Excel kosong atau format tidak sesuai template' });
    }

    const departments = await prisma.department.findMany();
    const deptMap: Record<string, string> = {};
    departments.forEach((d: any) => { deptMap[d.name.toLowerCase()] = d.id; });

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // Excel row number (header is row 1)

      const employeeId = String(row['ID Karyawan'] || '').trim();
      const name = String(row['Nama Lengkap'] || '').trim();
      const email = String(row['Email'] || '').trim() || null;
      const departmentName = String(row['Departemen'] || '').trim();
      const role = String(row['Role'] || 'PEGAWAI').trim().toUpperCase();
      const employeeStatus = String(row['Status Karyawan'] || '').trim() || null;
      
      let joinDate = null;
      let rawJoinDate = row['TMT (YYYY-MM-DD)'] || row['TMT'];
      if (rawJoinDate) {
        // Handle Excel date format (number) or string format
        if (typeof rawJoinDate === 'number') {
          // Excel uses 1900-01-01 as base date (1), accounting for 1900 leap year bug
          const jsDate = new Date((rawJoinDate - (RAW_EXCEL_DATE_OFFSET || 25569)) * 86400 * 1000);
          // Set to UTC+7 (local time handling basically)
          joinDate = jsDate;
        } else {
          const parsed = new Date(rawJoinDate);
          if (!isNaN(parsed.getTime())) {
            joinDate = parsed;
          }
        }
      }

      const hasSpouse = String(row['Tanggungan Istri'] || '').toLowerCase() === 'ya';
      const childCount = parseInt(String(row['Jumlah Anak'] || '0')) || 0;
      const positionAllowance = parseFloat(String(row['Tunjangan Jabatan (Rp)'] || '0')) || 0;
      const serviceAllowancePercent = parseFloat(String(row['Tunjangan Masa Kerja (%)'] || '0')) || 0;
      const salaryIndex = parseFloat(String(row['Indeks Gaji'] || '1.0')) || 1.0;
      const extraAllowance = parseFloat(String(row['Tunj. Tugas Tambahan'] || '0')) || 0;
      // Default password = employeeId, or use override from column
      const rawPassword = String(row['Password'] || employeeId).trim();

      if (!employeeId || !name) {
        errors.push(`Baris ${rowNum}: ID Karyawan dan Nama wajib diisi`);
        skipped++;
        continue;
      }

      // Check duplicate
      const existing = await (prisma.user as any).findUnique({ where: { employeeId } });
      if (existing) {
        errors.push(`Baris ${rowNum}: ID Karyawan "${employeeId}" sudah terdaftar, dilewati`);
        skipped++;
        continue;
      }

      const departmentId = departmentName ? (deptMap[departmentName.toLowerCase()] || null) : null;
      if (departmentName && !departmentId) {
        errors.push(`Baris ${rowNum}: Departemen "${departmentName}" tidak ditemukan, karyawan tetap diimpor tanpa departemen`);
      }

      const hashedPassword = await bcrypt.hash(rawPassword, 10);

      await (prisma.user as any).create({
        data: {
          id: crypto.randomUUID(),
          employeeId,
          name,
          email: email || null,
          password: hashedPassword,
          role: role === 'ADMIN' ? 'ADMIN' : 'PEGAWAI',
          departmentId,
          employeeStatus,
          joinDate,
          hasSpouse,
          childCount,
          positionAllowance,
          serviceAllowancePercent,
          salaryIndex,
          extraAllowance,
          updatedAt: new Date(),
        }
      });

      imported++;
    }

    return res.json({
      message: `Import selesai: ${imported} karyawan berhasil diimpor, ${skipped} dilewati.`,
      imported,
      skipped,
      errors,
    });
  } catch (error: any) {
    console.error('Import error:', error);
    return res.status(500).json({ error: 'Gagal memproses file: ' + error.message });
  }
});

export default router;
