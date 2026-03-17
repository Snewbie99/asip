import { useState, useEffect } from 'react';
import { apiRequest } from '../../lib/api';

interface LocationSetting {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  isActive: boolean;
}

export default function AdminLocations() {
  const [locations, setLocations] = useState<LocationSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state for editing/adding
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    latitude: '',
    longitude: '',
    radius: '',
  });

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/locations');
      setLocations(data);
      if (data.length > 0) {
        const primary = data[0];
        setFormData({
          id: primary.id,
          name: primary.name,
          latitude: primary.latitude.toString(),
          longitude: primary.longitude.toString(),
          radius: primary.radius.toString(),
        });
      }
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        name: formData.name,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        radius: parseInt(formData.radius),
      };

      if (formData.id) {
        await apiRequest(`/locations/${formData.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest('/locations', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      
      setSuccess('Pengaturan lokasi berhasil disimpan!');
      fetchLocations();
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
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Pengaturan Lokasi</h2>
          <p className="text-slate-500 mt-1">Atur titik koordinat kantor dan radius absensi</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-sm">
            <div className="p-6">
              {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 border border-red-100 flex items-center gap-3">
                  <span className="icon">error</span>
                  {error}
                </div>
              )}
              {success && (
                <div className="bg-green-50 text-green-600 p-4 rounded-xl mb-6 border border-green-100 flex items-center gap-3">
                  <span className="icon">check_circle</span>
                  {success}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Nama Lokasi</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    placeholder="Contoh: Kantor Utama"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5">Latitude</label>
                    <input 
                      type="number" 
                      step="any" 
                      required 
                      value={formData.latitude} 
                      onChange={e => setFormData({...formData, latitude: e.target.value})} 
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-mono"
                      placeholder="-7.0313..."
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5">Longitude</label>
                    <input 
                      type="number" 
                      step="any" 
                      required 
                      value={formData.longitude} 
                      onChange={e => setFormData({...formData, longitude: e.target.value})} 
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-mono"
                      placeholder="110.3373..."
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Radius Absensi (Meter)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      required 
                      value={formData.radius} 
                      onChange={e => setFormData({...formData, radius: e.target.value})} 
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                      placeholder="Contoh: 150"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">Meter</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">Radius ini menentukan seberapa jauh karyawan bisa melakukan absensi dari titik koordinat.</p>
                </div>

                <div className="pt-4">
                  <button 
                    type="submit" 
                    disabled={saving}
                    className="w-full sm:w-auto bg-primary hover:bg-primary-dark text-white px-8 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Menyimpan...
                      </>
                    ) : (
                      <>
                        <span className="icon">save</span>
                        Simpan Perubahan
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* List of Locations */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-sm">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <span className="icon text-primary">list</span>
                Daftar Lokasi Tersimpan
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3">Nama Lokasi</th>
                    <th className="px-6 py-3">Koordinat</th>
                    <th className="px-6 py-3">Radius</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {locations.map(loc => (
                    <tr key={loc.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900">{loc.name}</td>
                      <td className="px-6 py-4 font-mono text-xs">{loc.latitude}, {loc.longitude}</td>
                      <td className="px-6 py-4">{loc.radius}m</td>
                    </tr>
                  ))}
                  {locations.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-6 py-12 text-center text-slate-500">
                        Belum ada data lokasi.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Info Card */}
        <div className="space-y-6 text-sm">
          <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl shadow-slate-200">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-primary">
              <span className="icon text-primary font-filled">info</span>
              Petunjuk
            </h3>
            <ul className="space-y-4 text-slate-300">
              <li className="flex gap-3">
                <span className="icon text-primary shrink-0">pin_drop</span>
                <p>Gunakan Google Maps untuk mendapatkan koordinat yang akurat.</p>
              </li>
              <li className="flex gap-3">
                <span className="icon text-primary shrink-0">calculate</span>
                <p>Radius standar biasanya antara 50m - 150m. Untuk akurasi GPS yang kurang stabil, radius bisa lebih besar.</p>
              </li>
              <li className="flex gap-3 text-warning">
                <span className="icon text-warning shrink-0">warning</span>
                <p>Pastikan koordinat sudah benar sebelum menyimpan. Kesalahan koordinat bisa menyebabkan karyawan tidak bisa absen.</p>
              </li>
            </ul>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6">
            <h4 className="font-bold text-blue-900 mb-2">Lihat di Peta</h4>
            <p className="text-blue-700 text-xs mb-4">Verifikasi titik koordinat Anda saat ini di Google Maps.</p>
            <a 
              href={`https://www.google.com/maps?q=${formData.latitude},${formData.longitude}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-blue-800 font-bold hover:underline"
            >
              <span className="icon text-sm">open_in_new</span>
              Buka Google Maps
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
