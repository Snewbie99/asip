import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest, formatTime, formatDateShort } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { calculateWorkingDuration } from '../lib/dateUtils';

interface AttendanceStatus {
  status: string;
  attendance: any;
  schedule: any;
  activities: any[];
}

export default function Home() {
  const [data, setData] = useState<AttendanceStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [error, setError] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const { user } = useAuth();
  const navigate = useNavigate();

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch status
  const fetchStatus = useCallback(async () => {
    try {
      const result = await apiRequest('/attendance/status');
      setData(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const getLocation = (): Promise<{ latitude: number; longitude: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('GPS tidak tersedia di perangkat ini'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        (_err) => reject(new Error('Gagal mendapatkan lokasi. Pastikan GPS aktif.')),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  };

  const handleClockIn = async () => {
    setActionLoading('clock_in');
    setError('');
    try {
      const location = await getLocation();
      await apiRequest('/attendance/clock-in', {
        method: 'POST',
        body: JSON.stringify(location),
      });
      await fetchStatus();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading('');
    }
  };

  const handleClockOut = async () => {
    // 5 minutes cooldown check
    if (data?.attendance?.clockInTime) {
      const clockIn = new Date(data.attendance.clockInTime);
      const diffMinutes = (currentTime.getTime() - clockIn.getTime()) / (1000 * 60);
      if (diffMinutes < 5) {
        const remaining = Math.ceil(5 - diffMinutes);
        alert(`Mohon tunggu. Absen pulang hanya bisa dilakukan minimal 5 menit setelah absen masuk (Tunggu ${remaining} menit lagi).`);
        return;
      }
    }

    let confirmMsg = 'Yakin ingin absen pulang?';
    
    // Check for early leave
    if (data?.schedule?.endTime) {
      const [h, m] = data.schedule.endTime.split(':').map(Number);
      const endTime = new Date();
      endTime.setHours(h, m, 0, 0);
      
      if (currentTime < endTime) {
        confirmMsg = `⚠️ PERINGATAN: Jam kerja belum berakhir!\n\nJadwal pulang Anda adalah jam ${data.schedule.endTime}.\nTetap ingin absen pulang sekarang?`;
      }
    }

    if (!confirm(confirmMsg)) return;

    setActionLoading('clock_out');
    setError('');
    try {
      const location = await getLocation();
      await apiRequest('/attendance/clock-out', {
        method: 'POST',
        body: JSON.stringify(location),
      });
      await fetchStatus();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading('');
    }
  };

  const handleReturn = async () => {
    setActionLoading('return');
    setError('');
    try {
      await apiRequest('/attendance/return', { method: 'POST' });
      await fetchStatus();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading('');
    }
  };

  const timeString = currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateString = currentTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const scheduleText = data?.schedule
    ? `${data.schedule.startTime} - ${data.schedule.endTime}`
    : 'Tidak ada jadwal';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Clock Display */}
      <section className="text-center py-6">
        <h2 className="text-5xl font-bold tracking-tight text-primary">{timeString}</h2>
        <p className="text-slate-500 mt-1 font-medium">{dateString}</p>
        <div className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold">
          <span className="icon text-sm">schedule</span>
          Hari ini: {scheduleText}
        </div>
        {/* Status Badge */}
        {data?.status && (
          <div className={`mt-3 inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold
            ${data.status === 'sudah_masuk' ? 'bg-emerald-100 text-emerald-700' :
              data.status === 'istirahat' ? 'bg-amber-100 text-amber-700' :
              data.status === 'sudah_pulang' ? 'bg-slate-100 text-slate-600' :
              'bg-blue-100 text-blue-700'}`}>
            <span className="icon text-sm">
              {data.status === 'sudah_masuk' ? 'check_circle' :
               data.status === 'istirahat' ? 'coffee' :
               data.status === 'sudah_pulang' ? 'home' : 'radio_button_unchecked'}
            </span>
            {data.status === 'belum_masuk' ? 'Belum Absen' :
             data.status === 'sudah_masuk' ? 'Sedang Bekerja' :
             data.status === 'istirahat' ? 'Sedang Istirahat' : 'Sudah Pulang'}
          </div>
        )}
        {/* Masa Kerja Badge */}
        {user?.joinDate && (
          <div className="mt-3 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100 text-slate-600 text-sm font-semibold border border-slate-200">
            <span className="icon text-sm">work_history</span>
            Masa Kerja: <span className="text-primary">{calculateWorkingDuration(user.joinDate)}</span>
          </div>
        )}
      </section>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 flex items-center gap-2">
          <span className="icon text-lg">error</span>
          {error}
          <button onClick={() => setError('')} className="ml-auto"><span className="icon text-lg">close</span></button>
        </div>
      )}

      {/* Action Buttons */}
      <section className="grid grid-cols-1 gap-4">
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={handleClockIn}
            disabled={data?.status !== 'belum_masuk' || !!actionLoading}
            className="w-full py-8 bg-emerald-500 text-white rounded-3xl shadow-lg shadow-emerald-500/30 flex flex-col items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
          >
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
              {actionLoading === 'clock_in' ? (
                <div className="animate-spin w-8 h-8 border-3 border-white border-t-transparent rounded-full"/>
              ) : (
                <span className="icon icon-filled text-4xl">fingerprint</span>
              )}
            </div>
            <span className="text-lg font-bold uppercase tracking-wider">Masuk</span>
          </button>
          <button
            onClick={handleClockOut}
            disabled={data?.status !== 'sudah_masuk' || !!actionLoading}
            className="w-full py-8 bg-rose-500 text-white rounded-3xl shadow-lg shadow-rose-500/30 flex flex-col items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
          >
            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
              {actionLoading === 'clock_out' ? (
                <div className="animate-spin w-8 h-8 border-3 border-white border-t-transparent rounded-full"/>
              ) : (
                <span className="icon text-4xl">logout</span>
              )}
            </div>
            <span className="text-lg font-bold uppercase tracking-wider">Pulang</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => navigate('/break')}
            disabled={data?.status !== 'sudah_masuk' || !!actionLoading}
            className="p-4 glass rounded-2xl flex flex-col items-center gap-2 text-slate-700 border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all"
          >
            <span className="icon text-primary">coffee</span>
            <span className="font-semibold text-sm text-center leading-tight">Izin<br/>Istirahat</span>
          </button>
          <button
            onClick={handleReturn}
            disabled={data?.status !== 'istirahat' || !!actionLoading}
            className="p-4 glass rounded-2xl flex flex-col items-center gap-2 text-slate-700 border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all"
          >
            {actionLoading === 'return' ? (
              <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full"/>
            ) : (
              <span className="icon text-primary">resume</span>
            )}
            <span className="font-semibold text-sm text-center leading-tight">Kembali<br/>Bekerja</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => navigate('/field-duty')}
            className="p-4 glass rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-700 border border-slate-200 active:scale-[0.98] transition-all hover:bg-slate-50"
          >
            <span className="icon text-primary">flight_takeoff</span>
            <span className="font-semibold text-sm text-center leading-tight">Dinas Luar<br/>Kota</span>
          </button>
          <button
            onClick={() => navigate('/permission')}
            className="p-4 glass rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-700 border border-slate-200 active:scale-[0.98] transition-all hover:bg-slate-50"
          >
            <span className="icon text-primary">event_busy</span>
            <span className="font-semibold text-sm text-center leading-tight">Izin Tidak<br/>Masuk</span>
          </button>
        </div>
      </section>

      {/* Recent Activity */}
      <section className="pb-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900">Aktivitas Terbaru</h3>
          <button onClick={() => navigate('/history')} className="text-sm font-semibold text-primary">Lihat Semua</button>
        </div>
        <div className="space-y-3">
          {data?.activities && data.activities.length > 0 ? (
            data.activities.slice(0, 5).map((act: any) => (
              <div key={act.id} className="glass p-4 rounded-2xl flex items-center justify-between border border-slate-200">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center
                    ${act.type === 'clock_in' ? 'bg-green-500/10 text-green-600' :
                      act.type === 'clock_out' ? 'bg-red-500/10 text-red-600' :
                      act.type === 'break_start' ? 'bg-amber-500/10 text-amber-600' :
                      act.type === 'break_end' ? 'bg-blue-500/10 text-blue-600' :
                      'bg-purple-500/10 text-purple-600'}`}>
                    <span className="icon text-lg">
                      {act.type === 'clock_in' ? 'login' :
                       act.type === 'clock_out' ? 'logout' :
                       act.type === 'break_start' ? 'coffee' :
                       act.type === 'break_end' ? 'resume' : 'event_busy'}
                    </span>
                  </div>
                  <div>
                    <p className="font-bold text-sm text-slate-800">{act.label}</p>
                    <p className="text-xs text-slate-500">{act.desc || '-'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm text-slate-700">{formatTime(act.createdAt)}</p>
                  <p className="text-xs text-slate-500">{formatDateShort(act.createdAt)}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="glass p-8 rounded-2xl text-center border border-slate-200">
              <span className="icon text-4xl text-slate-300">event_available</span>
              <p className="mt-2 text-sm text-slate-400">Belum ada aktivitas hari ini</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
