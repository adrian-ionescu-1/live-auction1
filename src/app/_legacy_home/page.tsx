// src/app/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useAuctionStore } from '@/store/auctionStore';
import { AuthService } from '@/services/authService';
import LoginPage from '@/components/LoginPage';
import AuctionBoard from '@/components/AuctionBoard';
import BidControls from '@/components/BidControls';
import AdminControls from '@/components/AdminControls';
import UserBalance from '@/components/UserBalance';
import BidHistory from '@/components/BidHistory';
import ResultBanner from '@/components/ResultBanner';
import AdminUserCards from '@/components/AdminUserCards';
import ResultsView from '@/components/ResultsView';

export default function Home() {
  const { currentUserId, currentUserRole, status, login, dismissResults } = useAuctionStore();

  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      const savedId = sessionStorage.getItem('auction_user_id');
      const savedRole = sessionStorage.getItem('auction_user_role');

      if (savedId && savedRole) {
        const user = await AuthService.getUserById(savedId);

        if (user) {
          await login(user.id, user.role);
        } else {
          sessionStorage.removeItem('auction_user_id');
          sessionStorage.removeItem('auction_user_role');
        }
      }

      setHydrated(true);
    })();
  }, [login]);

  if (!hydrated) {
    return null;
  }

  if (!currentUserId || !currentUserRole) {
    return <LoginPage onLogin={login} />;
  }

  const handleCloseResults = () => {
    dismissResults();
  };

  if (status === 'finished' && currentUserRole !== 'ADMIN') {
    return <ResultsView onClose={handleCloseResults} />;
  }

  return (
    <main className="min-h-screen py-8 px-4">
      {/* subtle overlay ca să păstrezi lizibilitatea peste background-ul global */}
      <div className="max-w-7xl mx-auto rounded-3xl bg-black/30 ring-1 ring-white/10 backdrop-blur-sm p-6 sm:p-8">
        <div className="mb-8 text-center">
          <h1 className="text-5xl font-bold text-zinc-100 mb-2">Live Auction System</h1>
          <p className="text-zinc-300 font-semibold">
            Created by Adrian — Full-Stack Developer | Discord: <span className="text-emerald-300">_the_adrian_</span>
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="space-y-6">
            <UserBalance />
            {currentUserRole === 'ADMIN' && <AdminControls />}
            <BidHistory />
          </div>

          <div className="lg:col-span-1">
            <AuctionBoard />
          </div>

          <div className="space-y-6">
            <BidControls />
          </div>
        </div>

        {currentUserRole === 'ADMIN' && (
          <div className="mt-8">
            <AdminUserCards />
          </div>
        )}
      </div>

      <ResultBanner />
    </main>
  );
}
