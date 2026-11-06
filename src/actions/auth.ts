"use server";

import crypto from "crypto";
import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import {
  AUTH_COOKIE,
  createAdminSessionToken,
  verifyAdminSessionToken,
} from "@/lib/auth-token";

// In-memory brute-force protection per IP
const loginAttempts = new Map<
  string,
  { count: number; lockedUntil: number }
>();

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 5 * 60 * 1000; // 5 minutes

function safeCompareStrings(a: string, b: string): boolean {
  if (!a || !b) return false;
  const bufA = Buffer.from(a, "utf-8");
  const bufB = Buffer.from(b, "utf-8");
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

export async function loginAdmin(passcode: string) {
  const headerStore = await headers();
  const clientIp =
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headerStore.get("x-real-ip") ||
    "local-client";

  const now = Date.now();
  const record = loginAttempts.get(clientIp);

  if (record && record.lockedUntil > now) {
    const remainingSec = Math.ceil((record.lockedUntil - now) / 1000);
    return {
      success: false,
      message: `Terlalu banyak percobaan salah. Akses dikunci sementara, silakan coba lagi dalam ${remainingSec} detik.`,
    };
  }

  const trimmed = passcode.trim();

  // Check against SystemSetting PIN in database or ENV overrides
  const settings = await prisma.systemSetting.findUnique({
    where: { id: "default" },
  });

  const dbPin = (settings?.adminPin || "").trim();
  const envPin = (process.env.ADMIN_PIN || "123456").trim();
  const envSuperPass = (process.env.SUPER_ADMIN_PASSWORD || "").trim();

  const isMatchDb = dbPin ? safeCompareStrings(trimmed, dbPin) : false;
  const isMatchEnv = safeCompareStrings(trimmed, envPin);
  const isMatchSuper = envSuperPass ? safeCompareStrings(trimmed, envSuperPass) : false;

  const isValid = isMatchDb || isMatchEnv || isMatchSuper;

  if (!isValid) {
    const currentCount = (record?.count || 0) + 1;
    if (currentCount >= MAX_ATTEMPTS) {
      loginAttempts.set(clientIp, {
        count: currentCount,
        lockedUntil: now + LOCKOUT_MS,
      });
      return {
        success: false,
        message:
          "Terlalu banyak percobaan PIN salah! Sistem dikunci selama 5 menit demi keamanan.",
      };
    } else {
      loginAttempts.set(clientIp, {
        count: currentCount,
        lockedUntil: 0,
      });
      return {
        success: false,
        message: `Kode PIN Admin salah. Sisa percobaan: ${
          MAX_ATTEMPTS - currentCount
        }x.`,
      };
    }
  }

  // Reset failed attempts on success
  loginAttempts.delete(clientIp);

  // Create cryptographically signed session token
  const token = createAdminSessionToken();

  // Set secure HTTP-only cookie
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });

  return { success: true };
}

export async function logoutAdmin() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE);
  redirect("/dashboard/login");
}

export async function checkAdminAuth(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get(AUTH_COOKIE);
  return verifyAdminSessionToken(session?.value);
}

export async function requireAdminAuth(): Promise<void> {
  const isAuthorized = await checkAdminAuth();
  if (!isAuthorized) {
    throw new Error("Akses ditolak: Anda harus login sebagai Admin terlebih dahulu.");
  }
}
