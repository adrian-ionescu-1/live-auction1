// Edit the textual info of a community event: type tag, title, body, the optional
// link button, which roles see it, and the informational event dates. The
// registration form and window are managed elsewhere (reopen action), so they're
// intentionally not edited here. Portaled, mobile-first.

"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CommunityEvent } from "@/types/community-event.types";
import { ROLE_ORDER, roleMeta } from "@/components/admin/roleMeta";
import {
  EVENT_CATEGORY_PRESETS,
  localInputValue,
} from "@/components/admin/communityEventMeta";

const inputClass =
  "w-full min-w-0 rounded-xl bg-black/40 px-4 py-3 text-zinc-100 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400/40";

function isoToLocal(iso: string | null): string {
  return iso ? localInputValue(new Date(iso)) : "";
}

// Match the event's stored category back to a preset, falling back to "custom".
function presetKeyFor(event: CommunityEvent): string {
  return EVENT_CATEGORY_PRESETS.some((c) => c.key === event.categoryKey)
    ? event.categoryKey
    : "custom";
}

export default function EditCommunityEventDialog({
  event,
  isOpen,
  busy,
  onSave,
  onCancel,
}: {
  event: CommunityEvent | null;
  isOpen: boolean;
  busy: boolean;
  onSave: (payload: {
    categoryKey: string;
    categoryName: string;
    title: string;
    content: string;
    visibleRoles: string[];
    hasLink: boolean;
    linkLabel: string | null;
    linkUrl: string | null;
    startsAt: string | null;
    endsAt: string | null;
  }) => void;
  onCancel: () => void;
}) {
  const [categoryKey, setCategoryKey] = useState("custom");
  const [customName, setCustomName] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [roles, setRoles] = useState<Set<string>>(new Set());
  const [hasLink, setHasLink] = useState(false);
  const [linkLabel, setLinkLabel] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Refill the form whenever a (different) event opens.
  useEffect(() => {
    if (!isOpen || !event) return;
    const key = presetKeyFor(event);
    setCategoryKey(key);
    setCustomName(key === "custom" ? event.categoryName : "");
    setTitle(event.title);
    setContent(event.content);
    setRoles(new Set(event.visibleRoles));
    setHasLink(event.hasLink);
    setLinkLabel(event.linkLabel ?? "");
    setLinkUrl(event.linkUrl ?? "");
    setStartsAt(isoToLocal(event.startsAt));
    setEndsAt(isoToLocal(event.endsAt));
  }, [isOpen, event]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onCancel]);

  if (!isOpen || !mounted || !event) return null;

  const toggleRole = (role: string) =>
    setRoles((prev) => {
      const next = new Set(prev);
      if (next.has(role)) next.delete(role);
      else next.add(role);
      return next;
    });

  const categoryName =
    categoryKey === "custom"
      ? customName.trim() || "Custom"
      : EVENT_CATEGORY_PRESETS.find((c) => c.key === categoryKey)?.label ?? "Event";

  const titleValid = title.trim().length > 0;
  const rolesValid = roles.size > 0;
  const linkValid = !hasLink || linkUrl.trim().length > 0;
  const customValid = categoryKey !== "custom" || customName.trim().length > 0;
  const canSave = titleValid && rolesValid && linkValid && customValid && !busy;

  const submit = () => {
    if (!canSave) return;
    const toIso = (local: string) => (local ? new Date(local).toISOString() : null);
    onSave({
      categoryKey,
      categoryName,
      title: title.trim(),
      content: content.trim(),
      visibleRoles: Array.from(roles),
      hasLink,
      linkLabel: hasLink ? linkLabel.trim() || "Open link" : null,
      linkUrl: hasLink ? linkUrl.trim() : null,
      startsAt: toIso(startsAt),
      endsAt: toIso(endsAt),
    });
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] overflow-y-auto bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Edit event"
    >
      <div className="flex min-h-full items-start justify-center p-4">
        <div className="my-4 w-full max-w-lg min-w-0 rounded-3xl bg-zinc-950/95 p-5 ring-1 ring-white/10 shadow-2xl sm:p-6">
          <h3 className="text-lg font-extrabold text-zinc-100">Edit event</h3>
          <p className="mt-1 text-xs text-zinc-500">
            The registration form and window aren&apos;t changed here.
          </p>

          <div className="mt-4 space-y-4">
            <label className="block min-w-0">
              <span className="block text-sm font-semibold text-zinc-300">Event type</span>
              <div className="mt-2 grid grid-cols-1 gap-2 xs:grid-cols-2">
                <select
                  value={categoryKey}
                  onChange={(e) => setCategoryKey(e.target.value)}
                  className="min-w-0 rounded-xl bg-zinc-900 px-3 py-3 text-sm text-zinc-100 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
                >
                  {EVENT_CATEGORY_PRESETS.map((c) => (
                    <option key={c.key} value={c.key} className="bg-zinc-900 text-zinc-100">
                      {c.label}
                    </option>
                  ))}
                </select>
                {categoryKey === "custom" && (
                  <input
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="Custom category name"
                    maxLength={40}
                    className={inputClass}
                  />
                )}
              </div>
            </label>

            <label className="block min-w-0">
              <span className="block text-sm font-semibold text-zinc-300">Title</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
                className={`${inputClass} mt-2`}
              />
            </label>

            <label className="block min-w-0">
              <span className="block text-sm font-semibold text-zinc-300">Content</span>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                maxLength={4000}
                className={`${inputClass} mt-2 min-h-[6rem] resize-y`}
              />
            </label>

            <div className="min-w-0">
              <span className="block text-sm font-semibold text-zinc-300">Who can see it</span>
              <div className="mt-2 grid grid-cols-1 gap-2 xs:grid-cols-2">
                {ROLE_ORDER.map((role) => {
                  const active = roles.has(role);
                  return (
                    <label
                      key={role}
                      className={`flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2 text-sm ring-1 transition ${
                        active
                          ? "bg-emerald-500/15 text-emerald-100 ring-emerald-400/25"
                          : "bg-black/25 text-zinc-300 ring-white/10 hover:bg-white/5"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={() => toggleRole(role)}
                        className="h-4 w-4 accent-emerald-500"
                      />
                      <span className="font-semibold">{roleMeta(role).label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-3 rounded-2xl bg-black/25 px-3 py-2.5 text-sm text-zinc-200 ring-1 ring-white/10">
              <input
                type="checkbox"
                checked={hasLink}
                onChange={(e) => setHasLink(e.target.checked)}
                className="h-4 w-4 accent-emerald-500"
              />
              Show a link button
            </label>
            {hasLink && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  value={linkLabel}
                  onChange={(e) => setLinkLabel(e.target.value)}
                  placeholder="Button text"
                  maxLength={40}
                  className={inputClass}
                />
                <input
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://…"
                  inputMode="url"
                  className={inputClass}
                />
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block min-w-0">
                <span className="block text-xs font-semibold text-zinc-400">Event start</span>
                <input
                  type="datetime-local"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                  className={`${inputClass} mt-1`}
                />
              </label>
              <label className="block min-w-0">
                <span className="block text-xs font-semibold text-zinc-400">Event end</span>
                <input
                  type="datetime-local"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                  className={`${inputClass} mt-1`}
                />
              </label>
            </div>
          </div>

          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="flex-1 rounded-2xl bg-white/5 px-4 py-3 text-sm font-bold text-zinc-200 ring-1 ring-white/10 transition hover:bg-white/10 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={!canSave}
              className="flex-1 rounded-2xl bg-emerald-500/20 px-4 py-3 text-sm font-bold text-emerald-100 ring-1 ring-emerald-400/30 transition hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
