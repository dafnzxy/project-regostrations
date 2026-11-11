import { notFound, redirect } from "next/navigation";
import { checkAdminAuth } from "@/actions/auth";
import { prisma } from "@/lib/prisma";
import { ScannerClient } from "./ScannerClient";
import Link from "next/link";
import { ArrowLeft, Sparkles, Users } from "lucide-react";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CheckInPage({ params }: PageProps) {
  const isAuth = await checkAdminAuth();
  if (!isAuth) {
    redirect("/dashboard/login");
  }

  const { id } = await params;

  // Support querying by either ID or slug
  const event = await prisma.event.findFirst({
    where: {
      OR: [{ id }, { slug: id }],
    },
    include: {
      registrations: {
        where: {
          status: { in: ["APPROVED", "CHECKED_IN"] },
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          answers: true,
          status: true,
          qrToken: true,
          checkedInAt: true,
        },
        orderBy: { name: "asc" },
      },
    },
  });

  if (!event) {
    notFound();
  }

  const totalApproved = event.registrations.length;
  const totalCheckedIn = event.registrations.filter((r) => r.status === "CHECKED_IN").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-3xl liquid-glass flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#17449A] mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Dashboard</span>
          </Link>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Scanner Check-In Hari-H: {event.title}
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Pindai QR code tiket peserta menggunakan kamera perangkat untuk verifikasi instan.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/events/${event.id}/registrations`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-800 liquid-pill"
          >
            <Users className="w-3.5 h-3.5 text-[#17449A]" />
            <span>Data Peserta</span>
          </Link>

          <Link
            href={`/dashboard/events/${event.id}/doorprize`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-800 liquid-pill"
          >
            <Sparkles className="w-3.5 h-3.5 text-pink-600" />
            <span>Undian Doorprize</span>
          </Link>
        </div>
      </div>

      <ScannerClient
        eventId={event.id}
        eventTitle={event.title}
        totalApproved={totalApproved}
        totalCheckedIn={totalCheckedIn}
        initialAttendees={event.registrations}
      />
    </div>
  );
}
