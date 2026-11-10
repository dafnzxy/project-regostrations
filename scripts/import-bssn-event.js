const fs = require('fs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Parse CSV with quotes and multiline support
function parseCSV(text) {
  const rows = [];
  let currentRow = [];
  let currentField = '';
  let insideQuotes = false;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];
    
    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentField);
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentField);
      rows.push(currentRow);
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }
  return rows.filter(r => r.length > 1);
}

// Convert "29/10/2026 9:17:10" to Date object
function parseTimestamp(ts) {
  if (!ts) return new Date();
  try {
    const [datePart, timePart] = ts.trim().split(' ');
    if (!datePart) return new Date();
    const [d, m, y] = datePart.split('/');
    if (!d || !m || !y) return new Date();
    
    let hours = 0, minutes = 0, seconds = 0;
    if (timePart) {
      const parts = timePart.split(':');
      hours = parseInt(parts[0], 10) || 0;
      minutes = parseInt(parts[1], 10) || 0;
      seconds = parseInt(parts[2], 10) || 0;
    }
    // Jakarta is UTC+7 -> subtract 7 hours for UTC
    const date = new Date(Date.UTC(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10), hours - 7, minutes, seconds));
    return isNaN(date.getTime()) ? new Date() : date;
  } catch {
    return new Date();
  }
}

// Standardize phone number
function cleanPhone(raw) {
  if (!raw) return null;
  let p = raw.trim().replace(/[^0-9+]/g, '');
  if (p.startsWith('+62')) {
    p = '0' + p.slice(3);
  } else if (p.startsWith('62')) {
    p = '0' + p.slice(2);
  }
  return p || null;
}

const formSchema = [
  {
    id: "nama_perusahaan",
    label: "Nama Perusahaan / Institusi",
    type: "text",
    placeholder: "Contoh: PT Bank Central Asia Tbk",
    required: true
  },
  {
    id: "jabatan",
    label: "Jabatan / Role",
    type: "text",
    placeholder: "Contoh: Information Security Specialist",
    required: true
  },
  {
    id: "sektor_industri",
    label: "Sektor Industri",
    type: "dropdown",
    placeholder: "-- Pilih Sektor Industri --",
    required: true,
    options: [
      "Keuangan & Perbankan",
      "TIK & Telekomunikasi",
      "Pemerintah & BUMN",
      "Energi & Kelistrikan",
      "Migas (Minyak & Gas)",
      "Transportasi",
      "Logistik & Ekspedisi",
      "Kesehatan",
      "Asuransi",
      "Sekuritas & Investasi",
      "Industri Manufaktur",
      "Cybersecurity",
      "Pendidikan & Riset",
      "Lainnya"
    ]
  },
  {
    id: "provinsi",
    label: "Provinsi",
    type: "dropdown",
    placeholder: "-- Pilih Provinsi --",
    required: true,
    options: [
      "Jakarta",
      "Jawa Barat",
      "Banten",
      "Yogyakarta",
      "Jawa Tengah",
      "Jawa Timur",
      "Sumatera Selatan",
      "Lainnya"
    ]
  },
  {
    id: "nama_kota",
    label: "Nama Kota / Kabupaten",
    type: "text",
    placeholder: "Contoh: Jakarta Pusat / Tangerang",
    required: true
  },
  {
    id: "sumber_info",
    label: "Darimana Anda mengetahui Acara ini?",
    type: "dropdown",
    placeholder: "-- Pilih Sumber Informasi --",
    required: false,
    options: [
      "BSSN",
      "Undangan Email BSSN",
      "WA/Email Yorindo Communication",
      "ADIGSI",
      "APTIKNAS",
      "LinkedIn",
      "Instagram",
      "Kerabat / Rekan Kerja",
      "Lainnya"
    ]
  },
  {
    id: "persetujuan_data",
    label: "Persetujuan Pengumpulan dan Penggunaan Data Pribadi",
    type: "checkbox",
    required: true,
    options: [
      "Saya telah membaca, memahami, dan menyetujui bahwa data pribadi yang saya berikan dapat dikumpulkan, dikelola, dan digunakan oleh Yorindo Communication untuk keperluan administrasi dan absensi acara."
    ]
  }
];

