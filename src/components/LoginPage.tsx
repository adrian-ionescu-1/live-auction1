// src/components/LoginPage.tsx

'use client';

import { useState } from 'react';
import { AuthService } from '@/services/authService';
import { UserRole } from '@/types/auction.types';

interface LoginPageProps {
  onLogin: (userId: string, role: UserRole) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [key, setKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleConnect = async () => {
    if (!key.trim()) {
      setError('Please enter a key');
      return;
    }

    setLoading(true);
    setError('');

    const result = await AuthService.authenticateWithKey(key);

    if (result.success && result.user) {
      onLogin(result.user.id, result.user.role);
    } else {
      setError(result.error || 'Authentication failed');
    }

    setLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConnect();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl bg-black/35 ring-1 ring-white/10 backdrop-blur-sm p-8 sm:p-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-zinc-100 mb-2">
            Welcome to the Auction
          </h1>
          <p className="text-zinc-300">Enter your access key to continue</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Access Key
            </label>
            <input
              type="text"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter your key"
              disabled={loading}
              className="w-full rounded-2xl bg-white/5 ring-1 ring-white/10 px-4 py-3
                         text-zinc-100 placeholder:text-zinc-500
                         focus:outline-none focus:ring-2 focus:ring-emerald-400/35
                         disabled:opacity-60 disabled:cursor-not-allowed text-lg"
            />
          </div>

          {error && (
            <div className="rounded-2xl bg-red-500/10 ring-1 ring-red-400/25 p-3">
              <p className="text-sm text-red-200 text-center font-semibold">
                {error}
              </p>
            </div>
          )}

          <button
            onClick={handleConnect}
            disabled={loading || !key.trim()}
            className="w-full rounded-2xl py-4 px-6 text-lg font-bold transition
                       text-emerald-200 bg-emerald-500/15 hover:bg-emerald-500/20
                       ring-1 ring-emerald-400/25 active:scale-[0.98]
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Connecting...' : 'Connect'}
          </button>
        </div>

        <div className="mt-6 rounded-2xl bg-black/30 ring-1 ring-white/10 p-4">
          <p className="text-xs text-zinc-400 text-center">
            If you don't have a key, please contact the auction administrator.
          </p>
        </div>
      </div>
    </div>
  );
}
