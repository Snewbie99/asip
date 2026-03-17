import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import EmployeeLayout from './components/EmployeeLayout';
import AdminLayout from './components/AdminLayout';
import Login from './pages/Login';
import Home from './pages/Home';
import FieldDuty from './pages/FieldDuty';
import BreakRequest from './pages/BreakRequest';
import Permission from './pages/Permission';
import History from './pages/History';
import Payroll from './pages/Payroll';
import Profile from './pages/Profile';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminEmployees from './pages/admin/AdminEmployees';
import AdminSchedules from './pages/admin/AdminSchedules';
import AdminLocations from './pages/admin/AdminLocations';
import AdminLeaves from './pages/admin/AdminLeaves';
import AdminRecap from './pages/admin/AdminRecap';
import AdminPayroll from './pages/admin/AdminPayroll';
import AdminPayrollSettings from './pages/admin/AdminPayrollSettings';

function ProtectedRoute({ children, role }: { children: React.ReactNode; role?: string }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0f4f8]">
        <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to={user.role === 'ADMIN' ? '/admin' : '/home'} replace />;

  return <>{children}</>;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0f4f8]">
        <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={user.role === 'ADMIN' ? '/admin' : '/home'} replace /> : <Login />} />

      {/* Employee routes */}
      <Route element={<ProtectedRoute role="PEGAWAI"><EmployeeLayout /></ProtectedRoute>}>
        <Route path="/home" element={<Home />} />
        <Route path="/payroll" element={<Payroll />} />
        <Route path="/history" element={<History />} />
        <Route path="/profile" element={<Profile />} />
      </Route>

      {/* Standalone employee routes (no bottom nav) */}
      <Route path="/field-duty" element={<ProtectedRoute role="PEGAWAI"><div className="mobile-app-container flex flex-col p-4"><FieldDuty /></div></ProtectedRoute>} />
      <Route path="/break" element={<ProtectedRoute role="PEGAWAI"><div className="mobile-app-container flex flex-col p-4"><BreakRequest /></div></ProtectedRoute>} />
      <Route path="/permission" element={<ProtectedRoute role="PEGAWAI"><div className="mobile-app-container flex flex-col p-4"><Permission /></div></ProtectedRoute>} />

      {/* Admin routes */}
      <Route path="/admin" element={<ProtectedRoute role="ADMIN"><AdminLayout /></ProtectedRoute>}>
        <Route index element={<AdminDashboard />} />
        <Route path="employees" element={<AdminEmployees />} />
        <Route path="schedules" element={<AdminSchedules />} />
        <Route path="locations" element={<AdminLocations />} />
        <Route path="recap" element={<AdminRecap />} />
        <Route path="leaves" element={<AdminLeaves />} />
        <Route path="payroll" element={<AdminPayroll />} />
        <Route path="payroll/settings" element={<AdminPayrollSettings />} />
      </Route>

      {/* Default redirect */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
