import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Clean up existing data
  await prisma.prizeDraw.deleteMany({});
  await prisma.prize.deleteMany({});
  await prisma.emailLog.deleteMany({});
  await prisma.registration.deleteMany({});
  await prisma.event.deleteMany({});
  await prisma.user.deleteMany({});

  // 1. Create Super Admin User
  const admin = await prisma.user.create({
    data: {
      name: "Daffa (Super Admin)",
      email: "admin@eventorganizer.id",
      passwordHash: "admin123", // In production, hash with bcrypt/argon2
      role: "SUPER_ADMIN",
    },
  });

  // 2. Define custom fields schema for the event
  const formSchema = [
    {
      id: "company",
      label: "Nama Perusahaan / Institusi",
      type: "text",
      placeholder: "Contoh: PT Teknologi Indonesia",
      required: true,
      options: [],
    },
    {
      id: "jobTitle",
      label: "Jabatan / Role",
      type: "text",
      placeholder: "Contoh: Engineering Lead",
      required: true,
      options: [],
    },
    {
      id: "industry",
      label: "Bidang Usaha",
      type: "dropdown",
      placeholder: "Pilih bidang usaha",
      required: true,
      options: [
        "Teknologi Informasi & Software",
        "Fintech & Perbankan",
        "E-Commerce & Retail",
        "Media & Industri Kreatif",
        "Manufaktur & Logistik",
        "Pendidikan & Riset",
        "Lainnya",
      ],
    },
    {
      id: "dietary",
      label: "Preferensi Konsumsi (Snack/Lunch)",
      type: "radio",
      placeholder: "",
      required: false,
      options: ["Bebas / Standar", "Halal Only", "Vegetarian", "Vegan"],
    },
    {
      id: "city",
      label: "Kota Asal",
      type: "text",
      placeholder: "Contoh: Jakarta Selatan",
      required: false,
      options: [],
    },
  ];

  // 3. Create Main Demo Event
  const event = await prisma.event.create({
    data: {
      slug: "tech-innovators-summit-2026",
      title: "Tech Innovators Summit 2026",
      description:
        "Konferensi tahunan teknologi dan inovasi masa depan. Menghadirkan pembicara terkemuka di bidang AI, Cloud, dan Cybersecurity, networking eksklusif, serta pengundian doorprize spektakuler di akhir sesi.",
      location: "Grand Ballroom Hotel Indonesia Kempinski, Jakarta Pusat",
      startsAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Besok
      endsAt: new Date(Date.now() + 32 * 60 * 60 * 1000),
      registrationDeadline: new Date(Date.now() + 18 * 60 * 60 * 1000),
      quota: 150,
      status: "OPEN",
      posterUrl:
        "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80",
      formSchema: JSON.stringify(formSchema),
      rsvpMode: "MANUAL",
      autoSendConfirmed: false,
      emailSubject: "E-Ticket & QR Code RSVP: Tech Innovators Summit 2026",
      emailBody:
        "Halo {{name}},\n\nTerima kasih telah mendaftar di Tech Innovators Summit 2026. Pendaftaran Anda telah DISETUJUI oleh panitia.\n\nSilakan tunjukkan QR Code terlampir saat kedatangan di meja registrasi (Gate Entrance).\n\nSampai jumpa di lokasi acara!",
    },
  });

  // 4. Create Prizes for Doorprize
  const prizes = await Promise.all([
    prisma.prize.create({
      data: {
        eventId: event.id,
        name: "Apple iPad Air M2 128GB",
        quantity: 1,
        order: 1,
      },
    }),
    prisma.prize.create({
      data: {
        eventId: event.id,
        name: "Sony WH-1000XM5 Noise Cancelling Headphones",
        quantity: 2,
        order: 2,
      },
    }),
    prisma.prize.create({
      data: {
        eventId: event.id,
        name: "Smartwatch Samsung Galaxy Watch 6",
        quantity: 3,
        order: 3,
      },
    }),
    prisma.prize.create({
      data: {
        eventId: event.id,
        name: "Voucher Belanja MAP Rp 500.000",
        quantity: 5,
        order: 4,
      },
    }),
  ]);

  // 5. Create Sample Registrations
  const sampleRegistrations = [
    {
      name: "Budi Santoso",
      email: "budi.santoso@techcorp.id",
      phone: "081234567890",
      status: "CHECKED_IN",
      checkedInAt: new Date(),
      answers: JSON.stringify({
        company: "PT Inovasi Digital Nusantara",
        jobTitle: "CTO",
        industry: "Teknologi Informasi & Software",
        dietary: "Halal Only",
        city: "Jakarta Selatan",
      }),
    },
    {
      name: "Siti Rahmawati",
      email: "siti.rahma@fintechindo.com",
      phone: "081398765432",
      status: "CHECKED_IN",
      checkedInAt: new Date(Date.now() - 30 * 60 * 1000),
      answers: JSON.stringify({
        company: "Fintech Indo Maju",
        jobTitle: "Product Manager",
        industry: "Fintech & Perbankan",
        dietary: "Bebas / Standar",
        city: "Tangerang",
      }),
    },
    {
      name: "Reza Pratama",
      email: "reza.pratama@cloudmedia.co.id",
      phone: "085678901234",
      status: "CHECKED_IN",
      checkedInAt: new Date(Date.now() - 45 * 60 * 1000),
      answers: JSON.stringify({
        company: "Cloud Media Group",
        jobTitle: "Head of Marketing",
        industry: "Media & Industri Kreatif",
        dietary: "Vegetarian",
        city: "Jakarta Barat",
      }),
    },
    {
      name: "Dewi Lestari",
      email: "dewi.lestari@startupindonesia.org",
      phone: "081812345678",
      status: "CHECKED_IN",
      checkedInAt: new Date(Date.now() - 15 * 60 * 1000),
      answers: JSON.stringify({
        company: "Startup Hub ID",
        jobTitle: "Community Manager",
        industry: "Teknologi Informasi & Software",
        dietary: "Bebas / Standar",
        city: "Bandung",
      }),
    },
    {
      name: "Ahmad Fauzi",
      email: "ahmad.fauzi@logistikprima.co.id",
      phone: "087711223344",
      status: "CHECKED_IN",
      checkedInAt: new Date(Date.now() - 10 * 60 * 1000),
      answers: JSON.stringify({
        company: "PT Logistik Prima Express",
        jobTitle: "Operations Director",
        industry: "Manufaktur & Logistik",
        dietary: "Halal Only",
        city: "Bekasi",
      }),
    },
    {
      name: "Jessica Tan",
      email: "jessica.tan@ecomscale.io",
      phone: "081900112233",
      status: "APPROVED",
      approvedBy: admin.name,
      approvedAt: new Date(),
      answers: JSON.stringify({
        company: "E-Com Scale Asia",
        jobTitle: "Growth Lead",
        industry: "E-Commerce & Retail",
        dietary: "Bebas / Standar",
        city: "Jakarta Utara",
      }),
    },
    {
      name: "Kevin Sanjaya",
      email: "kevin.sanjaya@ai-labs.net",
      phone: "081299887766",
      status: "APPROVED",
      approvedBy: admin.name,
      approvedAt: new Date(),
      answers: JSON.stringify({
        company: "Deep Learning Labs",
        jobTitle: "AI Researcher",
        industry: "Pendidikan & Riset",
        dietary: "Bebas / Standar",
        city: "Depok",
      }),
    },
    {
      name: "Nurul Hidayah",
      email: "nurul.hidayah@bankdigital.co.id",
      phone: "085811224455",
      status: "PENDING",
      answers: JSON.stringify({
        company: "Bank Digital Terpadu",
        jobTitle: "Compliance Specialist",
        industry: "Fintech & Perbankan",
        dietary: "Halal Only",
        city: "Jakarta Pusat",
      }),
    },
    {
      name: "Rian Hendrawan",
      email: "rian.hendra@agencykreatif.com",
      phone: "089633445566",
      status: "PENDING",
      answers: JSON.stringify({
        company: "Studio Kreatif Nusantara",
        jobTitle: "Art Director",
        industry: "Media & Industri Kreatif",
        dietary: "Bebas / Standar",
        city: "Bogor",
      }),
    },
  ];

  for (const reg of sampleRegistrations) {
    await prisma.registration.create({
      data: {
        eventId: event.id,
        ...reg,
      },
    });
  }

  console.log("Seeding finished successfully!");
  console.log(`Created 1 Super Admin: ${admin.email}`);
  console.log(`Created Event: ${event.title} (slug: /e/${event.slug})`);
  console.log(`Created ${prizes.length} prize categories.`);
  console.log(`Created ${sampleRegistrations.length} sample registrations.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