async function main() {
  console.log('Connecting to Neon PostgreSQL database...');
  await prisma.$connect();
  console.log('Database connected successfully!');

  const eventSlug = 'bssn-core-3-jakarta-2026';
  const eventTitle = 'REG 12 November 2026 Jakarta - BSSN Core 3';
  const eventStartsAt = new Date('2026-11-12T01:30:00.000Z'); // 08:30 WIB
  const eventEndsAt = new Date('2026-11-12T10:00:00.000Z'); // 17:00 WIB

  // 1. Upsert Event
  console.log(`Upserting event: "${eventTitle}" (${eventSlug})...`);
  const event = await prisma.event.upsert({
    where: { slug: eventSlug },
    update: {
      title: eventTitle,
      description: 'Formulir Pendaftaran & Absensi Resmi Acara BSSN Core 3 Jakarta, diselenggarakan oleh Badan Siber dan Sandi Negara (BSSN) bekerja sama dengan Yorindo Communication pada tanggal 12 November 2026.',
      location: 'Jakarta (BSSN Core 3 Venue)',
      startsAt: eventStartsAt,
      endsAt: eventEndsAt,
      quota: 300,
      status: 'OPEN',
      rsvpMode: 'MANUAL',
      autoSendConfirmed: true,
      formSchema: JSON.stringify(formSchema),
      emailSubject: 'E-Tiket & QR Code RSVP: {{event}}',
      emailBody: 'Halo {{name}},\n\nTerima kasih telah mendaftar pada acara {{event}}.\nPendaftaran Anda telah disetujui. Berikut adalah detail tiket dan QR Code Anda untuk registrasi ulang di lokasi:\n\nWaktu  : {{date}}\nLokasi : {{location}}\n\nSilakan tunjukkan QR Code pada link tiket di bawah kepada panitia di meja registrasi:\n{{ticket_url}}\n\nSampai jumpa di lokasi acara!\n\nSalam hangat,\nPanitia BSSN & Yorindo Communication'
    },
    create: {
      slug: eventSlug,
      title: eventTitle,
      description: 'Formulir Pendaftaran & Absensi Resmi Acara BSSN Core 3 Jakarta, diselenggarakan oleh Badan Siber dan Sandi Negara (BSSN) bekerja sama dengan Yorindo Communication pada tanggal 12 November 2026.',
      location: 'Jakarta (BSSN Core 3 Venue)',
      startsAt: eventStartsAt,
      endsAt: eventEndsAt,
      quota: 300,
      status: 'OPEN',
      rsvpMode: 'MANUAL',
      autoSendConfirmed: true,
      formSchema: JSON.stringify(formSchema),
      emailSubject: 'E-Tiket & QR Code RSVP: {{event}}',
      emailBody: 'Halo {{name}},\n\nTerima kasih telah mendaftar pada acara {{event}}.\nPendaftaran Anda telah disetujui. Berikut adalah detail tiket dan QR Code Anda untuk registrasi ulang di lokasi:\n\nWaktu  : {{date}}\nLokasi : {{location}}\n\nSilakan tunjukkan QR Code pada link tiket di bawah kepada panitia di meja registrasi:\n{{ticket_url}}\n\nSampai jumpa di lokasi acara!\n\nSalam hangat,\nPanitia BSSN & Yorindo Communication'
    }
  });

  console.log(`Event ready! ID: ${event.id}`);

  // Remove strict unique constraint on (eventId, email) so all spreadsheet rows can be stored 1:1
  await prisma.$executeRawUnsafe('DROP INDEX IF EXISTS "Registration_eventId_email_key";');
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "Registration_eventId_email_idx" ON "Registration"("eventId", "email");');

  // Fetch existing registrations for this event
  const existingRegs = await prisma.registration.findMany({
    where: { eventId: event.id },
    orderBy: { createdAt: 'asc' }
  });
  const usedExistingIds = new Set();

  // 2. Read and parse CSV
  const csvContent = fs.readFileSync('sheet.csv', 'utf8');
  const rows = parseCSV(csvContent);
  const dataRows = rows.slice(1);
  console.log(`Found ${dataRows.length} participants in CSV.`);

  let insertedCount = 0;
  let updatedCount = 0;

  for (let i = 0; i < dataRows.length; i++) {
    const r = dataRows[i];
    const timestampStr = r[0];
    const name = (r[1] || '').trim();
    const namaPerusahaan = (r[2] || '').trim();
    const provinsi = (r[3] || '').trim();
    const namaKota = (r[4] || '').trim();
    const sektorIndustri = (r[5] || '').trim();
    const jabatan = (r[6] || '').trim();
    const email = (r[7] || '').trim().toLowerCase();
    const rawPhone = r[8];
    const sumberInfo = (r[9] || '').trim();
    const persetujuan = (r[10] || '').trim();

    if (!name || !email) {
      console.warn(`Row ${i + 2} skipped: missing name or email`);
      continue;
    }

    const createdAt = parseTimestamp(timestampStr);
    const phone = cleanPhone(rawPhone);

    const answersObj = {
      nama_perusahaan: namaPerusahaan,
      jabatan: jabatan,
      sektor_industri: sektorIndustri,
      provinsi: provinsi,
      nama_kota: namaKota,
      sumber_info: sumberInfo,
      persetujuan_data: persetujuan ? [persetujuan] : []
    };

    // Find an unused existing record with the same email
    const existing = existingRegs.find(
      (reg) => reg.email.toLowerCase() === email && !usedExistingIds.has(reg.id)
    );

    if (existing) {
      usedExistingIds.add(existing.id);
      await prisma.registration.update({
        where: { id: existing.id },
        data: {
          name: name,
          phone: phone || existing.phone,
          answers: JSON.stringify(answersObj),
          status: existing.status || 'APPROVED',
          approvedBy: existing.approvedBy || 'Admin Yorindo (Import)',
          approvedAt: existing.approvedAt || new Date(),
          createdAt: createdAt
        }
      });
      updatedCount++;
    } else {
      await prisma.registration.create({
        data: {
          eventId: event.id,
          name: name,
          email: email,
          phone: phone,
          answers: JSON.stringify(answersObj),
          status: 'APPROVED',
          approvedBy: 'Admin Yorindo (Import)',
          approvedAt: new Date(),
          createdAt: createdAt
        }
      });
      insertedCount++;
    }
  }

  console.log(`\n========================================`);
  console.log(`IMPORT COMPLETED SUCCESSFULLY!`);
  console.log(`Total New Inserted : ${insertedCount}`);
  console.log(`Total Updated      : ${updatedCount}`);
  console.log(`Total Records      : ${insertedCount + updatedCount}`);
  console.log(`Event Slug         : ${event.slug}`);
  console.log(`Event Title        : ${event.title}`);
  console.log(`========================================\n`);

  await prisma.$disconnect();
}

main().catch(err => {
  console.error('Import failed with error:', err);
  process.exit(1);
});

