"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { sendRsvpEmail } from "@/lib/email";

export async function registerParticipant(
  slug: string,
  data: {
    name: string;
    email: string;
    phone?: string;
    answers?: Record<string, any>;
    honeypot?: string;
  }
) {
  // Anti-spam honeypot
  if (data.honeypot) {
    return { success: false, message: "Aktivitas bot terdeteksi." };
  }

  const event = await prisma.event.findUnique({
    where: { slug },
    include: {
      _count: {
        select: { registrations: true },
      },
    },
  });

  if (!event) {
    return { success: false, message: "Event tidak ditemukan." };
  }

  if (event.status !== "OPEN") {
    return {
      success: false,
      message: "Pendaftaran untuk event ini sedang ditutup atau belum dibuka.",
    };
  }

  if (event.registrationDeadline && new Date() > new Date(event.registrationDeadline)) {
    return {
      success: false,
      message: "Batas waktu pendaftaran untuk event ini telah berakhir.",
    };
  }

  if (event._count.registrations >= event.quota) {
    return {
      success: false,
      message: "Mohon maaf, kuota peserta untuk event ini sudah penuh.",
    };
  }

  // Check duplicate email
  const existing = await prisma.registration.findUnique({
    where: {
      eventId_email: {
        eventId: event.id,
        email: data.email.toLowerCase().trim(),
      },
    },
  });

  if (existing) {
    return {
      success: false,
      message: "Email ini sudah terdaftar pada event ini. Silakan periksa kotak masuk email Anda.",
    };
  }

  const isAutoSend = event.rsvpMode === "AUTO";
  const initialStatus = isAutoSend ? "APPROVED" : "PENDING";

  const registration = await prisma.registration.create({
    data: {
      eventId: event.id,
      name: data.name.trim(),
      email: data.email.toLowerCase().trim(),
      phone: data.phone?.trim() || null,
      answers: JSON.stringify(data.answers || {}),
      status: initialStatus,
      approvedBy: isAutoSend ? "SYSTEM_AUTO_SEND" : null,
      approvedAt: isAutoSend ? new Date() : null,
    },
  });

  // If auto-send is active, send RSVP email immediately
  if (isAutoSend) {
    await sendRsvpEmail({
      registrationId: registration.id,
      recipientEmail: registration.email,
      recipientName: registration.name,
      eventTitle: event.title,
      eventLocation: event.location,
      eventStartsAt: event.startsAt,
      qrToken: registration.qrToken,
      customSubject: event.emailSubject,
      customBody: event.emailBody,
    });
  }

  revalidatePath(`/e/${slug}`);
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/events/${event.id}`);
  revalidatePath(`/dashboard/events/${event.id}/registrations`);
  revalidatePath(`/dashboard/events/${event.id}/checkin`);
  revalidatePath(`/dashboard/events/${event.id}/doorprize`);
  return {
    success: true,
    registrationId: registration.id,
    qrToken: registration.qrToken,
    status: initialStatus,
  };
}

export async function getEventRegistrations(
  eventId: string,
  options?: {
    search?: string;
    status?: string;
  }
) {
  const where: any = { eventId };

  if (options?.status && options.status !== "ALL") {
    where.status = options.status;
  }

  if (options?.search) {
    const s = options.search.toLowerCase();
    where.OR = [
      { name: { contains: s } },
      { email: { contains: s } },
      { phone: { contains: s } },
    ];
  }

  return await prisma.registration.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      emailLogs: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
}

export async function approveRegistration(id: string, adminName: string = "Admin") {
  const reg = await prisma.registration.findUnique({
    where: { id },
    include: { event: true },
  });

  if (!reg) throw new Error("Pendaftar tidak ditemukan");

  const updated = await prisma.registration.update({
    where: { id },
    data: {
      status: "APPROVED",
      approvedBy: adminName,
      approvedAt: new Date(),
    },
  });

  // Send RSVP email with QR code
  const emailResult = await sendRsvpEmail({
    registrationId: reg.id,
    recipientEmail: reg.email,
    recipientName: reg.name,
    eventTitle: reg.event.title,
    eventLocation: reg.event.location,
    eventStartsAt: reg.event.startsAt,
    qrToken: reg.qrToken,
    customSubject: reg.event.emailSubject,
    customBody: reg.event.emailBody,
  });

  revalidatePath(`/dashboard/events/${reg.eventId}/registrations`);
  return { registration: updated, emailResult };
}

export async function bulkApproveRegistrations(ids: string[], adminName: string = "Admin") {
  for (const id of ids) {
    try {
      await approveRegistration(id, adminName);
    } catch (e) {
      console.error(`Failed to approve ${id}:`, e);
    }
  }
  return { success: true, count: ids.length };
}

export async function rejectRegistration(id: string) {
  const reg = await prisma.registration.update({
    where: { id },
    data: { status: "REJECTED" },
  });
  revalidatePath(`/dashboard/events/${reg.eventId}/registrations`);
  return reg;
}

export async function deleteRegistration(id: string) {
  const reg = await prisma.registration.delete({
    where: { id },
  });
  revalidatePath(`/dashboard/events/${reg.eventId}/registrations`);
  return reg;
}

export async function resendRsvpEmail(id: string) {
  const reg = await prisma.registration.findUnique({
    where: { id },
    include: { event: true },
  });

  if (!reg) throw new Error("Peserta tidak ditemukan");

  return await sendRsvpEmail({
    registrationId: reg.id,
    recipientEmail: reg.email,
    recipientName: reg.name,
    eventTitle: reg.event.title,
    eventLocation: reg.event.location,
    eventStartsAt: reg.event.startsAt,
    qrToken: reg.qrToken,
    customSubject: reg.event.emailSubject,
    customBody: reg.event.emailBody,
  });
}

export async function validateAndCheckIn(eventId: string, qrToken: string) {
  const trimmedToken = qrToken.trim();
  const reg = await prisma.registration.findFirst({
    where: {
      eventId,
      qrToken: trimmedToken,
    },
    include: {
      event: true,
    },
  });

  if (!reg) {
    // Check if token belongs to another event
    const otherEvent = await prisma.registration.findFirst({
      where: { qrToken: trimmedToken },
      include: { event: true },
    });

    if (otherEvent) {
      return {
        success: false,
        code: "WRONG_EVENT",
        message: `Tiket ini milik event lain: "${otherEvent.event.title}"`,
      };
    }

    return {
      success: false,
      code: "INVALID_TOKEN",
      message: "QR Code tidak valid atau tidak terdaftar dalam sistem.",
    };
  }

  if (reg.status === "CHECKED_IN") {
    return {
      success: false,
      code: "ALREADY_CHECKED_IN",
      message: `Peserta telah melakukan check-in pada ${new Intl.DateTimeFormat("id-ID", {
        timeStyle: "medium",
        dateStyle: "short",
      }).format(reg.checkedInAt || new Date())}`,
      registration: reg,
    };
  }

  if (reg.status === "REJECTED") {
    return {
      success: false,
      code: "REJECTED",
      message: "Pendaftaran peserta ini berstatus DITOLAK.",
      registration: reg,
    };
  }

  if (reg.status === "PENDING") {
    return {
      success: false,
      code: "PENDING",
      message: "Pendaftaran peserta ini masih PENDING (belum disetujui oleh admin).",
      registration: reg,
    };
  }

  // Update to CHECKED_IN
  const updated = await prisma.registration.update({
    where: { id: reg.id },
    data: {
      status: "CHECKED_IN",
      checkedInAt: new Date(),
    },
  });

  revalidatePath(`/dashboard/events/${eventId}/checkin`);
  return {
    success: true,
    code: "SUCCESS",
    message: "Check-in BERHASIL! Selamat datang di acara.",
    registration: updated,
  };
}

export async function manualCheckInById(registrationId: string) {
  const reg = await prisma.registration.update({
    where: { id: registrationId },
    data: {
      status: "CHECKED_IN",
      checkedInAt: new Date(),
    },
  });
  revalidatePath(`/dashboard/events/${reg.eventId}/checkin`);
  revalidatePath(`/dashboard/events/${reg.eventId}/registrations`);
  return reg;
}

export async function addManualAttendee(
  eventId: string,
  data: {
    name: string;
    email: string;
    phone?: string;
    answers?: Record<string, any>;
    status?: string;
  }
) {
  const reg = await prisma.registration.create({
    data: {
      eventId,
      name: data.name.trim(),
      email: data.email.toLowerCase().trim(),
      phone: data.phone?.trim() || null,
      answers: JSON.stringify(data.answers || {}),
      status: data.status || "APPROVED",
      approvedBy: "Manual Admin Input",
      approvedAt: new Date(),
    },
  });

  revalidatePath(`/dashboard/events/${eventId}/registrations`);
  return reg;
}
