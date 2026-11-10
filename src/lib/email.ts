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

function formatParagraphsHtml(text: string): string {
  return text
    .trim()
    .split(/\n\s*\n/)
    .filter(Boolean)
    .map(
      (paragraph) =>
        `<p style="color: #1e293b; font-size: 14px; line-height: 1.7; margin: 0 0 16px 0;">${escapeHtml(
          paragraph.trim()
        ).replace(/\n/g, "<br />")}</p>`
    )
    .join("");
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
  const formattedDate = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
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

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://yorindoregistration.id";
  const ticketUrl = `${appUrl}/ticket/${qrToken}`;

  const qrBlockHtml = `
    <div style="margin: 24px 0; padding: 24px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; text-align: center;">
      <img src="cid:qrcode_ticket" alt="Personal QR Code" style="width: 200px; height: 200px; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; background: #ffffff; display: block; margin: 0 auto;" />
      <div style="font-family: monospace; font-size: 12px; color: #475569; margin-top: 10px; letter-spacing: 0.5px;">
        ID: ${escapeHtml(qrToken)}
      </div>
      <div style="margin-top: 14px;">
        <a href="${ticketUrl}" style="background-color: #17449A; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: 600; font-size: 13px; display: inline-block;">
          Open / Download Digital QR Pass
        </a>
      </div>
    </div>
  `;

  let mainContentHtml = "";
  const qrPlaceholderRegex = /\[ATTENDEE QR CODE\]|\{\{\s*qr_code\s*\}\}/i;

  if (qrPlaceholderRegex.test(resolvedBodyText)) {
    const parts = resolvedBodyText.split(qrPlaceholderRegex);
    const beforeQr = parts[0] || "";
    const afterQr = parts.slice(1).join("\n\n") || "";
    mainContentHtml = `
      ${formatParagraphsHtml(beforeQr)}
      ${qrBlockHtml}
      ${formatParagraphsHtml(afterQr)}
    `;
  } else {
    mainContentHtml = `
      ${formatParagraphsHtml(resolvedBodyText)}
      ${qrBlockHtml}
    `;
  }

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
  const smtpPass = (
    dbSettings?.smtpPass ||
    process.env.SMTP_PASS ||
    ""
  ).replace(/\s+/g, "");
  const smtpFrom =
    dbSettings?.smtpFrom ||
    process.env.SMTP_FROM ||
    `"BSSN CORE 3 - Yorindo Communication" <${smtpUser || "rsvp@yorindoregistration.id"}>`;

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
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      const htmlContent = `
        <div style="font-family: Arial, 'Segoe UI', Helvetica, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-top: 4px solid #17449A; border-radius: 8px; padding: 32px 28px; color: #1e293b;">
          ${mainContentHtml}
        </div>
      `;

      await transporter.sendMail({
        from: smtpFrom,
        to: recipientEmail,
        subject,
        html: htmlContent,
        attachments: [
          {
            filename: `QR-Code-${qrToken.slice(0, 8)}.png`,
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
