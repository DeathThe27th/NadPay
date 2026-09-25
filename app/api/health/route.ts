import { NextResponse } from "next/server";
import { getPayrollIntegrationStatus } from "@/lib/payroll/config";

export function GET() {
  return NextResponse.json({
    ok: true,
    service: "nads2pay",
    network: process.env.NEXT_PUBLIC_NETWORK === "testnet" ? "testnet" : "mainnet",
    integrations: getPayrollIntegrationStatus(),
  });
}
