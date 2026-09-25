import { NextResponse } from "next/server";
import { getAddress, isAddress, verifyMessage } from "viem";
import { activeChain } from "@/lib/wagmi";
import { getVerifiedIdentity } from "@/lib/server/identity";
import { supabaseAdminRequest } from "@/lib/server/supabase";

export async function POST(request: Request) {
  const identity = await getVerifiedIdentity(request);
  if (!identity?.appUserId) return NextResponse.json({ error: "authentication-required" }, { status: 401 });
  try {
    const body = (await request.json()) as { address?: string; message?: string; signature?: `0x${string}` };
    if (!body.address || !isAddress(body.address) || !body.message || !body.signature) {
      return NextResponse.json({ error: "Address, challenge message and signature are required." }, { status: 400 });
    }
    const address = getAddress(body.address);
    const issuedAt = body.message.match(/^Issued at: (.+)$/m)?.[1];
    const chainId = body.message.match(/^Chain ID: (\d+)$/m)?.[1];
    const messageAddress = body.message.match(/^Address: (0x[0-9a-fA-F]{40})$/m)?.[1];
    if (!issuedAt || !chainId || !messageAddress || getAddress(messageAddress) !== address || Number(chainId) !== activeChain.id) {
      return NextResponse.json({ error: "Wallet challenge is invalid." }, { status: 400 });
    }
    const age = Date.now() - Date.parse(issuedAt);
    if (!Number.isFinite(age) || age < -60_000 || age > 10 * 60_000) {
      return NextResponse.json({ error: "Wallet challenge has expired." }, { status: 400 });
    }
    if (!(await verifyMessage({ address, message: body.message, signature: body.signature }))) {
      return NextResponse.json({ error: "Wallet signature could not be verified." }, { status: 400 });
    }

    const existing = await supabaseAdminRequest<Array<{ id: string; user_id: string }>>(
      `verified_wallets?select=id,user_id&chain_id=eq.${activeChain.id}&wallet_address=ilike.${encodeURIComponent(address)}&limit=1`,
    );
    if (existing[0] && existing[0].user_id !== identity.appUserId) {
      return NextResponse.json({ error: "This wallet is already verified by another account." }, { status: 409 });
    }
    const wallet = existing[0] ?? (await supabaseAdminRequest<Array<{ id: string }>>("verified_wallets", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        user_id: identity.appUserId,
        chain_id: activeChain.id,
        wallet_address: address,
        ownership_verified_at: new Date().toISOString(),
        verification_method: "eip191-signature",
        is_primary: false,
      }),
    }))[0];
    return NextResponse.json({ ok: true, walletId: wallet?.id, address });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Wallet verification failed." }, { status: 400 });
  }
}
