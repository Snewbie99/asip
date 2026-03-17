import { useState, useEffect } from 'react';
import { apiRequest } from '../../lib/api';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface DailyRecap {
  id: string;
  employeeId: string;
  name: string;
  department: string;
  clockIn: string | null;
  breakStart: string | null;
  breakEnd: string | null;
  clockOut: string | null;
  status: string;
}

interface MonthlyRecap {
  employeeId: string;
  name: string;
  department: string;
  hariMasuk: number;
  late1to5Count: number;
  lateOver5Count: number;
  early1to5Count: number;
  earlyOver5Count: number;
  breakUnder1hCount: number;
  breakOver1hCount: number;
  countIzin: number;
  countSakit: number;
  countCuti: number;
  countAlpa: number;
}

export default function AdminRecap() {
  const [activeTab, setActiveTab] = useState<'daily' | 'monthly'>('daily');
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<any[]>([]);
  
  // Filters
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [deptId, setDeptId] = useState('');
  const [searchName, setSearchName] = useState('');

  const [dailyData, setDailyData] = useState<DailyRecap[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyRecap[]>([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editModalData, setEditModalData] = useState<{
    userId: string;
    userName: string;
    date: string;
    status: string;
    clockInTime: string | null;
    clockOutTime: string | null;
    breakStart: string | null;
    breakEnd: string | null;
  }>({
    userId: '',
    userName: '',
    date: '',
    status: 'ALPA',
    clockInTime: null,
    clockOutTime: null,
    breakStart: null,
    breakEnd: null
  });

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    if (activeTab === 'daily') fetchDaily();
    else fetchMonthly();
  }, [activeTab, date, startDate, endDate, deptId, searchName]);

  const fetchDepartments = async () => {
    try {
      const data = await apiRequest('/employees/departments/list');
      setDepartments(data);
    } catch (err) {}
  };

  const fetchDaily = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({ date, departmentId: deptId, name: searchName }).toString();
      const data = await apiRequest(`/recap/daily?${query}`);
      setDailyData(data);
    } catch (err: any) {}
    setLoading(false);
  };

  const fetchMonthly = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({ startDate, endDate, departmentId: deptId, name: searchName }).toString();
      const data = await apiRequest(`/recap?${query}`);
      console.log('Monthly Recap Data:', data);
      setMonthlyData(data);
      if (data.length === 0) {
        console.warn('API returned empty array for monthly recap');
      }
    } catch (err: any) {
      console.error('Fetch Monthly Error:', err);
      alert('Gagal mengambil data: ' + err.message);
    }
    setLoading(false);
  };

  const formatTime = (isoString: string | null) => {
    if (!isoString) return '-';
    return new Date(isoString).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  const exportExcel = () => {
    const data = activeTab === 'daily' 
      ? dailyData.map(d => ({
          'Nama': d.name,
          'ID': d.employeeId,
          'Dept': d.department,
          'Masuk': formatTime(d.clockIn),
          'Istirahat': formatTime(d.breakStart),
          'Kembali': formatTime(d.breakEnd),
          'Pulang': formatTime(d.clockOut),
          'Status': d.status
        }))
      : monthlyData.map(m => ({
          'Nama': m.name,
          'ID': m.employeeId,
          'Dept': m.department,
          'Hadir': m.hariMasuk,
          'Sakit': m.countSakit,
          'Ijin': m.countIzin,
          'Alpa': m.countAlpa,
          'Lat 1-5m': m.late1to5Count,
          'Lat 6m+': m.lateOver5Count,
          'Early 1-5m': m.early1to5Count,
          'Early 6m+': m.earlyOver5Count,
          'Brk <1h': m.breakUnder1hCount,
          'Brk >1h': m.breakOver1hCount
        }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, activeTab === 'daily' ? 'Harian' : 'Bulanan');
    XLSX.writeFile(wb, `Rekap_Absensi_${activeTab}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportPDF = () => {
    const doc = new jsPDF(activeTab === 'monthly' ? 'landscape' : 'portrait');
    doc.text(`Rekap Absensi ${activeTab === 'daily' ? 'Harian' : 'Bulanan'}`, 14, 15);
    
    if (activeTab === 'daily') {
      const tableData = dailyData.map(d => [
        d.name, d.department, formatTime(d.clockIn), formatTime(d.breakStart), formatTime(d.breakEnd), formatTime(d.clockOut), d.status
      ]);
      autoTable(doc, {
        head: [['Nama', 'Dept', 'Masuk', 'Istirahat', 'Kembali', 'Pulang', 'Status']],
        body: tableData,
        startY: 20,
      });
    } else {
      const tableData = monthlyData.map((m, i) => [
        i + 1, m.name, m.hariMasuk, m.countSakit, m.countIzin, m.countAlpa,
        m.late1to5Count, m.lateOver5Count, m.early1to5Count, m.earlyOver5Count,
        m.breakUnder1hCount, m.breakOver1hCount
      ]);
      autoTable(doc, {
        head: [
          ['No', 'Nama', 'Hadir', 'Skt', 'Izn', 'Alpa', 'L 1-5', 'L 6+', 'E 1-5', 'E 6+', '<1h', '>1h']
        ],
        body: tableData,
        startY: 20,
        styles: { fontSize: 7 }
      });
    }
    
    doc.save(`Rekap_Absensi_${activeTab}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Rekap Absensi</h2>
          <p className="text-slate-500 mt-1">Laporan kehadiran harian dan bulanan karyawan</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportExcel} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition">
            <span className="icon">description</span> Excel
          </button>
          <button onClick={exportPDF} className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-xl font-semibold hover:bg-rose-700 transition">
            <span className="icon">picture_as_pdf</span> PDF
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl w-fit">
        <button 
          onClick={() => setActiveTab('daily')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'daily' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Rekap Harian
        </button>
        <button 
          onClick={() => setActiveTab('monthly')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'monthly' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Rekap Bulanan
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4">
        {activeTab === 'daily' ? (
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Tanggal</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none" />
          </div>
        ) : (
          <>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Mulai</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Selesai</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none" />
            </div>
          </>
        )}
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Departemen</label>
          <select value={deptId} onChange={e => setDeptId(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none">
            <option value="">Semua Departemen</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nama Karyawan</label>
          <input type="text" placeholder="Cari nama..." value={searchName} onChange={e => setSearchName(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none" />
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
        {loading ? (
          <div className="flex items-center justify-center py-40">
            <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {activeTab === 'daily' ? (
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="px-6 py-4">Karyawan</th>
                    <th className="px-6 py-4">Masuk</th>
                    <th className="px-6 py-4">Istirahat</th>
                    <th className="px-6 py-4">Kembali</th>
                    <th className="px-6 py-4">Pulang</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dailyData.map(d => (
                    <tr key={d.id} className="hover:bg-slate-50/50">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">{d.name}</div>
                        <div className="text-slate-500 text-xs">{d.department}</div>
                      </td>
                      <td className="px-6 py-4 font-mono text-emerald-600 font-semibold">{formatTime(d.clockIn)}</td>
                      <td className="px-6 py-4 font-mono text-amber-600">{formatTime(d.breakStart)}</td>
                      <td className="px-6 py-4 font-mono text-amber-600">{formatTime(d.breakEnd)}</td>
                      <td className="px-6 py-4 font-mono text-rose-600 font-semibold">{formatTime(d.clockOut)}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase
                          ${d.status === 'HADIR' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {d.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button 
                          onClick={() => {
                            setEditModalData({
                              userId: d.id,
                              userName: d.name,
                              date: date,
                              status: d.status,
                              clockInTime: d.clockIn,
                              clockOutTime: d.clockOut,
                              breakStart: d.breakStart,
                              breakEnd: d.breakEnd
                            });
                            setIsModalOpen(true);
                          }}
                          className="p-2 text-primary hover:bg-primary/10 rounded-lg transition"
                          title="Edit Absensi"
                        >
                          <span className="icon text-lg">edit</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left text-[11px] border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase">
                  <tr className="border-b border-slate-200">
                    <th rowSpan={3} className="px-3 py-4 border-r border-slate-200 text-center">No</th>
                    <th rowSpan={3} className="px-4 py-4 border-r border-slate-200 min-w-[150px]">Karyawan</th>
                    <th rowSpan={3} className="px-3 py-4 border-r border-slate-200 text-center">Hadir</th>
                    <th rowSpan={3} className="px-3 py-4 border-r border-slate-200 text-center">SAKIT</th>
                    <th rowSpan={3} className="px-3 py-4 border-r border-slate-200 text-center">IJIN</th>
                    <th rowSpan={3} className="px-3 py-4 border-r border-slate-200 text-center">ALPA</th>
                    <th colSpan={4} className="px-3 py-2 border-r border-slate-200 text-center bg-slate-100/50">INDISIPLINER</th>
                    <th colSpan={2} className="px-3 py-2 text-center bg-slate-100/50">IJIN PRIBADI</th>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <th colSpan={2} className="px-3 py-2 border-r border-slate-200 text-center">TERLAMBAT</th>
                    <th colSpan={2} className="px-3 py-2 border-r border-slate-200 text-center">PULANG CEPAT</th>
                    <th rowSpan={2} className="px-3 py-2 border-r border-slate-200 text-center">{"<"} DARI 1 JAM</th>
                    <th rowSpan={2} className="px-3 py-2 text-center text-center">{">"} DARI 1 JAM</th>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <th className="px-2 py-2 border-r border-slate-200 text-center whitespace-nowrap">1 S.D. 5 MENIT</th>
                    <th className="px-2 py-2 border-r border-slate-200 text-center whitespace-nowrap">6 MENIT KEATAS</th>
                    <th className="px-2 py-2 border-r border-slate-200 text-center whitespace-nowrap">1 S.D. 5 MENIT</th>
                    <th className="px-2 py-2 border-r border-slate-200 text-center whitespace-nowrap">6 MENIT KEATAS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {monthlyData.map((m, i) => (
                    <tr key={i} className="hover:bg-slate-50/50">
                      <td className="px-3 py-3 border-r border-slate-100 text-center">{i + 1}</td>
                      <td className="px-4 py-3 border-r border-slate-100">
                        <div className="font-bold text-slate-900 leading-tight">{m.name}</div>
                        <div className="text-[10px] text-slate-500">{m.department}</div>
                      </td>
                      <td className="px-3 py-3 border-r border-slate-100 text-center font-bold text-primary">{m.hariMasuk}</td>
                      <td className="px-3 py-3 border-r border-slate-100 text-center text-blue-600 font-bold">{m.countSakit}</td>
                      <td className="px-3 py-3 border-r border-slate-100 text-center font-bold text-slate-700">{m.countIzin}</td>
                      <td className="px-3 py-3 border-r border-slate-100 text-center text-red-600 font-extrabold">{m.countAlpa}</td>
                      
                      <td className="px-3 py-3 border-r border-slate-100 text-center text-amber-600 font-bold">{m.late1to5Count}</td>
                      <td className="px-3 py-3 border-r border-slate-100 text-center text-rose-600 font-bold">{m.lateOver5Count}</td>
                      
                      <td className="px-3 py-3 border-r border-slate-100 text-center text-amber-500">{m.early1to5Count}</td>
                      <td className="px-3 py-3 border-r border-slate-100 text-center text-rose-500">{m.earlyOver5Count}</td>
                      
                      <td className="px-3 py-3 border-r border-slate-100 text-center">{m.breakUnder1hCount}</td>
                      <td className="px-3 py-3 text-center text-orange-600 font-bold">{m.breakOver1hCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {!loading && (activeTab === 'daily' ? dailyData : monthlyData).length === 0 && (
              <div className="py-20 text-center text-slate-400">
                <span className="icon text-4xl mb-2 block">database_off</span>
                Tidak ada data ditemukan
              </div>
            )}
          </div>
        )}
      </div>

      <AttendanceEditModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={fetchDaily}
        data={editModalData}
      />
    </div>
  );
}

interface AttendanceEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  data: {
    userId: string;
    userName: string;
    date: string;
    status: string;
    clockInTime: string | null;
    clockOutTime: string | null;
    breakStart: string | null;
    breakEnd: string | null;
  };
}

function AttendanceEditModal({ isOpen, onClose, onSave, data }: AttendanceEditModalProps) {
  const [status, setStatus] = useState(data.status);
  const [clockIn, setClockIn] = useState('');
  const [clockOut, setClockOut] = useState('');
  const [breakStart, setBreakStart] = useState('');
  const [breakEnd, setBreakEnd] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setStatus(data.status);
    setClockIn(data.clockInTime ? new Date(data.clockInTime).toTimeString().slice(0, 5) : '');
    setClockOut(data.clockOutTime ? new Date(data.clockOutTime).toTimeString().slice(0, 5) : '');
    setBreakStart(data.breakStart ? new Date(data.breakStart).toTimeString().slice(0, 5) : '');
    setBreakEnd(data.breakEnd ? new Date(data.breakEnd).toTimeString().slice(0, 5) : '');
  }, [data]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const d = new Date(data.date);
      let clockInISO = null;
      let clockOutISO = null;
      let breakStartISO = null;
      let breakEndISO = null;

      if (clockIn && (status === 'HADIR')) {
        const [h, m] = clockIn.split(':');
        const dIn = new Date(d);
        dIn.setHours(parseInt(h), parseInt(m), 0, 0);
        clockInISO = dIn.toISOString();
      }
      if (clockOut && (status === 'HADIR')) {
        const [h, m] = clockOut.split(':');
        const dOut = new Date(d);
        dOut.setHours(parseInt(h), parseInt(m), 0, 0);
        clockOutISO = dOut.toISOString();
      }
      if (breakStart && (status === 'HADIR')) {
        const [h, m] = breakStart.split(':');
        const dBrkS = new Date(d);
        dBrkS.setHours(parseInt(h), parseInt(m), 0, 0);
        breakStartISO = dBrkS.toISOString();
      }
      if (breakEnd && (status === 'HADIR')) {
        const [h, m] = breakEnd.split(':');
        const dBrkE = new Date(d);
        dBrkE.setHours(parseInt(h), parseInt(m), 0, 0);
        breakEndISO = dBrkE.toISOString();
      }

      await apiRequest('/recap/upsert', {
        method: 'POST',
        body: JSON.stringify({
          userId: data.userId,
          date: data.date,
          status,
          clockInTime: clockInISO,
          clockOutTime: clockOutISO,
          breakStart: breakStartISO,
          breakEnd: breakEndISO
        })
      } as any);
      onSave();
      onClose();
    } catch (err: any) {
      alert(err.message);
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Edit Absensi</h3>
            <p className="text-sm text-slate-500">{data.userName} - {data.date}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition">
            <span className="icon">close</span>
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Status Kehadiran</label>
            <select 
              value={status} 
              onChange={e => setStatus(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-primary outline-none"
            >
              <option value="HADIR">HADIR</option>
              <option value="ALPA">ALPA</option>
              <option value="SAKIT">SAKIT</option>
              <option value="IZIN">IZIN</option>
              <option value="CUTI">CUTI</option>
            </select>
          </div>

          {status === 'HADIR' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Jam Masuk</label>
                  <input 
                    type="time" 
                    value={clockIn} 
                    onChange={e => setClockIn(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Jam Pulang</label>
                  <input 
                    type="time" 
                    value={clockOut} 
                    onChange={e => setClockOut(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Jam Istirahat</label>
                  <input 
                    type="time" 
                    value={breakStart} 
                    onChange={e => setBreakStart(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Jam Kembali</label>
                  <input 
                    type="time" 
                    value={breakEnd} 
                    onChange={e => setBreakEnd(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-100 flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 rounded-2xl font-bold hover:bg-slate-50 transition"
          >
            Batal
          </button>
          <button 
            onClick={handleSave}
            disabled={loading}
            className="flex-1 px-4 py-3 bg-primary text-white rounded-2xl font-bold hover:bg-primary/90 transition shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
          >
            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Simpan Perubahan'}
          </button>
        </div>
      </div>
    </div>
  );
}
