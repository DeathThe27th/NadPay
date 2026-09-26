import { NextResponse } from "next/server";
import { getAddress, isAddress } from "viem";
import { activeChain } from "@/lib/wagmi";
import { getVerifiedIdentity } from "@/lib/server/identity";

export async function POST(request: Request) {
  const identity = await getVerifiedIdentity(request);
  if (!identity?.appUserId) return NextResponse.json({ error: "authentication-required" }, { status: 401 });
  const body = (await request.json()) as { address?: string };
  if (!body.address || !isAddress(body.address)) return NextResponse.json({ error: "A valid wallet address is required." }, { status: 400 });
  const address = getAddress(body.address);
  const issuedAt = new Date().toISOString();
  const nonce = crypto.randomUUID();
  const message = [
    "Nads2Pay wallet verification",
    `Address: ${address}`,
    `Chain ID: ${activeChain.id}`,
    `Issued at: ${issuedAt}`,
    `Nonce: ${nonce}`,
    "This proves control of the payout wallet. It does not authorize a payment.",
  ].join("\n");
  return NextResponse.json({ message, chainId: activeChain.id });
}
