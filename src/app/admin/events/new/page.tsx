// Create a named auction event, configured top to bottom in a logical order:
//   1. Identity  — the event name.
//   2. Target    — players each member must take.
//   3. Bidding   — opening bid + the "+N" increment buttons (these drive the reserve).
//   4. Reserve & budget — reserve = opening + smallest button; budget >= reserve.
//   5. Timer     — seconds per player + the anti-snipe extension rule.
// On the right: the members enrolled (current bidders) and the players that go up.

"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MembersService } from "@/services/membersService";
import { EventsService } from "@/services/eventsService";
import { CommunityEventsService } from "@/services/communityEventsService";
import { CommunityEvent, CommunityRegistration } from "@/types/community-event.types";
import { registrationState } from "@/components/admin/communityEventMeta";
import { AuctionEngine } from "@/services/auctionEngine";
import { Member } from "@/types/account.types";
import { Player } from "@/types/auction.types";
import { useMembersPresence } from "@/app/_components/useMembersPresence";
import { AccountAvatar } from "@/app/_components/AccountMenu";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import UnsavedChangesGuard from "@/components/admin/UnsavedChangesGuard";
import ImportListDialog, { ImportedRow, ImportOptions } from "@/components/community/ImportListDialog";
import { randomVariantId } from "@/components/auction/cardDesigns";
import { randomCountryCode } from "@/lib/flags";

const inputClass =
  "w-full rounded-xl bg-black/30 px-4 py-3 text-zinc-100 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400/40";

