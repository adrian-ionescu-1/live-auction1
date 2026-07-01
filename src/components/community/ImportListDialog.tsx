// Import a participant list from a CSV or Excel file. Two modes:
//
//   * "file"     — take the data straight from the file. Only the Player (name)
//                  column is fixed; every other column is a free-form custom
//                  field the admin titles and maps by hand (e.g. Battles, WR, or
//                  anything they want). One participant per row. Values are taken
//                  verbatim — no Wargaming validation. Each card gets a random
//                  design; a flag is assigned at random only if the admin ticks
//                  the option.
//
//   * "validate" — the file holds only a column of in-game names. The admin
//                  picks a Wargaming region and every name is validated against
//                  the WG API (search + career stats), exactly as if each player
//                  had validated themselves. Names with no match are reported and
//                  skipped on confirm; duplicate accounts are de-duplicated.
//
// Portaled, mobile-first (works at 320px).

"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { BlitzRegion, BlitzStats } from "@/types/community-event.types";
import { BlitzClient } from "@/services/blitzClient";

export interface ImportedRow {
  displayName: string;
  stats: BlitzStats | null;
  /** Free-form fields taken from the file (file mode), in the admin's order. */
  customFields: { label: string; value: string }[];
  /** Set when the row was validated on Wargaming (carries the real account). */
  accountId?: number | null;
  validated?: boolean;
}

/** Options that apply to the whole import (not per-row). */
export interface ImportOptions {
  /** Give every imported card a random country flag. Off by default. */
  assignRandomFlag: boolean;
}

type ExtraField = { id: number; label: string; col: string };
type Mode = "file" | "validate";

// Quick presets for the common WoT columns — one tap adds an editable custom
// field. The keys drive the best-effort column auto-match.
const FIELD_PRESETS: { label: string; keys: string[] }[] = [
  { label: "Battles", keys: ["battle"] },
  { label: "Win rate %", keys: ["win"] },
  { label: "Avg damage", keys: ["dmg", "damage"] },
];
type ValidateResult = {
  found: ImportedRow[];
  /** Names with no Wargaming match — skipped on import. */
  missing: string[];
  /** Names skipped because they repeat (same name, or resolve to the same account). */
  duplicates: string[];
};

const NONE = "";
// How many names to validate in parallel — small, to stay gentle on the WG API.
const VALIDATE_CONCURRENCY = 4;

const REGIONS: { value: BlitzRegion; label: string }[] = [
  { value: "eu", label: "EU" },
  { value: "na", label: "NA" },
  { value: "asia", label: "ASIA" },
];

// Scrollable preview of the rows that will actually be imported (name + stats
// when available). Numbered so the admin can eyeball the count.
function PreviewRows({ rows }: { rows: ImportedRow[] }) {
  return (
    <ol className="max-h-48 space-y-1 overflow-y-auto pr-1">
      {rows.map((r, i) => (
        <li
          key={`${r.displayName}-${i}`}
          className="flex items-center gap-2 rounded-xl bg-black/30 px-3 py-1.5 ring-1 ring-white/10"
        >
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-white/5 text-[10px] font-bold tabular-nums text-zinc-400 ring-1 ring-white/10">
            {i + 1}
          </span>
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-100">
            {r.displayName}
          </span>
          {r.validated && (
            <span className="shrink-0 text-[10px] font-bold text-emerald-300">✓</span>
          )}
          {r.stats ? (
            <span className="shrink-0 text-[10px] tabular-nums text-zinc-500">
              {r.stats.battles.toLocaleString()} · {r.stats.winrate.toFixed(1)}% ·{" "}
              {r.stats.avgDamage.toLocaleString()}
            </span>
          ) : (
            r.customFields.length > 0 && (
              <span className="max-w-[45%] shrink-0 truncate text-[10px] text-zinc-500">
                {r.customFields
                  .map((f) => `${f.label}: ${f.value || "—"}`)
                  .join(" · ")}
              </span>
            )
          )}
        </li>
      ))}
    </ol>
  );
}

