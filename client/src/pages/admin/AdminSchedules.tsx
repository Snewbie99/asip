import { useState, useEffect } from 'react';
import { apiRequest } from '../../lib/api';

interface Department {
  id: string;
  name: string;
}

interface ScheduleEntry {
  id: string;
  scheduleSetId: string;
  departmentId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  breakStart: string | null;
  breakEnd: string | null;
}

interface ScheduleSet {
  id: string;
  name: string;
  isActive: boolean;
  entries: ScheduleEntry[];
}

export default function AdminSchedules() {
  const [schedules, setSchedules] = useState<ScheduleSet[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form states
  const [showAddModal, setShowAddModal] = useState(false);
  const [newScheduleName, setNewScheduleName] = useState('');
  
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleSet | null>(null);
  const [editingEntry, setEditingEntry] = useState<Partial<ScheduleEntry> | null>(null);

  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

  const fetchData = async () => {
    try {
      const [schedRes, deptRes] = await Promise.all([
        apiRequest('/schedules'),
        apiRequest('/employees/departments/list')
      ]);
      setSchedules(schedRes);
      setDepartments(deptRes);
      
      // Select the first schedule if none selected
      if (!selectedSchedule && schedRes.length > 0) {
        setSelectedSchedule(schedRes[0]);
      } else if (selectedSchedule) {
        // Update selected schedule reference
        const updated = schedRes.find((s: ScheduleSet) => s.id === selectedSchedule.id);
        if (updated) setSelectedSchedule(updated);
      }
    } catch (err: any) {
      setError(err.message || 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newScheduleName.trim()) return;

    try {
      const res = await apiRequest('/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newScheduleName })
      });
      alert(res.message);
      setShowAddModal(false);
      setNewScheduleName('');
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Gagal membuat jadwal');
    }
  };

  const handleActivateSchedule = async (id: string, name: string) => {
    if (!confirm(`Aktifkan jadwal "${name}"? Jadwal lainnya akan dinonaktifkan.`)) return;
    
    try {
      const res = await apiRequest(`/schedules/${id}/activate`, { method: 'PUT' });
      alert(res.message);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Gagal mengaktifkan jadwal');
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!confirm('Yakin ingin menghapus jadwal ini? Semua setelan di dalamnya akan ikut terhapus.')) return;

    try {
      const res = await apiRequest(`/schedules/${id}`, { method: 'DELETE' });
      alert(res.message);
      if (selectedSchedule?.id === id) setSelectedSchedule(null);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus jadwal');
    }
  };

  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchedule || !editingEntry) return;

    try {
      const res = await apiRequest(`/schedules/${selectedSchedule.id}/entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries: [editingEntry] })
      });
      alert(res.message);
      setEditingEntry(null);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan detail jadwal');
    }
  };

  const openEntryModal = (deptId: string, dayOfWeek: number) => {
    if (!selectedSchedule) return;
    const entries = selectedSchedule.entries || [];
    const existing = entries.find(e => e.departmentId === deptId && e.dayOfWeek === dayOfWeek);
    if (existing) {
      setEditingEntry(existing);
    } else {
      setEditingEntry({
        departmentId: deptId,
        dayOfWeek: dayOfWeek,
        startTime: '08:00',
        endTime: '17:00',
        breakStart: '12:00',
        breakEnd: '13:00'
      });
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Memuat data jadwal...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Jadwal Kerja</h1>
          <p className="text-slate-500 text-sm">Kelola jam kerja & istirahat per departemen.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-primary hover:bg-blue-700 text-white px-4 py-2 rounded-xl transition-colors font-medium text-sm"
        >
          <span className="icon">add</span> Tambah Set Jadwal
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm border border-red-200">
          {error}
        </div>
      )}

      {/* Tabs / Schedule List */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {schedules.map(sched => (
          <button
            key={sched.id}
            onClick={() => setSelectedSchedule(sched)}
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-medium transition-all whitespace-nowrap border
              ${selectedSchedule?.id === sched.id 
                ? 'bg-primary text-white border-primary shadow-md' 
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
          >
            {sched.isActive && <span className="icon text-sm text-emerald-400">check_circle</span>}
            {sched.name}
          </button>
        ))}
      </div>

      {/* Schedule Management Panel */}
      {selectedSchedule && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4 mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                Set Jadwal: {selectedSchedule.name}
                {selectedSchedule.isActive && (
                  <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-md">Aktif</span>
                )}
              </h2>
            </div>
            <div className="flex gap-2">
              {!selectedSchedule.isActive && (
                <button
                  onClick={() => handleActivateSchedule(selectedSchedule.id, selectedSchedule.name)}
                  className="px-4 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-xl text-sm font-semibold transition-colors"
                >
                  Jadikan Jadwal Aktif
                </button>
              )}
              <button
                onClick={() => handleDeleteSchedule(selectedSchedule.id)}
                className="px-4 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl text-sm font-semibold transition-colors"
              >
                Hapus
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="p-3 border-b-2 border-slate-100 text-sm font-semibold text-slate-500 w-48">Departemen</th>
                  {days.map((day, idx) => (
                    <th key={idx} className="p-3 border-b-2 border-slate-100 text-sm font-semibold text-slate-500 text-center min-w-[120px]">
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {departments.map(dept => (
                  <tr key={dept.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="p-3 font-semibold text-slate-800">{dept.name}</td>
                    {days.map((_, dayIdx) => {
                      const entries = selectedSchedule.entries || [];
                      const entry = entries.find(e => e.departmentId === dept.id && e.dayOfWeek === dayIdx);
                      return (
                        <td key={dayIdx} className="p-2 text-center">
                          <button
                            onClick={() => openEntryModal(dept.id, dayIdx)}
                            className={`w-full p-2 rounded-xl border flex flex-col items-center justify-center transition-all min-h-[64px]
                              ${entry 
                                ? 'bg-blue-50/50 border-blue-100 hover:bg-blue-100 text-slate-700' 
                                : 'bg-slate-50 border-dashed border-slate-200 hover:border-blue-300 text-slate-400 hover:text-blue-500'}`}
                          >
                            {entry ? (
                              <>
                                <span className="font-bold text-sm tracking-tight">{entry.startTime} - {entry.endTime}</span>
                                {entry.breakStart && (
                                  <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-1">
                                    <span className="icon text-[10px]">coffee</span> {entry.breakStart} - {entry.breakEnd}
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="icon text-lg">add</span>
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!selectedSchedule && schedules.length === 0 && (
        <div className="text-center py-12 bg-white rounded-3xl border border-slate-200">
          <span className="icon text-4xl text-slate-300 mb-2">event_busy</span>
          <p className="text-slate-500">Belum ada set jadwal. Silakan tambah baru.</p>
        </div>
      )}

      {/* Add Schedule Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-800">Tambah Set Jadwal</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600"><span className="icon">close</span></button>
            </div>
            <form onSubmit={handleCreateSchedule} className="p-6">
              <div className="mb-6">
                <label className="block text-sm font-semibold text-slate-700 mb-2">Nama Jadwal</label>
                <input
                  type="text"
                  required
                  value={newScheduleName}
                  onChange={e => setNewScheduleName(e.target.value)}
                  placeholder="Misal: Normal, Ramadhan, Shift Malam"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/50 text-slate-800 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-5 py-2.5 text-slate-600 font-semibold hover:bg-slate-100 rounded-xl">Batal</button>
                <button type="submit" className="px-5 py-2.5 bg-primary text-white font-semibold rounded-xl hover:bg-blue-700">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Entry Modal */}
      {editingEntry && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="font-bold text-lg text-slate-800">Atur Jam Kerja</h3>
                <p className="text-sm text-slate-500">
                  {departments.find(d => d.id === editingEntry.departmentId)?.name} - {days[editingEntry.dayOfWeek!]}
                </p>
              </div>
              <button onClick={() => setEditingEntry(null)} className="text-slate-400 hover:text-slate-600"><span className="icon">close</span></button>
            </div>
            <form onSubmit={handleSaveEntry} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Jam Masuk</label>
                  <input
                    type="time" required
                    value={editingEntry.startTime || ''}
                    onChange={e => setEditingEntry({...editingEntry, startTime: e.target.value})}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Jam Pulang</label>
                  <input
                    type="time" required
                    value={editingEntry.endTime || ''}
                    onChange={e => setEditingEntry({...editingEntry, endTime: e.target.value})}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/50 focus:outline-none"
                  />
                </div>
              </div>
              
              <div className="pt-4 border-t border-slate-100">
                <p className="text-sm font-bold text-slate-800 mb-4">Jam Istirahat (Opsional)</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Mulai Istirahat</label>
                    <input
                      type="time"
                      value={editingEntry.breakStart || ''}
                      onChange={e => setEditingEntry({...editingEntry, breakStart: e.target.value})}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/50 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Selesai Istirahat</label>
                    <input
                      type="time"
                      value={editingEntry.breakEnd || ''}
                      onChange={e => setEditingEntry({...editingEntry, breakEnd: e.target.value})}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/50 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-6">
                <div>
                  {/* Option to clear/delete this entry */}
                  {editingEntry.id && (
                     <button type="button" 
                      onClick={async () => {
                         // API doesn't have a direct delete entry yet, so we could just save it as empty or we leave it. Let's just override it to 00:00 - 00:00 as a workaround, but it's better if we added a delete route
                         alert('Fitur hapus jam spesifik bisa ditambahkan nanti. Ubah jam menjadi 00:00 jika ingin dinonaktifkan.');
                      }}
                      className="text-rose-500 text-sm font-semibold hover:text-rose-600">
                        Hapus Jam
                     </button>
                  )}
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setEditingEntry(null)} className="px-5 py-2.5 text-slate-600 font-semibold hover:bg-slate-100 rounded-xl transition-colors">Batal</button>
                  <button type="submit" className="px-5 py-2.5 bg-primary text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-md shadow-primary/20">Simpan Jam Kerja</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
