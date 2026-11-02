import nodemailer from "nodemailer";
import { prisma } from "./prisma";
import { generateQrDataUrl } from "./qr";

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
  const subject =
    customSubject?.replace("{{name}}", recipientName).replace("{{event}}", eventTitle) ||
    `E-Tiket & QR Code RSVP: ${eventTitle}`;

  const formattedDate = new Intl.DateTimeFormat("id-ID", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(eventStartsAt));

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

  const smtpHost = dbSettings?.smtpHost || process.env.SMTP_HOST;
  const smtpPort = dbSettings?.smtpPort || (process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587);
  const smtpUser = dbSettings?.smtpUser || process.env.SMTP_USER;
  const smtpPass = dbSettings?.smtpPass || process.env.SMTP_PASS;
  const smtpFrom = dbSettings?.smtpFrom || process.env.SMTP_FROM || `"EventPass RSVP" <rsvp@eventorganizer.id>`;

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
            <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; opacity: 0.85; margin-bottom: 6px;">E-Ticket Resmi Acara</div>
            <h1 style="margin: 0; font-size: 24px; font-weight: 800; line-height: 1.3;">${eventTitle}</h1>
          </div>

          <p style="font-size: 16px; margin-bottom: 12px;">Halo <strong>${recipientName}</strong>,</p>
          <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
            Pendaftaran Anda telah <strong>DISETUJUI (ACC)</strong> oleh panitia. Silakan simpan email ini atau unduh E-Tiket Anda untuk ditunjukkan di meja registrasi kedatangan.
          </p>

          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px;">
            <div style="font-size: 13px; color: #64748b; margin-bottom: 8px;">
              <strong style="color: #334155;">🗓 Waktu Acara:</strong> ${formattedDate}
            </div>
            <div style="font-size: 13px; color: #64748b;">
              <strong style="color: #334155;">📍 Lokasi / Venue:</strong> ${eventLocation || "Akan diinfokan panitia"}
            </div>
          </div>

          <div style="text-align: center; padding: 20px; background-color: #f1f5f9; border-radius: 16px; margin-bottom: 24px;">
            <img src="cid:qrcode_ticket" alt="QR Code Ticket" style="width: 220px; height: 220px; border: 4px solid #4f46e5; border-radius: 12px; padding: 8px; background: #ffffff; display: block; margin: 0 auto;" />
            <div style="font-family: monospace; font-size: 12px; font-weight: 700; color: #475569; margin-top: 12px; letter-spacing: 1px;">
              TOKEN: ${qrToken}
            </div>
            <p style="font-size: 12px; color: #94a3b8; margin-top: 4px; margin-bottom: 16px;">
              Pindai QR Code di atas saat tiba di lokasi pintu masuk acara
            </p>
            <a href="${ticketUrl}" style="background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 700; font-size: 13px; display: inline-block;">
              Buka & Cetak E-Ticket Digital
            </a>
          </div>

          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0; line-height: 1.5;">
            Email ini dikirim secara otomatis oleh Sistem Registrasi EventPass.<br />
            Jika Anda memiliki pertanyaan seputar acara, silakan hubungi panitia penyelenggara.
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
            filename: `ticket-${qrToken.slice(0, 8)}.png`,
            content: qrBuffer,
            cid: "qrcode_ticket", // Same CID as referenced in the html img src
          },
        ],
      });

      console.log(`[REAL EMAIL DELIVERED] To: ${recipientEmail} | Subject: ${subject}`);
    } else {
      console.log(`[SIMULATED EMAIL LOGGED] To: ${recipientEmail} | Subject: ${subject}`);
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
    await prisma.emailLog.update({
      where: { id: log.id },
      data: {
        status: "FAILED",
        error: error?.message || "Unknown error sending email",
      },
    });
    return {
      success: false,
      logId: log.id,
      error: error?.message,
      isRealEmail: false,
      recipientEmail,
    };
  }
}
