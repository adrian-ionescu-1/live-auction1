'use client';

import { useState } from 'react';
import { AuthService } from '@/services/authService';
import { AccountService } from '@/services/accountService';
import { UserRole } from '@/types/auction.types';
import Logo from '@/app/_components/Logo';

interface LoginPageProps {
  onLogin: (userId: string, role: UserRole) => void;
}

/** Official Discord mark. */
function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className={className}
    >
      <path d="M20.317 4.369a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.211.375-.444.864-.608 1.249a18.27 18.27 0 0 0-5.487 0 12.6 12.6 0 0 0-.617-1.25.077.077 0 0 0-.079-.036A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.371-.291a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.009c.12.099.245.198.372.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.891.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.055c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028ZM8.02 15.331c-1.183 0-2.157-1.086-2.157-2.42 0-1.332.955-2.418 2.157-2.418 1.21 0 2.176 1.095 2.157 2.418 0 1.334-.955 2.42-2.157 2.42Zm7.975 0c-1.183 0-2.157-1.086-2.157-2.42 0-1.332.955-2.418 2.157-2.418 1.21 0 2.176 1.095 2.157 2.418 0 1.334-.946 2.42-2.157 2.42Z" />
    </svg>
  );
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [key, setKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [discordLoading, setDiscordLoading] = useState(false);
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

  const handleDiscord = async () => {
    setDiscordLoading(true);
    setError('');

    // On success the browser is redirected to Discord, so this component
    // unmounts. We only land back here if the redirect failed to start.
    const { error: discordError } = await AccountService.signInWithDiscord();

    if (discordError) {
      setError(discordError);
      setDiscordLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConnect();
    }
  };

  const busy = loading || discordLoading;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-up rounded-3xl bg-black/35 ring-1 ring-white/10 backdrop-blur-sm p-6 sm:p-10">
        <div className="text-center mb-8">
          <Logo className="mx-auto mb-5 h-14 w-14" priority />
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-zinc-100 mb-2">
            Welcome to the{" "}
            <span className="bg-gradient-to-r from-emerald-300 via-cyan-300 to-fuchsia-300 bg-[length:200%_auto] bg-clip-text text-transparent animate-gradient-pan">
              Auction
            </span>
          </h1>
          <p className="text-sm text-zinc-300 sm:text-base">
            Create an account with Discord, or enter with an access key
          </p>
        </div>

        {/* Account sign-in (Discord) */}
        <button
          onClick={handleDiscord}
          disabled={busy}
          className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[#5865F2] py-4 px-6
                     text-lg font-bold text-white transition hover:bg-[#4752C4] active:scale-[0.98]
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5865F2]/60
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <DiscordIcon className="h-6 w-6 shrink-0" />
          {discordLoading ? 'Redirecting…' : 'Sign in with Discord'}
        </button>

        <p className="mt-2 text-center text-xs text-zinc-500">
          Creates your account automatically — no username or password needed.
        </p>

        {/* Divider */}
        <div className="my-6 flex items-center gap-3">
          <span className="h-px flex-1 bg-white/10" />
          <span className="text-xs uppercase tracking-[0.2em] text-zinc-500">
            or use an access key
          </span>
          <span className="h-px flex-1 bg-white/10" />
        </div>

        {/* Access key login */}
        <div className="space-y-4">
          <div>
            <label
              htmlFor="access-key"
              className="block text-sm font-medium text-zinc-300 mb-2"
            >
              Access Key
            </label>
            <input
              id="access-key"
              type="text"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter your key"
              disabled={busy}
              autoComplete="off"
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
            disabled={busy || !key.trim()}
            className="w-full rounded-2xl py-4 px-6 text-lg font-bold transition
                       text-emerald-200 bg-emerald-500/15 hover:bg-emerald-500/20
                       ring-1 ring-emerald-400/25 active:scale-[0.98]
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Connecting...' : 'Connect'}
          </button>
        </div>

        <div className="mt-6 rounded-2xl bg-black/30 ring-1 ring-white/10 p-4">
          <p className="text-xs text-zinc-400 text-center">
            If you don&apos;t have a key, please contact the auction administrator.
          </p>
        </div>
      </div>
    </div>
  );
}
