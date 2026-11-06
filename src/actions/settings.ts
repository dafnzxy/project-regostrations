"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import nodemailer from "nodemailer";
import { requireAdminAuth } from "./auth";

export async function getSystemSettings() {
  await requireAdminAuth();

  let settings = await prisma.systemSetting.findUnique({
    where: { id: "default" },
  });

  if (!settings) {
    settings = await prisma.systemSetting.create({
      data: {
        id: "default",
        smtpHost: process.env.SMTP_HOST || "",
        smtpPort: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587,
        smtpUser: process.env.SMTP_USER || "",
        smtpPass: process.env.SMTP_PASS || "",
        smtpFrom: process.env.SMTP_FROM || "YORINDO registration <rsvp@yorindo.id>",
        adminPin: "123456",
      },
    });
  }

  return settings;
}

export async function updateSystemSettings(data: {
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  smtpFrom?: string;
  adminPin?: string;
}) {
  await requireAdminAuth();

  const normalizedHost = data.smtpHost?.includes("@gmail.com")
    ? "smtp.gmail.com"
    : data.smtpHost?.trim();
  const normalizedPass = data.smtpPass?.replace(/\s+/g, "");

  const updated = await prisma.systemSetting.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      smtpHost: normalizedHost,
      smtpPort: data.smtpPort ? Number(data.smtpPort) : 587,
      smtpUser: data.smtpUser?.trim(),
      smtpPass: normalizedPass,
      smtpFrom: data.smtpFrom,
      adminPin: data.adminPin || "123456",
    },
    update: {
      smtpHost: normalizedHost,
      smtpPort: data.smtpPort ? Number(data.smtpPort) : 587,
      smtpUser: data.smtpUser?.trim(),
      smtpPass: normalizedPass,
      smtpFrom: data.smtpFrom,
      adminPin: data.adminPin,
    },
  });

  revalidatePath("/dashboard/settings");
  return updated;
}

export async function testSmtpConnection(recipientEmail: string) {
  await requireAdminAuth();

  const settings = await getSystemSettings();

  const host = settings.smtpHost || process.env.SMTP_HOST;
  const port = settings.smtpPort || (process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587);
  const user = settings.smtpUser || process.env.SMTP_USER;
  const pass = settings.smtpPass || process.env.SMTP_PASS;
  const from = settings.smtpFrom || process.env.SMTP_FROM || `"YORINDO registration" <rsvp@yorindo.id>`;

  if (!host || !user || !pass) {
    return {
      success: false,
      message:
        "Pengaturan SMTP belum lengkap. Silakan isi Host, Port, User/Email, dan Password SMTP terlebih dahulu.",
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });

    // Verify connection configuration
    await transporter.verify();

    // Send actual test email
    await transporter.sendMail({
      from,
      to: recipientEmail,
      subject: "Uji Coba Pengiriman Email YORINDO registration",
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #17449A; margin-top: 0;">YORINDO <span style="color: #000000;">registration</span> — Pengaturan Email Berhasil!</h2>
          <p style="color: #334155; line-height: 1.5;">
            Halo! Ini adalah email uji coba dari sistem <strong>YORINDO registration</strong>. Jika email ini masuk ke kotak masuk Anda, berarti konfigurasi SMTP telah aktif dan siap mengirimkan E-Ticket QR Code kepada seluruh peserta acara secara otomatis.
          </p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 12px; color: #94a3b8; margin: 0;">Dikirim oleh YORINDO registration System.</p>
        </div>
      `,
    });

    return {
      success: true,
      message: `Email uji coba berhasil dikirim ke ${recipientEmail}! Silakan cek kotak masuk (atau folder spam).`,
    };
  } catch (error: any) {
    console.error("Test SMTP error:", error);
    const rawMsg = error?.message || "Koneksi SMTP ditolak";
    const friendlyMsg =
      rawMsg.includes("535") || rawMsg.includes("BadCredentials")
        ? "Gmail menolak password login biasa (Error 535). Anda wajib membuat 16-huruf 'Sandi Aplikasi (App Password)' di myaccount.google.com/apppasswords lalu menempelkannya ke kolom Kata Sandi SMTP."
        : rawMsg;

    return {
      success: false,
      message: `Gagal mengirim email: ${friendlyMsg}`,
    };
  }
}
