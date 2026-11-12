import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { generateQrDataUrl } from "@/lib/qr";
import { PublicNavbar } from "@/components/PublicNavbar";
import { StatusBadge } from "@/components/StatusBadge";
import { Calendar, MapPin, QrCode as QrIcon, Clock, XCircle, Crown } from "lucide-react";
import Link from "next/link";
import { TicketActions } from "./TicketActions";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { token } = await params;
  const reg = await prisma.registration.findUnique({
    where: { qrToken: token },
    select: {
      name: true,
      event: { select: { title: true } },
    },
  });

  if (!reg) return { title: "E-Ticket Tidak Ditemukan" };

  return {
    title: `E-Ticket: ${reg.name} - ${reg.event.title}`,
  };
}

export default async function TicketPage({ params }: PageProps) {
  const { token } = await params;

  const reg = await prisma.registration.findUnique({
    where: { qrToken: token },
    select: {
      id: true,
      name: true,
      email: true,
      answers: true,
      status: true,
      qrToken: true,
      isVip: true,
      event: {
        select: {
          title: true,
          location: true,
          startsAt: true,
          slug: true,
        },
      },
    },
  });

  if (!reg) {
    notFound();
  }

  const isTicketActive =
    reg.status === "APPROVED" || reg.status === "CHECKED_IN";
  const qrDataUrl = isTicketActive
    ? await generateQrDataUrl(reg.qrToken)
    : null;

  const formattedDate = new Intl.DateTimeFormat("id-ID", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(reg.event.startsAt));

  let customAnswers: Record<string, any> = {};
  try {
    customAnswers = JSON.parse(reg.answers || "{}");
  } catch {
    customAnswers = {};
  }

  return (
    <div className="min-h-screen flex flex-col bg-transparent relative">
      <PublicNavbar title={reg.event.title} />

      <main className="flex-1 py-6 sm:py-10 px-3.5 sm:px-6 max-w-xl mx-auto w-full">
        {/* Ticket Container */}
        <div
          id="printable-ticket"
          className="liquid-glass rounded-3xl overflow-hidden"
        >
          {/* Header Bar */}
          <div className="bg-[#17449A] p-5 sm:p-6 text-white text-center relative overflow-hidden">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/95 text-xs shadow-sm mb-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/assets/yorindo-logo.png"
                alt="YORINDO Logo"
                className="w-4 h-4 object-contain"
              />
              <span>
                <span className="font-extrabold text-[#17449A]">YORINDO</span>{" "}
                <span className="font-bold text-black">registration</span>
              </span>
            </div>
            <h1 className="text-lg sm:text-2xl font-black tracking-tight px-2">
              {reg.event.title}
            </h1>
            <p className="text-xs text-slate-200 mt-1">
              {reg.event.location || "Jakarta, Indonesia"}
            </p>
          </div>

          {/* Ticket Body */}
          <div className="p-5 sm:p-8 space-y-5 sm:space-y-6">
            {/* Status and Participant Name */}
            <div className="text-center">
              <StatusBadge status={reg.status} className="mb-3 text-xs" />
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 break-words">
                {reg.name}
              </h2>
              {reg.isVip && (
                <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 border border-amber-200">
                  <Crown className="w-3.5 h-3.5 text-amber-600" />
                  <span className="text-xs font-bold text-amber-800">VIP</span>
                </div>
              )}
              <p className="text-xs sm:text-sm text-slate-600 mt-0.5 break-all">
                {reg.email}
              </p>
              {customAnswers.company && (
                <p className="text-xs font-bold text-[#17449A] mt-1 break-words">
                  {customAnswers.jobTitle ? `${customAnswers.jobTitle} • ` : ""}
                  {customAnswers.company}
                </p>
              )}
            </div>

            {/* QR Code Presentation (Only if APPROVED or CHECKED_IN) */}
            {isTicketActive && qrDataUrl ? (
              <div className="flex flex-col items-center justify-center p-4 sm:p-6 bg-white rounded-3xl shadow-inner border border-slate-200/90">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrDataUrl}
                  alt={`QR Code ${reg.name}`}
                  className="w-48 h-48 sm:w-56 sm:h-56 object-contain"
                />
                <div className="mt-3 text-center">
                  <span className="text-[11px] font-mono tracking-wider font-bold text-slate-700 uppercase">
                    TOKEN: {reg.qrToken}
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Tunjukkan QR code ini ke petugas meja check-in saat
                    kedatangan
                  </p>
                </div>
              </div>
            ) : reg.status === "PENDING" ? (
              <div className="p-6 rounded-2xl bg-amber-50/90 border border-amber-200 text-center space-y-2">
                <Clock className="w-10 h-10 text-amber-500 mx-auto" />
                <h3 className="text-sm font-extrabold text-slate-900">
                  Menunggu Persetujuan Panitia
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Pendaftaran Anda sedang ditinjau oleh penyelenggara acara. QR
                  Code E-Tiket akan otomatis aktif dan dikirimkan ke email Anda
                  setelah disetujui.
                </p>
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-rose-50/90 border border-rose-200 text-center space-y-2">
                <XCircle className="w-10 h-10 text-rose-500 mx-auto" />
                <h3 className="text-sm font-extrabold text-slate-900">
                  E-Tiket Tidak Aktif
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Mohon maaf, status pendaftaran untuk tiket ini tidak dapat
                  digunakan untuk check-in acara.
                </p>
              </div>
            )}

            {/* Event Time & Venue Details */}
            <div className="space-y-3 pt-4 border-t border-slate-200/80 text-xs text-slate-700">
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-[#17449A]" /> Waktu Acara
                </span>
                <span className="font-bold text-right text-slate-900">
                  {formattedDate}
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-slate-900" /> Lokasi
                </span>
                <span className="font-bold text-right text-slate-900">
                  {reg.event.location || "Sesuai undangan"}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          {isTicketActive && qrDataUrl && (
            <div className="p-4 bg-white/70 border-t border-slate-200/80 flex items-center justify-center gap-3">
              <TicketActions qrDataUrl={qrDataUrl} name={reg.name} />
            </div>
          )}
        </div>

        <div className="mt-6 text-center">
          <Link
            href={`/e/${reg.event.slug}`}
            className="text-xs font-bold text-[#17449A] hover:text-[#12367B] underline underline-offset-4"
          >
            ← Kembali ke Halaman Registrasi Event
          </Link>
        </div>
      </main>
    </div>
  );
}
