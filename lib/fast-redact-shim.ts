// WalletConnect's logger imports fast-redact for optional server logging.
// Nads2Pay does not use that logger in the browser, but the dependency is
// statically bundled by Privy's connector package. Keep the browser fallback
// behavior lossless when the optional package is unavailable.
export default function fastRedact<T>(value: T): (input: unknown) => unknown {
  return () => value;
}
