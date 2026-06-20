// Export helpers for event results. CSV and Excel are produced natively (no
// dependency); PDF lazy-loads jsPDF only when used, so it never bloats the main
// bundle. All three download a file named after the event.

import { EventResult } from "@/types/event.types";

const COLUMNS = ["Member", "Player", "Amount", "Won at"] as const;

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 60) || "event"
  );
}

function rowsFor(results: EventResult[]): string[][] {
  return results.map((r) => [
    r.username,
    r.playerName,
    String(r.amount),
    new Date(r.wonAt).toLocaleString(),
  ]);
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function csvCell(value: string): string {
  // Quote and escape so commas / quotes / newlines survive.
  return `"${value.replace(/"/g, '""')}"`;
}

export function exportResultsCsv(eventName: string, results: EventResult[]) {
  const lines = [COLUMNS.join(",")];
  for (const row of rowsFor(results)) {
    lines.push(row.map(csvCell).join(","));
  }
  const blob = new Blob(["﻿" + lines.join("\r\n")], {
    type: "text/csv;charset=utf-8;",
  });
  triggerDownload(blob, `${slugify(eventName)}-results.csv`);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Excel opens an HTML table sent with the ms-excel mime type — a real .xls file
// with no library required.
export function exportResultsXls(eventName: string, results: EventResult[]) {
  const head = `<tr>${COLUMNS.map((c) => `<th>${c}</th>`).join("")}</tr>`;
  const body = rowsFor(results)
    .map((row) => `<tr>${row.map((c) => `<td>${escapeHtml(c)}</td>`).join("")}</tr>`)
    .join("");
  const html =
    `<html xmlns:o="urn:schemas-microsoft-com:office:office" ` +
    `xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">` +
    `<head><meta charset="utf-8" /></head><body><table border="1">${head}${body}</table></body></html>`;
  const blob = new Blob([html], { type: "application/vnd.ms-excel" });
  triggerDownload(blob, `${slugify(eventName)}-results.xls`);
}

export async function exportResultsPdf(eventName: string, results: EventResult[]) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF();
  const total = results.reduce((s, r) => s + r.amount, 0);

  doc.setFontSize(14);
  doc.text(`${eventName} — results`, 14, 16);
  doc.setFontSize(10);
  doc.text(`${results.length} players · $${total.toLocaleString()} total`, 14, 22);

  autoTable(doc, {
    head: [COLUMNS as unknown as string[]],
    body: rowsFor(results).map((row) => [
      row[0],
      row[1],
      `$${Number(row[2]).toLocaleString()}`,
      row[3],
    ]),
    startY: 28,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [16, 185, 129] },
  });

  doc.save(`${slugify(eventName)}-results.pdf`);
}
