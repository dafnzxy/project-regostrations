"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { sendRsvpEmail } from "@/lib/email";
import { requireAdminAuth } from "./auth";
import { FormField } from "@/types";

// Anti-spam per-IP rate limiting for public registration endpoint
const registrationRateLimit = new Map<
  string,
  { count: number; windowResetAt: number }
>();
const REG_MAX_PER_WINDOW = 10;
const REG_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

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
  // 1. Anti-spam honeypot
  if (data.honeypot) {
    return { success: false, message: "Aktivitas bot terdeteksi." };
  }

  // 2. Per-IP Rate Limiting
  const headerStore = await headers();
  const clientIp =
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headerStore.get("x-real-ip") ||
    "local-client";
  const now = Date.now();
  const rateEntry = registrationRateLimit.get(clientIp);
  if (rateEntry && rateEntry.windowResetAt > now) {
    if (rateEntry.count >= REG_MAX_PER_WINDOW) {
      return {
        success: false,
        message:
          "Terlalu banyak permintaan pendaftaran dari jaringan Anda. Silakan tunggu beberapa menit lalu coba kembali.",
      };
    }
    rateEntry.count += 1;
  } else {
    registrationRateLimit.set(clientIp, {
      count: 1,
      windowResetAt: now + REG_WINDOW_MS,
    });
  }

  // 3. Strict Input Validation & Sanitization
  const cleanName = (data.name || "").trim();
  const cleanEmail = (data.email || "").toLowerCase().trim();
  const cleanPhone = data.phone ? data.phone.trim() : null;

  if (cleanName.length < 2 || cleanName.length > 150) {
    return {
      success: false,
      message: "Nama lengkap wajib diisi (minimal 2 hingga 150 karakter).",
    };
  }

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(cleanEmail) || cleanEmail.length > 200) {
    return {
      success: false,
      message: "Format alamat email tidak valid.",
    };
  }

  if (cleanPhone && cleanPhone.length > 30) {
    return {
      success: false,
      message: "Nomor telepon terlalu panjang (maksimal 30 karakter).",
    };
  }

  const serializedAnswers = JSON.stringify(data.answers || {});
  if (serializedAnswers.length > 10000) {
    return {
      success: false,
      message: "Data jawaban formulir melebihi batas ukuran yang diizinkan.",
    };
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

  // 4. Server-side validation of required custom fields from formSchema
  try {
    const schemaFields: FormField[] = JSON.parse(event.formSchema || "[]");
    const answersObj = data.answers || {};
    for (const field of schemaFields) {
      if (field.required) {
        const val = answersObj[field.id];
        const isEmpty =
          val === undefined ||
          val === null ||
          (typeof val === "string" && val.trim() === "") ||
          (Array.isArray(val) && val.length === 0);
        if (isEmpty) {
          return {
            success: false,
            message: `Kolom "${field.label}" wajib diisi.`,
          };
        }
      }
    }
  } catch {
    // Ignore malformed schema JSON
  }

  // Check duplicate email
  const existing = await prisma.registration.findUnique({
    where: {
      eventId_email: {
        eventId: event.id,
        email: cleanEmail,
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
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      answers: serializedAnswers,
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
    qrToken: initialStatus === "APPROVED" ? registration.qrToken : null,
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
  await requireAdminAuth();

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

export async function approveRegistration(
  id: string,
  adminName: string = "Admin",
  templateOverride?: { subject?: string; body?: string }
) {
  await requireAdminAuth();

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
    customSubject: templateOverride?.subject || reg.event.emailSubject,
    customBody: templateOverride?.body || reg.event.emailBody,
  });

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/events/${reg.eventId}/registrations`);
  revalidatePath(`/dashboard/events/${reg.eventId}/checkin`);
  revalidatePath(`/dashboard/events/${reg.eventId}/doorprize`);
  revalidatePath(`/ticket/${reg.qrToken}`);
  return { registration: updated, emailResult };
}

export async function bulkApproveRegistrations(
  ids: string[],
  adminName: string = "Admin",
  templateOverride?: { subject?: string; body?: string }
) {
  await requireAdminAuth();

  for (const id of ids) {
    try {
      await approveRegistration(id, adminName, templateOverride);
    } catch (e) {
      console.error(`Failed to approve ${id}:`, e);
    }
  }
  revalidatePath("/dashboard");
  return { success: true, count: ids.length };
}

export async function rejectRegistration(id: string) {
  await requireAdminAuth();

  const reg = await prisma.registration.update({
    where: { id },
    data: { status: "REJECTED" },
  });
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/events/${reg.eventId}/registrations`);
  revalidatePath(`/dashboard/events/${reg.eventId}/checkin`);
  revalidatePath(`/dashboard/events/${reg.eventId}/doorprize`);
  revalidatePath(`/ticket/${reg.qrToken}`);
  return reg;
}

export async function deleteRegistration(id: string) {
  await requireAdminAuth();

  const reg = await prisma.registration.delete({
    where: { id },
  });
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/events/${reg.eventId}/registrations`);
  revalidatePath(`/dashboard/events/${reg.eventId}/checkin`);
  revalidatePath(`/dashboard/events/${reg.eventId}/doorprize`);
  return reg;
}

export async function resendRsvpEmail(
  id: string,
  templateOverride?: { subject?: string; body?: string }
) {
  await requireAdminAuth();

  const reg = await prisma.registration.findUnique({
    where: { id },
    include: { event: true },
  });

  if (!reg) throw new Error("Peserta tidak ditemukan");

  const res = await sendRsvpEmail({
    registrationId: reg.id,
    recipientEmail: reg.email,
    recipientName: reg.name,
    eventTitle: reg.event.title,
    eventLocation: reg.event.location,
    eventStartsAt: reg.event.startsAt,
    qrToken: reg.qrToken,
    customSubject: templateOverride?.subject || reg.event.emailSubject,
    customBody: templateOverride?.body || reg.event.emailBody,
  });

  revalidatePath(`/dashboard/events/${reg.eventId}/registrations`);
  return res;
}

export async function validateAndCheckIn(eventId: string, qrToken: string) {
  await requireAdminAuth();

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

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/events/${eventId}/checkin`);
  revalidatePath(`/dashboard/events/${eventId}/registrations`);
  revalidatePath(`/dashboard/events/${eventId}/doorprize`);
  revalidatePath(`/ticket/${reg.qrToken}`);
  return {
    success: true,
    code: "SUCCESS",
    message: "Check-in BERHASIL! Selamat datang di acara.",
    registration: updated,
  };
}

export async function manualCheckInById(registrationId: string) {
  await requireAdminAuth();

  const reg = await prisma.registration.update({
    where: { id: registrationId },
    data: {
      status: "CHECKED_IN",
      checkedInAt: new Date(),
    },
  });
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/events/${reg.eventId}/checkin`);
  revalidatePath(`/dashboard/events/${reg.eventId}/registrations`);
  revalidatePath(`/dashboard/events/${reg.eventId}/doorprize`);
  revalidatePath(`/ticket/${reg.qrToken}`);
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
  await requireAdminAuth();

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

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/events/${eventId}/registrations`);
  revalidatePath(`/dashboard/events/${eventId}/checkin`);
  revalidatePath(`/dashboard/events/${eventId}/doorprize`);
  return reg;
}
