import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiRequest } from '../lib/api';

export default function Profile() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await apiRequest('/profile');
        setProfile(data);
        setName(data.name);
        setEmail(data.email || '');
      } catch (err) {}
      setLoading(false);
    };
    fetchProfile();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      await apiRequest('/profile', {
        method: 'PUT',
        body: JSON.stringify({ name, email }),
      });
      setMessage('Profil berhasil diperbarui');
      // Update localStorage user
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      user.name = name;
      user.email = email;
      localStorage.setItem('user', JSON.stringify(user));
    } catch (err: any) {
      setError(err.message);
    }
    setSaving(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPw(true);
    setMessage('');
    setError('');
    try {
      await apiRequest('/profile/password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setMessage('Password berhasil diubah');
      setCurrentPassword('');
      setNewPassword('');
      setShowPasswordForm(false);
    } catch (err: any) {
      setError(err.message);
    }
    setSavingPw(false);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append('photo', file);
      const result = await apiRequest('/profile/photo', {
        method: 'PUT',
        body: formData,
      });
      setProfile({ ...profile, photoUrl: result.photoUrl });
      setMessage('Foto profil berhasil diperbarui');
      // Update localStorage
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      user.photoUrl = result.photoUrl;
      localStorage.setItem('user', JSON.stringify(user));
    } catch (err: any) {
      setError(err.message);
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
      <h2 className="text-xl font-bold text-slate-900">Profil Saya</h2>

      {message && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-600 text-sm rounded-xl px-4 py-3 flex items-center gap-2">
          <span className="icon text-lg">check_circle</span>{message}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 flex items-center gap-2">
          <span className="icon text-lg">error</span>{error}
        </div>
      )}

      {/* Photo */}
      <div className="flex flex-col items-center">
        <div className="relative">
          <div className="w-28 h-28 rounded-full border-4 border-primary/20 overflow-hidden bg-slate-200">
            {profile?.photoUrl ? (
              <img src={profile.photoUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-slate-100">
                <span className="icon text-5xl text-slate-400">person</span>
              </div>
            )}
          </div>
          <label className="absolute bottom-0 right-0 w-9 h-9 bg-primary text-white rounded-full flex items-center justify-center shadow-lg cursor-pointer hover:bg-primary-dark transition">
            <span className="icon text-lg">photo_camera</span>
            <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
          </label>
        </div>
        <h3 className="mt-3 text-lg font-bold text-slate-900">{profile?.name}</h3>
        <p className="text-sm text-slate-500">{profile?.employeeId} • {profile?.departmentName || 'Tanpa departemen'}</p>
      </div>

      {/* Edit Info */}
      <form onSubmit={handleSaveProfile} className="glass rounded-2xl p-5 border border-slate-200 space-y-4">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <span className="icon text-primary">edit</span>
          Informasi Pribadi
        </h3>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Nama Lengkap</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="w-full py-2.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark transition active:scale-[0.98] disabled:opacity-50"
        >
          {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
        </button>
      </form>

      {/* Password */}
      <div className="glass rounded-2xl p-5 border border-slate-200 space-y-4">
        <button
          onClick={() => setShowPasswordForm(!showPasswordForm)}
          className="w-full flex items-center justify-between text-slate-800 font-bold"
        >
          <span className="flex items-center gap-2">
            <span className="icon text-primary">lock</span>
            Ubah Password
          </span>
          <span className="icon text-slate-400">{showPasswordForm ? 'expand_less' : 'expand_more'}</span>
        </button>
        {showPasswordForm && (
          <form onSubmit={handleChangePassword} className="space-y-3 pt-2">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Password Lama</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Password Baru</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
            <button
              type="submit"
              disabled={savingPw}
              className="w-full py-2.5 bg-amber-500 text-white font-semibold rounded-xl hover:bg-amber-600 transition active:scale-[0.98] disabled:opacity-50"
            >
              {savingPw ? 'Mengubah...' : 'Ubah Password'}
            </button>
          </form>
        )}
      </div>

      {/* Info card */}
      <div className="glass rounded-2xl p-5 border border-slate-200">
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">ID Karyawan</span>
            <span className="font-semibold text-slate-800">{profile?.employeeId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Departemen</span>
            <span className="font-semibold text-slate-800">{profile?.departmentName || '-'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Role</span>
            <span className="font-semibold text-slate-800">{profile?.role}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