function Section({
  step,
  title,
  desc,
  children,
}: {
  step: number;
  title: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl bg-white/5 p-5 ring-1 ring-white/10 sm:p-6">
      <div className="mb-4 flex items-start gap-3">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-500/15 text-xs font-bold text-emerald-200 ring-1 ring-emerald-400/25">
          {step}
        </span>
        <div>
          <h2 className="text-base font-extrabold text-zinc-100">{title}</h2>
          {desc && <p className="mt-0.5 text-xs text-zinc-500">{desc}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-zinc-300">{label}</span>
      {hint && <span className="mt-0.5 block text-xs text-zinc-500">{hint}</span>}
      <div className="mt-2">{children}</div>
    </label>
  );
}

function MoneyInput({
  value,
  onChange,
  min = 0,
}: {
  value: string;
  onChange: (v: string) => void;
  min?: number;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
        $
      </span>
      <input
        type="number"
        min={min}
        className={`${inputClass} pl-7`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

// Editor for the preset "+N" bid buttons. Chips with remove + a custom adder.
function IncrementEditor({
  values,
  onChange,
}: {
  values: number[];
  onChange: (next: number[]) => void;
}) {
  const [custom, setCustom] = useState("");

  const add = (n: number) => {
    if (!n || n <= 0 || values.includes(n)) return;
    onChange([...values, n].sort((a, b) => a - b));
  };
  const remove = (n: number) => onChange(values.filter((v) => v !== n));

  const quick = [5, 10, 25, 50, 100, 250, 500, 1000].filter((n) => !values.includes(n));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {values.length === 0 && (
          <span className="text-xs text-amber-200">Add at least one bid button.</span>
        )}
        {values.map((n) => (
          <span
            key={n}
            className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-sm font-bold text-emerald-200 ring-1 ring-emerald-400/25"
          >
            +{n}
            <button
              type="button"
              onClick={() => remove(n)}
              aria-label={`Remove +${n}`}
              className="text-emerald-300/70 transition hover:text-emerald-100"
            >
              ✕
            </button>
          </span>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {quick.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => add(n)}
            className="rounded-lg bg-white/5 px-2.5 py-1 text-xs font-semibold text-zinc-300 ring-1 ring-white/10 transition hover:bg-white/10 hover:text-zinc-100"
          >
            +{n}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          type="number"
          min={1}
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="Custom amount"
          className={`${inputClass} min-w-0`}
        />
        <button
          type="button"
          onClick={() => {
            add(Math.floor(Number(custom) || 0));
            setCustom("");
          }}
          className="shrink-0 rounded-xl bg-emerald-500/15 px-4 py-2 text-sm font-bold text-emerald-200 ring-1 ring-emerald-400/25 transition hover:bg-emerald-500/25"
        >
          Add
        </button>
      </div>
    </div>
  );
}

// Selectable bidder access list. Every bidder is included by default; the admin
// can exclude anyone who shouldn't take part, even though they hold the role.
function BidderAccessSelect({
  members,
  onlineIds,
  excludedIds,
  onToggle,
}: {
  members: Member[];
  onlineIds: Set<string>;
  excludedIds: Set<string>;
  onToggle: (id: string) => void;
}) {
  const includedCount = members.filter((m) => !excludedIds.has(m.id)).length;

  return (
    <div className="rounded-3xl bg-white/5 p-5 ring-1 ring-white/10">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-extrabold text-zinc-100">Members with access</h3>
        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-200 ring-1 ring-emerald-400/25">
          {includedCount}/{members.length} in
        </span>
      </div>
      <p className="mb-3 text-xs text-zinc-500">
        Every bidder is enrolled automatically. Exclude anyone who shouldn&apos;t take part in
        this event — they won&apos;t be able to enter the room.
      </p>

      {members.length === 0 ? (
        <div className="rounded-2xl bg-black/25 p-6 text-center ring-1 ring-white/10">
          <p className="text-sm text-zinc-400">
            No bidders yet. Promote members to Bidder in the Members tab.
          </p>
        </div>
      ) : (
        <ul className="max-h-80 space-y-2 overflow-y-auto pr-1">
          {members.map((m) => {
            const excluded = excludedIds.has(m.id);
            const online = onlineIds.has(m.id);
            const dot = m.banned
              ? "bg-red-500"
              : online
                ? "bg-emerald-400"
                : "bg-zinc-500";
            return (
              <li
                key={m.id}
                className={`flex items-center gap-3 rounded-2xl px-3 py-2 ring-1 ${
                  excluded ? "bg-black/20 ring-white/5" : "bg-black/25 ring-white/10"
                }`}
              >
                <span className="relative shrink-0">
                  <AccountAvatar avatarUrl={m.avatarUrl} name={m.username} size={32} />
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-zinc-950 ${dot}`}
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={`block truncate text-sm font-semibold ${
                      excluded ? "text-zinc-500 line-through" : "text-zinc-100"
                    }`}
                  >
                    {m.username}
                  </span>
                  <span className="block text-[10px] uppercase tracking-wide text-zinc-500">
                    {excluded ? "Excluded" : online ? "Online" : "Offline"}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => onToggle(m.id)}
                  className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold ring-1 transition ${
                    excluded
                      ? "bg-emerald-500/15 text-emerald-200 ring-emerald-400/25 hover:bg-emerald-500/25"
                      : "bg-red-500/15 text-red-200 ring-red-400/25 hover:bg-red-500/25"
                  }`}
                >
                  {excluded ? "Include" : "Exclude"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// Smallest datetime-local the admin can pick: one minute from now, formatted for
// the native input (local time, no seconds/timezone suffix).
function localInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export default function CreateEventPage() {
  const router = useRouter();
  const onlineIds = useMembersPresence();

  // 1. Identity
  const [name, setName] = useState("");
  // 2. Target
  const [playerLimit, setPlayerLimit] = useState("8");
  // 3. Bidding (drives the reserve)
  const [openingBid, setOpeningBid] = useState("100");
  const [bidIncrements, setBidIncrements] = useState<number[]>([10, 50, 100]);
  // 4. Member budget (auto-synced to reserve until edited)
  const [memberBudget, setMemberBudget] = useState("880");
  const [budgetTouched, setBudgetTouched] = useState(false);
  // 5. Timer
  const [playerDuration, setPlayerDuration] = useState("30");
  const [extendThreshold, setExtendThreshold] = useState("10");
  const [extendAmount, setExtendAmount] = useState("5");
  // 6. Opening time — "now" (open immediately) or a scheduled local date+time.
  const [openMode, setOpenMode] = useState<"now" | "schedule">("now");
  const [opensAtLocal, setOpensAtLocal] = useState("");
  // 7. Member access — bidders excluded from this event (kept out even with role).
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());

  const [bidders, setBidders] = useState<Member[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  // Optional: source the auction players from a community event whose registration
  // has ended, instead of the players already in the database.
  const [lists, setLists] = useState<CommunityEvent[]>([]);
  const [selectedListId, setSelectedListId] = useState("");
  // Order players come up for auction from the chosen list: "list" keeps the
  // list's own order; "shuffle" randomizes it; "sort" orders by a custom field.
  const [listOrder, setListOrder] = useState<"list" | "shuffle" | "sort">("list");
  // When sorting: which custom field to sort by and the direction.
  const [sortField, setSortField] = useState("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [listPreview, setListPreview] = useState<CommunityRegistration[]>([]);
  const [listLoading, setListLoading] = useState(false);
  // Import a brand-new list (CSV/Excel, optionally Wargaming-validated) right
  // here: it becomes a standalone list and is selected as the player source.
  const [importing, setImporting] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [importNote, setImportNote] = useState<string | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([MembersService.getAllMembers(), AuctionEngine.loadPlayers()]).then(
      ([members, ps]) => {
        if (!active) return;
        setBidders(members.filter((m) => m.roles.includes("bidder")));
        setPlayers(ps);
        setLoading(false);
      }
    );
    return () => {
      active = false;
    };
  }, []);

  // Community lists that can feed the auction: standalone lists always, plus
  // event lists whose registration has ended.
  const loadLists = useCallback(async () => {
    const all = await CommunityEventsService.listEvents();
    const usable = all.filter(
      (e) =>
        e.kind === "list" ||
        (e.registrationClosesAt !== null &&
          registrationState(e.registrationOpensAt, e.registrationClosesAt) === "closed")
    );
    setLists(usable);
    return usable;
  }, []);

  useEffect(() => {
    loadLists().catch(() => {});
  }, [loadLists]);

  // Import a CSV/Excel file into a new standalone list and select it as the
  // player source. Reuses the shared import dialog (file data or Wargaming
  // validation), the participant-list RPCs and the same dedupe + random card.
  const handleImportToAuction = async (rows: ImportedRow[], options: ImportOptions) => {
    setImportBusy(true);
    setImportNote(null);
    // Include the time so re-importing never collides with an earlier list name.
    const stamp = new Date().toLocaleString();
    const listName = name.trim()
      ? `${name.trim()} — imported list (${stamp})`
      : `Imported list (${stamp})`;
    const created = await CommunityEventsService.createParticipantList(listName, null);
    if (!created.success || !created.eventId) {
      setImportNote(created.error ?? "Could not create the import list.");
      setImportBusy(false);
      return;
    }
    const listId = created.eventId;
    const seen = new Set<string>();
    let ok = 0;
    let skipped = 0;
    for (const r of rows) {
      const key = r.displayName.trim().toLowerCase();
      if (!key || seen.has(key)) {
        skipped += 1;
        continue;
      }
      seen.add(key);
      const blitz =
        r.validated && r.accountId != null
          ? { accountId: r.accountId, playerName: r.displayName, stats: r.stats! }
          : r.stats
            ? { playerName: r.displayName, stats: r.stats }
            : null;
      const res = await CommunityEventsService.addRegistration(
        listId,
        r.displayName,
        {},
        blitz,
        null,
        { variant: randomVariantId(), flag: options.assignRandomFlag ? randomCountryCode() : null },
        r.customFields
      );
      if (res.success) ok += 1;
      else skipped += 1;
    }
    await loadLists();
    setSelectedListId(listId);
    setImporting(false);
    setImportBusy(false);
    setImportNote(
      ok === 0
        ? "No players could be imported."
        : skipped > 0
          ? `Imported ${ok} player(s) into a new list. ${skipped} skipped (duplicates or errors).`
          : `Imported ${ok} player(s) into a new list, now selected below.`
    );
  };

  // Load the chosen list's participants for preview (and to confirm the count).
  useEffect(() => {
    // A different list has different custom fields — reset the sort choice.
    setSortField("");
    if (!selectedListId) {
      setListPreview([]);
      return;
    }
    let active = true;
    setListLoading(true);
    CommunityEventsService.listRegistrations(selectedListId).then((regs) => {
      if (!active) return;
      setListPreview(regs);
      setListLoading(false);
    });
    return () => {
      active = false;
    };
  }, [selectedListId]);

  // Custom-field labels available to sort by, taken from the loaded list preview
  // (union, in first-seen order). Empty when the list has no custom fields.
  const sortFieldOptions = (() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const reg of listPreview) {
      for (const f of reg.customFields) {
        const label = f.label.trim();
        if (label && !seen.has(label.toLowerCase())) {
          seen.add(label.toLowerCase());
          out.push(label);
        }
      }
    }
    return out;
  })();

  // Derived reserve math, mirrored from the server (admin_create_event):
  // the cheapest a member can secure a player is opening + smallest button, so
  // the reserve per player equals exactly that.
  const limitNum = Math.max(0, Math.floor(Number(playerLimit) || 0));
  const openingNum = Math.max(0, Math.floor(Number(openingBid) || 0));
  const minIncrement =
    bidIncrements.length > 0 ? Math.min(...bidIncrements) : 0;
  const reservePerPlayer = openingNum + minIncrement;
  const totalReserve = limitNum * reservePerPlayer;

  // Keep the budget glued to the reserve until the admin types their own value.
  useEffect(() => {
    if (!budgetTouched) setMemberBudget(String(totalReserve));
  }, [totalReserve, budgetTouched]);

  const budgetNum = Math.max(0, Math.floor(Number(memberBudget) || 0));
  const surplus = Math.max(0, budgetNum - totalReserve);
  const durationNum = Math.max(1, Math.floor(Number(playerDuration) || 0));
  const thresholdNum = Math.max(0, Math.floor(Number(extendThreshold) || 0));
  const extendNum = Math.max(0, Math.floor(Number(extendAmount) || 0));

  // Opening time: "now" sends null (open immediately); "schedule" must be a
  // valid future instant, converted to an ISO string for the server.
  const scheduledMs = opensAtLocal ? new Date(opensAtLocal).getTime() : NaN;
  const scheduleValid =
    openMode === "now" || (!Number.isNaN(scheduledMs) && scheduledMs > Date.now());
  const opensAtIso =
    openMode === "schedule" && !Number.isNaN(scheduledMs)
      ? new Date(scheduledMs).toISOString()
      : null;

  const nameValid = name.trim().length > 0;
  const limitValid = limitNum >= 1;
  const incrementsValid = bidIncrements.length > 0;
  const budgetValid = budgetNum >= totalReserve;
  const canSubmit =
    nameValid && limitValid && incrementsValid && budgetValid && scheduleValid && !submitting;

  const enrolledCount = bidders.filter((m) => !excludedIds.has(m.id)).length;

  // The form holds nothing until "Create" succeeds, so warn before leaving once
  // the admin has changed anything from the pristine defaults.
  const dirty =
    !submitting &&
    (name.trim() !== "" ||
      selectedListId !== "" ||
      listOrder !== "list" ||
      sortField !== "" ||
      excludedIds.size > 0 ||
      budgetTouched ||
      playerLimit !== "8" ||
      openingBid !== "100" ||
      bidIncrements.join(",") !== "10,50,100" ||
      playerDuration !== "30" ||
      extendThreshold !== "10" ||
      extendAmount !== "5" ||
      openMode !== "now");

  const toggleExcluded = (id: string) =>
    setExcludedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleCreate = async () => {
    setSubmitting(true);
    setError(null);
    const res = await EventsService.createEvent({
      name: name.trim(),
      playerLimit: limitNum,
      openingBid: openingNum,
      memberBudget: budgetNum,
      playerDuration: durationNum,
      extendThreshold: thresholdNum,
      extendAmount: extendNum,
      bidIncrements,
      opensAt: opensAtIso,
      excludedProfileIds: Array.from(excludedIds),
    });
    setConfirmOpen(false);
    if (!res.success) {
      setError(res.error ?? "Could not create the event");
      setSubmitting(false);
      return;
    }

    // If a registration list was chosen, replace the player pool with it.
    if (selectedListId) {
      const sort =
        listOrder === "sort" && sortField
          ? { field: sortField, dir: sortDir }
          : null;
      const pool = await CommunityEventsService.replacePlayersFromList(
        selectedListId,
        openingNum,
        listOrder === "shuffle",
        sort
      );
      if (!pool.success) {
        setError(
          `Auction created, but loading the player list failed: ${
            pool.error ?? "unknown error"
          }`
        );
        setSubmitting(false);
        return;
      }
    }

    router.push("/admin/events");
  };

  const extendPresets = [1, 5, 10];

  return (
    <>
      <UnsavedChangesGuard when={dirty} />
      <div className="animate-fade-up">
        <h1 className="text-2xl font-extrabold tracking-tight text-zinc-100 sm:text-3xl">
          Create auction
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          Configure the rules below. The reserve and the minimum budget are calculated
          automatically from the bidding setup, so every member can always reach their target.
        </p>
      </div>

      <div className="mt-6 grid animate-fade-up gap-6 lg:grid-cols-3">
        {/* Form */}
        <form
          className="min-w-0 space-y-5 lg:col-span-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (canSubmit) setConfirmOpen(true);
          }}
        >
          {/* 1. Identity */}
          <Section step={1} title="Identity" desc="Shown to bidders when they enter the room.">
            <Field label="Event name">
              <input
                className={inputClass}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Spring Draft 2026"
                maxLength={80}
              />
            </Field>
          </Section>

          {/* 2. Target */}
          <Section step={2} title="Target" desc="How many players each member must take.">
            <Field label="Players / member">
              <input
                type="number"
                min={1}
                className={`${inputClass} sm:max-w-[12rem]`}
                value={playerLimit}
                onChange={(e) => setPlayerLimit(e.target.value)}
              />
            </Field>
          </Section>

          {/* 3. Bidding */}
          <Section
            step={3}
            title="Bidding"
            desc="The opening bid and the quick buttons. These decide the reserve below."
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label="Opening bid (entry)"
                hint="The starting price for each player."
              >
                <MoneyInput value={openingBid} onChange={setOpeningBid} />
              </Field>
            </div>
            <div className="mt-5">
              <span className="block text-sm font-semibold text-zinc-300">Bid buttons</span>
              <span className="mt-0.5 block text-xs text-zinc-500">
                The increment buttons bidders tap (e.g. +10, +50, +100). The smallest one sets
                the reserve, since the first bid is always opening + smallest button.
              </span>
              <div className="mt-3">
                <IncrementEditor values={bidIncrements} onChange={setBidIncrements} />
              </div>
            </div>
          </Section>

          {/* 4. Reserve & budget */}
          <Section
            step={4}
            title="Reserve & budget"
            desc="Calculated from the bidding setup. The budget can be higher, never lower."
          >
            <div className="grid grid-cols-1 gap-3 xs:grid-cols-2 sm:grid-cols-3">
              <div className="min-w-0 rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
                <div className="text-xs uppercase tracking-wide text-zinc-400">
                  Reserve / player
                </div>
                <div className="mt-1 truncate text-xl font-extrabold tabular-nums text-cyan-200 sm:text-2xl">
                  ${reservePerPlayer.toLocaleString()}
                </div>
                <div className="mt-0.5 text-[11px] text-zinc-500">
                  ${openingNum} opening + ${minIncrement} button
                </div>
              </div>
              <div className="min-w-0 rounded-2xl bg-cyan-500/10 p-4 ring-1 ring-cyan-400/25">
                <div className="text-xs uppercase tracking-wide text-cyan-200/80">
                  Reserve / member
                </div>
                <div className="mt-1 truncate text-xl font-extrabold tabular-nums text-cyan-200 sm:text-2xl">
                  ${totalReserve.toLocaleString()}
                </div>
                <div className="mt-0.5 text-[11px] text-cyan-200/70">
                  {limitNum} × ${reservePerPlayer.toLocaleString()}
                </div>
              </div>
              <div className="min-w-0 rounded-2xl bg-emerald-500/10 p-4 ring-1 ring-emerald-400/25 xs:col-span-2 sm:col-span-1">
                <div className="text-xs uppercase tracking-wide text-emerald-200/80">
                  Spendable surplus
                </div>
                <div className="mt-1 truncate text-xl font-extrabold tabular-nums text-emerald-200 sm:text-2xl">
                  ${surplus.toLocaleString()}
                </div>
                <div className="mt-0.5 text-[11px] text-emerald-200/70">
                  extra for stars, above the reserve
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="flex-1">
                <Field label="Budget / member" hint={`Minimum $${totalReserve.toLocaleString()} (the reserve).`}>
                  <MoneyInput
                    value={memberBudget}
                    onChange={(v) => {
                      setBudgetTouched(true);
                      setMemberBudget(v);
                    }}
                    min={totalReserve}
                  />
                </Field>
              </div>
              <button
                type="button"
                onClick={() => {
                  setBudgetTouched(false);
                  setMemberBudget(String(totalReserve));
                }}
                className="rounded-xl bg-white/5 px-4 py-3 text-sm font-semibold text-zinc-200 ring-1 ring-white/10 transition hover:bg-white/10"
              >
                Reset to reserve
              </button>
            </div>
            {!budgetValid && (
              <p className="mt-2 text-xs font-semibold text-amber-200">
                Budget can&apos;t be below the reserve of ${totalReserve.toLocaleString()}.
              </p>
            )}
          </Section>

          {/* 5. Timer */}
          <Section
            step={5}
            title="Timer"
            desc="How long each player runs and how a late bid extends the clock (anti-snipe)."
          >
            <div className="grid gap-5 sm:grid-cols-3">
              <Field label="Seconds / player" hint="Length of the active phase.">
                <input
                  type="number"
                  min={1}
                  className={inputClass}
                  value={playerDuration}
                  onChange={(e) => setPlayerDuration(e.target.value)}
                />
              </Field>
              <Field label="Extend when ≤" hint="Seconds left that trigger an extend.">
                <input
                  type="number"
                  min={0}
                  className={inputClass}
                  value={extendThreshold}
                  onChange={(e) => setExtendThreshold(e.target.value)}
                />
              </Field>
              <Field label="Add seconds" hint="Added per qualifying bid.">
                <div className="space-y-2">
                  <input
                    type="number"
                    min={0}
                    className={inputClass}
                    value={extendAmount}
                    onChange={(e) => setExtendAmount(e.target.value)}
                  />
                  <div className="grid grid-cols-3 gap-2">
                    {extendPresets.map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setExtendAmount(String(n))}
                        className={`rounded-lg px-2 py-1.5 text-xs font-bold ring-1 transition ${
                          extendNum === n
                            ? "bg-emerald-500/20 text-emerald-200 ring-emerald-400/30"
                            : "bg-white/5 text-zinc-300 ring-white/10 hover:bg-white/10"
                        }`}
                      >
                        +{n}s
                      </button>
                    ))}
                  </div>
                </div>
              </Field>
            </div>
            <p className="mt-4 rounded-xl bg-black/25 px-3 py-2 text-xs text-zinc-400 ring-1 ring-white/10">
              Example: a player runs {durationNum}s. If a bid lands with {thresholdNum}s or
              less left, the clock jumps to {Math.min(extendNum + thresholdNum, durationNum)}s
              (adds {extendNum}s, capped at {durationNum}s).
            </p>
          </Section>

          {/* 6. Opening time */}
          <Section
            step={6}
            title="Opening time"
            desc="When bidders can enter the room. Open now, or schedule it for later."
          >
            <div className="grid grid-cols-2 gap-2 sm:max-w-sm">
              <button
                type="button"
                onClick={() => setOpenMode("now")}
                className={`rounded-xl px-4 py-2.5 text-sm font-bold ring-1 transition ${
                  openMode === "now"
                    ? "bg-emerald-500/20 text-emerald-200 ring-emerald-400/30"
                    : "bg-white/5 text-zinc-300 ring-white/10 hover:bg-white/10"
                }`}
              >
                Open now
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpenMode("schedule");
                  if (!opensAtLocal) {
                    setOpensAtLocal(localInputValue(new Date(Date.now() + 60 * 60 * 1000)));
                  }
                }}
                className={`rounded-xl px-4 py-2.5 text-sm font-bold ring-1 transition ${
                  openMode === "schedule"
                    ? "bg-emerald-500/20 text-emerald-200 ring-emerald-400/30"
                    : "bg-white/5 text-zinc-300 ring-white/10 hover:bg-white/10"
                }`}
              >
                Schedule
              </button>
            </div>

            {openMode === "schedule" && (
              <div className="mt-4">
                <Field label="Opens at" hint="Your local date and time.">
                  <input
                    type="datetime-local"
                    className={`${inputClass} sm:max-w-sm`}
                    value={opensAtLocal}
                    min={localInputValue(new Date())}
                    onChange={(e) => setOpensAtLocal(e.target.value)}
                  />
                </Field>
                {!scheduleValid && (
                  <p className="mt-2 text-xs font-semibold text-amber-200">
                    Pick a date and time in the future.
                  </p>
                )}
              </div>
            )}

            <p className="mt-4 rounded-xl bg-black/25 px-3 py-2 text-xs text-zinc-400 ring-1 ring-white/10">
              {openMode === "now"
                ? "Bidders can enter as soon as the event is created."
                : scheduleValid
                  ? "Until then, bidders see a countdown on their dashboard and can't enter."
                  : "Choose a valid future time to schedule the opening."}
            </p>
          </Section>

          {error && <p className="text-sm font-semibold text-red-200">{error}</p>}

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full rounded-2xl bg-emerald-500/20 px-6 py-3.5 text-sm font-bold text-emerald-100 ring-1 ring-emerald-400/30 transition hover:bg-emerald-500/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Creating…" : "Create event & apply rules"}
          </button>
        </form>

        {/* Right column: members + players */}
        <div className="min-w-0 space-y-6 lg:col-span-1">
          <BidderAccessSelect
            members={bidders}
            onlineIds={onlineIds}
            excludedIds={excludedIds}
            onToggle={toggleExcluded}
          />

          <div className="min-w-0 rounded-3xl bg-white/5 p-5 ring-1 ring-white/10">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-base font-extrabold text-zinc-100">Players up for auction</h3>
              <span className="shrink-0 rounded-full bg-white/5 px-2.5 py-0.5 text-xs font-semibold text-zinc-300 ring-1 ring-white/10">
                {selectedListId ? listPreview.length : players.length}
              </span>
            </div>

            {/* Source: a finished registration list, or the players already in the DB. */}
            <label className="block">
              <span className="block text-xs font-semibold text-zinc-400">Player source</span>
              <select
                value={selectedListId}
                onChange={(e) => setSelectedListId(e.target.value)}
                className="mt-1.5 w-full min-w-0 rounded-xl bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
              >
                <option value="" className="bg-zinc-900 text-zinc-100">
                  Players already in the database
                </option>
                {lists.map((l) => (
                  <option key={l.id} value={l.id} className="bg-zinc-900 text-zinc-100">
                    {l.title}
                    {l.region ? ` (${l.region.toUpperCase()})` : ""}
                  </option>
                ))}
              </select>
              {lists.length === 0 && (
                <span className="mt-1 block text-[11px] text-zinc-500">
                  No finished registration lists yet — close an event&apos;s registration, or import
                  a file below.
                </span>
              )}
            </label>

            {/* Import a brand-new list right here (CSV/Excel, optional WG validation). */}
            <button
              type="button"
              onClick={() => {
                setImportNote(null);
                setImporting(true);
              }}
              className="mt-3 w-full rounded-xl bg-white/5 px-3 py-2.5 text-sm font-bold text-zinc-200 ring-1 ring-white/10 transition hover:bg-white/10"
            >
              ⬆ Import a list (CSV/Excel)…
            </button>
            {importNote && (
              <p className="mt-2 rounded-xl bg-black/30 px-3 py-2 text-[11px] text-zinc-300 ring-1 ring-white/10">
                {importNote}
              </p>
            )}

            {selectedListId && (
              <p className="mt-2 rounded-xl bg-emerald-500/10 px-3 py-2 text-[11px] text-emerald-200/90 ring-1 ring-emerald-400/25">
                These participants replace the auction player pool. Each card shows their battles,
                win rate and average damage; the starting bid is the opening bid above.
              </p>
            )}

            {/* Player order: keep the list's own order, shuffle it, or sort by a
                custom field ascending / descending. */}
            {selectedListId && (
              <div className="mt-3">
                <span className="block text-xs font-semibold text-zinc-400">Player order</span>
                <div className="mt-1.5 grid grid-cols-3 gap-2">
                  {(
                    [
                      { key: "list", label: "List order" },
                      { key: "shuffle", label: "🔀 Shuffle" },
                      { key: "sort", label: "↕ Sort" },
                    ] as const
                  ).map((opt) => {
                    const active = listOrder === opt.key;
                    const disabled = opt.key === "sort" && sortFieldOptions.length === 0;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        disabled={disabled}
                        onClick={() => {
                          setListOrder(opt.key);
                          if (opt.key === "sort" && !sortField && sortFieldOptions.length > 0) {
                            setSortField(sortFieldOptions[0]);
                          }
                        }}
                        aria-pressed={active}
                        title={
                          disabled ? "This list has no custom fields to sort by." : undefined
                        }
                        className={`rounded-xl px-2 py-2 text-xs font-bold ring-1 transition ${
                          active
                            ? "bg-emerald-500/20 text-emerald-200 ring-emerald-400/30"
                            : "bg-white/5 text-zinc-300 ring-white/10 hover:bg-white/10"
                        } disabled:cursor-not-allowed disabled:opacity-40`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>

                {listOrder === "sort" && (
                  <div className="mt-2 grid grid-cols-1 gap-2 xs:grid-cols-2">
                    <select
                      value={sortField}
                      onChange={(e) => setSortField(e.target.value)}
                      aria-label="Sort by field"
                      className="w-full min-w-0 rounded-xl bg-zinc-900 px-3 py-2 text-sm text-zinc-100 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
                    >
                      {sortFieldOptions.map((label) => (
                        <option key={label} value={label} className="bg-zinc-900 text-zinc-100">
                          {label}
                        </option>
                      ))}
                    </select>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setSortDir("desc")}
                        aria-pressed={sortDir === "desc"}
                        className={`rounded-xl px-2 py-2 text-xs font-bold ring-1 transition ${
                          sortDir === "desc"
                            ? "bg-emerald-500/20 text-emerald-200 ring-emerald-400/30"
                            : "bg-white/5 text-zinc-300 ring-white/10 hover:bg-white/10"
                        }`}
                      >
                        ↓ High→low
                      </button>
                      <button
                        type="button"
                        onClick={() => setSortDir("asc")}
                        aria-pressed={sortDir === "asc"}
                        className={`rounded-xl px-2 py-2 text-xs font-bold ring-1 transition ${
                          sortDir === "asc"
                            ? "bg-emerald-500/20 text-emerald-200 ring-emerald-400/30"
                            : "bg-white/5 text-zinc-300 ring-white/10 hover:bg-white/10"
                        }`}
                      >
                        ↑ Low→high
                      </button>
                    </div>
                  </div>
                )}

                <p className="mt-1.5 text-[11px] text-zinc-500">
                  {listOrder === "shuffle"
                    ? "Players come up in a random order, different every time."
                    : listOrder === "sort"
                      ? sortField
                        ? `Players are ordered by "${sortField}" (${
                            sortDir === "desc" ? "highest first" : "lowest first"
                          }), by number.`
                        : "Pick a field to sort by."
                      : "Players come up in the list's own order (as previewed below)."}
                </p>
              </div>
            )}

            <div className="mt-3">
              {selectedListId ? (
                listLoading ? (
                  <div className="h-24 animate-pulse rounded-2xl bg-black/25" />
                ) : listPreview.length === 0 ? (
                  <p className="text-sm text-zinc-500">This list has no participants.</p>
                ) : (
                  <ol className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
                    {listPreview.map((reg, i) => (
                      <li
                        key={reg.id}
                        className="flex items-center gap-3 rounded-xl bg-black/25 px-3 py-2 ring-1 ring-white/10"
                      >
                        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-white/5 text-xs font-bold tabular-nums text-zinc-400 ring-1 ring-white/10">
                          {i + 1}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-zinc-100">
                            {reg.playerName || reg.displayName}
                          </span>
                          {reg.blitzStats && (
                            <span className="block text-[10px] tabular-nums text-zinc-500">
                              {reg.blitzStats.battles.toLocaleString()} btl ·{" "}
                              {reg.blitzStats.winrate.toFixed(1)}% ·{" "}
                              {reg.blitzStats.avgDamage.toLocaleString()} dmg
                            </span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ol>
                )
              ) : loading ? (
                <div className="h-24 animate-pulse rounded-2xl bg-black/25" />
              ) : players.length === 0 ? (
                <p className="text-sm text-zinc-500">
                  No players in the database yet. Pick a registration list above, or seed the
                  players table.
                </p>
              ) : (
                <ol className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
                  {players.map((p, i) => (
                    <li
                      key={p.id}
                      className="flex items-center gap-3 rounded-xl bg-black/25 px-3 py-2 ring-1 ring-white/10"
                    >
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-white/5 text-xs font-bold tabular-nums text-zinc-400 ring-1 ring-white/10">
                        {i + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-100">
                        {p.name}
                      </span>
                      <span className="shrink-0 text-xs tabular-nums text-zinc-500">
                        ${p.basePrice.toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmOpen}
        title="Create this event?"
        message={`"${name.trim()}" — ${limitNum} players/member, opening $${openingNum.toLocaleString()}, reserve $${totalReserve.toLocaleString()}, budget $${budgetNum.toLocaleString()} each. ${durationNum}s per player. ${enrolledCount} member(s) enrolled${
          excludedIds.size > 0 ? `, ${excludedIds.size} excluded` : ""
        }. ${
          opensAtIso
            ? `Opens ${new Date(opensAtIso).toLocaleString()}.`
            : "Opens immediately."
        }${
          selectedListId
            ? ` Player pool: ${listPreview.length} from the selected registration list (${
                listOrder === "shuffle"
                  ? "shuffled order"
                  : listOrder === "sort" && sortField
                    ? `sorted by ${sortField} ${sortDir === "desc" ? "↓" : "↑"}`
                    : "list order"
              }).`
            : ""
        } This becomes the live event.`}
        onConfirm={handleCreate}
        onCancel={() => setConfirmOpen(false)}
      />

      {/* Import a CSV/Excel list as the auction's player pool. The admin picks the
          Wargaming region inside the dialog when using validation. */}
      <ImportListDialog
        isOpen={importing}
        eventTitle={name.trim() || "this auction"}
        region={null}
        busy={importBusy}
        onImport={handleImportToAuction}
        onCancel={() => setImporting(false)}
      />
    </>
  );
}
