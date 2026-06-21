// Create a community event (anunț): a typed announcement shown to chosen roles,
// with an optional link button, informational start/end dates, a registration
// window, and an admin-defined set of fields participants fill in to register.
// Mobile-first: everything stacks and stays within 320px.

"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CommunityEventsService } from "@/services/communityEventsService";
import {
  BlitzRegion,
  RegistrationField,
  RegistrationFieldType,
} from "@/types/community-event.types";
import { ROLE_ORDER, roleMeta } from "@/components/admin/roleMeta";
import {
  EVENT_CATEGORY_PRESETS,
  categoryChip,
  categoryHashtag,
} from "@/components/admin/communityEventMeta";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

const inputClass =
  "w-full min-w-0 rounded-xl bg-black/30 px-4 py-3 text-zinc-100 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400/40";

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
    <div className="min-w-0 rounded-3xl bg-white/5 p-5 ring-1 ring-white/10 sm:p-6">
      <div className="mb-4 flex items-start gap-3">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-500/15 text-xs font-bold text-emerald-200 ring-1 ring-emerald-400/25">
          {step}
        </span>
        <div className="min-w-0">
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
    <label className="block min-w-0">
      <span className="block text-sm font-semibold text-zinc-300">{label}</span>
      {hint && <span className="mt-0.5 block text-xs text-zinc-500">{hint}</span>}
      <div className="mt-2">{children}</div>
    </label>
  );
}

// Slugify a field label into a stable key, keeping keys unique within the form.
function makeKey(label: string, taken: Set<string>): string {
  const base =
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "field";
  let key = base;
  let i = 2;
  while (taken.has(key)) key = `${base}_${i++}`;
  return key;
}

