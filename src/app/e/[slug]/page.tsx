import { notFound } from "next/navigation";
import { getEventBySlug } from "@/actions/events";
import { PublicNavbar } from "@/components/PublicNavbar";
import { RegistrationForm } from "@/components/RegistrationForm";
import { ShareEventQrButton } from "@/components/ShareEventQrButton";
import { FormField } from "@/types";
import { Calendar, MapPin, Users, Clock, ShieldCheck, Ticket } from "lucide-react";
import Image from "next/image";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);

  if (!event) return { title: "Event Tidak Ditemukan" };

  return {
    title: `Daftar: ${event.title} | YORINDO registration`,
    description: event.description || `Formulir pendaftaran resmi untuk ${event.title}`,
  };
}

export default async function PublicEventPage({ params }: PageProps) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);

  if (!event) {
    notFound();
  }

  let parsedFormSchema: FormField[] = [];
  try {
    parsedFormSchema = JSON.parse(event.formSchema || "[]");
  } catch (e) {
    parsedFormSchema = [];
  }

  const registeredCount = event._count.registrations;
  const quotaRemaining = Math.max(0, event.quota - registeredCount);
  const isOpen = event.status === "OPEN";

  const formattedStartDate = new Intl.DateTimeFormat("id-ID", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(event.startsAt));

  return (
    <div className="min-h-screen flex flex-col bg-transparent relative">
      <PublicNavbar title={event.title} />

      <main className="flex-1 py-5 sm:py-8 md:py-10 px-3.5 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Left Column: Event Poster & Details */}
          <div className="lg:col-span-7 space-y-5 sm:space-y-6">
            {/* Event Poster Banner (Tightly Fitted Frame, Balanced Size, Uncropped) */}
            {event.posterUrl ? (
              <div className="w-fit max-w-full mx-auto rounded-3xl liquid-glass p-1.5 sm:p-2 shadow-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={event.posterUrl}
                  alt={event.title}
                  className="w-auto max-w-full max-h-[320px] sm:max-h-[370px] md:max-h-[400px] object-contain block rounded-2xl"
                />
              </div>
            ) : (
              <div className="rounded-3xl h-48 sm:h-56 liquid-glass flex flex-col items-center justify-center p-6 text-slate-400">
                <Ticket className="w-12 h-12 mb-2 opacity-50 text-[#17449A]" />
                <span className="text-xs sm:text-sm font-medium">Banner / Poster Event</span>
              </div>
            )}

            {/* Mobile Quick Jump to Form CTA (< 1024px) */}
            <div className="lg:hidden">
              <a
                href="#form-registrasi"
                className="w-full py-3 px-4 rounded-2xl font-bold text-xs sm:text-sm text-white bg-[#17449A] hover:bg-[#12367B] shadow-lg shadow-[#17449A]/25 flex items-center justify-center gap-2"
              >
                <Ticket className="w-4 h-4" />
                <span>Langsung Isi Formulir Pendaftaran ↓</span>
              </a>
            </div>

            {/* Event Header & Info Card */}
            <div className="p-5 sm:p-7 rounded-3xl liquid-glass space-y-4 sm:space-y-5">
              {/* Event Status Badge & Title */}
              <div className="space-y-2 pb-4 border-b border-slate-200/80">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold shadow-2xs ${
                      isOpen
                        ? "bg-[#17449A] text-white"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isOpen ? "bg-emerald-300 animate-pulse" : "bg-slate-500"
                      }`}
                    />
                    {isOpen ? "Pendaftaran Terbuka" : "Pendaftaran Ditutup"}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200/80">
                    <Users className="w-3 h-3 text-[#17449A]" />
                    <span>{quotaRemaining} kursi tersisa</span>
                  </span>
                  <ShareEventQrButton slug={event.slug} eventTitle={event.title} />
                </div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight leading-snug break-words">
                  {event.title}
                </h1>
              </div>

              <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
                Detail Pelaksanaan Acara
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="flex items-start gap-3 p-3.5 sm:p-4 rounded-2xl liquid-card">
                  <div className="w-9 h-9 rounded-xl bg-[#17449A]/10 border border-[#17449A]/20 flex items-center justify-center text-[#17449A] flex-shrink-0">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] sm:text-xs text-slate-500 font-semibold">Waktu Acara</div>
                    <div className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5 break-words">
                      {formattedStartDate}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 sm:p-4 rounded-2xl liquid-card">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-900 flex-shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] sm:text-xs text-slate-500 font-semibold">Lokasi / Venue</div>
                    <div className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5 break-words">
                      {event.location || "Akan diumumkan"}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 sm:p-4 rounded-2xl liquid-card">
                  <div className="w-9 h-9 rounded-xl bg-[#17449A]/10 border border-[#17449A]/20 flex items-center justify-center text-[#17449A] flex-shrink-0">
                    <Users className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] sm:text-xs text-slate-500 font-semibold">Sisa Kuota Kursi</div>
                    <div className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5">
                      {quotaRemaining} kursi tersisa{" "}
                      <span className="text-xs text-slate-500 font-normal">
                        (dari {event.quota})
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 sm:p-4 rounded-2xl liquid-card">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-900 flex-shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] sm:text-xs text-slate-500 font-semibold">Mode Konfirmasi</div>
                    <div className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5">
                      {event.rsvpMode === "AUTO" ? "Instan (Auto-Send)" : "Review Panitia"}
                    </div>
                  </div>
                </div>
              </div>

              {event.description && (
                <div className="pt-4 border-t border-slate-200/80">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#17449A] mb-2">
                    Tentang Event
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                    {event.description}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Registration Form */}
          <div id="form-registrasi" className="lg:col-span-5 scroll-mt-20">
            <div className="p-5 sm:p-7 md:p-8 rounded-3xl liquid-glass lg:sticky lg:top-24">
              <div className="mb-5 sm:mb-6">
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
                  Formulir Pendaftaran
                </h2>
                <p className="text-xs text-slate-600 mt-1">
                  Lengkapi data Anda di bawah ini untuk mendapatkan E-Ticket RSVP.
                </p>
              </div>

              <RegistrationForm
                slug={event.slug}
                formSchema={parsedFormSchema}
                quotaRemaining={quotaRemaining}
                isOpen={isOpen}
                rsvpMode={event.rsvpMode}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
