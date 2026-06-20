// Makes a member row clickable and opens a popover where the admin can change
// the member's role and/or ban them. Writes go through MembersService (RPCs).
// `onChange` lets the parent update its local list optimistically.

"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { Member } from "@/types/account.types";
import { MembersService } from "@/services/membersService";
import { ASSIGNABLE_ROLES, roleMeta } from "./roleMeta";

export default function MemberActions({
  member,
  mode = "all",
  onChange,
  children,
}: {
  member: Member;
  mode?: "roles" | "ban" | "all";
  onChange: (member: Member) => void;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [nameInput, setNameInput] = useState(member.username);
  const ref = useRef<HTMLDivElement>(null);

  // Reset the editable name to the current one each time the popover opens.
  useEffect(() => {
    if (open) setNameInput(member.username);
  }, [open, member.username]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const changeRole = async (role: string) => {
    if (member.role.toLowerCase() === role) {
      setOpen(false);
      return;
    }
    setBusy(true);
    const ok = await MembersService.setRole(member.id, role);
    setBusy(false);
    if (ok) {
      onChange({ ...member, role });
      setOpen(false);
    }
  };

  const toggleBan = async () => {
    setBusy(true);
    const ok = await MembersService.setBanned(member.id, !member.banned);
    setBusy(false);
    if (ok) {
      onChange({ ...member, banned: !member.banned });
      setOpen(false);
    }
  };

  const saveName = async () => {
    const next = nameInput.trim();
    if (!next || next === member.username) {
      setOpen(false);
      return;
    }
    setBusy(true);
    const ok = await MembersService.setName(member.id, next);
    setBusy(false);
    if (ok) {
      onChange({ ...member, displayName: next, username: next });
      setOpen(false);
    }
  };

  const resetName = async () => {
    setBusy(true);
    const ok = await MembersService.setName(member.id, null);
    setBusy(false);
    if (ok) {
      onChange({
        ...member,
        displayName: null,
        username: member.originalUsername,
      });
      setOpen(false);
    }
  };

  const showRoles = mode === "roles" || mode === "all";
  const showBan = mode === "ban" || mode === "all";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="block w-full rounded-2xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50"
      >
        {children}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-1 w-64 origin-top-right animate-scale-in overflow-hidden rounded-2xl bg-zinc-900/95 ring-1 ring-white/10 shadow-2xl backdrop-blur"
        >
          {/* Display name: rename or reset to the original Discord name. */}
          <div className={`p-1.5 ${showRoles || showBan ? "border-b border-white/10" : ""}`}>
            <div className="px-2 py-1 text-[10px] uppercase tracking-wide text-zinc-500">
              Display name
            </div>
            <input
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void saveName();
                }
              }}
              placeholder={member.originalUsername}
              maxLength={40}
              disabled={busy}
              className="mb-1.5 w-full rounded-xl bg-black/40 px-3 py-2 text-sm text-zinc-100 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 disabled:opacity-60"
            />
            <button
              type="button"
              role="menuitem"
              disabled={busy || !nameInput.trim() || nameInput.trim() === member.username}
              onClick={saveName}
              className="w-full rounded-xl bg-emerald-500/15 px-3 py-2 text-sm font-bold text-emerald-200 ring-1 ring-emerald-400/25 transition hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Save name
            </button>
            {member.displayName && (
              <>
                <button
                  type="button"
                  role="menuitem"
                  disabled={busy}
                  onClick={resetName}
                  className="mt-1.5 w-full truncate rounded-xl bg-white/5 px-3 py-2 text-xs font-semibold text-zinc-200 ring-1 ring-white/10 transition hover:bg-white/10 disabled:opacity-50"
                >
                  Reset to “{member.originalUsername}”
                </button>
                <p className="mt-1.5 px-1 text-[10px] text-zinc-500">
                  Original name:{" "}
                  <span className="text-zinc-300">{member.originalUsername}</span>
                </p>
              </>
            )}
          </div>

          {showRoles && (
            <div className="p-1.5">
              <div className="px-2 py-1 text-[10px] uppercase tracking-wide text-zinc-500">
                Set role
              </div>
              {ASSIGNABLE_ROLES.map((r) => {
                const active = member.role.toLowerCase() === r;
                return (
                  <button
                    key={r}
                    type="button"
                    role="menuitem"
                    disabled={busy}
                    onClick={() => changeRole(r)}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition disabled:opacity-50 ${
                      active
                        ? "bg-emerald-500/15 font-semibold text-emerald-100"
                        : "text-zinc-200 hover:bg-white/10"
                    }`}
                  >
                    {roleMeta(r).label}
                    {active && <span aria-hidden>✓</span>}
                  </button>
                );
              })}
            </div>
          )}

          {showBan && (
            <div className={`p-1.5 ${showRoles ? "border-t border-white/10" : ""}`}>
              <button
                type="button"
                role="menuitem"
                disabled={busy}
                onClick={toggleBan}
                className={`flex w-full items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold transition disabled:opacity-50 ${
                  member.banned
                    ? "text-emerald-200 hover:bg-emerald-500/15"
                    : "text-red-200 hover:bg-red-500/15"
                }`}
              >
                {member.banned ? "Unban member" : "Ban member"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
