"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Upload, FileSpreadsheet, Link2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";

type InputMethod = "paste" | "csv" | "url" | null;

interface ParsedRow {
  [key: string]: string;
}

interface ColumnMapping {
  firstName: number;
  lastName: number;
  dob: number;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if ((ch === "," || ch === "\t") && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseData(raw: string): { headers: string[]; rows: string[][] } {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = parseCSVLine(lines[0]);
  const rows = lines.slice(1).map(parseCSVLine);
  return { headers, rows };
}

function autoDetectColumns(headers: string[]): ColumnMapping {
  const lower = headers.map((h) => h.toLowerCase());
  let firstName = lower.findIndex((h) => h.includes("first") || h === "given name");
  let lastName = lower.findIndex((h) => h.includes("last") || h === "surname" || h === "family name");
  let dob = lower.findIndex(
    (h) => h.includes("dob") || h.includes("birth") || h.includes("date") || h === "birthday"
  );

  if (firstName === -1) firstName = 0;
  if (lastName === -1) lastName = Math.min(1, headers.length - 1);
  if (dob === -1) dob = Math.min(2, headers.length - 1);

  return { firstName, lastName, dob };
}

export default function ImportPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [method, setMethod] = useState<InputMethod>(null);
  const [rawText, setRawText] = useState("");
  const [urlText, setUrlText] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({
    firstName: 0,
    lastName: 1,
    dob: 2,
  });
  const [importing, setImporting] = useState(false);

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setRawText(text);
    };
    reader.readAsText(file);
  }

  function processAndAdvance() {
    const data = rawText || urlText;
    if (!data.trim()) {
      toast.error("No data provided");
      return;
    }
    const { headers: h, rows: r } = parseData(data);
    if (r.length === 0) {
      toast.error("No data rows found");
      return;
    }
    setHeaders(h);
    setRows(r);
    setMapping(autoDetectColumns(h));
    setStep(2);
  }

  function getMappedPlayers() {
    return rows.map((row) => ({
      firstName: row[mapping.firstName] || "",
      lastName: row[mapping.lastName] || "",
      dob: row[mapping.dob] || "",
    })).filter((p) => p.firstName && p.lastName);
  }

  async function handleImport() {
    const players = getMappedPlayers();
    if (players.length === 0) {
      toast.error("No valid players to import");
      return;
    }

    setImporting(true);
    try {
      const res = await fetch("/api/players/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ players }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Import failed");
      }
      const result = await res.json();
      toast.success(`Imported ${result.count} players`);
      router.push("/roster/wizard");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-6 max-w-lg mx-auto min-h-screen">
      <header className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => (step > 1 ? setStep(step - 1) : router.push("/roster"))}>
          <ArrowLeft className="size-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">Import Roster</h1>
          <p className="text-sm text-muted-foreground">Step {step} of 3</p>
        </div>
      </header>

      {/* Step 1: Input Method */}
      {step === 1 && (
        <div className="flex flex-col gap-4 flex-1">
          <div className="grid gap-3">
            <button
              type="button"
              onClick={() => setMethod("paste")}
              className={`flex items-center gap-4 rounded-xl border-2 p-4 text-left transition-colors ${method === "paste" ? "border-primary bg-primary/5" : "border-border"}`}
            >
              <FileSpreadsheet className="size-8 text-primary shrink-0" />
              <div>
                <p className="font-semibold">Paste from Spreadsheet</p>
                <p className="text-sm text-muted-foreground">Copy rows from Excel or Google Sheets</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setMethod("csv")}
              className={`flex items-center gap-4 rounded-xl border-2 p-4 text-left transition-colors ${method === "csv" ? "border-primary bg-primary/5" : "border-border"}`}
            >
              <Upload className="size-8 text-primary shrink-0" />
              <div>
                <p className="font-semibold">Upload CSV File</p>
                <p className="text-sm text-muted-foreground">Upload a .csv file from your device</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setMethod("url")}
              className={`flex items-center gap-4 rounded-xl border-2 p-4 text-left transition-colors ${method === "url" ? "border-primary bg-primary/5" : "border-border"}`}
            >
              <Link2 className="size-8 text-primary shrink-0" />
              <div>
                <p className="font-semibold">Google Sheets URL</p>
                <p className="text-sm text-muted-foreground">Enter a shared Google Sheets link</p>
              </div>
            </button>
          </div>

          {method === "paste" && (
            <Textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Paste rows here (include header row)..."
              className="min-h-[200px] font-mono text-xs"
            />
          )}

          {method === "csv" && (
            <div className="flex flex-col gap-2">
              <Input
                type="file"
                accept=".csv,.tsv,.txt"
                onChange={handleFileUpload}
                className="h-auto py-3"
              />
              {rawText && (
                <p className="text-sm text-muted-foreground">
                  File loaded ({rawText.split("\n").length - 1} rows detected)
                </p>
              )}
            </div>
          )}

          {method === "url" && (
            <div className="flex flex-col gap-2">
              <Input
                value={urlText}
                onChange={(e) => setUrlText(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/..."
              />
              <p className="text-xs text-muted-foreground">
                Paste the exported CSV data from your Google Sheet
              </p>
            </div>
          )}

          <div className="mt-auto pt-4">
            <Button
              onClick={processAndAdvance}
              disabled={!method || (!rawText && !urlText)}
              className="w-full h-12"
            >
              Next
              <ArrowRight className="size-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Preview & Column Mapping */}
      {step === 2 && (
        <div className="flex flex-col gap-4 flex-1">
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full text-xs border-collapse min-w-[300px]">
              <thead>
                <tr>
                  {headers.map((h, i) => (
                    <th key={i} className="border-b px-2 py-1 text-left font-medium text-muted-foreground">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 5).map((row, ri) => (
                  <tr key={ri} className="border-b border-border/50">
                    {row.map((cell, ci) => (
                      <td key={ci} className="px-2 py-1 truncate max-w-[120px]">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 5 && (
              <p className="text-xs text-muted-foreground mt-1">
                ...and {rows.length - 5} more rows
              </p>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="font-semibold text-sm">Column Mapping</h3>
            {(["firstName", "lastName", "dob"] as const).map((field) => (
              <div key={field} className="flex items-center gap-3">
                <label className="text-sm font-medium w-24 shrink-0">
                  {field === "firstName" ? "First Name" : field === "lastName" ? "Last Name" : "DOB"}
                </label>
                <select
                  value={mapping[field]}
                  onChange={(e) =>
                    setMapping((m) => ({ ...m, [field]: parseInt(e.target.value) }))
                  }
                  className="flex-1 h-9 rounded-lg border border-input bg-background px-3 text-sm"
                >
                  {headers.map((h, i) => (
                    <option key={i} value={i}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="mt-auto pt-4 flex gap-2">
            <Button variant="outline" onClick={() => setStep(1)} className="flex-1 h-12">
              Back
            </Button>
            <Button onClick={() => setStep(3)} className="flex-1 h-12">
              Next
              <ArrowRight className="size-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Confirmation */}
      {step === 3 && (
        <div className="flex flex-col gap-4 flex-1">
          <h3 className="font-semibold">Ready to import {getMappedPlayers().length} players</h3>
          <div className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto">
            {getMappedPlayers().map((p, i) => (
              <Card key={i} size="sm">
                <CardContent className="flex items-center justify-between py-1">
                  <span className="font-medium">
                    {p.firstName} {p.lastName}
                  </span>
                  <span className="text-sm text-muted-foreground">{p.dob}</span>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-auto pt-4 flex gap-2">
            <Button variant="outline" onClick={() => setStep(2)} className="flex-1 h-12">
              Back
            </Button>
            <Button onClick={handleImport} disabled={importing} className="flex-1 h-12">
              {importing ? "Importing..." : `Import ${getMappedPlayers().length} Players`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