// Builder for the registration form: add fields (label, type, required), remove.
function RegistrationFieldsEditor({
  fields,
  onChange,
}: {
  fields: RegistrationField[];
  onChange: (next: RegistrationField[]) => void;
}) {
  const [label, setLabel] = useState("");
  const [type, setType] = useState<RegistrationFieldType>("text");
  const [required, setRequired] = useState(true);

  const add = () => {
    const clean = label.trim();
    if (!clean) return;
    const taken = new Set(fields.map((f) => f.key));
    onChange([...fields, { key: makeKey(clean, taken), label: clean, type, required }]);
    setLabel("");
    setType("text");
    setRequired(true);
  };

  const remove = (key: string) => onChange(fields.filter((f) => f.key !== key));

  return (
    <div className="space-y-3">
      {fields.length === 0 ? (
        <p className="text-xs text-amber-200">
          Add at least one field participants fill in (e.g. in-game nickname).
        </p>
      ) : (
        <ul className="space-y-2">
          {fields.map((f) => (
            <li
              key={f.key}
              className="flex items-center gap-3 rounded-2xl bg-black/25 px-3 py-2 ring-1 ring-white/10"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-zinc-100">
                  {f.label}
                </span>
                <span className="block text-[10px] uppercase tracking-wide text-zinc-500">
                  {f.type}
                  {f.required ? " · required" : " · optional"}
                </span>
              </span>
              <button
                type="button"
                onClick={() => remove(f.key)}
                aria-label={`Remove ${f.label}`}
                className="shrink-0 rounded-lg px-2 py-1 text-xs font-bold text-red-200 ring-1 ring-red-400/25 transition hover:bg-red-500/15"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="rounded-2xl bg-black/20 p-3 ring-1 ring-white/10">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Field label (e.g. In-game nickname)"
          maxLength={60}
          className={inputClass}
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <select
            value={type}
            onChange={(e) => setType(e.target.value as RegistrationFieldType)}
            className="min-w-0 flex-1 rounded-xl bg-zinc-900 px-3 py-2 text-sm text-zinc-100 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
          >
            <option value="text" className="bg-zinc-900 text-zinc-100">
              Text
            </option>
            <option value="number" className="bg-zinc-900 text-zinc-100">
              Number
            </option>
          </select>
          <label className="flex shrink-0 cursor-pointer items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-sm text-zinc-200 ring-1 ring-white/10">
            <input
              type="checkbox"
              checked={required}
              onChange={(e) => setRequired(e.target.checked)}
              className="h-4 w-4 accent-emerald-500"
            />
            Required
          </label>
          <button
            type="button"
            onClick={add}
            disabled={!label.trim()}
            className="shrink-0 rounded-xl bg-emerald-500/15 px-4 py-2 text-sm font-bold text-emerald-200 ring-1 ring-emerald-400/25 transition hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Add field
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CreateCommunityEventPage() {
  const router = useRouter();

  const [categoryKey, setCategoryKey] = useState("wot_blitz");
  const [customName, setCustomName] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [region, setRegion] = useState<"" | BlitzRegion>("");
  const [roles, setRoles] = useState<Set<string>>(new Set(["bidder"]));

  const [hasLink, setHasLink] = useState(false);
  const [linkLabel, setLinkLabel] = useState("");
  const [linkUrl, setLinkUrl] = useState("");

  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [regOpensAt, setRegOpensAt] = useState("");
  const [regClosesAt, setRegClosesAt] = useState("");

  const [fields, setFields] = useState<RegistrationField[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categoryName = useMemo(() => {
    if (categoryKey === "custom") return customName.trim() || "Custom";
    return EVENT_CATEGORY_PRESETS.find((c) => c.key === categoryKey)?.label ?? "Event";
  }, [categoryKey, customName]);

  const toggleRole = (role: string) =>
    setRoles((prev) => {
      const next = new Set(prev);
      if (next.has(role)) next.delete(role);
      else next.add(role);
      return next;
    });

  // datetime-local (local, no timezone) -> ISO for the server, or null when empty.
  const toIso = (local: string): string | null =>
    local ? new Date(local).toISOString() : null;

  const titleValid = title.trim().length > 0;
  const rolesValid = roles.size > 0;
  const fieldsValid = fields.length > 0;
  const customValid = categoryKey !== "custom" || customName.trim().length > 0;
  const linkValid = !hasLink || linkUrl.trim().length > 0;
  const canSubmit =
    titleValid && rolesValid && fieldsValid && customValid && linkValid && !submitting;

  const handleSubmit = async () => {
    setConfirmOpen(false);
    setSubmitting(true);
    setError(null);
    const res = await CommunityEventsService.createEvent({
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
      registrationOpensAt: toIso(regOpensAt),
      registrationClosesAt: toIso(regClosesAt),
      registrationFields: fields,
      region: region || null,
    });
    if (res.success) {
      router.push("/admin/community-events");
    } else {
      setError(res.error ?? "Could not create the event");
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="animate-fade-up">
        <h1 className="text-2xl font-extrabold tracking-tight text-zinc-100 sm:text-3xl">
          Create event
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          Post an announcement for the roles you choose. Eligible members see it on their
          dashboard and register by filling the fields you define below.
        </p>
      </div>

      <form
        className="mt-6 min-w-0 animate-fade-up space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (canSubmit) setConfirmOpen(true);
        }}
      >
        {/* 1. Type + identity */}
        <Section step={1} title="Type & title" desc="The event category tag, its title and body.">
          <div className="space-y-5">
            <Field label="Event type" hint="Shown as a # tag on the event.">
              <div className="grid grid-cols-1 gap-2 xs:grid-cols-2">
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
              <span
                className={`mt-2 inline-flex max-w-full items-center truncate rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ${categoryChip(
                  categoryKey
                )}`}
              >
                {categoryHashtag(categoryName)}
              </span>
            </Field>

            <Field
              label="Blitz region"
              hint="Pick a region to require players to validate a real WoT Blitz account."
            >
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value as "" | BlitzRegion)}
                className="w-full min-w-0 rounded-xl bg-zinc-900 px-3 py-3 text-sm text-zinc-100 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
              >
                <option value="" className="bg-zinc-900 text-zinc-100">
                  No Blitz validation
                </option>
                <option value="eu" className="bg-zinc-900 text-zinc-100">
                  EU
                </option>
                <option value="na" className="bg-zinc-900 text-zinc-100">
                  NA
                </option>
                <option value="asia" className="bg-zinc-900 text-zinc-100">
                  ASIA
                </option>
              </select>
              {region && (
                <p className="mt-1.5 text-xs text-emerald-200/80">
                  Players will verify their account on {region.toUpperCase()} and their stats
                  (battles, win rate, avg damage) are captured automatically.
                </p>
              )}
            </Field>

            <Field label="Title">
              <input
                className={inputClass}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Spring Blitz Cup — sign-ups open"
                maxLength={120}
              />
            </Field>

            <Field label="Content" hint="The announcement body shown to members.">
              <textarea
                className={`${inputClass} min-h-[7rem] resize-y`}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Describe the event, the rules, what participants should know…"
                maxLength={4000}
              />
            </Field>
          </div>
        </Section>

        {/* 2. Visibility */}
        <Section step={2} title="Who can see it" desc="Pick one or more roles. Only they see and can register.">
          <div className="grid grid-cols-1 gap-2 xs:grid-cols-2">
            {ROLE_ORDER.map((role) => {
              const active = roles.has(role);
              return (
                <label
                  key={role}
                  className={`flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2.5 text-sm ring-1 transition ${
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
          {!rolesValid && (
            <p className="mt-2 text-xs font-semibold text-amber-200">Select at least one role.</p>
          )}
        </Section>

        {/* 3. Optional link button */}
        <Section step={3} title="Link button (optional)" desc="Adds a clickable button to the event.">
          <label className="flex cursor-pointer items-center gap-3 rounded-2xl bg-black/25 px-3 py-2.5 text-sm text-zinc-200 ring-1 ring-white/10">
            <input
              type="checkbox"
              checked={hasLink}
              onChange={(e) => setHasLink(e.target.checked)}
              className="h-4 w-4 accent-emerald-500"
            />
            Add a link button to this event
          </label>
          {hasLink && (
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Button text">
                <input
                  className={inputClass}
                  value={linkLabel}
                  onChange={(e) => setLinkLabel(e.target.value)}
                  placeholder="e.g. Open rules"
                  maxLength={40}
                />
              </Field>
              <Field label="Link URL">
                <input
                  className={inputClass}
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://…"
                  inputMode="url"
                />
              </Field>
            </div>
          )}
          {hasLink && !linkValid && (
            <p className="mt-2 text-xs font-semibold text-amber-200">Add the link URL.</p>
          )}
        </Section>

        {/* 4. Dates */}
        <Section step={4} title="Dates" desc="Event dates are informational. The registration window controls sign-ups.">
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Event start" hint="Informational only.">
                <input
                  type="datetime-local"
                  className={inputClass}
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                />
              </Field>
              <Field label="Event end" hint="Informational only.">
                <input
                  type="datetime-local"
                  className={inputClass}
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                />
              </Field>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Registration opens" hint="When members can start registering.">
                <input
                  type="datetime-local"
                  className={inputClass}
                  value={regOpensAt}
                  onChange={(e) => setRegOpensAt(e.target.value)}
                />
              </Field>
              <Field label="Registration closes" hint="After this, sign-ups are closed.">
                <input
                  type="datetime-local"
                  className={inputClass}
                  value={regClosesAt}
                  onChange={(e) => setRegClosesAt(e.target.value)}
                />
              </Field>
            </div>
          </div>
        </Section>

        {/* 5. Registration form */}
        <Section step={5} title="Registration form" desc="The fields each participant fills in to register.">
          <RegistrationFieldsEditor fields={fields} onChange={setFields} />
        </Section>

        {error && <p className="text-sm font-semibold text-red-200">{error}</p>}

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full rounded-2xl bg-emerald-500/20 px-6 py-3.5 text-sm font-bold text-emerald-100 ring-1 ring-emerald-400/30 transition hover:bg-emerald-500/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Creating…" : "Create event"}
        </button>
      </form>

      <ConfirmDialog
        isOpen={confirmOpen}
        title="Create this event?"
        message={`"${title.trim()}" — type ${categoryName}, visible to ${Array.from(roles)
          .map((r) => roleMeta(r).label)
          .join(", ")}. ${fields.length} registration field(s).${
          hasLink ? " Includes a link button." : ""
        } Members can register within the window you set.`}
        tone="primary"
        confirmLabel="Create event"
        busy={submitting}
        onConfirm={handleSubmit}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
