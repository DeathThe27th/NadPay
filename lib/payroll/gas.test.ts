import { describe, expect, it } from "vitest";
import { tightGasLimit } from "./gas";

describe("Monad gas limits", () => {
  it("adds only a small explicit buffer", () => {
    expect(tightGasLimit(100_000n)).toBe(110_000n);
    expect(tightGasLimit(1n)).toBe(1n);
  });

  it("rejects an invalid estimate", () => {
    expect(() => tightGasLimit(0n)).toThrow();
  });
});
