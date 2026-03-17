import { useState, useEffect } from 'react';
import { apiRequest, formatTime, formatDate } from '../lib/api';

export default function History() {
  const [period, setPeriod] = useState('week');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async (p: string) => {
    setLoading(true);
    try {
      const result = await apiRequest(`/history?period=${p}`);
      setData(result);
    } catch (err) {}
    setLoading(false);
  };

  useEffect(() => { fetchHistory(period); }, [period]);

  const tabs = [
    { value: 'week', label: 'Minggu Ini' },
    { value: 'month', label: 'Bulan Ini' },
    { value: 'lastMonth', label: 'Bulan Lalu' },
  ];

  const statusIcons: Record<string, { icon: string; color: string; label: string }> = {
    HADIR: { icon: 'check_circle', color: 'text-emerald-600', label: 'Hadir' },
    IZIN: { icon: 'event_busy', color: 'text-blue-600', label: 'Izin' },
    SAKIT: { icon: 'local_hospital', color: 'text-amber-600', label: 'Sakit' },
    CUTI: { icon: 'beach_access', color: 'text-purple-600', label: 'Cuti' },
    ALPA: { icon: 'cancel', color: 'text-red-600', label: 'Alpa' },
  };

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-slate-900">Riwayat Absensi</h2>

      {/* Period Tabs */}
      <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setPeriod(tab.value)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all
              ${period === tab.value ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Summary */}
      {data && !loading && (
        <div className="grid grid-cols-3 gap-3">
          <div className="glass p-3 rounded-xl border border-slate-200 text-center">
            <p className="text-2xl font-bold text-emerald-600">{data.attendances.filter((a: any) => a.status === 'HADIR').length}</p>
            <p className="text-xs text-slate-500 font-medium">Hadir</p>
          </div>
          <div className="glass p-3 rounded-xl border border-slate-200 text-center">
            <p className="text-2xl font-bold text-amber-600">{data.attendances.filter((a: any) => a.lateMinutes > 0).length}</p>
            <p className="text-xs text-slate-500 font-medium">Telat</p>
          </div>
          <div className="glass p-3 rounded-xl border border-slate-200 text-center">
            <p className="text-2xl font-bold text-blue-600">{data.attendances.filter((a: any) => ['IZIN', 'SAKIT', 'CUTI'].includes(a.status)).length}</p>
            <p className="text-xs text-slate-500 font-medium">Izin/Sakit</p>
          </div>
        </div>
      )}

      {/* Attendance List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin w-8 h-8 border-3 border-primary border-t-transparent rounded-full"></div>
        </div>
      ) : data?.attendances.length > 0 ? (
        <div className="space-y-3">
          {data.attendances.map((att: any) => {
            const st = statusIcons[att.status] || statusIcons.HADIR;
            return (
              <div key={att.id} className="glass p-4 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`icon text-lg ${st.color}`}>{st.icon}</span>
                    <span className="font-bold text-sm text-slate-800">{st.label}</span>
                    {att.lateMinutes > 0 && (
                      <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs font-bold rounded-full">
                        +{att.lateMinutes} menit
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-500">{formatDate(att.date)}</span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  {att.clockInTime && (
                    <div className="flex items-center gap-1 text-emerald-600">
                      <span className="icon text-sm">login</span>
                      <span className="font-medium">{formatTime(att.clockInTime)}</span>
                    </div>
                  )}
                  {att.clockOutTime && (
                    <div className="flex items-center gap-1 text-rose-600">
                      <span className="icon text-sm">logout</span>
                      <span className="font-medium">{formatTime(att.clockOutTime)}</span>
                    </div>
                  )}
                  {att.breaklog?.length > 0 && (
                    <div className="flex items-center gap-1 text-amber-600">
                      <span className="icon text-sm">coffee</span>
                      <span className="font-medium">{att.breaklog.length}x istirahat</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="glass p-8 rounded-2xl text-center border border-slate-200">
          <span className="icon text-4xl text-slate-300">event_available</span>
          <p className="mt-2 text-sm text-slate-400">Tidak ada data untuk periode ini</p>
        </div>
      )}
    </div>
  );
}
