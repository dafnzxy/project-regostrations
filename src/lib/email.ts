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

function formatNaturalGmailHtml(text: string): string {
  return text
    .trim()
    .split(/\n\s*\n/)
    .filter(Boolean)
    .map(
      (paragraph) =>
        `<div style="margin-bottom: 14px; line-height: 1.6; color: #222222; font-size: 14px;">${escapeHtml(
          paragraph.trim()
        ).replace(/\n/g, "<br>")}</div>`
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

  // Clean inline QR block without external links (avoids Newly Registered Domain spam penalty)
  const qrBlockHtml = `
    <div style="margin: 20px 0;">
      <img src="cid:qrcode_ticket" alt="Personal QR Code" width="220" height="220" style="width: 220px; height: 220px; display: block; border: 1px solid #e5e7eb; padding: 8px; border-radius: 8px; background-color: #ffffff;" />
      <div style="font-size: 12px; color: #555555; margin-top: 6px;">
        Registration ID: ${escapeHtml(qrToken)}
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
      ${formatNaturalGmailHtml(beforeQr)}
      ${qrBlockHtml}
      ${formatNaturalGmailHtml(afterQr)}
    `;
  } else {
    mainContentHtml = `
      ${formatNaturalGmailHtml(resolvedBodyText)}
      ${qrBlockHtml}
    `;
  }

  // Plain-text version without external newly-registered domain URLs
  const plainTextContent = resolvedBodyText.replace(
    qrPlaceholderRegex,
    `[Personal QR Code Image Attached - Registration ID: ${qrToken}]`
  );

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

  try {
    // Generate QR code data URL
    const qrDataUrl = await generateQrDataUrl(qrToken);
    const qrBase64Data = qrDataUrl.replace(/^data:image\/png;base64,/, "");
    const qrBuffer = Buffer.from(qrBase64Data, "base64");

    const isRealSmtp = Boolean(smtpHost && smtpUser && smtpPass);

    if (isRealSmtp) {
      const transporter = nodemailer.createTransport({
        name: "yorindoregistration.id",
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      // Native Gmail-style <div dir="ltr"> wrapper (avoids promotional/marketing HTML table triggers)
      const htmlContent = `<div dir="ltr" style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #222222; max-width: 600px;">${mainContentHtml}</div>`;

      await transporter.sendMail({
        from: {
          name: "Yorindo Communication",
          address: smtpUser,
        },
        replyTo: smtpUser,
        to: {
          name: recipientName,
          address: recipientEmail,
        },
        subject,
        text: plainTextContent,
        html: htmlContent,
        attachments: [
          {
            filename: `QR-Code-${qrToken.slice(0, 8)}.png`,
            content: qrBuffer,
            contentType: "image/png",
            contentDisposition: "inline",
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
