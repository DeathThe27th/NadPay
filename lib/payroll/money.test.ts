import { describe, expect, it } from "vitest";
import { claimableAmount, parseMonAmount, sumBaseUnits } from "./money";

describe("payroll money boundaries", () => {
  it("parses MON as integer base units", () => {
    expect(parseMonAmount("1.25")).toBe(1_250_000_000_000_000_000n);
    expect(sumBaseUnits([1n, 2n, 3n])).toBe(6n);
  });

  it("rejects zero, empty and floating point notation", () => {
    expect(() => parseMonAmount("0")).toThrow();
    expect(() => parseMonAmount("1e-3")).toThrow();
    expect(() => parseMonAmount(" ")).toThrow();
  });

  it("excludes claimed and expired allocations", () => {
    expect(claimableAmount({ amount: 5n, claimed: false, deadline: 10n, nowSeconds: 10n })).toBe(5n);
    expect(claimableAmount({ amount: 5n, claimed: false, deadline: 10n, nowSeconds: 11n })).toBe(0n);
    expect(claimableAmount({ amount: 5n, claimed: true, deadline: 10n, nowSeconds: 1n })).toBe(0n);
  });
});
