import { parseEther } from "viem";

export const MON_DECIMALS = 18;

/** Parse a user-entered MON amount without floating-point arithmetic. */
export function parseMonAmount(value: string): bigint {
  const normalized = value.trim();
  if (!normalized || /[eE]/.test(normalized)) {
    throw new Error("Enter a decimal MON amount.");
  }
  const amount = parseEther(normalized);
  if (amount <= 0n) throw new Error("Amount must be greater than zero.");
  return amount;
}

export function sumBaseUnits(amounts: readonly bigint[]): bigint {
  return amounts.reduce((sum, amount) => sum + amount, 0n);
}

export function claimableAmount(args: {
  amount: bigint;
  claimed: boolean;
  deadline: bigint;
  nowSeconds?: bigint;
}): bigint {
  const now = args.nowSeconds ?? BigInt(Math.floor(Date.now() / 1000));
  if (args.claimed || now > args.deadline) return 0n;
  return args.amount;
}
