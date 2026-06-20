//
// Read-only Realtime presence for Discord members. Returns the set of member
// ids (profile ids) that currently have the site open. The matching "track"
// side lives in <AccountPresence /> (mounted globally for signed-in accounts).

"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export const MEMBERS_PRESENCE_CHANNEL = "members-presence";

export function useMembersPresence(): Set<string> {
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const channel = supabase.channel(MEMBERS_PRESENCE_CHANNEL);

    const sync = () => {
      const state = channel.presenceState();
      setOnlineIds(new Set(Object.keys(state)));
    };

    channel
      .on("presence", { event: "sync" }, sync)
      .on("presence", { event: "join" }, sync)
      .on("presence", { event: "leave" }, sync)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return onlineIds;
}
