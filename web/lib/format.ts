import { formatEther } from "viem";

export function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function formatMon(wei: bigint): string {
  const s = formatEther(wei);
  // Trim trailing zeros but keep at least one decimal-free integer.
  if (!s.includes(".")) return s;
  return s.replace(/\.?0+$/, "");
}

export function deadlineLabel(deadline: bigint): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = Number(deadline) - now;
  if (diff <= 0) return "closed";
  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${minutes}m left`;
}
