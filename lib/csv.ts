import { isAddress, parseEther } from "viem";

export type CsvRow = { address: string; amount: string };
export type CsvParseResult = { rows: CsvRow[]; errors: string[] };

export const SAMPLE_CSV = `address,amount
0x70997970c51812dc3a010c7d01b50e0d17dc79c8,1.5
0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc,2
0x90f79bf6eb2c4f870365e785982e1f101e93b906,0.75
`;

/** Split one CSV line into trimmed cells; commas, semicolons, and tabs all work. */
function splitLine(line: string): string[] {
  return line.split(/[,;\t]/).map((cell) => cell.trim().replace(/^"(.*)"$/, "$1"));
}

/**
 * Parse a pasted/uploaded `address,amount` list. An optional header row is
 * skipped. Every invalid row produces an error — rows are never silently
 * dropped, and `rows` should only be used when `errors` is empty.
 */
export function parseRecipientsCsv(text: string): CsvParseResult {
  const rows: CsvRow[] = [];
  const errors: string[] = [];
  const seen = new Map<string, number>();
  let firstContentLine = true;

  const lines = text.split(/\r?\n/);
  lines.forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (!line) return;
    const lineNo = index + 1;
    const cells = splitLine(line);
    const [address, amount] = cells;

    // Optional header: only the very first non-empty line may name the columns.
    const isHeader =
      firstContentLine && !isAddress(address) && /^address$/i.test(address);
    firstContentLine = false;
    if (isHeader) return;

    if (cells.filter(Boolean).length < 2) {
      errors.push(`Line ${lineNo}: expected two columns — address,amount`);
      return;
    }
    if (!isAddress(address)) {
      errors.push(`Line ${lineNo}: "${address}" is not a valid wallet address`);
      return;
    }
    let wei: bigint;
    try {
      wei = parseEther(amount);
    } catch {
      errors.push(`Line ${lineNo}: "${amount}" is not a valid MON amount`);
      return;
    }
    if (wei <= 0n) {
      errors.push(`Line ${lineNo}: amount must be greater than 0`);
      return;
    }
    const key = address.toLowerCase();
    const firstLine = seen.get(key);
    if (firstLine !== undefined) {
      errors.push(
        `Line ${lineNo}: duplicate address ${address} (first used on line ${firstLine})`,
      );
      return;
    }
    seen.set(key, lineNo);
    rows.push({ address, amount });
  });

  if (rows.length === 0 && errors.length === 0) {
    errors.push("No recipient rows found — paste or upload address,amount lines");
  }
  return { rows, errors };
}

/** Total cost of the parsed list, in wei. Assumes rows already validated. */
export function csvTotal(rows: CsvRow[]): bigint {
  return rows.reduce((sum, row) => sum + parseEther(row.amount), 0n);
}
