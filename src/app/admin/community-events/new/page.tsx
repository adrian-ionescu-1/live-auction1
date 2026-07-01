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
import UnsavedChangesGuard from "@/components/admin/UnsavedChangesGuard";
import CreateWbTournamentForm from "@/components/tournaments/wb/CreateWbTournamentForm";
import ImportListDialog, { ImportedRow, ImportOptions } from "@/components/community/ImportListDialog";
import { randomVariantId } from "@/components/auction/cardDesigns";
import { randomCountryCode } from "@/lib/flags";

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
  optional = false,
}: {
  fields: RegistrationField[];
  onChange: (next: RegistrationField[]) => void;
  /** When true the form is optional (a Blitz region already validates players). */
  optional?: boolean;
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
        <p className={`text-xs ${optional ? "text-zinc-500" : "text-amber-200"}`}>
          {optional
            ? "Optional — Blitz validation already captures each player. Add fields only if you need extra info."
            : "Add at least one field participants fill in (e.g. in-game nickname)."}
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

// The two creation options. Until the admin picks one, only the chooser shows.
type CreateKind = "community" | "wotblitz";

function KindChooser({ onPick }: { onPick: (k: CreateKind) => void }) {
  const options: { kind: CreateKind; title: string; desc: string; icon: string }[] = [
    {
      kind: "community",
      title: "Event with registration",
      desc: "An announcement/list members register for (optionally feeding an auction). Custom fields, optional Blitz validation.",
      icon: "📣",
    },
    {
      kind: "wotblitz",
      title: "WoT Blitz tournament",
      desc: "A registration-based tournament: teams sign up (1v1 … 7v7+2), then groups + a knockout bracket that auto-advances by score.",
      icon: "🏆",
    },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {options.map((o) => (
        <button
          key={o.kind}
          type="button"
          onClick={() => onPick(o.kind)}
          className="min-w-0 rounded-3xl bg-white/5 p-5 text-left ring-1 ring-white/10 transition hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 sm:p-6"
        >
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-500/15 text-xl ring-1 ring-emerald-400/25">
            {o.icon}
          </span>
          <h2 className="mt-3 text-base font-extrabold text-zinc-100">{o.title}</h2>
          <p className="mt-1 text-sm text-zinc-400">{o.desc}</p>
          <span className="mt-3 inline-block text-sm font-bold text-emerald-300">Choose →</span>
        </button>
      ))}
    </div>
  );
}

export default function CreateEventPage() {
  const [kind, setKind] = useState<CreateKind | null>(null);

  if (kind === null) {
    return (
      <>
        <div className="animate-fade-up">
          <h1 className="text-2xl font-extrabold tracking-tight text-zinc-100 sm:text-3xl">
            Create event
          </h1>
          <p className="mt-2 text-sm text-zinc-400">Pick what you want to create.</p>
        </div>
        <div className="mt-6 animate-fade-up">
          <KindChooser onPick={setKind} />
        </div>
      </>
    );
  }

  if (kind === "wotblitz") {
    return (
      <>
        <div className="animate-fade-up flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-zinc-100 sm:text-3xl">
              WoT Blitz tournament
            </h1>
            <p className="mt-2 text-sm text-zinc-400">
              Teams register, then play groups + a knockout bracket.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setKind(null)}
            className="shrink-0 rounded-xl bg-white/5 px-3 py-2 text-sm font-bold text-zinc-300 ring-1 ring-white/10 transition hover:bg-white/10"
          >
            ← Back
          </button>
        </div>
        <div className="mt-6 animate-fade-up">
          <CreateWbTournamentForm />
        </div>
      </>
    );
  }

  return <CommunityEventForm onBack={() => setKind(null)} />;
}

