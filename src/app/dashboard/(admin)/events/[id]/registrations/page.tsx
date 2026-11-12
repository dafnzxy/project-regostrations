import { notFound } from "next/navigation";
import { getEventById } from "@/actions/events";
import { getEventRegistrations } from "@/actions/registrations";
import { RegistrationsClient } from "./RegistrationsClient";
import { FormField } from "@/types";
import Link from "next/link";
import { ArrowLeft, QrCode, Sparkles, FileSpreadsheet } from "lucide-react";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EventRegistrationsPage({ params }: PageProps) {
  const { id } = await params;
  const event = await getEventById(id);

  if (!event) {
    notFound();
  }

  const registrations = await getEventRegistrations(id);

  let parsedSchema: FormField[] = [];
  try {
    parsedSchema = JSON.parse(event.formSchema || "[]");
  } catch (e) {
    parsedSchema = [];
  }

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
            Database Peserta: {event.title}
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Total {registrations.length} peserta terdaftar • Kuota {event.quota} Kursi {event.vipQuota > 0 && `• VIP: ${event.vipQuota} Kursi`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`/api/events/${event.id}/export`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 shadow-md shadow-slate-900/15 transition-all"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Download Laporan Excel (.xlsx)</span>
          </a>

          <Link
            href={`/dashboard/events/${event.id}/checkin`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-800 liquid-pill hover:text-[#17449A]"
          >
            <QrCode className="w-3.5 h-3.5 text-[#17449A]" />
            <span>Scanner Hari-H</span>
          </Link>

          <Link
            href={`/dashboard/events/${event.id}/doorprize`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-800 liquid-pill hover:text-[#17449A]"
          >
            <Sparkles className="w-3.5 h-3.5 text-slate-900" />
            <span>Undian Doorprize</span>
          </Link>
        </div>
      </div>

      <RegistrationsClient
        eventId={event.id}
        eventSlug={event.slug}
        eventTitle={event.title}
        eventLocation={event.location}
        eventStartsAt={event.startsAt.toISOString()}
        initialEmailSubject={event.emailSubject}
        initialEmailBody={event.emailBody}
        formSchema={parsedSchema}
        initialRegistrations={registrations}
        vipQuota={event.vipQuota}
      />
    </div>
  );
}
