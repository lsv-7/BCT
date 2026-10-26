import { AccessDenied, createDemoSession, demoRole, demoSessionCookie, demoSessionMaxAge, demoTokenMatches, jsonError } from "@/lib/server";
export const runtime = "nodejs";
function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try { return new URL(origin).host === req.headers.get("host"); } catch { return false; }
}
export async function GET(req: Request) {
  try { return Response.json({ role: demoRole(req) }); }
  catch { return Response.json({ role: null }, { status: 401 }); }
}
export async function POST(req: Request) {
  try {
    if (!sameOrigin(req)) throw new AccessDenied("Cross-origin sign-in is not allowed.");
    if (process.env.NODE_ENV === "production") throw new AccessDenied("Local demo sign-in is disabled in production.");
    const body = await req.json();
    const role = body.role;
    if ((role !== "admin" && role !== "issuer") || !demoTokenMatches(role, body.token)) throw new AccessDenied("Invalid demo role or token.");
    const session = createDemoSession(role);
    const secure = new URL(req.url).protocol === "https:" ? "; Secure" : "";
    return Response.json({ role, expiresAt: session.expires }, { headers: { "Set-Cookie": `${demoSessionCookie}=${encodeURIComponent(session.value)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${demoSessionMaxAge}${secure}` } });
  } catch (e) { return jsonError(e, 401); }
}
export async function DELETE(req: Request) {
  if (!sameOrigin(req)) return jsonError(new AccessDenied("Cross-origin sign-out is not allowed."), 403);
  const secure = new URL(req.url).protocol === "https:" ? "; Secure" : "";
  return Response.json({ signedOut: true }, { headers: { "Set-Cookie": `${demoSessionCookie}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}` } });
}
