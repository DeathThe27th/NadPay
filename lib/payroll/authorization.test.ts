import { describe, expect, it } from "vitest";
import {
  assertOrganizationAccess,
  canApproveJoinRequest,
  canReadCompensation,
} from "./authorization";

const owner = { organizationId: "a", userId: "owner", role: "owner" as const, status: "active" as const };
const employee = { organizationId: "a", userId: "employee", role: "employee" as const, status: "active" as const };

describe("payroll authorization boundaries", () => {
  it("keeps company data tenant-scoped", () => {
    expect(() => assertOrganizationAccess(employee, "b")).toThrow();
    expect(canApproveJoinRequest(employee)).toBe(false);
    expect(canApproveJoinRequest(owner)).toBe(true);
  });

  it("only lets owners or the subject read compensation", () => {
    expect(canReadCompensation(employee, "employee")).toBe(true);
    expect(canReadCompensation(employee, "someone-else")).toBe(false);
    expect(canReadCompensation(owner, "someone-else")).toBe(true);
  });
});
