import { useState, useEffect, useMemo } from 'react';
import { apiRequest, formatDate } from '../../lib/api';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface LeaveRequest {
  id: string;
  userId: string;
  type: string;
  startDate: string;
  endDate: string;
  reason: string | null;
  photoUrl: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  user: {
    name: string;
    employeeId: string;
  };
}

export default function AdminLeaves() {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [filterMonth, setFilterMonth] = useState<string>('current'); // 'current', 'last', 'all'

  useEffect(() => {
    fetchLeaves();
  }, []);

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/leaves');
      setLeaves(data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const filteredLeaves = useMemo(() => {
    if (filterMonth === 'all') return leaves;
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    return leaves.filter(leave => {
      const leaveDate = new Date(leave.startDate);
      const leaveMonth = leaveDate.getMonth();
      const leaveYear = leaveDate.getFullYear();
      
      if (filterMonth === 'current') {
        return leaveMonth === currentMonth && leaveYear === currentYear;
      } else if (filterMonth === 'last') {
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
        return leaveMonth === lastMonth && leaveYear === lastMonthYear;
      }
      return true;
    });
  }, [leaves, filterMonth]);

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    if (!confirm(`Apakah Anda yakin ingin ${action === 'approve' ? 'menyetujui' : 'menolak'} pengajuan ini?`)) return;
    
    setProcessing(id);
    try {
      await apiRequest(`/leaves/${id}/${action}`, { method: 'PUT' });
      fetchLeaves();
    } catch (err: any) {
      alert('Gagal: ' + err.message);
    }
    setProcessing(null);
  };

  const exportExcel = () => {
    const data = filteredLeaves.map(l => ({
      'Nama Karyawan': l.user.name,
      'ID Karyawan': l.user.employeeId,
      'Jenis Izin': leaveTypes[l.type] || l.type,
      'Alasan': l.reason || '-',
      'Tanggal Mulai': formatDate(l.startDate),
      'Tanggal Selesai': formatDate(l.endDate),
      'Status': l.status
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pengajuan Izin");
    XLSX.writeFile(wb, `Rekap_Izin_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text('Rekap Pengajuan Izin', 14, 15);
    
    const tableData = filteredLeaves.map(l => [
      l.user.name,
      l.user.employeeId,
      leaveTypes[l.type] || l.type,
      `${formatDate(l.startDate)}${l.startDate !== l.endDate ? ` - ${formatDate(l.endDate)}` : ''}`,
      l.status
    ]);
    
    autoTable(doc, {
      head: [['Nama', 'ID', 'Jenis', 'Tanggal', 'Status']],
      body: tableData,
      startY: 20,
    });
    
    doc.save(`Rekap_Izin_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const statusColors = {
    PENDING: 'bg-amber-100 text-amber-700',
    APPROVED: 'bg-emerald-100 text-emerald-700',
    REJECTED: 'bg-red-100 text-red-700',
  };

  const leaveTypes: Record<string, string> = {
    SAKIT: 'Sakit',
    CUTI: 'Cuti',
    IZIN_PRIBADI: 'Izin Pribadi',
    DINAS_LUAR: 'Dinas Luar',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Pengajuan Izin</h2>
          <p className="text-slate-500 mt-1">Kelola permohonan izin, sakit, dan cuti karyawan</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={exportExcel}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition shadow-sm"
          >
            <span className="icon text-lg">description</span>
            Excel
          </button>
          <button 
            onClick={exportPDF}
            className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-xl font-semibold hover:bg-rose-700 transition shadow-sm"
          >
            <span className="icon text-lg">picture_as_pdf</span>
            PDF
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center gap-4 shadow-sm">
        <span className="text-sm font-semibold text-slate-600">Filter Bulan:</span>
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button 
            onClick={() => setFilterMonth('current')}
            className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${filterMonth === 'current' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Bulan Ini
          </button>
          <button 
            onClick={() => setFilterMonth('last')}
            className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${filterMonth === 'last' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Bulan Lalu
          </button>
          <button 
            onClick={() => setFilterMonth('all')}
            className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${filterMonth === 'all' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Semua
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="px-6 py-4">Karyawan</th>
                <th className="px-6 py-4">Tipe / Alasan</th>
                <th className="px-6 py-4">Tanggal</th>
                <th className="px-6 py-4">Lampiran</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLeaves.length > 0 ? (
                filteredLeaves.map((leave) => (
                  <tr key={leave.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{leave.user.name}</div>
                      <div className="text-slate-500 text-xs mt-0.5">{leave.user.employeeId}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-700">{leaveTypes[leave.type] || leave.type}</div>
                      <div className="text-slate-500 text-xs mt-0.5 truncate max-w-[200px]" title={leave.reason || ''}>
                        {leave.reason || 'Tanpa keterangan'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-700">
                        {formatDate(leave.startDate)}
                        {leave.startDate !== leave.endDate && (
                          <div className="text-slate-400 text-xs mt-0.5 whitespace-nowrap">s/d {formatDate(leave.endDate)}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {leave.photoUrl ? (
                        <a 
                          href={`http://localhost:5000${leave.photoUrl}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-primary hover:underline font-semibold"
                        >
                          <span className="icon text-sm">image</span>
                          Lihat Bukti
                        </a>
                      ) : (
                        <span className="text-slate-400 text-xs italic">Tidak ada</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold ${statusColors[leave.status]}`}>
                        {leave.status === 'PENDING' ? 'MENUNGGU' : leave.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {leave.status === 'PENDING' ? (
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleAction(leave.id, 'approve')}
                            disabled={!!processing}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                          >
                            Setujui
                          </button>
                          <button 
                            onClick={() => handleAction(leave.id, 'reject')}
                            disabled={!!processing}
                            className="bg-rose-500 hover:bg-rose-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                          >
                            Tolak
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                           <span className="text-slate-400 text-xs italic">Selesai</span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    <span className="icon text-4xl text-slate-200 mb-2 block">content_paste_off</span>
                    Tidak ada data pengajuan untuk periode ini
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
