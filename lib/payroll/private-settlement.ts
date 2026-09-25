export type PrivateSettlementCapabilities = {
  delayedClaim: boolean;
  deadlineReclaim: boolean;
  employeeWithdrawal: boolean;
  hidesRecipientsAndAmounts: boolean;
};

export type PrivacyDecision =
  | { status: "supported"; note: string }
  | { status: "distribution-only"; note: string }
  | { status: "blocked"; note: string };

/** Keep privacy promises tied to observed protocol semantics. */
export function evaluatePrivacyCapabilities(
  capabilities: PrivateSettlementCapabilities | null,
): PrivacyDecision {
  if (!capabilities) return { status: "blocked", note: "Provider capabilities have not been verified." };
  if (capabilities.delayedClaim && capabilities.deadlineReclaim && capabilities.hidesRecipientsAndAmounts) {
    return { status: "supported", note: "Private funded-pot semantics may be supported; complete a real testnet proof before release." };
  }
  if (capabilities.employeeWithdrawal && capabilities.hidesRecipientsAndAmounts) {
    return { status: "distribution-only", note: "Private distribution is available, but employer reclaim semantics are not established." };
  }
  return { status: "blocked", note: "The verified capabilities do not meet the payroll privacy requirements." };
}
