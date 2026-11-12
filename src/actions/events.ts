"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminAuth } from "./auth";
import { EMAIL_TEMPLATE_PRESETS } from "@/lib/email-templates";

export async function getEvents() {
  await requireAdminAuth();

  return await prisma.event.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          registrations: true,
          prizes: true,
        },
      },
    },
  });
}

export async function getEventBySlug(slug: string) {
  return await prisma.event.findUnique({
    where: { slug },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      location: true,
      startsAt: true,
      endsAt: true,
      registrationDeadline: true,
      quota: true,
      vipQuota: true,
      status: true,
      posterUrl: true,
      formSchema: true,
      rsvpMode: true,
      _count: {
        select: {
          registrations: true,
        },
      },
    },
  });
}

export async function getEventById(id: string) {
  await requireAdminAuth();

  return await prisma.event.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          registrations: true,
          prizes: true,
        },
      },
      prizes: {
        orderBy: { order: "asc" },
      },
    },
  });
}

export async function createEvent(data: {
  title: string;
  slug: string;
  description?: string;
  location?: string;
  startsAt: string;
  endsAt?: string;
  registrationDeadline?: string;
  quota: number;
  vipQuota?: number;
  status: string;
  posterUrl?: string;
  rsvpMode: string;
  formSchema?: string;
}) {
  await requireAdminAuth();

  const existing = await prisma.event.findUnique({
    where: { slug: data.slug },
  });

  if (existing) {
    throw new Error("Slug URL sudah digunakan oleh event lain. Silakan pilih slug yang berbeda.");
  }

  const defaultSchema = JSON.stringify([
    {
      id: "company",
      label: "Nama Perusahaan / Organisasi",
      type: "text",
      placeholder: "Contoh: PT Maju Bersama",
      required: false,
      options: [],
    },
  ]);

  const event = await prisma.event.create({
    data: {
      title: data.title,
      slug: data.slug.toLowerCase().trim().replace(/[^a-z0-9-]+/g, "-"),
      description: data.description,
      location: data.location,
      startsAt: new Date(data.startsAt),
      endsAt: data.endsAt ? new Date(data.endsAt) : null,
      registrationDeadline: data.registrationDeadline ? new Date(data.registrationDeadline) : null,
      quota: data.quota || 100,
      vipQuota: data.vipQuota || 0,
      status: data.status || "OPEN",
      posterUrl: data.posterUrl || "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80",
      rsvpMode: data.rsvpMode || "MANUAL",
      formSchema: data.formSchema || defaultSchema,
      emailSubject: EMAIL_TEMPLATE_PRESETS[0].subject,
      emailBody: EMAIL_TEMPLATE_PRESETS[0].body,
    },
  });

  revalidatePath("/dashboard");
  return event;
}

export async function updateEvent(
  id: string,
  data: {
    title?: string;
    description?: string;
    location?: string;
    startsAt?: string;
    endsAt?: string;
    quota?: number;
    vipQuota?: number;
    status?: string;
    posterUrl?: string;
    rsvpMode?: string;
    formSchema?: string;
    emailSubject?: string;
    emailBody?: string;
  }
) {
  await requireAdminAuth();

  const updatePayload: any = {};
  if (data.title !== undefined) updatePayload.title = data.title;
  if (data.description !== undefined) updatePayload.description = data.description;
  if (data.location !== undefined) updatePayload.location = data.location;
  if (data.startsAt !== undefined) updatePayload.startsAt = new Date(data.startsAt);
  if (data.endsAt !== undefined) updatePayload.endsAt = data.endsAt ? new Date(data.endsAt) : null;
  if (data.quota !== undefined) updatePayload.quota = Number(data.quota);
  if (data.vipQuota !== undefined) updatePayload.vipQuota = Number(data.vipQuota);
  if (data.status !== undefined) updatePayload.status = data.status;
  if (data.posterUrl !== undefined) updatePayload.posterUrl = data.posterUrl;
  if (data.rsvpMode !== undefined) updatePayload.rsvpMode = data.rsvpMode;
  if (data.formSchema !== undefined) updatePayload.formSchema = data.formSchema;
  if (data.emailSubject !== undefined) updatePayload.emailSubject = data.emailSubject;
  if (data.emailBody !== undefined) updatePayload.emailBody = data.emailBody;

  const updated = await prisma.event.update({
    where: { id },
    data: updatePayload,
  });

  revalidatePath(`/dashboard/events/${id}`);
  revalidatePath(`/dashboard/events/${id}/registrations`);
  revalidatePath(`/dashboard/events/${id}/form-builder`);
  revalidatePath(`/e/${updated.slug}`);
  return updated;
}

export async function duplicateEvent(id: string) {
  await requireAdminAuth();

  const source = await prisma.event.findUnique({
    where: { id },
    include: { prizes: true },
  });

  if (!source) throw new Error("Event tidak ditemukan");

  const newSlug = `${source.slug}-copy-${Math.floor(1000 + Math.random() * 9000)}`;

  const duplicated = await prisma.event.create({
    data: {
      title: `${source.title} (Salinan)`,
      slug: newSlug,
      description: source.description,
      location: source.location,
      startsAt: source.startsAt,
      endsAt: source.endsAt,
      quota: source.quota,
      status: "DRAFT",
      posterUrl: source.posterUrl,
      formSchema: source.formSchema,
      rsvpMode: source.rsvpMode,
      emailSubject: source.emailSubject,
      emailBody: source.emailBody,
    },
  });

  // Duplicate prizes as well
  for (const p of source.prizes) {
    await prisma.prize.create({
      data: {
        eventId: duplicated.id,
        name: p.name,
        quantity: p.quantity,
        order: p.order,
      },
    });
  }

  revalidatePath("/dashboard");
  return duplicated;
}

export async function deleteEvent(id: string) {
  await requireAdminAuth();

  const deleted = await prisma.event.delete({
    where: { id },
  });

  revalidatePath("/dashboard");
  return deleted;
}
