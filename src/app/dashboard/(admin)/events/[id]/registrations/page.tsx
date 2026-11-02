import { notFound } from "next/navigation";
import { getEventById } from "@/actions/events";
import { getEventRegistrations } from "@/actions/registrations";
import { RegistrationsClient } from "./RegistrationsClient";
import { FormField } from "@/types";
import Link from "next/link";
import { ArrowLeft, ExternalLink, QrCode, Sparkles } from "lucide-react";

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Dashboard</span>
          </Link>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Database Peserta: {event.title}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Total {registrations.length} peserta terdaftar • Kuota {event.quota}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/events/${event.id}/checkin`}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
          >
            <QrCode className="w-3.5 h-3.5 text-emerald-400" />
            <span>Scanner Hari-H</span>
          </Link>

          <Link
            href={`/dashboard/events/${event.id}/doorprize`}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-pink-400" />
            <span>Undian Doorprize</span>
          </Link>
        </div>
      </div>

      <RegistrationsClient
        eventId={event.id}
        eventTitle={event.title}
        formSchema={parsedSchema}
        initialRegistrations={registrations}
      />
    </div>
  );
}
