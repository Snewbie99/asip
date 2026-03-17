import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

import authRoutes from './routes/auth';
import attendanceRoutes from './routes/attendance';
import leavesRoutes from './routes/leaves';
import employeesRoutes from './routes/employees';
import schedulesRoutes from './routes/schedules';
import locationsRoutes from './routes/locations';
import payrollRoutes from './routes/payroll';
import historyRoutes from './routes/history';
import recapRoutes from './routes/recap';
import profileRoutes from './routes/profile';
import payrollManagementRoutes from './routes/payroll_management';
import { authenticate } from './middleware/auth';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/attendance', authenticate, attendanceRoutes);
app.use('/api/leaves', authenticate, leavesRoutes);
app.use('/api/employees', employeesRoutes);
app.use('/api/schedules', schedulesRoutes);
app.use('/api/locations', locationsRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/recap', recapRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/payroll-management', payrollManagementRoutes);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof SyntaxError && 'body' in err) {
    console.error('JSON Syntax Error:', err.message);
    return res.status(400).json({ error: 'Data JSON tidak valid: ' + err.message });
  }
  console.error('Global Error:', err);
  return res.status(500).json({ error: 'Terjadi kesalahan sistem internal' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

export default app;
