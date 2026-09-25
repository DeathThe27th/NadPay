import { describe, expect, it } from "vitest";
import { canCreateSupplementalRun, canSubmitPayroll, payrollRunKey } from "./runs";

describe("payroll run gates", () => {
  it("requires deliberate approval before signing", () => {
    expect(canSubmitPayroll("draft")).toBe(false);
    expect(canSubmitPayroll("approved")).toBe(true);
  });

  it("requires explicit approval for supplemental payroll", () => {
    expect(canCreateSupplementalRun(false)).toBe(false);
    expect(canCreateSupplementalRun(true)).toBe(true);
  });

  it("deduplicates one schedule period", () => {
    expect(payrollRunKey("org", "schedule", "2026-09-01", "2026-09-30")).toBe("org:schedule:2026-09-01:2026-09-30");
  });
});
