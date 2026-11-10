const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const event = await prisma.event.findUnique({
    where: { slug: 'bssn-core-3-jakarta-2026' },
    include: {
      _count: { select: { registrations: true } },
      registrations: { take: 3 }
    }
  });

  console.log('Event Title:', event.title);
  console.log('Location:', event.location);
  console.log('Starts At:', event.startsAt);
  console.log('Total Registrations:', event._count.registrations);
  console.log('\nSample Participants:');
  event.registrations.forEach((r, idx) => {
    console.log(`[${idx + 1}] ${r.name} - ${r.email} - HP: ${r.phone} - Status: ${r.status}`);
    console.log('    Token QR:', r.qrToken);
    console.log('    Jawaban Form:', r.answers);
  });
  await prisma.$disconnect();
}
check().catch(console.error);

