// src/components/LoginPage.tsx

'use client';

import { useState } from 'react';
import { AuthService } from '@/services/authService';

interface LoginPageProps {
  onLogin: (userId: string, role: 'ADMIN' | 'USER' | 'SPECTATOR') => void;
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-purple-700 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-12 max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Welcome to the Auction</h1>
          <p className="text-gray-600">Enter your access key to continue</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Access Key</label>
            <input
              type="text"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter your key"
              disabled={loading}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed text-lg text-black placeholder-gray-400"
            />
          </div>

          {error && (
            <div className="bg-red-50 border-2 border-red-300 rounded-lg p-3">
              <p className="text-sm text-red-800 text-center font-semibold">{error}</p>
            </div>
          )}

          <button
            onClick={handleConnect}
            disabled={loading || !key.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-lg transition disabled:bg-gray-400 disabled:cursor-not-allowed text-lg shadow-lg"
          >
            {loading ? 'Connecting...' : 'Connect'}
          </button>
        </div>

        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600 text-center">
            If you don't have a key, please contact the auction administrator.
          </p>
        </div>
      </div>
    </div>
  );
}
