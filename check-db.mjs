import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const regs = await prisma.registration.findMany({
    include: { event: { select: { title: true, slug: true } } },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
  
  console.log(`Total registrations: ${regs.length}`);
  for (const r of regs) {
    console.log(`- ${r.name} | ${r.email} | Status: ${r.status} | Event: ${r.event.title} | Created: ${r.createdAt}`);
  }
  
  const events = await prisma.event.findMany({
    include: { _count: { select: { registrations: true } } },
  });
  console.log('\nEvents:');
  for (const e of events) {
    console.log(`- [${e.status}] ${e.title} (slug: ${e.slug}) - ${e._count.registrations} registrations`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
