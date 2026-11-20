import React, { useState } from 'react';
import { Lock, User as UserIcon, Leaf } from 'lucide-react';
import { apiFetch, setAuthToken } from '../api';
import type { User } from '../types';
import { SuwasiriLogo } from './Logo';

interface LoginPageProps {
  onSuccess: (user: User) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiFetch<{ token: string; user: User }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      setAuthToken(res.token);
      onSuccess(res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setLoading(false);
    }
  }

  function fillQuickLogin(u: string, p: string) {
    setUsername(u);
    setPassword(p);
    setError('');
  }

  return (
    <div className="min-h-screen bg-[#F5F0E6] flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-xl border border-[#E4DEC9] overflow-hidden grid md:grid-cols-12">
        {/* Left Banner Column */}
        <div className="md:col-span-6 bg-[#1B4332] text-white flex flex-col justify-between">
          <div>
            <img
              src="/suwasiri-banner.png"
              alt="Suwasiri Ayurvedic Wellness Center"
              className="w-full h-56 md:h-64 object-cover border-b border-white/10"
            />
            <div className="p-6 md:p-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-[#B7E4C7] text-xs font-medium mb-4">
                <Leaf className="w-3.5 h-3.5" />
                Offline-First Local Clinic System
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white">
                Suwasiri Clinic Manager
              </h1>
              <p className="mt-2 text-sm text-[#D8F3DC]/90 leading-relaxed">
                Patient registration, daily appointment tokens, herbal medicine & treatment inventory,
                and instant printable billing — stored securely on your clinic PC.
              </p>
            </div>
          </div>

          <div className="px-6 pb-6 md:px-8 md:pb-8 text-xs text-[#B7E4C7]/80">
            Natural Healing for a Healthier Tomorrow
          </div>
        </div>

        {/* Right Form Column */}
        <div className="md:col-span-6 p-6 md:p-10 flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-6">
            <SuwasiriLogo className="w-11 h-11" />
            <div>
              <h2 className="text-xl font-bold text-[#1B4332]">Staff Sign In</h2>
              <p className="text-xs text-[#5C6B62]">Enter your clinic account credentials</p>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#2D3E35] mb-1.5">Username</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-[#6B7C72] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. admin, doctor1, doctor2"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#D6CFC0] bg-[#FBF9F5] focus:outline-none focus:ring-2 focus:ring-[#2D5A27]/30 focus:border-[#2D5A27]"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#2D3E35] mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#6B7C72] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#D6CFC0] bg-[#FBF9F5] focus:outline-none focus:ring-2 focus:ring-[#2D5A27]/30 focus:border-[#2D5A27]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-[#1B4332] hover:bg-[#2D5A27] text-white font-semibold transition-colors disabled:opacity-60 cursor-pointer"
            >
              {loading ? 'Signing in...' : 'Sign In to Clinic'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-[#ECE6D8]">
            <p className="text-xs font-medium text-[#5C6B62] mb-2.5">
              Quick-Fill Accounts (update names &amp; passwords in Settings):
            </p>
            <div className="grid grid-cols-5 gap-1.5">
              <button
                type="button"
                onClick={() => fillQuickLogin('admin', 'admin123')}
                className="px-2 py-2 rounded-lg border border-[#D6CFC0] bg-[#FBF9F5] hover:bg-[#EDF5EF] text-xs font-semibold text-[#1B4332] transition-colors cursor-pointer"
              >
                Admin
              </button>
              {[1, 2, 3, 4].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => fillQuickLogin(`doctor${num}`, 'doctor123')}
                  className="px-2 py-2 rounded-lg border border-[#D6CFC0] bg-[#FBF9F5] hover:bg-[#EDF5EF] text-xs font-medium text-[#1B4332] transition-colors cursor-pointer"
                >
                  Dr. {num}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
