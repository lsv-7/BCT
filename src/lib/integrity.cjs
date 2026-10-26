const crypto = require("node:crypto");
function validatePdf(bytes, filename, mime, maxBytes) {
  if (!Number.isFinite(maxBytes) || maxBytes <= 0) throw new Error("Upload size limit is not configured correctly.");
  if (!bytes?.length) throw new Error("Choose a non-empty PDF.");
  if (bytes.length > maxBytes) throw new Error("PDF exceeds upload size limit.");
  if (mime !== "application/pdf" && !String(filename).toLowerCase().endsWith(".pdf")) throw new Error("Only PDF documents are accepted.");
  if (bytes.subarray(0, 5).toString("ascii") !== "%PDF-") throw new Error("The uploaded file does not have a valid PDF signature.");
  return crypto.createHash("sha256").update(bytes).digest("hex");
}
function sanitizeErrorMessage(message, secrets = []) {
  let safe = String(message);
  for (const secret of secrets) if (secret) safe = safe.split(secret).join("[redacted]");
  return safe.replace(/0x[a-f\d]{64}/gi, "[redacted]").replace(/https?:\/\/[^\s"'<>]+/gi, "[RPC endpoint]");
}
function verificationStatus({ exists, revoked, hashMatches, hasUpload }) {
  if (!exists) return "NOT_FOUND";
  if (revoked) return "REVOKED";
  if (!hasUpload) return "REGISTERED";
  return hashMatches ? "VALID" : "HASH_MISMATCH";
}
function assertChainId(actual, expected) {
  if (BigInt(actual) !== BigInt(expected)) throw new Error(`Wrong blockchain network: expected chain ${expected}, connected to ${actual}.`);
}
module.exports = { validatePdf, verificationStatus, assertChainId, sanitizeErrorMessage };
