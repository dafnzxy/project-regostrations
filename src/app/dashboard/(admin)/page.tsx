import { getEvents } from "@/actions/events";
import { checkAdminAuth } from "@/actions/auth";
import { redirect } from "next/navigation";
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
  FileSpreadsheet,
} from "lucide-react";
import Link from "next/link";
import { EventCardActions } from "./EventCardActions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Dashboard Overview | YORINDO registration",
};

export default async function DashboardPage() {
  const isAuth = await checkAdminAuth();
  if (!isAuth) {
    redirect("/dashboard/login");
  }

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
    <div className="space-y-6 sm:space-y-8">
      {/* Header Section inside Liquid Glass Hero Banner */}
      <div className="p-5 sm:p-7 rounded-3xl liquid-glass flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-[#17449A]/10 text-[#17449A] border border-[#17449A]/20 mb-2">
            Workspace Manajemen Acara
          </span>
          <h1 className="text-xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Manajemen Event
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Kelola seluruh rangkaian event, pendaftar, check-in QR, dan doorprize dalam satu panel.
          </p>
        </div>

        <Link
          href="/dashboard/events/new"
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-bold text-white bg-[#17449A] hover:bg-[#12367B] active:scale-[0.99] shadow-lg shadow-[#17449A]/20 transition-all text-xs sm:text-sm w-full sm:w-fit shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Event Baru</span>
        </Link>
      </div>

      {/* KPI Cards (Liquid Glass Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl liquid-card glass-card-hover">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] sm:text-xs font-bold text-slate-600">Total Event</span>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl bg-[#17449A]/10 border border-[#17449A]/20 flex items-center justify-center text-[#17449A] shadow-xs shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
            {totalEvents}
          </div>
          <div className="text-[10px] sm:text-[11px] font-medium text-slate-500 mt-0.5 truncate">
            Event aktif & draft
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl liquid-card glass-card-hover">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] sm:text-xs font-bold text-slate-600">Total Pendaftar</span>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-900 shadow-xs shrink-0">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
            {totalRegistrations}
          </div>
          <div className="text-[10px] sm:text-[11px] font-medium text-slate-500 mt-0.5 truncate">
            Database peserta
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl liquid-card glass-card-hover">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] sm:text-xs font-bold text-slate-600">Disetujui (ACC)</span>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl bg-[#17449A]/10 border border-[#17449A]/20 flex items-center justify-center text-[#17449A] shadow-xs shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#17449A] mt-2">
            {totalApproved}
          </div>
          <div className="text-[10px] sm:text-[11px] font-medium text-slate-500 mt-0.5 truncate">
            Tiket QR aktif
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl liquid-card glass-card-hover">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] sm:text-xs font-bold text-slate-600">Check-in Hari-H</span>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-900 shadow-xs shrink-0">
              <QrCode className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
            {totalCheckedIn}
          </div>
          <div className="text-[10px] sm:text-[11px] font-medium text-slate-500 mt-0.5 truncate">
            Hadir di lokasi
          </div>
        </div>
      </div>

      {/* Events List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-lg font-extrabold text-slate-900">Daftar Event</h2>
          <span className="text-xs font-semibold text-slate-500 liquid-pill px-3 py-1 rounded-full">
            {events.length} event terdaftar
          </span>
        </div>

        {events.length === 0 ? (
          <div className="p-12 text-center liquid-glass rounded-3xl">
            <Calendar className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-900">Belum ada event</h3>
            <p className="text-xs text-slate-600 max-w-sm mx-auto mt-1 mb-5">
              Buat event pertama Anda sekarang untuk mulai mengumpulkan registrasi dan mengelola tiket.
            </p>
            <Link
              href="/dashboard/events/new"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold text-white bg-[#17449A] hover:bg-[#12367B] shadow-md shadow-[#17449A]/20"
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
                timeZone: "Asia/Jakarta",
              }).format(new Date(evt.startsAt));

              const quotaPercent = Math.min(
                100,
                Math.round((evt._count.registrations / evt.quota) * 100)
              );

              return (
                <div
                  key={evt.id}
                  className="p-4 sm:p-6 md:p-7 rounded-3xl liquid-glass glass-card-hover flex flex-col justify-between gap-5"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    <div className="space-y-2.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={evt.status} />
                        <span className="text-[11px] sm:text-xs font-bold text-[#17449A] bg-[#17449A]/10 px-2.5 py-0.5 rounded-full border border-[#17449A]/20">
                          Mode RSVP: {evt.rsvpMode === "AUTO" ? "Kirim Otomatis" : "Manual Approval"}
                        </span>
                      </div>

                      <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight break-words">
                        {evt.title}
                      </h3>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-medium text-slate-600">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#17449A] shrink-0" />
                          <span>{formattedDate}</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-900 shrink-0" />
                          <span className="truncate max-w-[220px] sm:max-w-xs">
                            {evt.location || "Venue belum ditentukan"}
                          </span>
                        </span>
                        <span className="font-mono text-[11px] text-slate-500 bg-slate-100/80 px-2 py-0.5 rounded-lg border border-slate-200/70 break-all">
                          /e/{evt.slug}
                        </span>
                      </div>
                    </div>

                    <EventCardActions
                      eventId={evt.id}
                      slug={evt.slug}
                      status={evt.status}
                      eventTitle={evt.title}
                    />
                  </div>

                  {/* Quota Progress Bar inside Translucent Sub-Card */}
                  <div className="p-3.5 sm:p-4 rounded-2xl liquid-card space-y-2">
                    <div className="flex items-center justify-between text-xs gap-2">
                      <span className="font-semibold text-slate-600">Kapasitas Pendaftar</span>
                      <span className="font-bold text-slate-900">
                        {evt._count.registrations} / {evt.quota} Peserta ({quotaPercent}%)
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-200/80 rounded-full overflow-hidden p-0.5">
                      <div
                        className="h-full bg-[#17449A] rounded-full transition-all duration-300"
                        style={{ width: `${quotaPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Functional Navigation Buttons (Responsive Grid on Mobile/Tablet, Flex on Desktop) */}
                  <div className="pt-4 border-t border-slate-200/70 grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap items-center gap-2">
                    <Link
                      href={`/dashboard/events/${evt.id}/registrations`}
                      className="inline-flex items-center justify-center sm:justify-start gap-2 px-3.5 py-2.5 sm:py-2 rounded-2xl text-xs font-bold text-slate-900 hover:text-[#17449A] liquid-pill"
                    >
                      <Users className="w-3.5 h-3.5 text-[#17449A] shrink-0" />
                      <span className="truncate">Data Peserta & ACC ({evt._count.registrations})</span>
                    </Link>

                    <Link
                      href={`/dashboard/events/${evt.id}/form-builder`}
                      className="inline-flex items-center justify-center sm:justify-start gap-2 px-3.5 py-2.5 sm:py-2 rounded-2xl text-xs font-bold text-slate-900 hover:text-[#17449A] liquid-pill"
                    >
                      <Sliders className="w-3.5 h-3.5 text-slate-900 shrink-0" />
                      <span className="truncate">Custom Form Builder</span>
                    </Link>

                    <Link
                      href={`/dashboard/events/${evt.id}/checkin`}
                      className="inline-flex items-center justify-center sm:justify-start gap-2 px-3.5 py-2.5 sm:py-2 rounded-2xl text-xs font-bold text-slate-900 hover:text-[#17449A] liquid-pill"
                    >
                      <QrCode className="w-3.5 h-3.5 text-[#17449A] shrink-0" />
                      <span className="truncate">Scanner Hari-H</span>
                    </Link>

                    <Link
                      href={`/dashboard/events/${evt.id}/doorprize`}
                      className="inline-flex items-center justify-center sm:justify-start gap-2 px-3.5 py-2.5 sm:py-2 rounded-2xl text-xs font-bold text-slate-900 hover:text-[#17449A] liquid-pill"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-slate-900 shrink-0" />
                      <span className="truncate">Spin Wheel ({evt._count.prizes} Hadiah)</span>
                    </Link>

                    <a
                      href={`/api/events/${evt.id}/export`}
                      className="sm:col-span-2 lg:col-span-1 inline-flex items-center justify-center sm:justify-start gap-2 px-3.5 py-2.5 sm:py-2 rounded-2xl text-xs font-bold text-white bg-[#17449A] hover:bg-[#12367B] shadow-xs transition-all"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-white shrink-0" />
                      <span>Export Excel (.xlsx)</span>
                    </a>
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
