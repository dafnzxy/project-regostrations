import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { generateQrDataUrl } from "@/lib/qr";
import { PublicNavbar } from "@/components/PublicNavbar";
import { StatusBadge } from "@/components/StatusBadge";
import { Calendar, MapPin, Download, Printer, CheckCircle2, QrCode as QrIcon } from "lucide-react";
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
    include: { event: true },
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
    include: { event: true },
  });

  if (!reg) {
    notFound();
  }

  const qrDataUrl = await generateQrDataUrl(reg.qrToken);

  const formattedDate = new Intl.DateTimeFormat("id-ID", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(reg.event.startsAt));

  let customAnswers: Record<string, any> = {};
  try {
    customAnswers = JSON.parse(reg.answers || "{}");
  } catch (e) {
    customAnswers = {};
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950">
      <PublicNavbar title={reg.event.title} />

      <main className="flex-1 py-10 px-4 sm:px-6 max-w-xl mx-auto w-full">
        {/* Ticket Container */}
        <div id="printable-ticket" className="glass-panel rounded-3xl border border-slate-700/80 shadow-2xl overflow-hidden">
          {/* Header Bar */}
          <div className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 p-6 text-white text-center relative overflow-hidden">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold uppercase tracking-wider mb-2">
              <QrIcon className="w-3.5 h-3.5" />
              <span>Official Event Pass</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">{reg.event.title}</h1>
            <p className="text-xs text-indigo-100 mt-1">{reg.event.location || "Jakarta, Indonesia"}</p>
          </div>

          {/* Ticket Body */}
          <div className="p-6 sm:p-8 space-y-6">
            {/* Status and Participant Name */}
            <div className="text-center">
              <StatusBadge status={reg.status} className="mb-3 text-xs" />
              <h2 className="text-2xl font-extrabold text-white">{reg.name}</h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">{reg.email}</p>
              {customAnswers.company && (
                <p className="text-xs font-medium text-indigo-400 mt-1">
                  {customAnswers.jobTitle ? `${customAnswers.jobTitle} • ` : ""}
                  {customAnswers.company}
                </p>
              )}
            </div>

            {/* QR Code Presentation */}
            <div className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl shadow-inner border border-slate-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrDataUrl}
                alt={`QR Code ${reg.name}`}
                className="w-56 h-56 object-contain"
              />
              <div className="mt-3 text-center">
                <span className="text-[11px] font-mono tracking-wider font-semibold text-slate-600 uppercase">
                  TOKEN: {reg.qrToken}
                </span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Tunjukkan QR code ini ke petugas meja check-in saat kedatangan
                </p>
              </div>
            </div>

            {/* Event Time & Venue Details */}
            <div className="space-y-3 pt-2 border-t border-slate-800 text-xs text-slate-300">
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-indigo-400" /> Waktu Acara
                </span>
                <span className="font-semibold text-right text-white">{formattedDate}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-violet-400" /> Lokasi
                </span>
                <span className="font-semibold text-right text-white">
                  {reg.event.location || "Sesuai undangan"}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="p-4 bg-slate-900/80 border-t border-slate-800 flex items-center justify-center gap-3">
            <TicketActions qrDataUrl={qrDataUrl} name={reg.name} />
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link
            href={`/e/${reg.event.slug}`}
            className="text-xs text-slate-400 hover:text-white underline underline-offset-4"
          >
            ← Kembali ke Halaman Event
          </Link>
        </div>
      </main>
    </div>
  );
}
