import { PrismaClient } from "@prisma/client";
import { Contract, JsonRpcProvider, Wallet, isAddress } from "ethers";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
const { validatePdf, assertChainId, sanitizeErrorMessage } = require("./integrity.cjs") as { validatePdf: (bytes: Buffer, filename: string, mime: string, max: number) => string; assertChainId: (actual: bigint, expected: bigint) => void; sanitizeErrorMessage: (message: string, secrets?: string[]) => string };

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
export const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
export const provider = new JsonRpcProvider(process.env.RPC_URL || "http://127.0.0.1:8545");
export function networkLabel(chainId: bigint) {
  return chainId === 31337n ? "Local Hardhat (31337)" : chainId === 80002n ? "Polygon Amoy" : `Configured EVM network (${chainId})`;
}
export async function assertExpectedNetwork() {
  const network = await provider.getNetwork();
  const expected = BigInt(process.env.CHAIN_ID || "31337");
  assertChainId(network.chainId, expected);
  if (process.env.CONTRACT_ADDRESS && await provider.getCode(process.env.CONTRACT_ADDRESS) === "0x") throw new Error("No contract code exists at the configured address on this chain.");
  return network;
}
export const ABI = [
  "function administrator() view returns (address)",
  "function authorizeIssuer(address)", "function suspendIssuer(address)", "function reactivateIssuer(address)",
  "function isAuthorizedIssuer(address) view returns (bool)",
  "function registerDocument(bytes32,string)", "function revokeDocument(string)",
  "function getDocument(string) view returns (bytes32 documentHash,address issuer,uint64 timestamp,bool exists,bool revoked)",
  "function verifyDocument(string,bytes32) view returns (bool exists,bool hashMatches,bool revoked)",
  "event DocumentRegistered(bytes32 indexed idHash,string documentId,bytes32 documentHash,address indexed issuer,uint64 timestamp)",
  "event DocumentRevoked(bytes32 indexed idHash,string documentId,address indexed actor,uint64 timestamp)"
];
export function contract(signer?: Wallet) {
  if (!process.env.CONTRACT_ADDRESS || !isAddress(process.env.CONTRACT_ADDRESS)) throw new Error("Contract is not deployed. Run npm run deploy:local.");
  return new Contract(process.env.CONTRACT_ADDRESS, ABI, signer ?? provider);
}
export type DemoRole = "admin" | "issuer";
const SESSION_COOKIE = "chainproof_demo";
const SESSION_SECONDS = 8 * 60 * 60;
function roleToken(role: DemoRole) {
  return role === "admin" ? process.env.DEMO_ADMIN_TOKEN : process.env.DEMO_ISSUER_TOKEN;
}
function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}
function sessionSignature(role: DemoRole, expires: number) {
  const secret = roleToken(role);
  if (!secret) throw new AccessDenied(`Set DEMO_${role.toUpperCase()}_TOKEN in .env to enable the local demo session.`);
  return crypto.createHmac("sha256", secret).update(`${role}.${expires}`).digest("base64url");
}
export function createDemoSession(role: DemoRole) {
  const expires = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  return { value: `${role}.${expires}.${sessionSignature(role, expires)}`, expires };
}
export function demoTokenMatches(role: DemoRole, candidate: unknown) {
  const expected = roleToken(role);
  return typeof candidate === "string" && Boolean(expected) && safeEqual(candidate, expected!);
}
export const demoSessionCookie = SESSION_COOKIE;
export const demoSessionMaxAge = SESSION_SECONDS;
export function demoRole(req: Request): DemoRole {
  if (process.env.NODE_ENV === "production") throw new AccessDenied("Development authentication is disabled in production.");
  const raw = req.headers.get("cookie")?.split(";").map(v => v.trim()).find(v => v.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1);
  if (!raw) throw new AccessDenied("Sign in with a local demo account first.");
  const [role, expiresText, signature] = decodeURIComponent(raw).split(".");
  if ((role !== "admin" && role !== "issuer") || !expiresText || !signature) throw new AccessDenied("Invalid local demo session.");
  const expires = Number(expiresText);
  if (!Number.isSafeInteger(expires) || expires <= Math.floor(Date.now() / 1000)) throw new AccessDenied("Local demo session expired. Sign in again.");
  if (!safeEqual(signature, sessionSignature(role, expires))) throw new AccessDenied("Invalid local demo session.");
  return role;
}
export function demoAuth(req: Request, role: DemoRole) {
  if (demoRole(req) !== role) throw new AccessDenied(`This action requires the local demo ${role} role.`);
  const key = role === "admin" ? process.env.DEMO_ADMIN_PRIVATE_KEY : process.env.DEMO_ISSUER_PRIVATE_KEY;
  if (!key) throw new AccessDenied(`Set DEMO_${role.toUpperCase()}_PRIVATE_KEY in .env for local demo transactions.`);
  return new Wallet(key, provider);
}
export class AccessDenied extends Error {}
export function safeErrorMessage(error: unknown) {
  const rawMessage = error instanceof Error ? error.message : "Request failed";
  return sanitizeErrorMessage(rawMessage, [process.env.DEMO_ADMIN_PRIVATE_KEY || "", process.env.DEMO_ISSUER_PRIVATE_KEY || "", process.env.DEMO_ADMIN_TOKEN || "", process.env.DEMO_ISSUER_TOKEN || "", process.env.RPC_URL || ""]);
}
export function jsonError(error: unknown, status = 400) {
  const message = safeErrorMessage(error);
  return Response.json({ error: message }, { status: error instanceof AccessDenied ? 403 : status });
}
export async function storePdf(bytes: Buffer) {
  const storageRef = crypto.randomUUID() + ".pdf";
  const dir = path.resolve(process.env.UPLOAD_DIR || "./private-uploads");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, storageRef), bytes, { flag: "wx", mode: 0o600 });
  return storageRef;
}
export async function removeStoredPdf(storageRef: string) {
  const dir = path.resolve(process.env.UPLOAD_DIR || "./private-uploads");
  await fs.unlink(path.join(dir, path.basename(storageRef))).catch(() => undefined);
}
export async function withChainDocumentState<T extends { id: string }>(docs: T[]) {
  const c = contract();
  return Promise.all(docs.map(async doc => {
    const record = await c.getDocument(doc.id);
    return { ...doc, onChainExists: Boolean(record.exists), revoked: Boolean(record.exists && record.revoked) };
  }));
}
export async function savePdf(file: File, persist = true) {
  const max = Number(process.env.MAX_UPLOAD_MB || 10) * 1024 * 1024;
  if (!Number.isFinite(max) || max <= 0) throw new Error("Upload size limit is not configured correctly.");
  if (file.size > max) throw new Error("PDF exceeds upload size limit.");
  const bytes = Buffer.from(await file.arrayBuffer());
  const sha256 = validatePdf(bytes, file.name, file.type, max);
  const storageRef = persist ? await storePdf(bytes) : "";
  return { bytes, sha256, storageRef };
}
