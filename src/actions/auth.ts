"use server";

import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

const AUTH_COOKIE = "eventpass_admin_auth";

export async function loginAdmin(passcode: string) {
  const trimmed = passcode.trim();

  // 1. Check against SystemSetting PIN
  const settings = await prisma.systemSetting.findUnique({
    where: { id: "default" },
  });

  const validPin = settings?.adminPin || "123456";

  // 2. Also check if matches default admin password
  const isValid =
    trimmed === validPin ||
    trimmed === "admin123" ||
    trimmed === "123456";

  if (!isValid) {
    return { success: false, message: "Kode PIN / Kata sandi admin salah." };
  }

  // Set secure cookie
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE, "authenticated", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
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
  return session?.value === "authenticated";
}
