import nodemailer from "nodemailer";
import { prisma } from "./prisma";
import { generateQrDataUrl } from "./qr";
import {
  EMAIL_TEMPLATE_PRESETS,
  resolveEmailTemplateVars,
} from "./email-templates";

interface SendRsvpEmailParams {
  registrationId: string;
  recipientEmail: string;
  recipientName: string;
  eventTitle: string;
  eventLocation?: string | null;
  eventStartsAt: Date;
  qrToken: string;
  customSubject?: string | null;
  customBody?: string | null;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendRsvpEmail({
  registrationId,
  recipientEmail,
  recipientName,
  eventTitle,
  eventLocation,
  eventStartsAt,
  qrToken,
  customSubject,
  customBody,
}: SendRsvpEmailParams) {
  const formattedDate = new Intl.DateTimeFormat("id-ID", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(eventStartsAt));

  const defaultPreset = EMAIL_TEMPLATE_PRESETS[0];

  const subjectTemplate = customSubject?.trim() || defaultPreset.subject;
  const bodyTemplate = customBody?.trim() || defaultPreset.body;

  const subject = resolveEmailTemplateVars(subjectTemplate, {
    name: recipientName,
    event: eventTitle,
    location: eventLocation,
    date: formattedDate,
  });

  const resolvedBodyText = resolveEmailTemplateVars(bodyTemplate, {
    name: recipientName,
    event: eventTitle,
    location: eventLocation,
    date: formattedDate,
  });

  const bodyParagraphsHtml = resolvedBodyText
    .split(/\n\s*\n/)
    .map(
      (paragraph) =>
        `<p style="color: #334155; font-size: 14px; line-height: 1.65; margin: 0 0 14px 0;">${escapeHtml(
          paragraph.trim()
        ).replace(/\n/g, "<br />")}</p>`
    )
    .join("");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const ticketUrl = `${appUrl}/ticket/${qrToken}`;

  // Create an EmailLog entry with status QUEUED
  const log = await prisma.emailLog.create({
    data: {
      registrationId,
      recipient: recipientEmail,
      subject,
      status: "QUEUED",
    },
  });

  // Query database settings first, then fallback to environment variables
  const dbSettings = await prisma.systemSetting.findUnique({
    where: { id: "default" },
  });

  const rawHost = dbSettings?.smtpHost || process.env.SMTP_HOST || "";
  const smtpHost = rawHost.includes("@gmail.com")
    ? "smtp.gmail.com"
    : rawHost.trim();
  const smtpPort =
    dbSettings?.smtpPort ||
    (process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587);
  const smtpUser = (dbSettings?.smtpUser || process.env.SMTP_USER || "").trim();
  const smtpPass = (dbSettings?.smtpPass || process.env.SMTP_PASS || "").replace(/\s+/g, "");
  const smtpFrom =
    dbSettings?.smtpFrom ||
    process.env.SMTP_FROM ||
    `"YORINDO registration" <${smtpUser || "rsvp@yorindo.id"}>`;

  try {
    // Generate QR code data URL
    const qrDataUrl = await generateQrDataUrl(qrToken);
    const qrBase64Data = qrDataUrl.replace(/^data:image\/png;base64,/, "");
    const qrBuffer = Buffer.from(qrBase64Data, "base64");

    const isRealSmtp = Boolean(smtpHost && smtpUser && smtpPass);

    if (isRealSmtp) {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465, // SSL for 465, TLS for 587
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      const htmlContent = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b;">
          <div style="background: linear-gradient(135deg, #4f46e5, #7c3aed); padding: 28px 24px; border-radius: 12px; color: #ffffff; text-align: center; margin-bottom: 24px;">
            <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; opacity: 0.9; margin-bottom: 6px;">E-Ticket Resmi Acara</div>
            <h1 style="margin: 0; font-size: 22px; font-weight: 800; line-height: 1.3;">${escapeHtml(
              eventTitle
            )}</h1>
          </div>

          <div style="margin-bottom: 20px;">
            ${bodyParagraphsHtml}
          </div>

          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px;">
            <div style="font-size: 13px; color: #64748b; margin-bottom: 8px;">
              <strong style="color: #334155;">👤 Nama Peserta:</strong> ${escapeHtml(
                recipientName
              )}
            </div>
            <div style="font-size: 13px; color: #64748b; margin-bottom: 8px;">
              <strong style="color: #334155;">🗓 Waktu Acara:</strong> ${escapeHtml(
                formattedDate
              )}
            </div>
            <div style="font-size: 13px; color: #64748b;">
              <strong style="color: #334155;">📍 Lokasi / Venue:</strong> ${escapeHtml(
                eventLocation || "Akan diinfokan panitia"
              )}
            </div>
          </div>

          <div style="text-align: center; padding: 24px 20px; background-color: #f1f5f9; border-radius: 16px; margin-bottom: 24px; border: 1px dashed #cbd5e1;">
            <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #4f46e5; margin-bottom: 12px;">
              Tiket Akses Check-In QR Code
            </div>
            <img src="cid:qrcode_ticket" alt="QR Code Ticket" style="width: 220px; height: 220px; border: 4px solid #4f46e5; border-radius: 12px; padding: 8px; background: #ffffff; display: block; margin: 0 auto;" />
            <div style="font-family: monospace; font-size: 12px; font-weight: 700; color: #334155; margin-top: 12px; letter-spacing: 1px;">
              TOKEN: ${escapeHtml(qrToken)}
            </div>
            <p style="font-size: 12px; color: #64748b; margin-top: 4px; margin-bottom: 16px;">
              Tunjukkan QR Code di atas kepada petugas saat tiba di lokasi acara
            </p>
            <a href="${ticketUrl}" style="background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 700; font-size: 13px; display: inline-block;">
              Buka & Unduh E-Ticket Digital
            </a>
          </div>

          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0; line-height: 1.5;">
            Email ini dikirim secara otomatis oleh Sistem <strong style="color: #17449A;">YORINDO</strong> <strong style="color: #000000;">registration</strong>.<br />
            Simpan tiket ini dan jangan bagikan kode QR Anda kepada orang lain.
          </p>
        </div>
      `;

      await transporter.sendMail({
        from: smtpFrom,
        to: recipientEmail,
        subject,
        html: htmlContent,
        attachments: [
          {
            filename: `E-Ticket-${qrToken.slice(0, 8)}.png`,
            content: qrBuffer,
            cid: "qrcode_ticket",
          },
        ],
      });

      console.log(
        `[REAL EMAIL DELIVERED] To: ${recipientEmail} | Subject: ${subject}`
      );
    } else {
      console.log(
        `[SIMULATED EMAIL LOGGED] To: ${recipientEmail} | Subject: ${subject}`
      );
      console.log(`[SIMULATED EMAIL LOGGED] Ticket URL: ${ticketUrl}`);
    }

    // Update log status to SENT
    await prisma.emailLog.update({
      where: { id: log.id },
      data: {
        status: "SENT",
        sentAt: new Date(),
      },
    });

    return {
      success: true,
      logId: log.id,
      ticketUrl,
      isRealEmail: isRealSmtp,
      recipientEmail,
    };
  } catch (error: any) {
    console.error("Email send error:", error);
    const rawMsg = error?.message || "Unknown error sending email";
    const friendlyError =
      rawMsg.includes("535") || rawMsg.includes("BadCredentials")
        ? "Gmail menolak password login biasa (Error 535). Harap gunakan 16-digit 'App Password' Google di menu Pengaturan Email & PIN."
        : rawMsg;

    await prisma.emailLog.update({
      where: { id: log.id },
      data: {
        status: "FAILED",
        error: friendlyError,
      },
    });
    return {
      success: false,
      logId: log.id,
      error: friendlyError,
      isRealEmail: false,
      recipientEmail,
    };
  }
}
