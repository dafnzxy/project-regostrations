export interface EmailTemplatePreset {
  id: string;
  name: string;
  badge: string;
  description: string;
  subject: string;
  body: string;
}

export const EMAIL_TEMPLATE_PRESETS: EmailTemplatePreset[] = [
  {
    id: "bssn_formal",
    name: "BSSN CORE 3 – Formal (English)",
    badge: "Default • Resmi",
    description: "Template resmi BSSN CORE 3 dengan susunan surat formal yang bersih dan rapi.",
    subject: "Registration Confirmation: BSSN CORE 3 – CSIRT Operation Readiness for Economics 2026 - [Participant Name]",
    body: `Dear Mr./Ms. [Participant Name],

Greetings from BSSN CORE 3 – CSIRT Operation Readiness for Economics 2026.

Thank you for registering. We are pleased to confirm that your registration for BSSN CORE 3 has been successfully confirmed.

Please find your event details below:
Event: BSSN CORE 3 – CSIRT Operation Readiness for Economics
Date: Thursday, 12 November 2026
Time: 08.00 - 17.00
Venue: Aston Kartika Grogol Hotel, Jakarta
Category: Participant
Registration will be open at 08:00

Your Personal QR Code
Please find your personal QR Code below. Kindly save this email or take a screenshot of your QR Code and present it to our registration team upon arrival for a smooth and convenient check-in process.

[ATTENDEE QR CODE]

We look forward to welcoming you to BSSN CORE 3.

If you have any further questions, please contact us at:
Selvie: +62 898-7660-733

Best regards,
BSSN CORE 3 – 2026
Organized by Yorindo Communication
Event Organizer | Marketing Agency
www.yorindocommunication.com`,
  },
  {
    id: "formal_general",
    name: "Formal Corporate (Dinamis)",
    badge: "Semua Event",
    description: "Format surat konfirmasi formal berbahasa Inggris yang otomatis mengikuti nama & lokasi event.",
    subject: "Registration Confirmation: {{event}} - [Participant Name]",
    body: `Dear Mr./Ms. [Participant Name],

Greetings from {{event}}.

Thank you for registering. We are pleased to confirm that your registration for {{event}} has been successfully confirmed.

Please find your event details below:
Event: {{event}}
Date: {{date}}
Venue: {{location}}
Category: Participant

Your Personal QR Code
Please find your personal QR Code below. Kindly save this email or take a screenshot of your QR Code and present it to our registration team upon arrival for a smooth and convenient check-in process.

[ATTENDEE QR CODE]

We look forward to welcoming you to {{event}}.

Best regards,
Organized by Yorindo Communication
Event Organizer | Marketing Agency
www.yorindocommunication.com`,
  },
  {
    id: "formal_id",
    name: "Resmi Bahasa Indonesia",
    badge: "Formal ID",
    description: "Format surat konfirmasi resmi dalam Bahasa Indonesia yang bersih tanpa elemen berlebihan.",
    subject: "Konfirmasi Registrasi & QR Code: {{event}} - [Participant Name]",
    body: `Yth. Bapak/Ibu [Participant Name],

Terima kasih telah melakukan pendaftaran pada acara {{event}}. Kami mengonfirmasi bahwa registrasi Anda telah berhasil diverifikasi dan disetujui.

Berikut adalah rincian pelaksanaan acara:
Acara  : {{event}}
Waktu  : {{date}}
Lokasi : {{location}}
Kategori: Peserta

QR Code Personal Anda
Silakan simpan email ini atau tangkap layar (screenshot) QR Code di bawah ini dan tunjukkan kepada tim registrasi kami saat tiba di lokasi acara untuk proses check-in.

[ATTENDEE QR CODE]

Kami menantikan kehadiran Anda.

Hormat kami,
Organized by Yorindo Communication
Event Organizer | Marketing Agency
www.yorindocommunication.com`,
  },
];

export function resolveEmailTemplateVars(
  templateText: string,
  vars: {
    name: string;
    event: string;
    location?: string | null;
    date?: string;
  }
): string {
  return templateText
    .replace(/\{\{\s*name\s*\}\}/gi, vars.name)
    .replace(/\[\s*Participant Name\s*\]/gi, vars.name)
    .replace(/\{\{\s*event\s*\}\}/gi, vars.event)
    .replace(/\{\{\s*location\s*\}\}/gi, vars.location || "Aston Kartika Grogol Hotel, Jakarta")
    .replace(/\{\{\s*date\s*\}\}/gi, vars.date || "Thursday, 12 November 2026");
}
