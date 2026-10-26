import { assertExpectedNetwork, contract, jsonError, networkLabel, savePdf } from "@/lib/server";
const { verificationStatus } = require("@/lib/integrity.cjs") as { verificationStatus: (input: { exists: boolean; revoked: boolean; hashMatches: boolean; hasUpload: boolean }) => string };
export const runtime = "nodejs";
export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const id = String(form.get("id") || "").trim();
    const file = form.get("file");
    if (!id) throw new Error("Enter a document ID.");
    await assertExpectedNetwork();
    let digest: string | undefined;
    if (file instanceof File && file.size) digest = (await savePdf(file, false)).sha256;
    const c = contract();
    const record = await c.getDocument(id);
    if (!record.exists) return Response.json({ status: verificationStatus({ exists: false, revoked: false, hashMatches: false, hasUpload: Boolean(digest) }), id });
    const result = digest ? await c.verifyDocument(id, "0x" + digest) : null;
    const status = verificationStatus({ exists: Boolean(record.exists), revoked: Boolean(record.revoked), hashMatches: Boolean(result?.hashMatches), hasUpload: Boolean(digest) });
    return Response.json({ status, id, hash: record.documentHash, uploadedHash: digest || null, issuer: record.issuer, timestamp: Number(record.timestamp), network: networkLabel(BigInt(process.env.CHAIN_ID || "31337")), txHash: null });
  } catch (e) { return jsonError(e, 503); }
}
