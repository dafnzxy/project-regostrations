import { getEvents } from "@/actions/events";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Calendar,
  Users,
  CheckCircle2,
  QrCode,
  Sparkles,
  Sliders,
  Plus,
  ArrowRight,
  MapPin,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { EventCardActions } from "./EventCardActions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Dashboard Overview | EventPass",
};

export default async function DashboardPage() {
  const events = await getEvents();

  // Calculate high level KPIs
  const totalEvents = events.length;
  const totalRegistrations = await prisma.registration.count();
  const totalApproved = await prisma.registration.count({
    where: { status: "APPROVED" },
  });
  const totalCheckedIn = await prisma.registration.count({
    where: { status: "CHECKED_IN" },
  });

  return (
    <div className="space-y-8">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Manajemen Event
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Kelola seluruh rangkaian event, pendaftar, check-in QR, dan doorprize.
          </p>
        </div>

        <Link
          href="/dashboard/events/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 shadow-lg shadow-indigo-600/25 transition-all text-sm w-fit"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Event Baru</span>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl glass-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Event</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white mt-2">{totalEvents}</div>
          <div className="text-[11px] text-slate-400 mt-1">Event aktif & draft</div>
        </div>

        <div className="p-5 rounded-2xl glass-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Pendaftar</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white mt-2">
            {totalRegistrations}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Seluruh database peserta</div>
        </div>

        <div className="p-5 rounded-2xl glass-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Peserta Disetujui</span>
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-violet-400 mt-2">
            {totalApproved}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Mendapatkan RSVP QR Code</div>
        </div>

        <div className="p-5 rounded-2xl glass-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Check-in Hari-H</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
              <QrCode className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-400 mt-2">
            {totalCheckedIn}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Hadir di lokasi acara</div>
        </div>
      </div>

      {/* Events List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Daftar Event</h2>
          <span className="text-xs text-slate-400">{events.length} event terdaftar</span>
        </div>

        {events.length === 0 ? (
          <div className="p-12 text-center glass-card rounded-2xl border border-slate-800">
            <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-white">Belum ada event</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-5">
              Buat event pertama Anda sekarang untuk mulai mengumpulkan registrasi dan mengelola tiket.
            </p>
            <Link
              href="/dashboard/events/new"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500"
            >
              <Plus className="w-4 h-4" />
              <span>Buat Event Baru</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5">
            {events.map((evt) => {
              const formattedDate = new Intl.DateTimeFormat("id-ID", {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(evt.startsAt));

              const quotaPercent = Math.min(
                100,
                Math.round((evt._count.registrations / evt.quota) * 100)
              );

              return (
                <div
                  key={evt.id}
                  className="p-6 rounded-2xl glass-panel border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col justify-between gap-6"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <StatusBadge status={evt.status} />
                        <span className="text-xs font-semibold text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
                          Mode RSVP: {evt.rsvpMode === "AUTO" ? "Kirim Otomatis" : "Manual Approval"}
                        </span>
                      </div>

                      <h3 className="text-xl font-bold text-white tracking-tight">{evt.title}</h3>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-indigo-400" />
                          {formattedDate}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-violet-400" />
                          {evt.location || "Venue belum ditentukan"}
                        </span>
                        <span className="font-mono text-slate-400">/e/{evt.slug}</span>
                      </div>
                    </div>

                    <EventCardActions eventId={evt.id} slug={evt.slug} />
                  </div>

                  {/* Quota Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Kapasitas Pendaftar</span>
                      <span className="font-semibold text-white">
                        {evt._count.registrations} / {evt.quota} Peserta ({quotaPercent}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-300"
                        style={{ width: `${quotaPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Functional Navigation Buttons */}
                  <div className="pt-4 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
                    <Link
                      href={`/dashboard/events/${evt.id}/registrations`}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
                    >
                      <Users className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Data Peserta & Approval ({evt._count.registrations})</span>
                    </Link>

                    <Link
                      href={`/dashboard/events/${evt.id}/form-builder`}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
                    >
                      <Sliders className="w-3.5 h-3.5 text-amber-400" />
                      <span>Custom Form Builder</span>
                    </Link>

                    <Link
                      href={`/dashboard/events/${evt.id}/checkin`}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
                    >
                      <QrCode className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Scanner Hari-H</span>
                    </Link>

                    <Link
                      href={`/dashboard/events/${evt.id}/doorprize`}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                      <span>Doorprize Spin Wheel ({evt._count.prizes} Hadiah)</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
