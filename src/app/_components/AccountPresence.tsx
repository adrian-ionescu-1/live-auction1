//
// Tracks the signed-in Discord account in the "members-presence" Realtime
// channel so the admin views can show who is online. Mounted once globally in
// the root layout; renders nothing. Does nothing for key-login participants
// (they have no Supabase Auth session) — their presence is the separate
// auction-presence channel handled in the auction store.

"use client";

import { useEffect } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { MEMBERS_PRESENCE_CHANNEL } from "./useMembersPresence";

export default function AccountPresence() {
  useEffect(() => {
    let channel: RealtimeChannel | null = null;
    let trackedId: string | null = null;

    const leave = () => {
      if (channel) {
        void channel.untrack();
        supabase.removeChannel(channel);
        channel = null;
      }
      trackedId = null;
    };

    const join = (userId: string) => {
      if (trackedId === userId) return;
      leave();
      trackedId = userId;
      channel = supabase.channel(MEMBERS_PRESENCE_CHANNEL, {
        config: { presence: { key: userId } },
      });
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          void channel?.track({ id: userId, online_at: Date.now() });
        }
      });
    };

    supabase.auth.getSession().then(({ data }) => {
      const id = data.session?.user?.id;
      if (id) join(id);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const id = session?.user?.id;
      if (id) join(id);
      else leave();
    });

    return () => {
      subscription.unsubscribe();
      leave();
    };
  }, []);

  return null;
}
