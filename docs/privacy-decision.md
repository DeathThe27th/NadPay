# Nads2Pay privacy decision record

Status: research adapter, not production privacy.

The current NadPay contract is public by design: payer, recipients, amounts,
round state and claim events are visible onchain. Solidity visibility modifiers
cannot change that. Existing public rounds are preserved and must never be
re-labeled as private.

Unlink is the first candidate adapter because its Monad testnet support is
listed in the project brief. Mainnet access, SDK availability, token support,
fees, relay funding and exact payroll escrow semantics still require provider
access and a real testnet proof.

The decisive semantic question is whether the provider supports a funded pot
with delayed employee claim, deadline, and employer reclaim. A completed
private transfer may already belong to the employee and therefore cannot be
treated as employer-reclaimable. If the provider only supports private
distribution followed by employee withdrawal, the product must say that
clearly; a database balance is not a privacy escrow.

Until the proof is completed, NadPay exposes the public MON path and keeps the
privacy capability unavailable rather than simulating confidentiality.
