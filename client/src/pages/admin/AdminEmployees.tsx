import { useState, useEffect } from 'react';
import { apiRequest } from '../../lib/api';
import { calculateWorkingDuration, formatDateIndo } from '../../lib/dateUtils';
import * as XLSX from 'xlsx';

interface Employee {
  id: string;
  name: string;
  employeeId: string;
  email: string | null;
  role: string;
  departmentId: string | null;
  departmentName: string | null;
  employeeStatus: string | null;
  hasSpouse: boolean;
  childCount: number;
  positionAllowance: number;
  serviceAllowancePercent: number;
  salaryIndex: number;
  extraAllowance: number;
  joinDate: string | null;
}

export default function AdminEmployees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [payrollRates, setPayrollRates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  // Department Modal State
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [deptName, setDeptName] = useState('');
  const [editingDeptId, setEditingDeptId] = useState<string | null>(null);

  // Import Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ message: string; imported: number; skipped: number; errors: string[] } | null>(null);
  const [importError, setImportError] = useState('');
  
  // Form State
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    employeeId: '',
    email: '',
    password: '',
    role: 'PEGAWAI',
    departmentId: '',
    employeeStatus: '',
    hasSpouse: false,
    childCount: 0,
    positionAllowance: 0,
    serviceAllowancePercent: 0,
    salaryIndex: 1.0,
    extraAllowance: 0,
    joinDate: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [empData, deptData, rateData] = await Promise.all([
        apiRequest('/employees'),
        apiRequest('/employees/departments/list'),
        apiRequest('/payroll-management/rates'),
      ]);
      setEmployees(empData);
      setDepartments(deptData || []);
      setPayrollRates(rateData || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(search.toLowerCase()) || 
                          emp.employeeId.toLowerCase().includes(search.toLowerCase());
    const matchesDept = filterDept ? emp.departmentId === filterDept : true;
    return matchesSearch && matchesDept;
  });

  const handleOpenAdd = () => {
    setModalMode('add');
    setFormData({ 
      id: '', name: '', employeeId: '', email: '', password: '', role: 'PEGAWAI', departmentId: '',
      employeeStatus: '', hasSpouse: false, childCount: 0, positionAllowance: 0, serviceAllowancePercent: 0,
      salaryIndex: 1.0, extraAllowance: 0, joinDate: ''
    });
    setError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (emp: Employee) => {
    setModalMode('edit');
    setFormData({ 
      id: emp.id, 
      name: emp.name, 
      employeeId: emp.employeeId, 
      email: emp.email || '', 
      password: '', // blank password unless changing
      role: emp.role, 
      departmentId: emp.departmentId || '',
      employeeStatus: emp.employeeStatus || '',
      hasSpouse: emp.hasSpouse || false,
      childCount: emp.childCount || 0,
      positionAllowance: emp.positionAllowance || 0,
      serviceAllowancePercent: emp.serviceAllowancePercent || 0,
      salaryIndex: (emp as any).salaryIndex || 1.0,
      extraAllowance: (emp as any).extraAllowance || 0,
      joinDate: emp.joinDate ? emp.joinDate.split('T')[0] : ''
    });
    setError('');
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Hapus karyawan ${name}?`)) return;
    try {
      await apiRequest(`/employees/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const exportExcel = () => {
    const data = filteredEmployees.map(emp => ({
      'ID Karyawan': emp.employeeId,
      'Nama Lengkap': emp.name,
      'Email': emp.email || '-',
      'Departemen': emp.departmentName || '-',
      'Role': emp.role,
      'Status Karyawan': emp.employeeStatus || '-',
      'Tanggungan Istri': emp.hasSpouse ? 'Ya' : 'Tidak',
      'Jumlah Anak': emp.childCount,
      'Tunjangan Jabatan (Rp)': emp.positionAllowance,
      'Tunjangan Masa Kerja (%)': emp.serviceAllowancePercent,
      'Indeks Gaji': (emp as any).salaryIndex || 1.0,
      'Tunj. Tugas Tambahan': (emp as any).extraAllowance || 0,
      'TMT (YYYY-MM-DD)': emp.joinDate ? emp.joinDate.split('T')[0] : '-',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    // Auto-set column widths
    const colWidths = Object.keys(data[0] || {}).map(key => ({ wch: Math.max(key.length + 2, 15) }));
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data Karyawan');
    XLSX.writeFile(wb, `Data_Karyawan_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const downloadTemplate = () => {
    const templateData = [{
      'ID Karyawan': 'EMP001',
      'Nama Lengkap': 'Budi Santoso',
      'Email': 'budi@contoh.com',
      'Departemen': 'TU',
      'Role': 'PEGAWAI',
      'Status Karyawan': 'Honorer K2',
      'Tanggungan Istri': 'Ya',
      'Jumlah Anak': 2,
      'Tunjangan Jabatan (Rp)': 500000,
      'Tunjangan Masa Kerja (%)': 10,
      'Indeks Gaji': 1,
      'Tunj. Tugas Tambahan': 0,
      'TMT (YYYY-MM-DD)': '2020-01-01',
      'Password': '', // kosong = pakai ID Karyawan sebagai password default
    }];
    const ws = XLSX.utils.json_to_sheet(templateData);
    ws['!cols'] = Object.keys(templateData[0]).map(k => ({ wch: Math.max(k.length + 2, 15) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'Template_Import_Karyawan.xlsx');
  };

  const handleImport = async () => {
    if (!importFile) return;
    setImporting(true);
    setImportError('');
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append('file', importFile);
      const token = localStorage.getItem('token');
      const res = await fetch('/api/employees/import', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal import');
      setImportResult(json);
      fetchData();
    } catch (err: any) {
      setImportError(err.message);
    }
    setImporting(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload: any = { ...formData };
      if (!payload.departmentId) payload.departmentId = null;
      if (modalMode === 'edit' && !payload.password) {
        delete payload.password;
      }

      if (modalMode === 'add') {
        await apiRequest('/employees', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      } else {
        await apiRequest(`/employees/${payload.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
    setSaving(false);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Data Karyawan</h2>
          <p className="text-slate-500 mt-1">Kelola data {employees.length} karyawan terdaftar</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={exportExcel}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm"
          >
            <span className="icon">description</span>
            Export Excel
          </button>
          <button
            onClick={() => { setIsImportModalOpen(true); setImportFile(null); setImportResult(null); setImportError(''); }}
            className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm"
          >
            <span className="icon">upload_file</span>
            Import Excel
          </button>
          <button 
            onClick={() => { setIsDeptModalOpen(true); setDeptName(''); setEditingDeptId(null); setError(''); }}
            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm"
          >
            <span className="icon">domain</span>
            Kelola Departemen
          </button>
          <button 
            onClick={handleOpenAdd}
            className="bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-primary/20"
          >
            <span className="icon">add</span>
            Tambah Karyawan
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row gap-4 shadow-sm">
        <div className="flex-1 relative">
          <span className="icon absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
          <input 
            type="text" 
            placeholder="Cari nama atau ID..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
          />
        </div>
        <div className="sm:w-64">
          <select 
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm appearance-none"
          >
            <option value="">Semua Departemen</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="px-6 py-4">ID / Nama</th>
                <th className="px-6 py-4">Departemen</th>
                <th className="px-6 py-4">TMT / Masa Kerja</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEmployees.length > 0 ? (
                filteredEmployees.map(emp => (
                  <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{emp.name}</div>
                      <div className="text-slate-500 text-xs mt-0.5">{emp.employeeId}</div>
                    </td>
                    <td className="px-6 py-4">
                      {emp.departmentName ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                          {emp.departmentName}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4">
                      {emp.joinDate ? (
                        <div className="space-y-0.5">
                          <div className="font-medium text-slate-800">
                            {formatDateIndo(emp.joinDate)}
                          </div>
                          <div className="text-xs text-slate-500 font-semibold bg-slate-100 px-2 py-0.5 rounded-full inline-block">
                            {calculateWorkingDuration(emp.joinDate)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Belum diatur</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-2 py-1 rounded-md text-xs font-bold ${emp.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'}`}>
                        {emp.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleOpenEdit(emp)} className="w-8 h-8 rounded-lg flex items-center justify-center text-blue-600 hover:bg-blue-50 transition-colors" title="Edit">
                          <span className="icon text-sm">edit</span>
                        </button>
                        <button onClick={() => handleDelete(emp.id, emp.name)} className="w-8 h-8 rounded-lg flex items-center justify-center text-rose-600 hover:bg-rose-50 transition-colors" title="Hapus" disabled={emp.role === 'ADMIN' && employees.filter(e => e.role === 'ADMIN').length === 1}>
                          <span className="icon text-sm">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    <span className="icon text-4xl text-slate-300 mb-2 block">group_off</span>
                    Tidak ada data karyawan ditemukan
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-full">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-900">
                {modalMode === 'add' ? 'Tambah Karyawan Baru' : 'Edit Karyawan'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <span className="icon">close</span>
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              {error && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl mb-4 border border-red-100">
                  {error}
                </div>
              )}
              <form id="employeeForm" onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Nama Lengkap</label>
                  <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">ID Karyawan</label>
                    <input type="text" required value={formData.employeeId} onChange={e => setFormData({...formData, employeeId: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Role</label>
                    <select required value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none">
                      <option value="PEGAWAI">PEGAWAI</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Email (opsional)</label>
                  <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">TMT (Tanggal Mulai Tugas)</label>
                  <input type="date" value={formData.joinDate} onChange={e => setFormData({...formData, joinDate: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Departemen</label>
                  <select value={formData.departmentId} onChange={e => setFormData({...formData, departmentId: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none">
                    <option value="">-- Pilih Departemen --</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Password {modalMode === 'edit' && <span className="text-slate-400 font-normal">(Kosongkan jika tidak diubah)</span>}
                  </label>
                  <input type="password" required={modalMode === 'add'} minLength={6} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none" />
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <span className="icon text-primary">payments</span>
                    Pengaturan Payroll
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Status / Kategori Gaji</label>
                      <select value={formData.employeeStatus} onChange={e => setFormData({...formData, employeeStatus: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none">
                        <option value="">-- Pilih Status --</option>
                        {payrollRates.map(r => (
                          <option key={r.id} value={r.categoryName}>{r.categoryName} ({r.type})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="flex items-center gap-2 cursor-pointer mt-2">
                        <input type="checkbox" checked={formData.hasSpouse} onChange={e => setFormData({...formData, hasSpouse: e.target.checked})} className="w-4 h-4 text-primary" />
                        <span className="text-sm font-semibold text-slate-700">Ada Istri/Suami</span>
                      </label>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Jumlah Anak</label>
                      <input type="number" min={0} max={10} value={formData.childCount} onChange={e => setFormData({...formData, childCount: parseInt(e.target.value) || 0})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Tunj. Jabatan</label>
                      <input type="number" step="1000" value={formData.positionAllowance} onChange={e => setFormData({...formData, positionAllowance: parseFloat(e.target.value) || 0})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Tunj. Pengabdian (%)</label>
                      <input type="number" step="0.1" value={formData.serviceAllowancePercent} onChange={e => setFormData({...formData, serviceAllowancePercent: parseFloat(e.target.value) || 0})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Indeks Gaji</label>
                      <input type="number" step="0.1" value={formData.salaryIndex} onChange={e => setFormData({...formData, salaryIndex: parseFloat(e.target.value) || 1.0})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Tunj. Tugas Tambahan</label>
                      <input type="number" value={formData.extraAllowance} onChange={e => setFormData({...formData, extraAllowance: parseFloat(e.target.value) || 0})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none" />
                    </div>
                  </div>
                </div>
              </form>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex gap-3 justify-end">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">
                Batal
              </button>
              <button type="submit" form="employeeForm" disabled={saving} className="px-4 py-2 font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2">
                {saving ? 'Menyimpan...' : 'Simpan Karyawan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Department Management Modal */}
      {isDeptModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-900">
                Kelola Departemen
              </h3>
              <button 
                onClick={() => {
                  fetchData(); // Refresh main list just in case
                  setIsDeptModalOpen(false);
                }} 
                className="text-slate-400 hover:text-slate-600"
              >
                <span className="icon">close</span>
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
              {error && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl mb-4 border border-red-100">
                  {error}
                </div>
              )}
              
              {/* Add/Edit Form */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6">
                <form 
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!deptName.trim()) return;
                    setSaving(true);
                    setError('');
                    try {
                      if (editingDeptId) {
                        await apiRequest(`/employees/departments/${editingDeptId}`, {
                          method: 'PUT',
                          body: JSON.stringify({ name: deptName })
                        });
                        setEditingDeptId(null);
                      } else {
                        await apiRequest('/employees/departments', {
                          method: 'POST',
                          body: JSON.stringify({ name: deptName })
                        });
                      }
                      setDeptName('');
                      // Refresh just departments to keep modal open
                      const deptData = await apiRequest('/employees/departments/list');
                      setDepartments(deptData || []);
                    } catch (err: any) {
                      setError(err.message);
                    }
                    setSaving(false);
                  }}
                  className="flex gap-2"
                >
                  <input 
                    type="text" 
                    placeholder="Nama Departemen Baru..." 
                    value={deptName}
                    onChange={(e) => setDeptName(e.target.value)}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none" 
                  />
                  <button 
                    type="submit" 
                    disabled={saving || !deptName.trim()}
                    className="bg-primary text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
                  >
                    {editingDeptId ? 'Update' : 'Tambah'}
                  </button>
                  {editingDeptId && (
                    <button 
                      type="button" 
                      onClick={() => { setEditingDeptId(null); setDeptName(''); }}
                      className="bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-semibold hover:bg-slate-300"
                    >
                      Batal
                    </button>
                  )}
                </form>
              </div>

              {/* Department List */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="px-4 py-3">Nama Departemen</th>
                      <th className="px-4 py-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {departments.length > 0 ? (
                      departments.map(dept => (
                        <tr key={dept.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-medium text-slate-800">{dept.name}</td>
                          <td className="px-4 py-3 text-right">
                             <div className="flex items-center justify-end gap-1">
                                <button 
                                  onClick={() => { setEditingDeptId(dept.id); setDeptName(dept.name); setError(''); }} 
                                  className="w-8 h-8 rounded-lg flex items-center justify-center text-blue-600 hover:bg-blue-50 transition-colors" 
                                  title="Edit"
                                >
                                  <span className="icon text-sm">edit</span>
                                </button>
                                <button 
                                  onClick={async () => {
                                    if (!confirm(`Hapus departemen ${dept.name}?`)) return;
                                    try {
                                      await apiRequest(`/employees/departments/${dept.id}`, { method: 'DELETE' });
                                      const deptData = await apiRequest('/employees/departments/list');
                                      setDepartments(deptData || []);
                                    } catch (err: any) {
                                      alert(err.message);
                                    }
                                  }} 
                                  className="w-8 h-8 rounded-lg flex items-center justify-center text-rose-600 hover:bg-rose-50 transition-colors" 
                                  title="Hapus"
                                >
                                  <span className="icon text-sm">delete</span>
                                </button>
                             </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={2} className="px-4 py-6 text-center text-slate-500">
                          Belum ada departemen.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsImportModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Import Karyawan dari Excel</h3>
                <p className="text-sm text-slate-500 mt-0.5">Unggah file .xlsx sesuai format template</p>
              </div>
              <button onClick={() => setIsImportModalOpen(false)} className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-slate-100 text-slate-500 transition-colors">
                <span className="icon">close</span>
              </button>
            </div>

            {/* Step 1: Download Template */}
            <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 space-y-2">
              <p className="text-sm font-semibold text-sky-800">Langkah 1: Unduh template Excel</p>
              <p className="text-xs text-sky-700">Isi data karyawan mengikuti kolom di template. Kolom Password dapat dikosongkan (default = ID Karyawan).</p>
              <button onClick={downloadTemplate} className="flex items-center gap-2 text-sm font-semibold text-sky-700 hover:text-sky-900 underline underline-offset-2 transition-colors">
                <span className="icon text-base">download</span>
                Template_Import_Karyawan.xlsx
              </button>
            </div>

            {/* Step 2: Upload File */}
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-700">Langkah 2: Pilih file Excel yang sudah diisi</p>
              <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-sky-400 hover:bg-sky-50 transition-colors">
                <span className="icon text-3xl text-slate-400 mb-1">upload_file</span>
                <span className="text-sm text-slate-500">{importFile ? importFile.name : 'Klik untuk memilih file .xlsx'}</span>
                <input type="file" accept=".xlsx,.xls" className="hidden" onChange={e => setImportFile(e.target.files?.[0] || null)} />
              </label>
            </div>

            {/* Errors */}
            {importError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{importError}</div>
            )}

            {/* Result */}
            {importResult && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-2">
                <p className="text-sm font-bold text-emerald-800">{importResult.message}</p>
                {importResult.errors.length > 0 && (
                  <div className="max-h-28 overflow-y-auto space-y-1">
                    {importResult.errors.map((e, i) => (
                      <p key={i} className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1">{e}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-1">
              <button onClick={() => setIsImportModalOpen(false)} className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                Tutup
              </button>
              <button
                onClick={handleImport}
                disabled={!importFile || importing}
                className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors flex items-center gap-2"
              >
                {importing ? (
                  <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Memproses...</>
                ) : (
                  <><span className="icon text-base">upload</span>Mulai Import</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
