import { AccessDenied, assertExpectedNetwork, contract, demoAuth, demoRole, jsonError, networkLabel, prisma, removeStoredPdf, savePdf, storePdf, withChainDocumentState } from "@/lib/server";
import { randomUUID } from "node:crypto";
export const runtime = "nodejs";
export async function GET(req: Request) {
  try {
    const id = new URL(req.url).searchParams.get("id");
    await assertExpectedNetwork();
    if (id) {
      const record = await contract().getDocument(id);
      if (!record.exists) return Response.json({ status: "NOT_FOUND", id });
      return Response.json({ status: record.revoked ? "REVOKED" : "REGISTERED", id, hash: record.documentHash, issuer: record.issuer, timestamp: Number(record.timestamp), revoked: record.revoked, network: networkLabel(BigInt(process.env.CHAIN_ID || "31337")) });
    }
    const role = demoRole(req);
    const signer = demoAuth(req, role);
    if (role === "admin" && (await contract().administrator()).toLowerCase() !== signer.address.toLowerCase()) throw new AccessDenied("Configured demo admin is not the contract administrator.");
    const metadata = await prisma.document.findMany({ where: role === "issuer" ? { issuerAddress: signer.address } : undefined, orderBy: { timestamp: "desc" }, take: 100, select: { id: true, title: true, category: true, sha256: true, issuerAddress: true, timestamp: true, network: true, transactionHash: true } });
    const docs = await withChainDocumentState(metadata);
    const stats = { total: docs.length, revoked: docs.filter(d => d.revoked).length, valid: docs.filter(d => d.onChainExists && !d.revoked).length };
    return Response.json({ docs, stats });
  } catch (e) { return jsonError(e, 503); }
}
export async function POST(req: Request) {
  let storageRef: string | undefined;
  let metadataSaved = false;
  try {
    const signer = demoAuth(req, "issuer");
    const network = await assertExpectedNetwork();
    const form = await req.formData();
    const file = form.get("file");
    const title = String(form.get("title") || "").trim();
    const category = String(form.get("category") || "").trim();
    if (!(file instanceof File) || !title || title.length > 120 || !category || category.length > 60) throw new Error("Provide a PDF, title (up to 120 characters), and category.");
    if (!(await contract().isAuthorizedIssuer(signer.address))) throw new Error("This wallet is not an active authorized issuer on the connected chain.");
    const saved = await savePdf(file, false);
    const id = `CP-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 8).toUpperCase()}`;
    const tx = await contract(signer).registerDocument("0x" + saved.sha256, id);
    const receipt = await tx.wait(1);
    if (!receipt || receipt.status !== 1) throw new Error("Blockchain transaction was not confirmed successfully.");
    storageRef = await storePdf(saved.bytes);
    const doc = await prisma.document.create({ data: { id, title, category, originalFilename: file.name.slice(0, 255), sha256: saved.sha256, issuerAddress: signer.address, network: networkLabel(network.chainId), transactionHash: tx.hash, storageRef } });
    metadataSaved = true;
    await prisma.auditLog.create({ data: { actor: signer.address, action: "DOCUMENT_REGISTERED", target: id } });
    return Response.json({ id: doc.id, title: doc.title, category: doc.category, sha256: doc.sha256, issuerAddress: doc.issuerAddress, timestamp: doc.timestamp, network: doc.network, transactionHash: doc.transactionHash, revoked: doc.revoked }, { status: 201 });
  } catch (e) { if (storageRef && !metadataSaved) await removeStoredPdf(storageRef); return jsonError(e); }
}
