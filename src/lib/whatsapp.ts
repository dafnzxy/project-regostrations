import {
  EMAIL_TEMPLATE_PRESETS,
  resolveEmailTemplateVars,
} from "./email-templates";

const DEFAULT_FONNTE_TOKEN = "Cz5WgMv1dBpMwZQsVoWD";

interface SendWhatsAppParams {
  recipientPhone: string;
  recipientName: string;
  eventTitle: string;
  eventLocation?: string | null;
  eventStartsAt: Date;
  qrToken: string;
  customBody?: string | null;
}

export async function sendWhatsAppTicketViaFonnte({
  recipientPhone,
  recipientName,
  eventTitle,
  eventLocation,
  eventStartsAt,
  qrToken,
  customBody,
}: SendWhatsAppParams): Promise<{
  success: boolean;
  detail?: string;
  error?: string;
}> {
  const token = process.env.FONNTE_TOKEN || DEFAULT_FONNTE_TOKEN;

  const cleanPhone = (recipientPhone || "").replace(/[^0-9]/g, "");
  if (!cleanPhone) {
    return {
      success: false,
      error: "Nomor WhatsApp peserta kosong atau tidak valid.",
    };
  }

  const formattedDate = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(new Date(eventStartsAt));

  const defaultPreset = EMAIL_TEMPLATE_PRESETS[0];
  const bodyTemplate = customBody?.trim() || defaultPreset.body;

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://yorindoregistration.id";
  const ticketUrl = `${appUrl}/ticket/${qrToken}`;

  const resolvedText = resolveEmailTemplateVars(bodyTemplate, {
    name: recipientName,
    event: eventTitle,
    location: eventLocation,
    date: formattedDate,
  });

  const qrPlaceholderRegex = /\[ATTENDEE QR CODE\]|\{\{\s*qr_code\s*\}\}/gi;
  const qrReplacementText = `🔗 *Personal QR Code Link:*\n${ticketUrl}\n*(Klik link di atas untuk membuka & menyimpan QR Code Check-In Anda)*`;

  const finalMessage = qrPlaceholderRegex.test(resolvedText)
    ? resolvedText.replace(qrPlaceholderRegex, qrReplacementText)
    : `${resolvedText}\n\n${qrReplacementText}`;

  try {
    const formData = new URLSearchParams();
    formData.append("target", cleanPhone);
    formData.append("message", finalMessage);
    formData.append("countryCode", "62");

    const response = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: {
        Authorization: token,
      },
      body: formData,
    });

    const data = await response.json();

    if (data && data.status === true) {
      return {
        success: true,
        detail: Array.isArray(data.detail)
          ? data.detail.join(", ")
          : data.detail || "Pesan WhatsApp berhasil dikirim.",
      };
    } else {
      const reason =
        data?.reason ||
        data?.detail ||
        "Gagal mengirim WA. Pastikan Device di Fonnte sudah berstatus Connect (Scan QR).";
      return {
        success: false,
        error: String(reason),
      };
    }
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Gagal menghubungi server Fonnte.",
    };
  }
}

