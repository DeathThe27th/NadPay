import { describe, expect, it } from "vitest";
import { monthlyDueDate, payrollPeriodKey } from "./schedules";

describe("payroll schedule boundaries", () => {
  it("handles month-end dates explicitly", () => {
    expect(monthlyDueDate(2026, 2, 31)).toBe("2026-02-28");
    expect(monthlyDueDate(2028, 2, 31)).toBe("2028-02-29");
    expect(monthlyDueDate(2026, 4, 30)).toBe("2026-04-30");
  });

  it("creates a unique period key", () => {
    expect(payrollPeriodKey("org", "schedule", "2026-09-01", "2026-09-30")).toBe("org:schedule:2026-09-01:2026-09-30");
  });
});
