import { ImportedPlayer } from "./types";

/**
 * Parse CSV text into player records.
 * Expects columns for first name, last name, and DOB.
 * Handles various date formats.
 */
export function parseCSV(text: string): {
  headers: string[];
  rows: string[][];
} {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  // Detect delimiter (tab, comma, or pipe)
  const firstLine = lines[0];
  let delimiter = ",";
  if (firstLine.includes("\t")) delimiter = "\t";
  else if (firstLine.includes("|")) delimiter = "|";

  const parsed = lines.map((line) => splitCSVLine(line, delimiter));
  const headers = parsed[0] || [];
  const rows = parsed.slice(1);

  return { headers, rows };
}

function splitCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Auto-detect column mapping from headers.
 */
export function autoMapColumns(headers: string[]): {
  firstNameIdx: number;
  lastNameIdx: number;
  dobIdx: number;
} {
  const normalized = headers.map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ""));

  let firstNameIdx = -1;
  let lastNameIdx = -1;
  let dobIdx = -1;

  for (let i = 0; i < normalized.length; i++) {
    const h = normalized[i];
    if (
      h.includes("first") ||
      h === "fname" ||
      h === "firstname"
    ) {
      firstNameIdx = i;
    } else if (
      h.includes("last") ||
      h === "lname" ||
      h === "lastname" ||
      h === "surname"
    ) {
      lastNameIdx = i;
    } else if (
      h.includes("dob") ||
      h.includes("birth") ||
      h.includes("birthday") ||
      h === "date" ||
      h === "dateofbirth"
    ) {
      dobIdx = i;
    } else if (h === "name" && firstNameIdx === -1) {
      // Could be full name — we'll handle this
      firstNameIdx = i;
    }
  }

  // Fallback to positional
  if (firstNameIdx === -1 && headers.length >= 1) firstNameIdx = 0;
  if (lastNameIdx === -1 && headers.length >= 2) lastNameIdx = 1;
  if (dobIdx === -1 && headers.length >= 3) dobIdx = 2;

  return { firstNameIdx, lastNameIdx, dobIdx };
}

/**
 * Convert raw rows + column mapping to ImportedPlayer[]
 */
export function mapToPlayers(
  rows: string[][],
  firstNameIdx: number,
  lastNameIdx: number,
  dobIdx: number
): ImportedPlayer[] {
  const players: ImportedPlayer[] = [];

  for (const row of rows) {
    const firstName = (row[firstNameIdx] || "").trim();
    const lastName = (row[lastNameIdx] || "").trim();
    const dobRaw = (row[dobIdx] || "").trim();

    if (!firstName && !lastName) continue;

    const dob = parseDate(dobRaw);
    if (!dob) continue;

    players.push({ firstName, lastName, dob });
  }

  return players;
}

/**
 * Parse various date formats to ISO string.
 */
function parseDate(str: string): string | null {
  if (!str) return null;

  // Try ISO format first
  const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) return d.toISOString();
  }

  // MM/DD/YYYY or M/D/YYYY
  const usMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (usMatch) {
    let year = parseInt(usMatch[3]);
    if (year < 100) year += 2000;
    const month = parseInt(usMatch[1]) - 1;
    const day = parseInt(usMatch[2]);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d.toISOString();
  }

  // Try native Date parsing as last resort
  const d = new Date(str);
  if (!isNaN(d.getTime())) return d.toISOString();

  return null;
}

/**
 * Extract Google Sheets ID from URL and construct CSV export URL.
 * The actual fetching is done on the client side or via API route.
 */
export function extractGoogleSheetsUrl(url: string): string | null {
  // Match Google Sheets URL patterns
  const match = url.match(
    /docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/
  );
  if (!match) return null;

  const sheetId = match[1];
  // Construct CSV export URL (works for publicly shared sheets)
  return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
}
