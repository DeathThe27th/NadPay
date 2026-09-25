export type ContractorRequestStatus =
  | "submitted"
  | "approved-unfunded"
  | "rejected"
  | "included-in-draft"
  | "funded"
  | "claimed"
  | "expired"
  | "reclaimed";

const transitions: Record<ContractorRequestStatus, readonly ContractorRequestStatus[]> = {
  submitted: ["approved-unfunded", "rejected"],
  "approved-unfunded": ["included-in-draft", "funded", "rejected"],
  rejected: [],
  "included-in-draft": ["approved-unfunded", "funded"],
  funded: ["claimed", "expired", "reclaimed"],
  claimed: [],
  expired: [],
  reclaimed: [],
};

export function canTransitionRequest(from: ContractorRequestStatus, to: ContractorRequestStatus): boolean {
  return transitions[from].includes(to);
}

export function requestFundingKey(requestId: string): string {
  return `contractor-request:${requestId}`;
}
