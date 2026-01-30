// src/app/page.tsx

'use client';

import { useAuctionStore } from '@/store/auctionStore';
import UserSelector from '@/components/UserSelector';
import AuctionBoard from '@/components/AuctionBoard';
import BidControls from '@/components/BidControls';
import AdminControls from '@/components/AdminControls';
import UserBalance from '@/components/UserBalance';
import BidHistory from '@/components/BidHistory';
import ResultBanner from '@/components/ResultBanner';
import AdminUserCards from '@/components/AdminUserCards';

export default function Home() {
  const { currentUserId, users } = useAuctionStore();

  // Show user selector if no user is selected
  if (!currentUserId) {
    return <UserSelector />;
  }

  const currentUser = users.find((u) => u.id === currentUserId);

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-2">
            Live Auction System
          </h1>
          <p className="text-gray-600">FIFA-Style Player Draft Auction</p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - User Info & Admin */}
          <div className="space-y-6">
            <UserBalance />
            {currentUser?.isAdmin && <AdminControls />}
            <BidHistory />
          </div>

          {/* Center Column - Auction Board */}
          <div className="lg:col-span-1">
            <AuctionBoard />
          </div>

          {/* Right Column - Bid Controls */}
          <div className="space-y-6">
            <BidControls />
          </div>
        </div>

        {/* Admin User Cards - Full Width Below */}
        {currentUser?.isAdmin && (
          <div className="mt-8">
            <AdminUserCards />
          </div>
        )}
      </div>

      {/* Result Banner Overlay */}
      <ResultBanner />
    </main>
  );
}