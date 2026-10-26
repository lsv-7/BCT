import { assertExpectedNetwork, contract, demoAuth, demoRole, jsonError, prisma } from "@/lib/server";
export const runtime = "nodejs";
export async function POST(req: Request) {
  try {
    const role = demoRole(req);
    const signer = demoAuth(req, role); await assertExpectedNetwork(); const { id } = await req.json(); if (!id) throw new Error("Document ID required.");
    const tx = await contract(signer).revokeDocument(id); const receipt = await tx.wait(1); if (!receipt || receipt.status !== 1) throw new Error("Revocation was not confirmed.");
    await prisma.document.update({ where: { id }, data: { revoked: true } });
    await prisma.auditLog.create({ data: { actor: signer.address, action: "DOCUMENT_REVOKED", target: id } });
    return Response.json({ txHash: tx.hash, status: "REVOKED" });
  } catch (e) { return jsonError(e); }
}