// Amber chip list used for duplicate / not-found names.
function NameChips({ names, tone }: { names: string[]; tone: "amber" | "zinc" }) {
  const cls =
    tone === "amber"
      ? "bg-black/30 text-amber-100 ring-amber-400/20"
      : "bg-black/30 text-zinc-300 ring-white/10";
  return (
    <ul className="mt-1 flex flex-wrap gap-1.5">
      {names.map((n, i) => (
        <li
          key={`${n}-${i}`}
          className={`min-w-0 max-w-full truncate rounded-lg px-2 py-0.5 text-xs ring-1 ${cls}`}
        >
          {n}
        </li>
      ))}
    </ul>
  );
}

export default function ImportListDialog({
  isOpen,
  eventTitle,
  busy,
  onImport,
  onCancel,
  region = null,
}: {
  isOpen: boolean;
  eventTitle: string;
  busy: boolean;
  onImport: (rows: ImportedRow[], options: ImportOptions) => void;
  onCancel: () => void;
  /** When set, the validation region is fixed to this (e.g. the list's region). */
  region?: BlitzRegion | null;
}) {
  const [mode, setMode] = useState<Mode>("file");
  const [rows, setRows] = useState<string[][]>([]);
  const [hasHeader, setHasHeader] = useState(true);
  const [fileName, setFileName] = useState("");
  const [nameCol, setNameCol] = useState(NONE);
  // Every non-name column is a free-form custom field (title + source column).
  const [extras, setExtras] = useState<ExtraField[]>([]);
  const [nextExtraId, setNextExtraId] = useState(1);
  // Off by default: a flag is only assigned at random when the admin ticks this.
  const [assignFlag, setAssignFlag] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validate-mode state.
  const [validateRegion, setValidateRegion] = useState<"" | BlitzRegion>(region ?? "");
  const [validating, setValidating] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [validateResult, setValidateResult] = useState<ValidateResult | null>(null);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!isOpen) return;
    setMode("file");
    setRows([]);
    setHasHeader(true);
    setFileName("");
    setNameCol(NONE);
    setExtras([]);
    setNextExtraId(1);
    setAssignFlag(false);
    setError(null);
    setValidateRegion(region ?? "");
    setValidating(false);
    setProgress({ done: 0, total: 0 });
    setValidateResult(null);
  }, [isOpen, region]);

  if (!isOpen || !mounted) return null;

  const handleFile = async (file: File) => {
    setError(null);
    setValidateResult(null);
    try {
      // Lazy-load the (heavy) spreadsheet parser only when a file is chosen.
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json<string[]>(sheet, {
        header: 1,
        blankrows: false,
        defval: "",
        raw: false,
      });
      if (!data.length) {
        setError("The file appears to be empty.");
        return;
      }
      setRows(data.map((r) => r.map((c) => String(c ?? ""))));
      setFileName(file.name);
      // Best-effort auto-map by header name.
      const head = (data[0] ?? []).map((c) => String(c ?? "").toLowerCase());
      const find = (...keys: string[]) => {
        const i = head.findIndex((h) => keys.some((k) => h.includes(k)));
        return i >= 0 ? String(i) : NONE;
      };
      setNameCol(find("name", "nick", "player") || "0");
      // Pre-fill custom fields for any of the common WoT columns we recognize, so
      // the admin starts from a sensible mapping but can rename / remap / remove.
      let id = 1;
      const detected = FIELD_PRESETS.map((preset) => {
        const col = find(...preset.keys);
        return col === NONE ? null : { id: id++, label: preset.label, col };
      }).filter((e): e is ExtraField => e !== null);
      setExtras(detected);
      setNextExtraId(id);
    } catch {
      setError("Could not read that file. Use a .csv, .xlsx or .xls file.");
    }
  };

  const colCount = rows.reduce((m, r) => Math.max(m, r.length), 0);
  const headerLabels = Array.from({ length: colCount }, (_, i) => {
    const h = hasHeader ? rows[0]?.[i]?.trim() : "";
    return h || `Column ${i + 1}`;
  });
  const dataRows = hasHeader ? rows.slice(1) : rows;

  const colOptions = (
    <>
      <option value={NONE} className="bg-zinc-900 text-zinc-100">
        —
      </option>
      {headerLabels.map((label, i) => (
        <option key={i} value={String(i)} className="bg-zinc-900 text-zinc-100">
          {label}
        </option>
      ))}
    </>
  );

  const cell = (row: string[], col: string) =>
    col === NONE ? "" : (row[Number(col)] ?? "").trim();

  // Custom fields ready to map (a title + a chosen source column).
  const activeExtras = extras.filter((e) => e.col !== NONE && e.label.trim() !== "");

  // --- File mode --------------------------------------------------------------
  const buildRows = (): ImportedRow[] =>
    dataRows
      .map((row) => {
        const displayName = cell(row, nameCol);
        if (!displayName) return null;
        const customFields = activeExtras.map((e) => ({
          label: e.label.trim(),
          value: cell(row, e.col),
        }));
        // File mode has no validated WG stats — everything is a custom field.
        return { displayName, stats: null, customFields } as ImportedRow;
      })
      .filter((r): r is ImportedRow => r !== null);

  // --- Validate mode ----------------------------------------------------------
  // Unique, non-empty names from the chosen column (case-insensitive dedupe).
  const uniqueNames = (): string[] => {
    const seen = new Map<string, string>();
    for (const row of dataRows) {
      const n = cell(row, nameCol);
      if (n && !seen.has(n.toLowerCase())) seen.set(n.toLowerCase(), n);
    }
    return Array.from(seen.values());
  };

  const runValidation = async () => {
    if (!validateRegion) return;
    const names = uniqueNames();
    if (names.length === 0) {
      setError("No names found in the selected column.");
      return;
    }
    const reg = validateRegion as BlitzRegion;
    setError(null);
    setValidateResult(null);
    setValidating(true);
    setProgress({ done: 0, total: names.length });

    // Names that repeat in the file (collapsed before validation) — reported so
    // the admin sees they're imported only once.
    const nameDuplicates: string[] = [];
    {
      const seenName = new Set<string>();
      for (const row of dataRows) {
        const n = cell(row, nameCol);
        if (!n) continue;
        const k = n.toLowerCase();
        if (seenName.has(k)) {
          if (!nameDuplicates.some((d) => d.toLowerCase() === k)) nameDuplicates.push(n);
        } else {
          seenName.add(k);
        }
      }
    }

    const found: ImportedRow[] = [];
    const missing: string[] = [];
    const accountDuplicates: string[] = [];
    const seenAccounts = new Set<number>();
    let done = 0;

    const validateOne = async (name: string) => {
      try {
        const s = await BlitzClient.search(reg, name);
        if (!s.error && s.players.length > 0) {
          const exact = s.players.find(
            (p) => p.nickname.toLowerCase() === name.toLowerCase()
          );
          const acc = exact ?? s.players[0];
          const pl = await BlitzClient.player(reg, acc.accountId);
          if (!pl.error && pl.player) {
            // A name that resolves to an account we already took is a duplicate.
            if (seenAccounts.has(pl.player.accountId)) {
              accountDuplicates.push(name);
            } else {
              seenAccounts.add(pl.player.accountId);
              found.push({
                displayName: pl.player.nickname,
                accountId: pl.player.accountId,
                validated: true,
                stats: {
                  battles: pl.player.battles,
                  winrate: pl.player.winrate,
                  avgDamage: pl.player.avgDamage,
                },
                customFields: [],
              });
            }
            return;
          }
        }
        missing.push(name);
      } catch {
        missing.push(name);
      } finally {
        done += 1;
        setProgress({ done, total: names.length });
      }
    };

    // Small worker pool so a long list validates reasonably fast without
    // hammering the Wargaming API.
    let idx = 0;
    const runners = Array.from(
      { length: Math.min(VALIDATE_CONCURRENCY, names.length) },
      async () => {
        while (idx < names.length) {
          const my = idx++;
          await validateOne(names[my]);
        }
      }
    );
    await Promise.all(runners);

    const duplicates = [...nameDuplicates, ...accountDuplicates].sort((a, b) =>
      a.localeCompare(b)
    );
    setValidating(false);
    setValidateResult({
      found: found.sort((a, b) => a.displayName.localeCompare(b.displayName)),
      missing: missing.sort((a, b) => a.localeCompare(b)),
      duplicates,
    });
  };

  // File mode: rows straight from the file, de-duplicated by name (the duplicates
  // are surfaced as a warning, and imported only once).
  const fileRows = buildRows();
  const fileDuplicates: string[] = [];
  const filePreview: ImportedRow[] = [];
  {
    const seenName = new Set<string>();
    for (const r of fileRows) {
      const k = r.displayName.trim().toLowerCase();
      if (seenName.has(k)) {
        if (!fileDuplicates.some((d) => d.toLowerCase() === k)) fileDuplicates.push(r.displayName);
      } else {
        seenName.add(k);
        filePreview.push(r);
      }
    }
  }
  const namesToValidate = mode === "validate" && nameCol !== NONE ? uniqueNames().length : 0;

  const canImport =
    !busy &&
    (mode === "file"
      ? nameCol !== NONE && filePreview.length > 0
      : !validating && (validateResult?.found.length ?? 0) > 0);

  const importRows = () =>
    onImport(mode === "file" ? filePreview : validateResult?.found ?? [], {
      assignRandomFlag: assignFlag,
    });

  const importCount = mode === "file" ? filePreview.length : validateResult?.found.length ?? 0;

  const selectCls =
    "w-full min-w-0 rounded-xl bg-zinc-900 px-3 py-2 text-sm text-zinc-100 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400/40";

  const tabCls = (active: boolean) =>
    `flex-1 rounded-xl px-3 py-2 text-xs font-bold ring-1 transition ${
      active
        ? "bg-emerald-500/20 text-emerald-100 ring-emerald-400/30"
        : "bg-white/5 text-zinc-300 ring-white/10 hover:bg-white/10"
    }`;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] overflow-y-auto bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Import list"
    >
      <div className="flex min-h-full items-start justify-center p-4">
        <div className="my-4 w-full max-w-lg min-w-0 rounded-3xl bg-zinc-950/95 p-5 ring-1 ring-white/10 shadow-2xl sm:p-6">
          <h3 className="text-lg font-extrabold text-zinc-100">Import list</h3>
          <p className="mt-1 text-xs text-zinc-500">
            CSV or Excel into &ldquo;{eventTitle}&rdquo;. One participant per row.
          </p>

          {/* Mode selector */}
          <div className="mt-4 flex gap-2" role="tablist" aria-label="Import mode">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "file"}
              onClick={() => setMode("file")}
              className={tabCls(mode === "file")}
            >
              Use file data
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "validate"}
              onClick={() => setMode("validate")}
              className={tabCls(mode === "validate")}
            >
              Validate on Wargaming
            </button>
          </div>
          <p className="mt-2 text-[11px] text-zinc-500">
            {mode === "file"
              ? "Stats come straight from the file; each card gets a random design and flag."
              : "The file needs only a column of in-game names. Each is verified on Wargaming and its real stats are fetched automatically."}
          </p>

          <label className="mt-4 flex cursor-pointer items-center justify-center rounded-2xl border border-dashed border-white/15 bg-black/25 px-4 py-5 text-center text-sm text-zinc-300 transition hover:bg-white/5">
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
              }}
            />
            {fileName ? (
              <span className="min-w-0 truncate font-semibold text-zinc-100">{fileName}</span>
            ) : (
              <span>Click to choose a .csv / .xlsx file</span>
            )}
          </label>

          {error && <p className="mt-2 text-sm font-semibold text-amber-200">{error}</p>}

          {rows.length > 0 && (
            <>
              <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-zinc-200">
                <input
                  type="checkbox"
                  checked={hasHeader}
                  onChange={(e) => setHasHeader(e.target.checked)}
                  className="h-4 w-4 accent-emerald-500"
                />
                First row is a header
              </label>

              {mode === "file" ? (
                <div className="mt-3 space-y-3">
                  {/* The only fixed column: the players' names. */}
                  <label className="block min-w-0">
                    <span className="block text-xs font-semibold text-zinc-400">
                      Player (name) <span className="text-red-300">*</span>
                    </span>
                    <select
                      value={nameCol}
                      onChange={(e) => setNameCol(e.target.value)}
                      className={`${selectCls} mt-1`}
                    >
                      {colOptions}
                    </select>
                  </label>

                  {/* Every other column is a custom field: a title + its source
                      column. Values are taken verbatim, shown on the card in order. */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-zinc-400">
                        Custom fields
                      </span>
                      <span className="text-[10px] text-zinc-500">
                        titled by you · shown on the card
                      </span>
                    </div>

                    {extras.length === 0 && (
                      <p className="rounded-xl bg-black/20 px-3 py-2 text-[11px] text-zinc-500 ring-1 ring-white/10">
                        No custom fields yet. Add battles, win rate, or anything you
                        want — each becomes a titled cell on the player card.
                      </p>
                    )}

                    {extras.map((ex) => (
                      <div key={ex.id} className="grid grid-cols-1 gap-2 xs:grid-cols-2">
                        <input
                          value={ex.label}
                          onChange={(e) =>
                            setExtras((p) =>
                              p.map((x) => (x.id === ex.id ? { ...x, label: e.target.value } : x))
                            )
                          }
                          placeholder="Field title (e.g. Battles)"
                          maxLength={40}
                          className="w-full min-w-0 rounded-xl bg-black/40 px-3 py-2 text-sm text-zinc-100 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
                        />
                        <div className="flex gap-2">
                          <select
                            value={ex.col}
                            onChange={(e) =>
                              setExtras((p) =>
                                p.map((x) => (x.id === ex.id ? { ...x, col: e.target.value } : x))
                              )
                            }
                            className={selectCls}
                            aria-label="Source column"
                          >
                            {colOptions}
                          </select>
                          <button
                            type="button"
                            onClick={() => setExtras((p) => p.filter((x) => x.id !== ex.id))}
                            aria-label={`Remove field ${ex.label || ""}`}
                            className="shrink-0 rounded-xl px-2 py-1 text-xs font-bold text-red-200 ring-1 ring-red-400/25 transition hover:bg-red-500/15"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}

                    <div className="flex flex-wrap gap-1.5">
                      {FIELD_PRESETS.filter(
                        (preset) =>
                          !extras.some(
                            (e) => e.label.trim().toLowerCase() === preset.label.toLowerCase()
                          )
                      ).map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => {
                            const head = headerLabels.map((h) => h.toLowerCase());
                            const idx = head.findIndex((h) =>
                              preset.keys.some((k) => h.includes(k))
                            );
                            setExtras((p) => [
                              ...p,
                              {
                                id: nextExtraId,
                                label: preset.label,
                                col: idx >= 0 ? String(idx) : NONE,
                              },
                            ]);
                            setNextExtraId((n) => n + 1);
                          }}
                          className="rounded-lg bg-white/5 px-2.5 py-1 text-xs font-semibold text-zinc-300 ring-1 ring-white/10 transition hover:bg-white/10 hover:text-zinc-100"
                        >
                          + {preset.label}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          setExtras((p) => [...p, { id: nextExtraId, label: "", col: NONE }]);
                          setNextExtraId((n) => n + 1);
                        }}
                        className="rounded-lg bg-emerald-500/15 px-2.5 py-1 text-xs font-bold text-emerald-200 ring-1 ring-emerald-400/25 transition hover:bg-emerald-500/25"
                      >
                        + Custom field
                      </button>
                    </div>
                  </div>

                  {/* Flag is opt-in: only assign a random one when ticked. */}
                  <label className="flex cursor-pointer items-start gap-2 rounded-xl bg-black/20 px-3 py-2 text-sm text-zinc-200 ring-1 ring-white/10">
                    <input
                      type="checkbox"
                      checked={assignFlag}
                      onChange={(e) => setAssignFlag(e.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-500"
                    />
                    <span>
                      Assign a random flag to each card
                      <span className="mt-0.5 block text-[11px] text-zinc-500">
                        Leave off for no flag. Every card still gets a random design.
                      </span>
                    </span>
                  </label>

                  {filePreview.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs font-semibold text-zinc-300">
                        {filePreview.length} participant(s) ready — review before importing:
                      </p>
                      <PreviewRows rows={filePreview} />
                      {fileDuplicates.length > 0 && (
                        <div className="rounded-2xl bg-amber-500/10 p-3 ring-1 ring-amber-400/25">
                          <p className="text-[11px] font-bold uppercase tracking-wide text-amber-200/90">
                            ⚠ {fileDuplicates.length} duplicate name(s) — imported once
                          </p>
                          <NameChips names={fileDuplicates} tone="amber" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-3 space-y-3">
                  <div className="grid grid-cols-1 gap-2 xs:grid-cols-2">
                    <label className="block min-w-0">
                      <span className="block text-xs font-semibold text-zinc-400">
                        Region <span className="text-red-300">*</span>
                      </span>
                      {region ? (
                        <div className="mt-1 rounded-xl bg-black/30 px-3 py-2 text-sm font-semibold text-emerald-200 ring-1 ring-white/10">
                          {region.toUpperCase()}
                        </div>
                      ) : (
                        <select
                          value={validateRegion}
                          onChange={(e) => {
                            setValidateRegion(e.target.value as "" | BlitzRegion);
                            setValidateResult(null);
                          }}
                          className={`${selectCls} mt-1`}
                        >
                          <option value="" className="bg-zinc-900 text-zinc-100">
                            Pick a region…
                          </option>
                          {REGIONS.map((r) => (
                            <option key={r.value} value={r.value} className="bg-zinc-900 text-zinc-100">
                              {r.label}
                            </option>
                          ))}
                        </select>
                      )}
                    </label>
                    <label className="block min-w-0">
                      <span className="block text-xs font-semibold text-zinc-400">
                        Name column <span className="text-red-300">*</span>
                      </span>
                      <select
                        value={nameCol}
                        onChange={(e) => {
                          setNameCol(e.target.value);
                          setValidateResult(null);
                        }}
                        className={`${selectCls} mt-1`}
                      >
                        {colOptions}
                      </select>
                    </label>
                  </div>

                  {validating ? (
                    <div className="rounded-2xl bg-black/30 p-3 ring-1 ring-white/10">
                      <div className="flex items-center justify-between text-xs text-zinc-300">
                        <span>Validating on Wargaming…</span>
                        <span className="tabular-nums">
                          {progress.done}/{progress.total}
                        </span>
                      </div>
                      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/5 ring-1 ring-white/10">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400 transition-all"
                          style={{
                            width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  ) : validateResult ? (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-emerald-200">
                        ✓ {validateResult.found.length} validated
                        {validateResult.duplicates.length > 0
                          ? ` · ${validateResult.duplicates.length} duplicate`
                          : ""}
                        {validateResult.missing.length > 0
                          ? ` · ${validateResult.missing.length} not found`
                          : ""}
                        .
                      </p>

                      {validateResult.found.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-[11px] text-zinc-500">
                            These {validateResult.found.length} player(s) will be imported:
                          </p>
                          <PreviewRows rows={validateResult.found} />
                        </div>
                      )}

                      {validateResult.duplicates.length > 0 && (
                        <div className="rounded-2xl bg-amber-500/10 p-3 ring-1 ring-amber-400/25">
                          <p className="text-[11px] font-bold uppercase tracking-wide text-amber-200/90">
                            ⚠ {validateResult.duplicates.length} duplicate — imported once
                          </p>
                          <NameChips names={validateResult.duplicates} tone="amber" />
                        </div>
                      )}

                      {validateResult.missing.length > 0 && (
                        <div className="rounded-2xl bg-red-500/10 p-3 ring-1 ring-red-400/25">
                          <p className="text-[11px] font-bold uppercase tracking-wide text-red-200/90">
                            ✕ {validateResult.missing.length} invalid — not found on{" "}
                            {(validateRegion || region || "").toString().toUpperCase()} (skipped)
                          </p>
                          <NameChips names={validateResult.missing} tone="amber" />
                        </div>
                      )}

                      {validateResult.found.length === 0 && (
                        <p className="text-[11px] font-semibold text-red-200">
                          No valid players to import — check the names or the region.
                        </p>
                      )}

                      <button
                        type="button"
                        onClick={() => setValidateResult(null)}
                        className="rounded-xl bg-white/5 px-3 py-1.5 text-xs font-bold text-zinc-200 ring-1 ring-white/10 transition hover:bg-white/10"
                      >
                        Re-validate
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={runValidation}
                      disabled={!validateRegion || nameCol === NONE || namesToValidate === 0}
                      className="w-full rounded-2xl bg-cyan-500/15 px-4 py-2.5 text-sm font-bold text-cyan-100 ring-1 ring-cyan-400/30 transition hover:bg-cyan-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Validate {namesToValidate || ""} name{namesToValidate === 1 ? "" : "s"} on Wargaming
                    </button>
                  )}
                </div>
              )}
            </>
          )}

          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={busy || validating}
              className="flex-1 rounded-2xl bg-white/5 px-4 py-3 text-sm font-bold text-zinc-200 ring-1 ring-white/10 transition hover:bg-white/10 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={importRows}
              disabled={!canImport}
              className="flex-1 rounded-2xl bg-emerald-500/20 px-4 py-3 text-sm font-bold text-emerald-100 ring-1 ring-emerald-400/30 transition hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "Importing…" : `Import ${importCount || ""}`}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
