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
    id: "formal",
    name: "Resmi & Profesional",
    badge: "Default • Rekomendasi",
    description: "Cocok untuk seminar, konferensi, acara kantor, atau instansi resmi.",
    subject: "[E-Tiket Resmi] Konfirmasi Kehadiran {{event}} - {{name}}",
    body: `Halo {{name}},

Terima kasih telah melakukan pendaftaran pada acara {{event}}. Kami dengan senang hati mengonfirmasi bahwa pendaftaran Anda telah DISETUJUI (ACC) oleh panitia.

Berikut adalah E-Tiket resmi beserta QR Code khusus untuk Anda. Mohon simpan email ini dan tunjukkan QR Code di bawah kepada petugas meja registrasi saat kedatangan di lokasi acara.

Sampai jumpa di lokasi acara!`,
  },
  {
    id: "friendly",
    name: "Ramah & Antusias",
    badge: "Komunitas / Workshop",
    description: "Bahasa hangat dan santai untuk gathering, workshop, atau acara kreatif.",
    subject: "Tiket Kamu Sudah Siap! Sampai Jumpa di {{event}}",
    body: `Hai {{name}}!

Kabar gembira! Pendaftaran kamu untuk mengikuti {{event}} sudah resmi dikonfirmasi oleh tim panitia.

Di bawah ini adalah QR Code E-Tiket resmi kamu. Jangan lupa disimpan di HP ya, nanti tinggal scan cepat waktu check-in di pintu masuk acara (sekaligus otomatis masuk daftar undian Doorprize!).

Sampai ketemu di hari-H!`,
  },
  {
    id: "vip",
    name: "Undangan Eksklusif / VIP",
    badge: "Tamu Kehormatan",
    description: "Bahasa sopan dan eksklusif untuk tamu undangan khusus atau VIP.",
    subject: "[VIP ACCESS] E-Tiket Kehormatan {{event}} - {{name}}",
    body: `Yth. Bapak/Ibu {{name}},

Merupakan suatu kehormatan bagi kami untuk menyambut kehadiran Anda dalam acara {{event}}. Status registrasi Anda telah terverifikasi sebagai tamu undangan resmi.

Silakan gunakan QR Code E-Tiket terlampir untuk akses cepat pada meja penerimaan tamu saat hari pelaksanaan acara.

Hormat kami,
Panitia Penyelenggara {{event}}`,
  },
  {
    id: "reminder",
    name: "Pengingat Hari-H (Reminder)",
    badge: "H-1 / Hari Acara",
    description: "Untuk dikirim ulang menjelang acara agar peserta siap menunjukkan QR Code.",
    subject: "[Pengingat Acara] E-Tiket & QR Code Check-In {{event}} - {{name}}",
    body: `Halo {{name}},

Sekadar mengingatkan bahwa acara {{event}} akan segera berlangsung pada {{date}} di {{location}}. Kami mengirimkan kembali E-Tiket dan QR Code Anda agar mudah diakses saat tiba di lokasi.

Mohon hadir 15-30 menit sebelum acara dimulai dan siapkan QR Code di bawah ini pada layar smartphone Anda untuk proses scan check-in yang cepat.`,
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
    .replace(/\{\{\s*event\s*\}\}/gi, vars.event)
    .replace(/\{\{\s*location\s*\}\}/gi, vars.location || "Lokasi sesuai undangan")
    .replace(/\{\{\s*date\s*\}\}/gi, vars.date || "Sesuai jadwal acara");
}

