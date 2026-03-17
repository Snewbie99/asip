import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function EmployeeLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="mobile-app-container flex flex-col">
      {/* Header */}
      <header className="p-4 flex items-center justify-between sticky top-0 z-10 glass">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full border-2 border-primary overflow-hidden bg-slate-200">
            {user?.photoUrl ? (
              <img src={user.photoUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-500">
                <span className="icon icon-filled text-2xl">person</span>
              </div>
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Selamat datang,</p>
            <h1 className="text-lg font-bold leading-tight text-slate-900">{user?.name || 'Karyawan'}</h1>
          </div>
        </div>
        <button onClick={handleLogout} className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-500 transition-colors" title="Logout">
          <span className="icon">power_settings_new</span>
        </button>
      </header>

      {/* Content */}
      <main className="flex-1 p-4 pb-24">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto glass border-t border-slate-200 px-6 py-3 flex items-center justify-between z-20">
        <NavLink to="/home" className={({ isActive }) => `flex flex-col items-center gap-1 ${isActive ? 'text-primary' : 'text-slate-400'} transition-colors`}>
          {({ isActive }) => (<>
            <span className={`icon ${isActive ? 'icon-filled' : ''}`}>home</span>
            <span className="text-[10px] font-bold uppercase tracking-tighter">Home</span>
          </>)}
        </NavLink>
        <NavLink to="/payroll" className={({ isActive }) => `flex flex-col items-center gap-1 ${isActive ? 'text-primary' : 'text-slate-400'} transition-colors`}>
          {({ isActive }) => (<>
            <span className={`icon ${isActive ? 'icon-filled' : ''}`}>payments</span>
            <span className="text-[10px] font-bold uppercase tracking-tighter">Payroll</span>
          </>)}
        </NavLink>
        <NavLink to="/history" className={({ isActive }) => `flex flex-col items-center gap-1 ${isActive ? 'text-primary' : 'text-slate-400'} transition-colors`}>
          {({ isActive }) => (<>
            <span className={`icon ${isActive ? 'icon-filled' : ''}`}>history_edu</span>
            <span className="text-[10px] font-bold uppercase tracking-tighter">Riwayat</span>
          </>)}
        </NavLink>
        <NavLink to="/profile" className={({ isActive }) => `flex flex-col items-center gap-1 ${isActive ? 'text-primary' : 'text-slate-400'} transition-colors`}>
          {({ isActive }) => (<>
            <span className={`icon ${isActive ? 'icon-filled' : ''}`}>person</span>
            <span className="text-[10px] font-bold uppercase tracking-tighter">Profil</span>
          </>)}
        </NavLink>
      </nav>
    </div>
  );
}
