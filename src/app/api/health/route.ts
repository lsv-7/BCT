import { assertExpectedNetwork, networkLabel, safeErrorMessage } from "@/lib/server";
export const runtime = "nodejs";
export async function GET(req: Request) {
  try { const n = await assertExpectedNetwork(); return Response.json({ connected: true, chainId: n.chainId.toString(), network: networkLabel(n.chainId), contract: process.env.CONTRACT_ADDRESS || null, appUrl: process.env.APP_URL || new URL(req.url).origin }); }
  catch (e) { return Response.json({ connected: false, error: safeErrorMessage(e), network: "Configured network", contract: process.env.CONTRACT_ADDRESS || null }, { status: 503 }); }
}
