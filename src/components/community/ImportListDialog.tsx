// Import a participant list from a CSV or Excel file (exceptional cases where the
// players don't go through Blitz validation). The admin uploads a file, maps each
// column to a card field (name + optional battles / win rate / avg damage) and
// any extra detail columns, previews the result, then imports — one standard
// participant per row. Portaled, mobile-first.

"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { BlitzStats } from "@/types/community-event.types";

export interface ImportedRow {
  displayName: string;
  stats: BlitzStats | null;
  values: Record<string, string>;
}

type ExtraField = { id: number; label: string; col: string };

const NONE = "";

function parseNumber(v: string): number {
  const n = Number(String(v).replace(/[%,\s]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export default function ImportListDialog({
  isOpen,
  eventTitle,
  busy,
  onImport,
  onCancel,
}: {
  isOpen: boolean;
  eventTitle: string;
  busy: boolean;
  onImport: (rows: ImportedRow[]) => void;
  onCancel: () => void;
}) {
  const [rows, setRows] = useState<string[][]>([]);
  const [hasHeader, setHasHeader] = useState(true);
  const [fileName, setFileName] = useState("");
  const [nameCol, setNameCol] = useState(NONE);
  const [battlesCol, setBattlesCol] = useState(NONE);
  const [winrateCol, setWinrateCol] = useState(NONE);
  const [dmgCol, setDmgCol] = useState(NONE);
  const [extras, setExtras] = useState<ExtraField[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!isOpen) return;
    setRows([]);
    setHasHeader(true);
    setFileName("");
    setNameCol(NONE);
    setBattlesCol(NONE);
    setWinrateCol(NONE);
    setDmgCol(NONE);
    setExtras([]);
    setError(null);
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const handleFile = async (file: File) => {
    setError(null);
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
      setBattlesCol(find("battle"));
      setWinrateCol(find("win"));
      setDmgCol(find("dmg", "damage"));
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

  const buildRows = (): ImportedRow[] =>
    dataRows
      .map((row) => {
        const displayName = cell(row, nameCol);
        if (!displayName) return null;
        const hasStats = battlesCol !== NONE || winrateCol !== NONE || dmgCol !== NONE;
        const stats: BlitzStats | null = hasStats
          ? {
              battles: parseNumber(cell(row, battlesCol)),
              winrate: parseNumber(cell(row, winrateCol)),
              avgDamage: parseNumber(cell(row, dmgCol)),
            }
          : null;
        const values: Record<string, string> = {};
        for (const e of extras) {
          if (e.col !== NONE && e.label.trim()) values[e.label.trim()] = cell(row, e.col);
        }
        return { displayName, stats, values };
      })
      .filter((r): r is ImportedRow => r !== null);

  const preview = buildRows();
  const canImport = nameCol !== NONE && preview.length > 0 && !busy;

  const selectCls =
    "w-full min-w-0 rounded-xl bg-zinc-900 px-3 py-2 text-sm text-zinc-100 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400/40";

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
            CSV or Excel into &ldquo;{eventTitle}&rdquo;. Map the columns, then import one
            participant per row.
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

              <div className="mt-3 space-y-2">
                <div className="grid grid-cols-1 gap-2 xs:grid-cols-2">
                  <label className="block min-w-0">
                    <span className="block text-xs font-semibold text-zinc-400">
                      Name <span className="text-red-300">*</span>
                    </span>
                    <select value={nameCol} onChange={(e) => setNameCol(e.target.value)} className={`${selectCls} mt-1`}>
                      {colOptions}
                    </select>
                  </label>
                  <label className="block min-w-0">
                    <span className="block text-xs font-semibold text-zinc-400">Battles</span>
                    <select value={battlesCol} onChange={(e) => setBattlesCol(e.target.value)} className={`${selectCls} mt-1`}>
                      {colOptions}
                    </select>
                  </label>
                  <label className="block min-w-0">
                    <span className="block text-xs font-semibold text-zinc-400">Win rate %</span>
                    <select value={winrateCol} onChange={(e) => setWinrateCol(e.target.value)} className={`${selectCls} mt-1`}>
                      {colOptions}
                    </select>
                  </label>
                  <label className="block min-w-0">
                    <span className="block text-xs font-semibold text-zinc-400">Avg damage</span>
                    <select value={dmgCol} onChange={(e) => setDmgCol(e.target.value)} className={`${selectCls} mt-1`}>
                      {colOptions}
                    </select>
                  </label>
                </div>

                {/* Extra detail columns -> participant fields. */}
                {extras.map((ex) => (
                  <div key={ex.id} className="grid grid-cols-1 gap-2 xs:grid-cols-2">
                    <input
                      value={ex.label}
                      onChange={(e) =>
                        setExtras((p) => p.map((x) => (x.id === ex.id ? { ...x, label: e.target.value } : x)))
                      }
                      placeholder="Detail label"
                      className="w-full min-w-0 rounded-xl bg-black/40 px-3 py-2 text-sm text-zinc-100 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
                    />
                    <div className="flex gap-2">
                      <select
                        value={ex.col}
                        onChange={(e) =>
                          setExtras((p) => p.map((x) => (x.id === ex.id ? { ...x, col: e.target.value } : x)))
                        }
                        className={selectCls}
                      >
                        {colOptions}
                      </select>
                      <button
                        type="button"
                        onClick={() => setExtras((p) => p.filter((x) => x.id !== ex.id))}
                        className="shrink-0 rounded-xl px-2 py-1 text-xs font-bold text-red-200 ring-1 ring-red-400/25 transition hover:bg-red-500/15"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => setExtras((p) => [...p, { id: Date.now(), label: "", col: NONE }])}
                  className="rounded-xl bg-white/5 px-3 py-1.5 text-xs font-bold text-zinc-200 ring-1 ring-white/10 transition hover:bg-white/10"
                >
                  + Add detail column
                </button>
              </div>

              <p className="mt-3 text-xs text-zinc-500">
                {preview.length} participant(s) ready
                {preview[0] ? ` · e.g. ${preview[0].displayName}` : ""}.
              </p>
            </>
          )}

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
              onClick={() => onImport(preview)}
              disabled={!canImport}
              className="flex-1 rounded-2xl bg-emerald-500/20 px-4 py-3 text-sm font-bold text-emerald-100 ring-1 ring-emerald-400/30 transition hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "Importing…" : `Import ${preview.length || ""}`}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
