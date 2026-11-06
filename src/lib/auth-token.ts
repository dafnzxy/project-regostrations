import crypto from "crypto";

export const AUTH_COOKIE = "eventpass_admin_auth";

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function getSecretKey(): string {
  return (
    process.env.AUTH_SECRET ||
    process.env.DATABASE_URL ||
    "eventpass-secure-admin-secret-2026"
  );
}

export function createAdminSessionToken(): string {
  const exp = Date.now() + SESSION_DURATION_MS;
  const nonce = crypto.randomBytes(16).toString("hex");
  const payload = Buffer.from(
    JSON.stringify({ role: "admin", exp, nonce })
  ).toString("base64url");

  const signature = crypto
    .createHmac("sha256", getSecretKey())
    .update(payload)
    .digest("base64url");

  return `${payload}.${signature}`;
}

export function verifyAdminSessionToken(token?: string | null): boolean {
  if (!token || !token.includes(".")) {
    return false;
  }

  const parts = token.split(".");
  if (parts.length !== 2) {
    return false;
  }

  const [payload, signature] = parts;
  const expectedSignature = crypto
    .createHmac("sha256", getSecretKey())
    .update(payload)
    .digest("base64url");

  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    sigBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(sigBuffer, expectedBuffer)
  ) {
    return false;
  }

  try {
    const decoded = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf-8")
    );
    if (decoded.role !== "admin" || typeof decoded.exp !== "number") {
      return false;
    }
    if (Date.now() > decoded.exp) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

