import { useState, useEffect } from 'react';
import { apiRequest } from '../../lib/api';
import { Link } from 'react-router-dom';

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        // Will fetch actual stats later, stubbing for now to match UI plan
        const data = await apiRequest('/history?period=week'); 
        
        // Mocking today's stats from latest attendances
        const today = new Date().toISOString().split('T')[0];
        const todaysAtt = data.attendances?.filter((a: any) => a.date.startsWith(today)) || [];
        
        setStats({
          hadir: todaysAtt.filter((a: any) => a.status === 'HADIR').length,
          telat: todaysAtt.filter((a: any) => a.status === 'HADIR' && a.lateMinutes > 0).length,
          izin: todaysAtt.filter((a: any) => ['IZIN', 'SAKIT', 'CUTI'].includes(a.status)).length,
          alpa: todaysAtt.filter((a: any) => a.status === 'ALPA').length,
          totalEmployees: 5, // Just a placeholder until we hit an employee count endpoint
        });
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Dashboard</h2>
        <p className="text-slate-500 mt-1">Ringkasan absensi karyawan hari ini</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-500">Hadir Target</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{stats?.hadir || 0} <span className="text-sm text-slate-400 font-normal">/ {stats?.totalEmployees || 0}</span></p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <span className="icon">how_to_reg</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-500">Terlambat</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{stats?.telat || 0}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <span className="icon">schedule</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-500">Izin / Sakit</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{stats?.izin || 0}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <span className="icon">event_busy</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-500">Alpa</p>
            <p className="text-2xl font-bold text-rose-600 mt-1">{stats?.alpa || 0}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
            <span className="icon">person_off</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <h3 className="text-lg font-bold text-slate-900 mt-8 mb-4">Aksi Cepat</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link to="/admin/employees" className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-primary/50 hover:shadow-md transition-all group">
          <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <span className="icon">group_add</span>
          </div>
          <h4 className="font-bold text-slate-800">Kelola Karyawan</h4>
          <p className="text-sm text-slate-500 mt-1">Tambah, edit, atau hapus data</p>
        </Link>
        <Link to="/admin/schedules" className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-primary/50 hover:shadow-md transition-all group">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <span className="icon">calendar_month</span>
          </div>
          <h4 className="font-bold text-slate-800">Atur Jadwal</h4>
          <p className="text-sm text-slate-500 mt-1">Ubah jadwal normal / ramadhan</p>
        </Link>
        <Link to="/admin/recap" className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-primary/50 hover:shadow-md transition-all group">
          <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <span className="icon">summarize</span>
          </div>
          <h4 className="font-bold text-slate-800">Cetak Rekap</h4>
          <p className="text-sm text-slate-500 mt-1">Export laporan bulanan</p>
        </Link>
      </div>
    </div>
  );
}