function CommunityEventForm({ onBack }: { onBack: () => void }) {
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

  // Optional: a participant list the admin uploads at creation time. Staged in
  // memory (the event has no id yet) and written once the event is created.
  const [importing, setImporting] = useState(false);
  const [importedRows, setImportedRows] = useState<ImportedRow[]>([]);
  // Whether the staged import asked for a random flag per card (opt-in).
  const [importAssignFlag, setImportAssignFlag] = useState(false);

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
  // Blitz region validation already identifies each participant (in-game account),
  // so a registration form is optional when a region is set. Without a region the
  // form is the only way to collect data, so at least one field is required.
  const blitzValidation = region !== "";
  const fieldsValid = blitzValidation || fields.length > 0;
  const customValid = categoryKey !== "custom" || customName.trim().length > 0;
  const linkValid = !hasLink || linkUrl.trim().length > 0;
  const canSubmit =
    titleValid && rolesValid && fieldsValid && customValid && linkValid && !submitting;

  // Nothing is saved until "Create" succeeds, so warn before leaving once the
  // admin has changed anything from the pristine defaults.
  const dirty =
    !submitting &&
    (title.trim() !== "" ||
      content.trim() !== "" ||
      customName.trim() !== "" ||
      categoryKey !== "wot_blitz" ||
      region !== "" ||
      hasLink ||
      linkLabel !== "" ||
      linkUrl !== "" ||
      startsAt !== "" ||
      endsAt !== "" ||
      regOpensAt !== "" ||
      regClosesAt !== "" ||
      fields.length > 0 ||
      importedRows.length > 0 ||
      !(roles.size === 1 && roles.has("bidder")));

  // Stage an imported list (deduped by name). Written to the event after it is
  // created. Validated rows keep their real Wargaming account + stats.
  const handleImportStage = (rows: ImportedRow[], options: ImportOptions) => {
    const seen = new Set<string>();
    const deduped: ImportedRow[] = [];
    for (const r of rows) {
      const key = r.displayName.trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      deduped.push(r);
    }
    setImportedRows(deduped);
    setImportAssignFlag(options.assignRandomFlag);
    setImporting(false);
  };

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
    if (!res.success || !res.eventId) {
      setError(res.error ?? "Could not create the event");
      setSubmitting(false);
      return;
    }

    // Write the staged import (if any) into the new event's participant list.
    if (importedRows.length > 0) {
      let skipped = 0;
      for (const r of importedRows) {
        const blitz =
          r.validated && r.accountId != null
            ? { accountId: r.accountId, playerName: r.displayName, stats: r.stats! }
            : r.stats
              ? { playerName: r.displayName, stats: r.stats }
              : null;
        const added = await CommunityEventsService.addRegistration(
          res.eventId,
          r.displayName,
          {},
          blitz,
          null,
          {
            variant: randomVariantId(),
            flag: importAssignFlag ? randomCountryCode() : null,
          },
          r.customFields
        );
        if (!added.success) skipped += 1;
      }
      if (skipped > 0) {
        // The event was created; surface that some imported rows didn't take,
        // but still continue to the events list.
        console.warn(`Imported list: ${skipped} participant(s) could not be added.`);
      }
    }

    router.push("/admin/community-events");
  };

  return (
    <>
      <UnsavedChangesGuard when={dirty} />
      <div className="animate-fade-up flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-zinc-100 sm:text-3xl">
            Create event
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Post an announcement for the roles you choose. Eligible members see it on their
            dashboard and register by filling the fields you define below.
          </p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="shrink-0 rounded-xl bg-white/5 px-3 py-2 text-sm font-bold text-zinc-300 ring-1 ring-white/10 transition hover:bg-white/10"
        >
          ← Back
        </button>
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
              {region ? (
                <p className="mt-1.5 text-xs text-emerald-200/80">
                  Players will verify their account on {region.toUpperCase()} and their stats
                  (battles, win rate, avg damage) are captured automatically. The registration
                  form below becomes optional.
                </p>
              ) : (
                <p className="mt-1.5 text-xs text-amber-200/80">
                  No region: players won&apos;t be validated, so the registration form below is
                  required.
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
        <Section
          step={5}
          title={blitzValidation ? "Registration form (optional)" : "Registration form"}
          desc={
            blitzValidation
              ? "Players validate their Blitz account, so fields here are optional extras."
              : "The fields each participant fills in to register."
          }
        >
          <RegistrationFieldsEditor fields={fields} onChange={setFields} optional={blitzValidation} />
        </Section>

        {/* 6. Pre-loaded participants (optional) */}
        <Section
          step={6}
          title="Participants (optional)"
          desc="Upload a whole list now instead of (or in addition to) members self-registering."
        >
          {importedRows.length === 0 ? (
            <button
              type="button"
              onClick={() => setImporting(true)}
              className="w-full rounded-xl bg-white/5 px-3 py-2.5 text-sm font-bold text-zinc-200 ring-1 ring-white/10 transition hover:bg-white/10"
            >
              ⬆ Import a list (CSV/Excel)…
            </button>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-emerald-500/10 px-4 py-3 ring-1 ring-emerald-400/25">
              <span className="text-sm font-semibold text-emerald-100">
                {importedRows.length} participant(s) staged
                {importedRows.some((r) => r.validated) ? " · Wargaming-validated" : ""}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setImporting(true)}
                  className="rounded-xl bg-white/5 px-3 py-1.5 text-xs font-bold text-zinc-200 ring-1 ring-white/10 transition hover:bg-white/10"
                >
                  Replace
                </button>
                <button
                  type="button"
                  onClick={() => setImportedRows([])}
                  className="rounded-xl px-3 py-1.5 text-xs font-bold text-red-200 ring-1 ring-red-400/25 transition hover:bg-red-500/15"
                >
                  Clear
                </button>
              </div>
            </div>
          )}
          <p className="mt-2 text-[11px] text-zinc-500">
            They&apos;ll be added to this event&apos;s participant list when you create it. Use the
            list later to feed an auction.
          </p>
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
        }${
          importedRows.length > 0
            ? ` ${importedRows.length} participant(s) pre-loaded from an import.`
            : ""
        } Members can register within the window you set.`}
        tone="primary"
        confirmLabel="Create event"
        busy={submitting}
        onConfirm={handleSubmit}
        onCancel={() => setConfirmOpen(false)}
      />

      {/* Import participants now. If a Blitz region is set above, validation is
          fixed to it; otherwise the admin picks the region in the dialog. */}
      <ImportListDialog
        isOpen={importing}
        eventTitle={title.trim() || "this event"}
        region={region || null}
        busy={false}
        onImport={handleImportStage}
        onCancel={() => setImporting(false)}
      />
    </>
  );
}
