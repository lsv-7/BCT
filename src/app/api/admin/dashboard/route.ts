import { AccessDenied, assertExpectedNetwork, contract, demoAuth, jsonError, prisma, withChainDocumentState } from "@/lib/server";
export const runtime = "nodejs";
export async function GET(req: Request) {
  try {
    const signer = demoAuth(req, "admin");
    const network = await assertExpectedNetwork();
    if ((await contract().administrator()).toLowerCase() !== signer.address.toLowerCase()) throw new AccessDenied("Configured demo admin is not the contract administrator.");
    const [docs, issuers, activity] = await Promise.all([
      prisma.document.findMany({ orderBy: { timestamp: "desc" }, take: 100, select: { id: true, title: true, category: true, sha256: true, issuerAddress: true, timestamp: true, network: true, transactionHash: true, revoked: true } }),
      prisma.issuer.count(),
      prisma.auditLog.findMany({ orderBy: { timestamp: "desc" }, take: 10 }),
    ]);
    const chainDocs = await withChainDocumentState(docs);
    return Response.json({ stats: { total: chainDocs.length, valid: chainDocs.filter(d => d.onChainExists && !d.revoked).length, revoked: chainDocs.filter(d => d.revoked).length, authorizedIssuers: issuers }, docs: chainDocs.slice(0, 8), activity, network: { connected: true, chainId: network.chainId.toString(), contract: process.env.CONTRACT_ADDRESS } });
  } catch (e) { return jsonError(e, 503); }
}
