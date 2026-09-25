import { describe, expect, it } from "vitest";
import { paymentStatementCsv } from "./reports";

describe("payment statements", () => {
  it("exports authorized rows with safe CSV escaping", () => {
    expect(paymentStatementCsv([{ period: "Sep, 2026", fundedAt: "2026-09-01", claimedAt: "2026-09-02", token: "USDC", amountBaseUnits: "42", transaction: "0xabc" }])).toBe(
      "period,funded_at,claimed_at,token,amount_base_units,transaction\n\"Sep, 2026\",2026-09-01,2026-09-02,USDC,42,0xabc",
    );
  });
});
