import { notFound, redirect } from "next/navigation";
import { checkAdminAuth } from "@/actions/auth";
import { prisma } from "@/lib/prisma";
import { getPrizes, getWinnerHistory } from "@/actions/doorprize";
import { SpinWheelClient } from "./SpinWheelClient";
import Link from "next/link";
import { ArrowLeft, QrCode, Users } from "lucide-react";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function DoorprizePage({ params }: PageProps) {
  const isAuth = await checkAdminAuth();
  if (!isAuth) {
    redirect("/dashboard/login");
  }

  const { id } = await params;

  // Support querying by ID or slug
  const event = await prisma.event.findFirst({
    where: {
      OR: [{ id }, { slug: id }],
    },
  });

  if (!event) {
    notFound();
  }

  const prizes = await getPrizes(event.id);
  const winners = await getWinnerHistory(event.id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-3xl liquid-glass flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Dashboard</span>
          </Link>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Spin Wheel Doorprize: {event.title}
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Undian doorprize interaktif dengan animasi roda, penentuan acak server yang adil, dan efek konfeti.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/events/${event.id}/checkin`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-800 liquid-pill"
          >
            <QrCode className="w-3.5 h-3.5 text-emerald-600" />
            <span>Scanner Hari-H</span>
          </Link>

          <Link
            href={`/dashboard/events/${event.id}/registrations`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-800 liquid-pill"
          >
            <Users className="w-3.5 h-3.5 text-indigo-600" />
            <span>Data Peserta</span>
          </Link>
        </div>
      </div>

      <SpinWheelClient
        eventId={event.id}
        eventTitle={event.title}
        initialPrizes={prizes}
        initialWinners={winners}
      />
    </div>
  );
}
