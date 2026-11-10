const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const formalSubject = "Registration Confirmation: BSSN CORE 3 – CSIRT Operation Readiness for Economics 2026 - [Participant Name]";

const formalBody = `Dear Mr./Ms. [Participant Name],

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
www.yorindocommunication.com`;

async function main() {
  const updated = await prisma.event.update({
    where: { slug: 'bssn-core-3-jakarta-2026' },
    data: {
      title: 'BSSN CORE 3 – CSIRT Operation Readiness for Economics',
      location: 'Aston Kartika Grogol Hotel, Jakarta',
      startsAt: new Date('2026-11-12T01:00:00.000Z'), // 08:00 WIB
      endsAt: new Date('2026-11-12T10:00:00.000Z'),   // 17:00 WIB
      emailSubject: formalSubject,
      emailBody: formalBody,
    }
  });
  console.log('Event updated successfully:', updated.title);
  console.log('Venue:', updated.location);
  await prisma.$disconnect();
}

main().catch(console.error);
