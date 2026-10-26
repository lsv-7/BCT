import { AccessDenied, assertExpectedNetwork, contract, demoAuth, jsonError, prisma } from "@/lib/server";
export const runtime = "nodejs";
export async function GET(req: Request) {
  try { const signer = demoAuth(req, "admin"); await assertExpectedNetwork(); if ((await contract().administrator()).toLowerCase() !== signer.address.toLowerCase()) throw new AccessDenied("Configured demo admin is not the contract administrator."); return Response.json(await prisma.issuer.findMany({ orderBy: { updatedAt: "desc" } })); } catch (e) { return jsonError(e, 503); }
}
export async function POST(req: Request) {
  try {
    const signer = demoAuth(req, "admin"); await assertExpectedNetwork(); const body = await req.json();
    if (!/^0x[a-fA-F0-9]{40}$/.test(body.address || "")) throw new Error("Enter a valid wallet address.");
    const action = body.action;
    if (!["authorize", "suspend", "reactivate"].includes(action)) throw new Error("Unsupported issuer action.");
    const c = contract(signer); const tx = await c[action === "authorize" ? "authorizeIssuer" : action === "suspend" ? "suspendIssuer" : "reactivateIssuer"](body.address);
    const receipt = await tx.wait(1); if (!receipt || receipt.status !== 1) throw new Error("Issuer transaction failed.");
    const active = await c.isAuthorizedIssuer(body.address);
    await prisma.issuer.upsert({ where: { address: body.address.toLowerCase() }, create: { address: body.address.toLowerCase(), status: active ? "ACTIVE" : "SUSPENDED" }, update: { status: active ? "ACTIVE" : "SUSPENDED" } });
    await prisma.auditLog.create({ data: { actor: signer.address, action: `ISSUER_${action.toUpperCase()}`, target: body.address } });
    return Response.json({ txHash: tx.hash, status: active ? "ACTIVE" : "SUSPENDED" });
  } catch (e) { return jsonError(e); }
}
