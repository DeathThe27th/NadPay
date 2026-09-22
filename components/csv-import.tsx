"use client";

import { useMemo, useState } from "react";
import { formatMon } from "@/lib/format";
import {
  csvTotal,
  parseRecipientsCsv,
  SAMPLE_CSV,
  type CsvRow,
} from "@/lib/csv";

const SAMPLE_HREF = `data:text/csv;charset=utf-8,${encodeURIComponent(SAMPLE_CSV)}`;

/**
 * Bulk-load the recipient editor from a pasted or uploaded CSV.
 * Parsing is all client-side; applying only fills the editor — funding is
 * always a separate, reviewed step.
 */
export function CsvImport({ onApply }: { onApply: (rows: CsvRow[]) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);

  const parsed = useMemo(
    () => (text.trim() ? parseRecipientsCsv(text) : null),
    [text],
  );
  const valid = parsed !== null && parsed.errors.length === 0;

  async function onFile(file: File | undefined) {
    if (!file) return;
    setFileError(null);
    try {
      setText(await file.text());
    } catch {
      setFileError("Couldn't read that file — try pasting its contents instead.");
    }
  }

  function apply() {
    if (!parsed || !valid) return;
    onApply(parsed.rows);
    setText("");
    setOpen(false);
  }

  if (!open) {
    return (
      <div className="text-center">
        <button
          onClick={() => setOpen(true)}
          className="text-sm font-medium text-primary hover:underline"
        >
          or import recipients from CSV
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-medium">Import recipients from CSV</p>
        <button
          onClick={() => {
            setOpen(false);
            setText("");
            setFileError(null);
          }}
          className="text-sm text-muted hover:text-foreground transition-colors"
        >
          Close
        </button>
      </div>
      <p className="text-xs text-muted">
        Two columns: <span className="font-mono">address,amount</span> (amount
        in MON), one row per teammate. A header row is fine.{" "}
        <a
          href={SAMPLE_HREF}
          download="nadpay-recipients-sample.csv"
          className="font-medium text-primary hover:underline"
        >
          Download sample
        </a>
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={"address,amount\n0xabc…,1.5"}
        rows={5}
        spellCheck={false}
        className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm placeholder:text-muted/70 focus:border-primary focus:outline-none"
      />
      <div className="flex flex-wrap items-center gap-3">
        <label className="cursor-pointer rounded-xl border border-border bg-background px-3.5 py-2 text-sm font-medium hover:border-primary hover:text-primary transition-colors">
          Upload .csv file
          <input
            type="file"
            accept=".csv,text/csv,text/plain"
            className="sr-only"
            onChange={(e) => {
              void onFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
        {fileError && <p className="text-sm text-danger">{fileError}</p>}
      </div>

      {parsed && parsed.errors.length > 0 && (
        <div className="rounded-xl border border-danger/40 bg-danger-soft p-3">
          <p className="text-sm font-medium text-danger">
            Fix {parsed.errors.length}{" "}
            {parsed.errors.length === 1 ? "problem" : "problems"} before
            importing:
          </p>
          <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs text-danger">
            {parsed.errors.slice(0, 8).map((error) => (
              <li key={error}>{error}</li>
            ))}
            {parsed.errors.length > 8 && (
              <li>…and {parsed.errors.length - 8} more</li>
            )}
          </ul>
        </div>
      )}

      {valid && parsed.rows.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-2.5">
          <p className="text-sm">
            {parsed.rows.length}{" "}
            {parsed.rows.length === 1 ? "recipient" : "recipients"} ·{" "}
            <span className="font-mono font-semibold tabular">
              {formatMon(csvTotal(parsed.rows))} MON
            </span>{" "}
            total
          </p>
          <button
            onClick={apply}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-strong transition-colors"
          >
            Load into editor
          </button>
        </div>
      )}
      {valid && parsed.rows.length > 0 && (
        <p className="text-xs text-muted">
          Loading replaces the current list so you can review it — nothing is
          saved or funded until you choose to.
        </p>
      )}
    </div>
  );
}
