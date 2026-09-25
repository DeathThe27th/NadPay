import { describe, expect, it } from "vitest";
import { canTransitionRequest, requestFundingKey } from "./requests";

describe("contractor request lifecycle", () => {
  it("separates approval from funding", () => {
    expect(canTransitionRequest("submitted", "approved-unfunded")).toBe(true);
    expect(canTransitionRequest("approved-unfunded", "funded")).toBe(true);
    expect(canTransitionRequest("submitted", "funded")).toBe(false);
  });

  it("provides a unique funding key", () => {
    expect(requestFundingKey("req-1")).toBe("contractor-request:req-1");
  });
});
