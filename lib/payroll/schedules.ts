/** Clamp a monthly schedule to the final day of shorter months. */
export function monthlyDueDate(year: number, month: number, preferredDay: number): string {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const day = Math.min(Math.max(preferredDay, 1), lastDay);
  return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}

export function payrollPeriodKey(organizationId: string, scheduleId: string, periodStart: string, periodEnd: string): string {
  return `${organizationId}:${scheduleId}:${periodStart}:${periodEnd}`;
}
