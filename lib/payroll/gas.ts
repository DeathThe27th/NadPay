/** Monad charges from the submitted gas limit, so keep the buffer deliberate. */
export function tightGasLimit(estimate: bigint): bigint {
  if (estimate <= 0n) throw new Error("Gas estimate must be positive.");
  return estimate + estimate / 10n;
}
