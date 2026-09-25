export type StatementRow = {
  period: string;
  fundedAt: string;
  claimedAt: string;
  token: string;
  amountBaseUnits: string;
  transaction: string;
};

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

export function paymentStatementCsv(rows: readonly StatementRow[]): string {
  const header = ["period", "funded_at", "claimed_at", "token", "amount_base_units", "transaction"];
  return [header, ...rows.map((row) => [row.period, row.fundedAt, row.claimedAt, row.token, row.amountBaseUnits, row.transaction])]
    .map((line) => line.map(csvCell).join(","))
    .join("\n");
}
