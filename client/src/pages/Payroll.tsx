import { useState, useEffect } from 'react';
import { apiRequest, formatCurrency } from '../lib/api';
import { calculateWorkingDuration, formatDateIndo, MONTH_NAMES } from '../lib/dateUtils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function Payroll() {
  const [current, setCurrent] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlip, setSelectedSlip] = useState<any>(null);
  const [isSlipModalOpen, setIsSlipModalOpen] = useState(false);

  useEffect(() => {
    const fetchPayroll = async () => {
      try {
        const [curr, hist] = await Promise.all([
          apiRequest('/payroll/current'),
          apiRequest('/payroll/history'),
        ]);
        setCurrent(curr);
        setHistory(hist);
      } catch (err) {}
      setLoading(false);
    };
    fetchPayroll();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handlePrintSlip = (slipData: any) => {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text('Slip Gaji Karyawan', 14, 22);
    
    doc.setFontSize(11);
    doc.text(`Nama: ${slipData.user?.name || '-'}`, 14, 32);
    doc.text(`Departemen: ${slipData.user?.department?.name || '-'}`, 14, 38);
    if (slipData.user?.joinDate) {
      doc.text(`TMT: ${formatDateIndo(slipData.user.joinDate)}`, 14, 44);
      doc.text(`Periode: ${MONTH_NAMES[slipData.month]} ${slipData.year}`, 14, 50);
    } else {
      doc.text(`Periode: ${MONTH_NAMES[slipData.month]} ${slipData.year}`, 14, 44);
    }

    let details = slipData.details;
    if (typeof details === 'string') {
      try { details = JSON.parse(details); } catch (e) { details = {}; }
    }

    const breakdown = details?.breakdown || {};

    const tableData = [
      ['Gaji Pokok (Indeks)', formatCurrency(breakdown.basicSalary || slipData.basicSalary)],
      ['Tunjangan Keluarga', formatCurrency(breakdown.familyAllowance || 0)],
      ['Tunjangan Masa Kerja', formatCurrency(breakdown.serviceAllowance || 0)],
      ['Tunjangan Jabatan', formatCurrency(breakdown.positionAllowance || 0)],
      ['Tunjangan Tugas Tambahan', formatCurrency(breakdown.extraAllowance || 0)],
      ['Uang Makan/Transport', formatCurrency(breakdown.eatingTransport || 0)],
      ['Uang Kerajinan Kerja', formatCurrency(breakdown.workDiligence || 0)],
      ['Potongan & Penalti', `-${formatCurrency(breakdown.totalPenalty || slipData.deduction)}`],
      ['', ''], // empty row separator
      ['Total Penghasilan Tetap', formatCurrency(breakdown.totalBasicAndAllowances || 0)],
      ['Total Uang Kehadiran', formatCurrency(breakdown.totalAttendanceAllowance || 0)],
      ['Total Potongan', `-${formatCurrency(breakdown.totalPenalty || slipData.deduction)}`],
      ['Gaji Bersih (Diterima)', formatCurrency(slipData.netSalary)]
    ];

    autoTable(doc, {
      startY: slipData.user?.joinDate ? 56 : 51,
      head: [['Keterangan', 'Jumlah']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] }
    });
    const fileName = `Slip_Gaji_${slipData.user?.name || 'Karyawan'}_${MONTH_NAMES[slipData.month]}_${slipData.year}.pdf`;
    doc.save(fileName.replace(/\s+/g, '_'));
  };

  const parseDetails = (detailsStr: any) => {
    if (!detailsStr) return null;
    if (typeof detailsStr === 'object') return detailsStr;
    try {
      return JSON.parse(detailsStr);
    } catch {
      return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-3 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">Payroll</h2>
        <button
          onClick={handlePrint}
          className="no-print px-4 py-2 bg-primary text-white text-sm font-semibold rounded-xl flex items-center gap-2 hover:bg-primary-dark transition active:scale-95"
        >
          <span className="icon text-lg">print</span>
          Cetak / PDF
        </button>
      </div>

      {/* Current Month Payroll */}
      {current ? (
        <div className="bg-gradient-to-br from-primary to-indigo-600 rounded-3xl p-6 text-white shadow-xl shadow-primary/30">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-blue-100">Gaji Bulan Ini</p>
              <p className="text-lg font-bold">{MONTH_NAMES[current.month]} {current.year}</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
              <span className="icon icon-filled text-2xl">account_balance_wallet</span>
            </div>
          </div>
          <p className="text-3xl font-bold tracking-tight">{formatCurrency(current.netSalary)}</p>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-xs text-blue-200">Gaji Pokok</p>
              <p className="text-sm font-bold mt-1">{formatCurrency(current.basicSalary)}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-xs text-blue-200">Tunjangan</p>
              <p className="text-sm font-bold mt-1">{formatCurrency(current.allowance)}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-xs text-blue-200">Potongan</p>
              <p className="text-sm font-bold mt-1">-{formatCurrency(current.deduction)}</p>
            </div>
          </div>
          {current.paidAt && (
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-1 text-sm text-blue-200">
                <span className="icon text-sm">check_circle</span>
                Sudah dibayarkan
              </div>
              {current.user?.joinDate ? (
                <div className="text-[10px] text-blue-100/70 font-semibold flex items-center gap-1.5">
                  <span className="icon text-[12px]">work</span>
                  {calculateWorkingDuration(current.user.joinDate)}
                </div>
              ) : (
                <div className="text-[10px] text-blue-100/50 italic flex items-center gap-1.5">
                  TMT belum diatur
                </div>
              )}
            </div>
          )}
          {!current.paidAt && (
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-1 text-sm text-amber-300">
                <span className="icon text-sm">schedule</span>
                Belum dibayarkan
              </div>
              {current.user?.joinDate ? (
                <div className="text-[10px] text-blue-100/70 font-semibold flex items-center gap-1.5">
                  <span className="icon text-[12px]">work</span>
                  {calculateWorkingDuration(current.user.joinDate)}
                </div>
              ) : (
                <div className="text-[10px] text-blue-100/50 italic flex items-center gap-1.5">
                  TMT belum diatur
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="glass p-8 rounded-2xl text-center border border-slate-200">
          <span className="icon text-4xl text-slate-300">payments</span>
          <p className="mt-2 text-sm text-slate-400">Data gaji bulan ini belum tersedia</p>
        </div>
      )}

      {/* History */}
      <section>
        <h3 className="text-lg font-bold text-slate-900 mb-3">Riwayat Gaji</h3>
        {history.length > 0 ? (
          <div className="space-y-3">
            {history.map((pay: any) => (
              <div key={pay.id} className="glass p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm text-slate-800">{MONTH_NAMES[pay.month]} {pay.year}</p>
                  <p className="text-xs text-slate-500 mt-0.5 mb-2">
                    Pokok: {formatCurrency(pay.basicSalary)} + Tunjangan: {formatCurrency(pay.allowance)} - Potongan: {formatCurrency(pay.deduction)}
                  </p>
                  {pay.user?.joinDate && (
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] text-slate-400 font-semibold bg-slate-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <span className="icon text-xs">event</span>
                        {formatDateIndo(pay.user.joinDate)}
                      </span>
                      <span className="text-[10px] text-primary/70 font-bold">
                        {calculateWorkingDuration(pay.user.joinDate)}
                      </span>
                    </div>
                  )}
                  <button 
                    onClick={() => {
                      setSelectedSlip(pay);
                      setIsSlipModalOpen(true);
                    }}
                    className="text-xs px-3 py-1.5 bg-indigo-50 text-indigo-600 font-bold rounded-lg hover:bg-indigo-100 transition"
                  >
                    Detail Slip
                  </button>
                </div>
                <div className="text-right">
                  <p className="font-bold text-primary">{formatCurrency(pay.netSalary)}</p>
                  <p className="text-xs mt-0.5">
                    {pay.paidAt ? (
                      <span className="text-emerald-600 flex items-center gap-0.5 justify-end">
                        <span className="icon text-xs">check_circle</span> Dibayar
                      </span>
                    ) : (
                      <span className="text-amber-600">Pending</span>
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="glass p-8 rounded-2xl text-center border border-slate-200">
            <p className="text-sm text-slate-400">Belum ada riwayat gaji</p>
          </div>
        )}
      </section>

      {/* Slip Modal */}
      {isSlipModalOpen && selectedSlip && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-primary/5 to-transparent">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Detail Slip Gaji</h3>
                <p className="text-sm text-slate-500">{MONTH_NAMES[selectedSlip.month]} {selectedSlip.year}</p>
                <p className="text-sm font-bold mt-1 text-slate-800">
                  {selectedSlip.user?.name || '-'} 
                  <span className="text-slate-500 font-normal"> | {selectedSlip.user?.department?.name || '-'}</span>
                </p>
                {selectedSlip.user?.joinDate && (
                  <div className="mt-2 text-[10px] text-slate-400 font-semibold flex items-center gap-2">
                    <span>TMT: {formatDateIndo(selectedSlip.user.joinDate)}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                    <span>Masa Kerja: {calculateWorkingDuration(selectedSlip.user.joinDate)}</span>
                  </div>
                )}
              </div>
              <button onClick={() => setIsSlipModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-xl transition">
                <span className="icon">close</span>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-4">
                <div className="text-xs text-slate-500 mb-1">Total Pendapatan Bersih</div>
                <div className="text-3xl font-bold text-primary">{formatCurrency(selectedSlip.netSalary)}</div>
              </div>

              <div className="space-y-2">
                <div className="bg-slate-50 p-4 rounded-2xl space-y-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase">Penghasilan Tetap</h4>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-600">Gaji Pokok (Indeks)</span>
                    <span className="font-semibold text-slate-900">{formatCurrency(parseDetails(selectedSlip.details)?.breakdown?.basicSalary || selectedSlip.basicSalary)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-600">Tunjangan Keluarga</span>
                    <span className="font-semibold text-slate-900">{formatCurrency(parseDetails(selectedSlip.details)?.breakdown?.familyAllowance || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-600">Tunjangan Masa Kerja</span>
                    <span className="font-semibold text-slate-900">{formatCurrency(parseDetails(selectedSlip.details)?.breakdown?.serviceAllowance || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-600">Tunjangan Jabatan</span>
                    <span className="font-semibold text-slate-900">{formatCurrency(parseDetails(selectedSlip.details)?.breakdown?.positionAllowance || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-600">Tunjangan Tugas Tambahan</span>
                    <span className="font-semibold text-slate-900">{formatCurrency(parseDetails(selectedSlip.details)?.breakdown?.extraAllowance || 0)}</span>
                  </div>
                </div>

                <div className="bg-emerald-50/50 p-4 rounded-2xl space-y-2 border border-emerald-100/50">
                  <h4 className="text-xs font-bold text-emerald-600 uppercase">Uang Kehadiran</h4>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-600">Uang Makan/Transport</span>
                    <span className="font-semibold text-slate-900">{formatCurrency(parseDetails(selectedSlip.details)?.breakdown?.eatingTransport || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-600">Uang Kerajinan Kerja</span>
                    <span className="font-semibold text-slate-900">{formatCurrency(parseDetails(selectedSlip.details)?.breakdown?.workDiligence || 0)}</span>
                  </div>
                </div>

                <div className="bg-rose-50/50 p-4 rounded-2xl space-y-2 border border-rose-100/50">
                  <h4 className="text-xs font-bold text-rose-600 uppercase">Potongan & Penalti</h4>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-600">Keterlambatan / Ketidakhadiran</span>
                    <span className="font-semibold text-rose-600">-{formatCurrency(parseDetails(selectedSlip.details)?.breakdown?.totalPenalty || selectedSlip.deduction)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-slate-100 flex gap-3 bg-slate-50/50">
              <button 
                onClick={() => setIsSlipModalOpen(false)}
                className="flex-1 px-4 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition"
              >
                Tutup
              </button>
              <button 
                onClick={() => handlePrintSlip(selectedSlip)}
                className="flex-1 px-4 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
              >
                <span className="icon text-sm">print</span>
                Cetak Slip PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
