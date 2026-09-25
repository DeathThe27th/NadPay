import { describe, expect, it } from "vitest";
import { paymentReadyNotificationKey, retryAt } from "./outbox";

describe("notification outbox", () => {
  it("uses a stable dedupe key", () => {
    expect(paymentReadyNotificationKey("run-1", "user-2")).toBe("payment-ready:run-1:user-2");
  });

  it("backs off and caps retries", () => {
    const now = new Date("2026-09-23T00:00:00.000Z");
    expect(retryAt(0, now)).toBe("2026-09-23T00:00:30.000Z");
    expect(retryAt(12, now)).toBe("2026-09-24T00:00:00.000Z");
  });
});
