import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useState } from 'react';

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/admin', icon: 'dashboard', label: 'Dashboard' },
    { path: '/admin/employees', icon: 'groups', label: 'Karyawan' },
    { path: '/admin/schedules', icon: 'calendar_month', label: 'Jadwal Kerja' },
    { path: '/admin/locations', icon: 'location_on', label: 'Lokasi & Radius' },
    { path: '/admin/recap', icon: 'summarize', label: 'Rekap Absensi' },
    { path: '/admin/leaves', icon: 'edit_document', label: 'Pengajuan Izin' },
    { path: '/admin/payroll', icon: 'payments', label: 'Payroll' },
  ];

  return (
    <div className="min-h-screen bg-[#f0f4f8] flex">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-full flex flex-col">
          {/* Logo area */}
          <div className="h-16 flex items-center px-6 border-b border-slate-800">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center mr-3">
              <span className="icon text-white text-lg">admin_panel_settings</span>
            </div>
            <span className="text-white font-bold text-lg tracking-wide">ASIPP ADMIN</span>
          </div>

          {/* Nav links */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/admin'}
                onClick={() => setIsSidebarOpen(false)}
                className={({ isActive }) => 
                  `flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${
                    isActive 
                      ? 'bg-primary/10 text-primary font-semibold' 
                      : 'hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                {({ isActive }) => (<>
                  <span className={`icon ${isActive ? 'icon-filled' : ''}`}>{item.icon}</span>
                  {item.label}
                </>)}
              </NavLink>
            ))}
          </nav>

          {/* User area */}
          <div className="p-4 border-t border-slate-800">
            <div className="flex items-center gap-3 mb-4 px-2">
               <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center">
                 <span className="icon text-slate-400">person</span>
               </div>
               <div className="flex-1 overflow-hidden">
                 <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
                 <p className="text-xs text-slate-500 truncate">Administrator</p>
               </div>
            </div>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 transition-colors"
            >
              <span className="icon text-lg">logout</span>
              Keluar
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 max-h-screen overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 z-10 shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden w-10 h-10 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-600"
            >
              <span className="icon">menu</span>
            </button>
            <h1 className="text-lg font-bold text-slate-800 hidden sm:block">Panel Admin</h1>
          </div>
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <span className="icon text-sm">notifications</span>
             </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
