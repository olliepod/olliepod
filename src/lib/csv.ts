// Minimal RFC 4180 CSV parser (quoted fields, embedded commas/newlines,
// "" as an escaped quote). No external dependency needed for the CSV sizes
// involved here (one Weekly Earnings Report at a time).
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      pushField();
    } else if (char === "\n") {
      pushRow();
    } else if (char === "\r") {
      // skip; \r\n handled by the following \n
    } else {
      field += char;
    }
  }

  // Final field/row if the file doesn't end with a newline.
  if (field.length > 0 || row.length > 0) {
    pushRow();
  }

  return rows.filter((r) => !(r.length === 1 && r[0] === ""));
}

// Serializes a header row + data rows into RFC 4180 CSV text (CRLF line
// endings, fields quoted only when they contain a comma/quote/newline).
export function toCsv(headers: string[], rows: (string | number)[][]): string {
  const escapeField = (value: string | number): string => {
    const str = String(value);
    return /[",\r\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };

  return [headers, ...rows].map((row) => row.map(escapeField).join(",")).join("\r\n") + "\r\n";
}

// Parses a CSV with a header row into an array of column-name -> value
// records.
export function parseCsvRecords(text: string): Record<string, string>[] {
  const rows = parseCsv(text);
  if (rows.length === 0) return [];
  const [header, ...rest] = rows;
  return rest.map((r) => {
    const record: Record<string, string> = {};
    header.forEach((col, i) => {
      record[col] = r[i] ?? "";
    });
    return record;
  });
}
