import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest, formatDate } from '../lib/api';

export default function Permission() {
  const [type, setType] = useState('SAKIT');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [myLeaves, setMyLeaves] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    setStartDate(today);
    setEndDate(today);
    fetchLeaves();
  }, []);

  const fetchLeaves = async () => {
    try {
      const data = await apiRequest('/leaves');
      setMyLeaves(data);
    } catch (err) {}
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const formData = new FormData();
      formData.append('type', type);
      formData.append('startDate', startDate);
      formData.append('endDate', endDate);
      formData.append('reason', reason);
      if (photo) formData.append('photo', photo);

      await apiRequest('/leaves', {
        method: 'POST',
        body: formData,
      });
      setSuccess('Izin berhasil diajukan!');
      setReason('');
      setPhoto(null);
      setPreview(null);
      fetchLeaves();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const leaveTypes = [
    { value: 'SAKIT', label: 'Sakit', icon: 'local_hospital' },
    { value: 'CUTI', label: 'Cuti', icon: 'beach_access' },
    { value: 'IZIN_PRIBADI', label: 'Izin Pribadi', icon: 'person_off' },
    { value: 'DINAS_LUAR', label: 'Dinas Luar', icon: 'business_center' },
  ];

  const statusColors: Record<string, string> = {
    PENDING: 'bg-amber-100 text-amber-700',
    APPROVED: 'bg-emerald-100 text-emerald-700',
    REJECTED: 'bg-red-100 text-red-700',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/home')} className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 text-slate-600">
          <span className="icon">arrow_back</span>
        </button>
        <h2 className="text-xl font-bold text-slate-900">Izin Tidak Masuk</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 flex items-center gap-2">
            <span className="icon text-lg">error</span>{error}
          </div>
        )}
        {success && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-600 text-sm rounded-xl px-4 py-3 flex items-center gap-2">
            <span className="icon text-lg">check_circle</span>{success}
          </div>
        )}

        {/* Leave Type */}
        <div className="glass rounded-2xl p-4 border border-slate-200">
          <label className="block text-sm font-semibold text-slate-700 mb-3">Jenis Izin</label>
          <div className="grid grid-cols-2 gap-2">
            {leaveTypes.map((lt) => (
              <button
                key={lt.value}
                type="button"
                onClick={() => setType(lt.value)}
                className={`p-3 rounded-xl border text-sm font-semibold flex items-center gap-2 transition-all
                  ${type === lt.value ? 'border-primary bg-primary/10 text-primary' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                <span className="icon text-lg">{lt.icon}</span>
                {lt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Tanggal Mulai</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Tanggal Selesai</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>
        </div>

        {/* Reason */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Keterangan</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Tuliskan alasan izin..."
            rows={3}
            className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
        </div>

        {/* Photo Upload */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Lampiran (Surat Dokter / Bukti)
          </label>
          {preview ? (
            <div className="relative">
              <img src={preview} alt="Preview" className="w-full h-40 object-cover rounded-xl" />
              <button type="button" onClick={() => { setPhoto(null); setPreview(null); }}
                className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center shadow">
                <span className="icon text-lg">close</span>
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center h-32 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-100 transition">
              <span className="icon text-3xl text-slate-400">upload_file</span>
              <span className="text-xs text-slate-500 mt-1">Upload foto surat dokter / bukti</span>
              <input type="file" accept="image/*" capture="environment" onChange={handlePhotoChange} className="hidden" />
            </label>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-primary/30"
        >
          {loading ? 'Mengirim...' : 'Ajukan Izin'}
        </button>
      </form>

      {/* My Leaves History */}
      {myLeaves.length > 0 && (
        <section>
          <h3 className="text-lg font-bold text-slate-900 mb-3">Riwayat Izin</h3>
          <div className="space-y-3">
            {myLeaves.map((leave: any) => (
              <div key={leave.id} className="glass p-4 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-slate-800">
                    {leaveTypes.find(lt => lt.value === leave.type)?.label || leave.type}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${statusColors[leave.status]}`}>
                    {leave.status === 'PENDING' ? 'Menunggu' : leave.status === 'APPROVED' ? 'Disetujui' : 'Ditolak'}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  {formatDate(leave.startDate)}
                  {leave.startDate !== leave.endDate && ` - ${formatDate(leave.endDate)}`}
                </p>
                {leave.reason && <p className="text-xs text-slate-600 mt-1">{leave.reason}</p>}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
