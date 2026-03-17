import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../lib/api';

export default function BreakRequest() {
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

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
    try {
      const formData = new FormData();
      if (photo) formData.append('photo', photo);

      await apiRequest('/attendance/break', {
        method: 'POST',
        body: formData,
      });
      navigate('/home');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/home')} className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 text-slate-600">
          <span className="icon">arrow_back</span>
        </button>
        <h2 className="text-xl font-bold text-slate-900">Izin Istirahat</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 flex items-center gap-2">
            <span className="icon text-lg">error</span>
            {error}
          </div>
        )}

        {/* Photo Upload */}
        <div className="glass rounded-2xl p-5 border border-slate-200">
          <label className="block text-sm font-semibold text-slate-700 mb-3">
            <span className="icon text-primary text-lg align-middle mr-1">photo_camera</span>
            Foto Bukti Izin (opsional)
          </label>
          
          {preview ? (
            <div className="relative">
              <img src={preview} alt="Preview" className="w-full h-48 object-cover rounded-xl" />
              <button
                type="button"
                onClick={() => { setPhoto(null); setPreview(null); }}
                className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center shadow"
              >
                <span className="icon text-lg">close</span>
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center h-40 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-100 transition">
              <span className="icon text-4xl text-slate-400">add_a_photo</span>
              <span className="text-sm text-slate-500 mt-2">Ketuk untuk mengambil foto</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoChange}
                className="hidden"
              />
            </label>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-amber-500/30"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"/>
              Memproses...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <span className="icon">coffee</span>
              Mulai Istirahat
            </span>
          )}
        </button>
      </form>
    </div>
  );
}
