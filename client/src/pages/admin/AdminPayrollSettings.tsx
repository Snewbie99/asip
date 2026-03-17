import { useState, useEffect } from 'react';
import { apiRequest, formatCurrency } from '../../lib/api';

export default function AdminPayrollSettings() {
  const [rates, setRates] = useState<any[]>([]);
  const [config, setConfig] = useState<any>({
    periodStartDay: 21,
    wifeAllowancePercent: 10,
    childAllowancePercent: 5,
    maxChildren: 2,
    lateLowThreshold: 1,
    lateHighThreshold: 5,
    lateLowPenaltyPercent: 50,
    lateLowPenaltySource: "workDiligence",
    lateHighPenaltyPercent: 100,
    lateHighPenaltySource: "workDiligence",
    breakThreshold: 60,
    breakLowPenaltyPercent: 0,
    breakLowPenaltySource: "workDiligence",
    breakHighPenaltyPercent: 100,
    breakHighPenaltySource: "workDiligence"
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Rate Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<any>(null);
  const [rateForm, setRateForm] = useState({
    categoryName: '',
    basicSalary: 0,
    eatingTransport: 0,
    workDiligence: 0,
    type: 'PEGAWAI'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ratesData, configData] = await Promise.all([
        apiRequest('/payroll-management/rates'),
        apiRequest('/payroll-management/config')
      ]);
      setRates(ratesData || []);
      if (configData) setConfig(configData);
    } catch (err) {}
    setLoading(false);
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      await apiRequest('/payroll-management/config', {
        method: 'POST',
        body: JSON.stringify(config)
      });
      alert('Konfigurasi berhasil disimpan');
    } catch (err: any) {
      alert(err.message);
    }
    setSaving(false);
  };

  const handleOpenAdd = () => {
    setEditingRate(null);
    setRateForm({ categoryName: '', basicSalary: 0, eatingTransport: 0, workDiligence: 0, type: 'PEGAWAI' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (rate: any) => {
    setEditingRate(rate);
    setRateForm({ ...rate });
    setIsModalOpen(true);
  };

  const handleRateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingRate) {
        await apiRequest(`/payroll-management/rates/${editingRate.id}`, {
          method: 'PUT',
          body: JSON.stringify(rateForm)
        });
      } else {
        await apiRequest('/payroll-management/rates', {
          method: 'POST',
          body: JSON.stringify(rateForm)
        });
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
    setSaving(false);
  };

  const handleDeleteRate = async (id: string, name: string) => {
    if (!confirm(`Hapus kategori ${name}?`)) return;
    try {
      await apiRequest(`/payroll-management/rates/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Memuat pengaturan...</div>;
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Konfigurasi Payroll</h2>
          <p className="text-slate-500 mt-1">Atur standar gaji, uang kehadiran, dan periode cut-off</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Section 1: Periode Absensi */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-primary/40"></div>
          <div className="p-6 pb-0">
            <h3 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2">
              <span className="icon text-primary">calendar_month</span>
              1. Pengaturan Periode Gaji
            </h3>
            <div className="max-w-md space-y-2 mb-6">
              <label className="block text-sm font-semibold text-slate-700">Mulai Periode Absensi (Tanggal)</label>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <select
                  value={config.periodStartDay}
                  onChange={e => setConfig({...config, periodStartDay: parseInt(e.target.value)})}
                  className="w-full sm:w-48 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all"
                >
                  <option value={1}>Tanggal 1</option>
                  <option value={21}>Tanggal 21</option>
                </select>
                <p className="text-sm text-slate-500 italic">
                  {config.periodStartDay === 21 ? 'Contoh: 21 Jan – 20 Feb' : 'Contoh: 1 Jan – 31 Jan'}
                </p>
              </div>
            </div>
          </div>
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
             <button
               disabled={saving}
               onClick={handleSaveConfig}
               className="bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-xl font-bold transition shadow-md shadow-primary/20 disabled:opacity-50 flex items-center gap-2 text-sm"
             >
               {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span> : <span className="icon text-lg">save</span>}
               Simpan Periode
             </button>
          </div>
        </div>

        {/* Section 2: Tunjangan */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500/40"></div>
          <div className="p-6 pb-0">
            <h3 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2">
              <span className="icon text-emerald-600">payments</span>
              2. Pengaturan Tunjangan Keluarga
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">Tunjangan Istri (% Nilai Satuan Gaji)</label>
                <div className="relative">
                  <input
                    type="number" min={0} max={100} step={0.1}
                    value={config.wifeAllowancePercent}
                    onChange={e => setConfig({...config, wifeAllowancePercent: parseFloat(e.target.value) || 0})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/50 outline-none pr-10"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">Tunjangan Anak (% per Anak)</label>
                <div className="relative">
                  <input
                    type="number" min={0} max={100} step={0.1}
                    value={config.childAllowancePercent}
                    onChange={e => setConfig({...config, childAllowancePercent: parseFloat(e.target.value) || 0})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/50 outline-none pr-10"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">Maksimal Anak Ditanggung</label>
                <input
                  type="number" min={0} max={10}
                  value={config.maxChildren}
                  onChange={e => setConfig({...config, maxChildren: parseInt(e.target.value) || 0})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/50 outline-none"
                />
              </div>
            </div>
          </div>
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
             <button
               disabled={saving}
               onClick={handleSaveConfig}
               className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold transition shadow-md shadow-emerald-600/20 disabled:opacity-50 flex items-center gap-2 text-sm"
             >
               {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span> : <span className="icon text-lg">save</span>}
               Simpan Tunjangan
             </button>
          </div>
        </div>

        {/* Section 3: Potongan & Potongan */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-500/40"></div>
          <div className="p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <span className="icon text-rose-600">timer_off</span>
              3. Pengaturan Potongan & Toleransi
            </h3>
            
            <div className="space-y-8">
              {/* Lateness Group */}
              <div>
                <h4 className="text-sm font-bold text-rose-600 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span className="icon text-sm">schedule</span> Potongan Terlambat
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Late Low */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-slate-700">1. Telat {'>'} {config.lateLowThreshold} Menit</span>
                      <div className="flex items-center gap-2">
                        <input 
                          type="number" className="w-16 px-2 py-1 bg-white border border-slate-200 rounded text-xs"
                          value={config.lateLowThreshold}
                          onChange={e => setConfig({...config, lateLowThreshold: parseInt(e.target.value) || 0})}
                        />
                        <span className="text-[10px] text-slate-400">menit</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-500">Besar Potongan (%)</label>
                        <div className="relative">
                          <input
                            type="number" min={0} max={100}
                            value={config.lateLowPenaltyPercent}
                            onChange={e => setConfig({...config, lateLowPenaltyPercent: parseFloat(e.target.value) || 0})}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm pr-7"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">%</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-500">Dipotong Dari</label>
                        <select
                          value={config.lateLowPenaltySource}
                          onChange={e => setConfig({...config, lateLowPenaltySource: e.target.value})}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                        >
                          <option value="workDiligence">Kerajinan Kerja</option>
                          <option value="basicSalary">Nilai Satuan Gaji</option>
                          <option value="eatingTransport">Uang Makan/Transp</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Late High */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-slate-700">2. Telat {'>'} {config.lateHighThreshold} Menit</span>
                      <div className="flex items-center gap-2">
                        <input 
                          type="number" className="w-16 px-2 py-1 bg-white border border-slate-200 rounded text-xs"
                          value={config.lateHighThreshold}
                          onChange={e => setConfig({...config, lateHighThreshold: parseInt(e.target.value) || 0})}
                        />
                        <span className="text-[10px] text-slate-400">menit</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-500">Besar Potongan (%)</label>
                        <div className="relative">
                          <input
                            type="number" min={0} max={100}
                            value={config.lateHighPenaltyPercent}
                            onChange={e => setConfig({...config, lateHighPenaltyPercent: parseFloat(e.target.value) || 0})}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm pr-7"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">%</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-500">Dipotong Dari</label>
                        <select
                          value={config.lateHighPenaltySource}
                          onChange={e => setConfig({...config, lateHighPenaltySource: e.target.value})}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                        >
                          <option value="workDiligence">Kerajinan Kerja</option>
                          <option value="basicSalary">Nilai Satuan Gaji</option>
                          <option value="eatingTransport">Uang Makan/Transp</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Break Group */}
              <div>
                <h4 className="text-sm font-bold text-rose-600 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span className="icon text-sm">logout</span> Potongan Izin Keluar / Istirahat
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Break Low */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-slate-700">3. Izin {'<'} {config.breakThreshold} Menit</span>
                      <div className="flex items-center gap-2">
                        <input 
                          type="number" className="w-16 px-2 py-1 bg-white border border-slate-200 rounded text-xs"
                          value={config.breakThreshold}
                          onChange={e => setConfig({...config, breakThreshold: parseInt(e.target.value) || 0})}
                        />
                        <span className="text-[10px] text-slate-400">menit</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-500">Besar Potongan (%)</label>
                        <div className="relative">
                          <input
                            type="number" min={0} max={100}
                            value={config.breakLowPenaltyPercent}
                            onChange={e => setConfig({...config, breakLowPenaltyPercent: parseFloat(e.target.value) || 0})}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm pr-7"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">%</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-500">Dipotong Dari</label>
                        <select
                          value={config.breakLowPenaltySource}
                          onChange={e => setConfig({...config, breakLowPenaltySource: e.target.value})}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                        >
                          <option value="workDiligence">Kerajinan Kerja</option>
                          <option value="basicSalary">Nilai Satuan Gaji</option>
                          <option value="eatingTransport">Uang Makan/Transp</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Break High */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-slate-700">4. Izin {'>'}= {config.breakThreshold} Menit</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-500">Besar Potongan (%)</label>
                        <div className="relative">
                          <input
                            type="number" min={0} max={100}
                            value={config.breakHighPenaltyPercent}
                            onChange={e => setConfig({...config, breakHighPenaltyPercent: parseFloat(e.target.value) || 0})}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm pr-7"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">%</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-500">Dipotong Dari</label>
                        <select
                          value={config.breakHighPenaltySource}
                          onChange={e => setConfig({...config, breakHighPenaltySource: e.target.value})}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                        >
                          <option value="workDiligence">Kerajinan Kerja</option>
                          <option value="basicSalary">Nilai Satuan Gaji</option>
                          <option value="eatingTransport">Uang Makan/Transp</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
             <button
               disabled={saving}
               onClick={handleSaveConfig}
               className="bg-rose-600 hover:bg-rose-700 text-white px-5 py-2.5 rounded-xl font-bold transition shadow-md shadow-rose-600/20 disabled:opacity-50 flex items-center gap-2 text-sm"
             >
               {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span> : <span className="icon text-lg">save</span>}
               Simpan Potongan
             </button>
          </div>
        </div>
      </div>

      {/* Rates Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <span className="icon text-primary">account_balance_wallet</span>
            Kategori & Nilai Satuan Gaji
          </h3>
          <button 
            onClick={handleOpenAdd}
            className="flex items-center gap-2 text-primary hover:bg-primary/10 px-4 py-2 rounded-xl font-semibold transition"
          >
            <span className="icon">add</span>
            Tambah Kategori
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="px-6 py-4">Kategori (Status)</th>
                <th className="px-6 py-4">Tipe</th>
                <th className="px-6 py-4">Gaji Pokok</th>
                <th className="px-6 py-4">Makan & Transport</th>
                <th className="px-6 py-4">Kerajinan Kerja</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rates.map(rate => (
                <tr key={rate.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-900">{rate.categoryName}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${rate.type === 'PEGAWAI' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                      {rate.type}
                    </span>
                  </td>
                  <td className="px-6 py-4">{formatCurrency(rate.basicSalary)}</td>
                  <td className="px-6 py-4">{formatCurrency(rate.eatingTransport)}</td>
                  <td className="px-6 py-4">{formatCurrency(rate.workDiligence)}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => handleOpenEdit(rate)} className="w-8 h-8 rounded-lg flex items-center justify-center text-blue-600 hover:bg-blue-50">
                        <span className="icon text-sm">edit</span>
                      </button>
                      <button onClick={() => handleDeleteRate(rate.id, rate.categoryName)} className="w-8 h-8 rounded-lg flex items-center justify-center text-rose-600 hover:bg-rose-50">
                        <span className="icon text-sm">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rate Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-[100] flex items-center justify-center p-4">
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <h3 className="font-bold text-slate-900">{editingRate ? 'Edit Kategori' : 'Tambah Kategori'}</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <span className="icon">close</span>
                </button>
              </div>
              <form onSubmit={handleRateSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Nama Kategori (Status)</label>
                  <input required value={rateForm.categoryName} onChange={e => setRateForm({...rateForm, categoryName: e.target.value})} className="w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-primary" placeholder="Misal: PTY" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Tipe</label>
                  <select value={rateForm.type} onChange={e => setRateForm({...rateForm, type: e.target.value})} className="w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-primary">
                    <option value="PEGAWAI">PEGAWAI (Kepsek, PTY, PT, PTT, Magang)</option>
                    <option value="KARYAWAN">KARYAWAN (KTU, KTY, KT, KTT, Kontrak)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Gaji Pokok (per hari)</label>
                  <input type="number" required value={rateForm.basicSalary} onChange={e => setRateForm({...rateForm, basicSalary: parseFloat(e.target.value) || 0})} className="w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">U. Makan & Transport (per hari)</label>
                  <input type="number" required value={rateForm.eatingTransport} onChange={e => setRateForm({...rateForm, eatingTransport: parseFloat(e.target.value) || 0})} className="w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">U. Kerajinan Kerja (per hari)</label>
                  <input type="number" required value={rateForm.workDiligence} onChange={e => setRateForm({...rateForm, workDiligence: parseFloat(e.target.value) || 0})} className="w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition">Batal</button>
                  <button type="submit" disabled={saving} className="flex-1 px-4 py-2 font-semibold text-white bg-primary hover:bg-primary-dark rounded-xl transition disabled:opacity-50">
                    {saving ? 'Menyimpan...' : 'Simpan'}
                  </button>
                </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}
