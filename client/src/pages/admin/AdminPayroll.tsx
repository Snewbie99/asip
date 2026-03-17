import { useState, useEffect } from 'react';
import { apiRequest, formatCurrency } from '../../lib/api';
import { calculateWorkingDuration, formatDateIndo, MONTH_NAMES, MONTH_OPTIONS } from '../../lib/dateUtils';
import { Link } from 'react-router-dom';

export default function AdminPayroll() {
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [config, setConfig] = useState<any>(null);
  
  const [filters, setFilters] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });
  const [selectedSlip, setSelectedSlip] = useState<any>(null);

  const months = MONTH_OPTIONS;

  const years = [2024, 2025, 2026];

  useEffect(() => {
    fetchConfig();
    fetchPayrolls();
  }, [filters]);

  const fetchConfig = async () => {
    try {
      const data = await apiRequest('/payroll-management/config');
      setConfig(data);
    } catch (err) {}
  };

  const fetchPayrolls = async () => {
    setLoading(true);
    try {
      // We'll need a new endpoint for admin to list all payrolls for a specific period
      // For now, let's use a placeholder if the endpoint isn't ready
      // I'll add GET /api/payroll/admin/list later, but for now let's assume it exists
      const data = await apiRequest(`/payroll/admin/list?month=${filters.month}&year=${filters.year}`);
      setPayrolls(data || []);
    } catch (err) {
      setPayrolls([]);
    }
    setLoading(false);
  };

  const handleGenerate = async () => {
    if (!confirm(`Generate payroll untuk ${months.find(m => m.value === filters.month)?.label} ${filters.year}? Data yang sudah ada akan diperbarui.`)) return;
    setGenerating(true);
    try {
      await apiRequest('/payroll/generate', {
        method: 'POST',
        body: JSON.stringify(filters)
      });
      fetchPayrolls();
      alert('Payroll berhasil digenerate');
    } catch (err: any) {
      alert(err.message);
    }
    setGenerating(false);
  };
  
  const handlePay = async (id: string) => {
    if (!confirm('Tandai payroll ini sebagai sudah dibayar?')) return;
    try {
      await apiRequest(`/payroll/admin/process-pay/${id}`, { method: 'PATCH' });
      fetchPayrolls();
    } catch (err: any) {
      alert('Gagal memproses pembayaran: ' + err.message);
    }
  };

  const getPeriodRange = () => {
    if (!config) return '';
    const { month, year } = filters;
    const startDay = config.periodStartDay || 1;

    if (startDay === 1) {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0);
      return `${start.toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })} - ${end.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`;
    } else {
      // Example: month=3 (March), year=2026, startDay=21
      // Start: 21 Feb 2026, End: 20 Mar 2026
      const start = new Date(year, month - 2, startDay);
      const end = new Date(year, month - 1, startDay - 1);
      return `${start.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: start.getFullYear() !== end.getFullYear() ? 'numeric' : undefined })} - ${end.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`;
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Manajemen Payroll</h2>
          <p className="text-slate-500 mt-1 flex items-center gap-2">
            <span className="icon text-sm">calendar_today</span>
            Periode: <span className="font-semibold text-primary">{getPeriodRange()}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link 
            to="/admin/payroll/settings"
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition"
          >
            <span className="icon text-lg">settings</span>
            Pengaturan
          </Link>
          <button 
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl transition shadow-lg shadow-primary/20 disabled:opacity-50"
          >
            <span className={`icon ${generating ? 'animate-spin' : ''}`}>refresh</span>
            {generating ? 'Generating...' : 'Generate Payroll'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-wrap gap-4 shadow-sm">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5 ml-1">Bulan</label>
          <select 
            value={filters.month} 
            onChange={e => setFilters({...filters, month: parseInt(e.target.value)})}
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/50"
          >
            {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
        <div className="w-32">
          <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5 ml-1">Tahun</label>
          <select 
            value={filters.year} 
            onChange={e => setFilters({...filters, year: parseInt(e.target.value)})}
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/50"
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Payroll Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
              <tr>
                <th className="px-6 py-4">Karyawan</th>
                <th className="px-6 py-4">Gaji Pokok</th>
                <th className="px-6 py-4">Tunjangan</th>
                <th className="px-6 py-4">Uang Kehadiran</th>
                <th className="px-6 py-4">Potongan</th>
                <th className="px-6 py-4">Total Diterima</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">Memuat data...</td>
                </tr>
              ) : payrolls.length > 0 ? (
                payrolls.map(pay => (
                  <tr key={pay.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{pay.user.name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{pay.user.employeeId}</div>
                    </td>
                    <td className="px-6 py-4">{formatCurrency(pay.basicSalary)}</td>
                    <td className="px-6 py-4">{formatCurrency(pay.allowance)}</td>
                    <td className="px-6 py-4">{formatCurrency(pay.attendanceAllowance || 0)}</td>
                    <td className="px-6 py-4 text-rose-600">-{formatCurrency(pay.deduction)}</td>
                    <td className="px-6 py-4 font-bold text-primary">{formatCurrency(pay.netSalary)}</td>
                    <td className="px-6 py-4">
                      {pay.paidAt ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">DIBAYAR</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">PENDING</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button 
                        onClick={() => setSelectedSlip(pay)}
                        className="text-primary hover:underline font-semibold"
                      >
                        Slip
                      </button>
                      {!pay.paidAt && (
                        <button 
                          onClick={() => handlePay(pay.id)}
                          className="bg-primary text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-primary-dark transition"
                        >
                          Bayar
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-20 text-center">
                    <div className="max-w-xs mx-auto">
                      <span className="icon text-4xl text-slate-200 mb-2 block">payments</span>
                      <p className="text-slate-400 text-sm">Belum ada data payroll untuk periode ini. Klik <b>Generate Payroll</b> untuk memulai.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {selectedSlip && <SlipModal payroll={selectedSlip} onClose={() => setSelectedSlip(null)} />}
    </div>
  );
}

function SlipModal({ payroll, onClose }: { payroll: any, onClose: () => void }) {
  const details = payroll.details?.breakdown || {};
  
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition"
        >
          <span className="icon text-2xl">close</span>
        </button>
        
        <div className="p-8">
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-slate-900">Slip Gaji Digital</h3>
            <p className="text-slate-500 text-sm mt-1">{payroll.user.name} • {payroll.user.employeeId}</p>
            <p className="text-xs text-primary font-bold mt-1">{MONTH_NAMES[payroll.month]} {payroll.year}</p>
            {payroll.user.joinDate && (
              <div className="mt-2 text-[10px] text-slate-400 font-semibold flex items-center justify-center gap-2">
                <span>TMT: {formatDateIndo(payroll.user.joinDate)}</span>
                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                <span>Masa Kerja: {calculateWorkingDuration(payroll.user.joinDate)}</span>
              </div>
            )}
          </div>

          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
            <div className="bg-slate-50 p-4 rounded-2xl space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase">Penghasilan Tetap</h4>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600">Gaji Pokok (Indeks)</span>
                <span className="font-semibold text-slate-900">{formatCurrency(details.basicSalary || payroll.basicSalary)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600">Tunjangan Keluarga</span>
                <span className="font-semibold text-slate-900">{formatCurrency(details.familyAllowance || 0)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600">Tunjangan Masa Kerja</span>
                <span className="font-semibold text-slate-900">{formatCurrency(details.serviceAllowance || 0)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600">Tunjangan Jabatan</span>
                <span className="font-semibold text-slate-900">{formatCurrency(details.positionAllowance || 0)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600">Tunjangan Tugas Tambahan</span>
                <span className="font-semibold text-slate-900">{formatCurrency(details.extraAllowance || 0)}</span>
              </div>
            </div>

            <div className="bg-emerald-50/50 p-4 rounded-2xl space-y-2">
              <h4 className="text-xs font-bold text-emerald-600 uppercase">Uang Kehadiran</h4>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600">Uang Makan/Transport</span>
                <span className="font-semibold text-slate-900">{formatCurrency(details.eatingTransport || 0)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600">Uang Kerajinan Kerja</span>
                <span className="font-semibold text-slate-900">{formatCurrency(details.workDiligence || 0)}</span>
              </div>
            </div>

            <div className="bg-rose-50/50 p-4 rounded-2xl space-y-2">
              <h4 className="text-xs font-bold text-rose-600 uppercase">Potongan & Penalti</h4>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600">Keterlambatan / Ketidakhadiran</span>
                <span className="font-semibold text-rose-600">-{formatCurrency(details.totalPenalty || payroll.deduction)}</span>
              </div>
            </div>

            <div className="pt-4 flex justify-between items-center border-t border-slate-200 mt-4 px-2">
              <span className="text-lg font-bold text-slate-900">Total Gaji Bersih</span>
              <span className="text-xl font-extrabold text-primary">{formatCurrency(payroll.netSalary)}</span>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-200">
            <div className="flex flex-col gap-2 bg-slate-50 p-3 rounded-xl border border-dashed border-slate-200">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400 font-bold uppercase">Status Pembayaran</span>
                <span className={payroll.paidAt ? "text-emerald-600 font-bold" : "text-amber-600 font-bold"}>
                  {payroll.paidAt ? "SUDAH DIBAYAR" : "PENDING (BELUM DIBAYAR)"}
                </span>
              </div>
              {payroll.paidAt && (
                <div className="flex justify-between text-[10px] text-slate-400 italic">
                  <span>Waktu Transfer / Pembayaran</span>
                  <span>{new Date(payroll.paidAt).toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4 mt-6">
              <button 
                onClick={onClose}
                className="py-3 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition"
              >
                Kembali
              </button>
              <button 
                onClick={() => window.print()}
                className="py-3 bg-primary text-white font-bold rounded-2xl hover:bg-primary-dark transition flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
              >
                <span className="icon">print</span>
                Cetak Slip
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
