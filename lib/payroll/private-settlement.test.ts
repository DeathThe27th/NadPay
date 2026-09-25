import { describe, expect, it } from "vitest";
import { evaluatePrivacyCapabilities } from "./private-settlement";

describe("privacy capability decisions", () => {
  it("never treats missing provider access as private payroll", () => {
    expect(evaluatePrivacyCapabilities(null).status).toBe("blocked");
  });

  it("distinguishes private distribution from reclaimable escrow", () => {
    expect(evaluatePrivacyCapabilities({ delayedClaim: false, deadlineReclaim: false, employeeWithdrawal: true, hidesRecipientsAndAmounts: true }).status).toBe("distribution-only");
    expect(evaluatePrivacyCapabilities({ delayedClaim: true, deadlineReclaim: true, employeeWithdrawal: true, hidesRecipientsAndAmounts: true }).status).toBe("supported");
  });
});
