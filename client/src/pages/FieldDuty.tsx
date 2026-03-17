import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../lib/api';

export default function FieldDuty() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [desc, setDesc] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Ukuran foto maksimal 5MB');
        return;
      }
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
      setError('');
    }
  };

  const handleSubmit = async (type: 'masuk' | 'pulang') => {
    if (!photoFile) {
      setError('Bukti foto wajib dilampirkan untuk Dinas Luar');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('photo', photoFile);
      if (desc) formData.append('desc', desc);

      const endpoint = type === 'masuk' ? '/attendance/dinas-masuk' : '/attendance/dinas-pulang';
      const response = await apiRequest(endpoint, {
        method: 'POST',
        body: formData,
      });

      alert(response.message || `Berhasil absen dinas ${type}`);
      navigate('/home');
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat menyimpan data');
    }
    setLoading(false);
  };

  return (
    <div className="flex-1 flex flex-col pt-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => navigate('/home')}
          className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <span className="icon">arrow_back</span>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dinas Luar Kota</h1>
          <p className="text-slate-500 text-sm">Absensi dengan lampiran foto lokasi</p>
        </div>
      </div>

      <div className="glass rounded-3xl p-6 shadow-sm border border-slate-200/50 mb-6 flex-1">
        {error && (
          <div className="bg-rose-50 border border-rose-100 text-rose-600 px-4 py-3 rounded-xl mb-6 text-sm flex items-center gap-2">
            <span className="icon text-lg">error</span>
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* Photo area */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Foto Bukti (Wajib) <span className="text-rose-500">*</span></label>
            <input 
              type="file" 
              accept="image/*" 
              capture="environment"
              className="hidden" 
              ref={fileInputRef}
              onChange={handlePhotoUpload}
            />
            
            {photoPreview ? (
              <div className="relative rounded-2xl overflow-hidden aspect-video bg-slate-100 border border-slate-200">
                <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                <button 
                  onClick={() => {
                    setPhotoFile(null);
                    setPhotoPreview(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 backdrop-blur-sm"
                >
                  <span className="icon text-sm">close</span>
                </button>
              </div>
            ) : (
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full rounded-2xl aspect-video border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-primary/50 text-slate-500 transition-colors flex flex-col items-center justify-center gap-2"
              >
                <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-primary">
                  <span className="icon text-2xl">add_a_photo</span>
                </div>
                <div className="text-sm font-medium">Ambil / Pilih Foto</div>
              </button>
            )}
            <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
              <span className="icon text-[14px]">info</span>
              Gunakan foto lokasi / selfie saat dinas. Maks 5MB.
            </p>
          </div>

          {/* Keterangan */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Keterangan / Lokasi Tujuan (Opsional)</label>
            <textarea 
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Contoh: Meeting di PT Angkasa Pura Jakarta"
              className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/50 text-slate-700 resize-none h-24"
            ></textarea>
          </div>
        </div>
      </div>

      {/* Submit Buttons */}
      <div className="grid grid-cols-2 gap-4 pb-8 mt-auto">
        <button 
          onClick={() => handleSubmit('masuk')}
          disabled={loading || !photoFile}
          className="bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white p-4 rounded-2xl font-bold flex flex-col items-center justify-center gap-1 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="icon text-2xl mb-1">flight_takeoff</span>
          Dinas Masuk
        </button>
        <button 
          onClick={() => handleSubmit('pulang')}
          disabled={loading || !photoFile}
          className="bg-rose-400 hover:bg-rose-500 active:bg-rose-600 text-white p-4 rounded-2xl font-bold flex flex-col items-center justify-center gap-1 transition-all shadow-lg shadow-rose-400/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="icon text-2xl mb-1">flight_land</span>
          Dinas Pulang
        </button>
      </div>
    </div>
  );
}
