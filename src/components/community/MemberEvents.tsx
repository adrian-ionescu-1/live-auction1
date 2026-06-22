// Community events shown to a signed-in member on their dashboard: the events
// their role can see, with a "Participate" button that opens the registration
// form. Already-registered events show a badge and let the member update their
// answers while registration is open. Mobile-first.

"use client";

import { useCallback, useEffect, useState } from "react";
import { CommunityEventsService } from "@/services/communityEventsService";
import { CommunityEvent, MyRegistration } from "@/types/community-event.types";
import { registrationState } from "@/components/admin/communityEventMeta";
import CommunityEventView from "@/components/community/CommunityEventView";
import EventsBoard from "@/components/community/EventsBoard";
import RegistrationFormDialog from "@/components/community/RegistrationFormDialog";

export default function MemberEvents({
  roles,
  onChanged,
}: {
  roles: string[];
  /** Called after a successful (un)registration, so a parent can refresh too. */
  onChanged?: () => void;
}) {
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [registered, setRegistered] = useState<Set<string>>(new Set());
  const [myRegs, setMyRegs] = useState<Map<string, MyRegistration>>(new Map());
  const [loading, setLoading] = useState(true);

  const [active, setActive] = useState<CommunityEvent | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const lc = roles.map((r) => r.toLowerCase());
    const [all, mine, myRegistrations] = await Promise.all([
      CommunityEventsService.listEvents(),
      CommunityEventsService.listMyRegisteredEventIds(),
      CommunityEventsService.listMyRegistrations(),
    ]);
    // An event shows if ANY of the member's roles is in its visible_roles.
    setEvents(
      all.filter((e) => e.kind === "event" && e.visibleRoles.some((r) => lc.includes(r)))
    );
    setRegistered(mine);
    setMyRegs(new Map(myRegistrations.map((r) => [r.eventId, r])));
    setLoading(false);
  }, [roles]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (result: {
    values: Record<string, string>;
    blitz: { accountId: number; playerName: string; stats: { battles: number; winrate: number; avgDamage: number } } | null;
    cardVariant: string;
    flag: string | null;
  }) => {
    if (!active) return;
    setBusy(true);
    setError(null);
    const res = await CommunityEventsService.register(active.id, result.values, result.blitz, {
      variant: result.cardVariant,
      flag: result.flag,
    });
    setBusy(false);
    if (res.success) {
      setActive(null);
      await load();
      onChanged?.();
    } else {
      setError(res.error ?? "Could not register");
    }
  };

  if (loading || events.length === 0) return null;

  return (
    <section className="mt-8 animate-fade-up sm:mt-10">
      <h2 className="text-lg font-extrabold text-zinc-100 sm:text-xl">Events</h2>
      <p className="mt-1 text-xs text-zinc-500">
        Announcements open to your role. Register to take part.
      </p>

      <div className="mt-4">
        <EventsBoard
          events={events}
          showBadges
          emptyHint="Events open to your role show up here as they're announced."
          renderEvent={(ev) => {
            const reg = registrationState(ev.registrationOpensAt, ev.registrationClosesAt);
            const isRegistered = registered.has(ev.id);
            return (
              <CommunityEventView
                event={ev}
                hideTitle
                actionSlot={
                  reg === "open" ? (
                    <div className="flex flex-col items-center gap-2">
                      {isRegistered && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-200 ring-1 ring-emerald-400/25">
                          ✓ Registered
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setError(null);
                          setActive(ev);
                        }}
                        className="rounded-2xl bg-emerald-500/20 px-5 py-2.5 text-sm font-bold text-emerald-100 ring-1 ring-emerald-400/30 transition hover:bg-emerald-500/30 active:scale-[0.98]"
                      >
                        {isRegistered ? "Update" : "Participate"}
                      </button>
                    </div>
                  ) : isRegistered ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-200 ring-1 ring-emerald-400/25">
                      ✓ Registered
                    </span>
                  ) : undefined
                }
              />
            );
          }}
        />
      </div>

      <RegistrationFormDialog
        isOpen={active !== null}
        title="Participate"
        description={active ? `Register for "${active.title}".` : undefined}
        fields={active?.registrationFields ?? []}
        region={active?.region ?? null}
        confirmLabel={registered.has(active?.id ?? "") ? "Update" : "Register"}
        busy={busy}
        error={error}
        initialValues={{}}
        initialCardVariant={active ? myRegs.get(active.id)?.cardVariant ?? null : null}
        initialFlag={active ? myRegs.get(active.id)?.flag ?? null : null}
        requireConsent
        onSubmit={handleSubmit}
        onCancel={() => setActive(null)}
      />
    </section>
  );
}
