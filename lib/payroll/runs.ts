export type PayrollRunStatus = "draft" | "approved" | "submitted" | "pending" | "funded" | "failed" | "cancelled";

export function payrollRunKey(organizationId: string, scheduleId: string | null, periodStart: string, periodEnd: string): string {
  return `${organizationId}:${scheduleId ?? "supplemental"}:${periodStart}:${periodEnd}`;
}

export function canSubmitPayroll(status: PayrollRunStatus): boolean {
  return status === "approved";
}

export function canCreateSupplementalRun(hasExplicitApproval: boolean): boolean {
  return hasExplicitApproval;
}
