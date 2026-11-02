import { notFound } from "next/navigation";
import { getEventBySlug } from "@/actions/events";
import { PublicNavbar } from "@/components/PublicNavbar";
import { RegistrationForm } from "@/components/RegistrationForm";
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
    title: `Daftar: ${event.title} | EventPass`,
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
  }).format(new Date(event.startsAt));

  return (
    <div className="min-h-screen flex flex-col bg-slate-950">
      <PublicNavbar title={event.title} />

      <main className="flex-1 py-10 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Event Poster & Details */}
          <div className="lg:col-span-7 space-y-6">
            {/* Event Poster Banner */}
            <div className="relative rounded-2xl overflow-hidden border border-slate-800 shadow-2xl aspect-[16/9] bg-slate-900 group">
              {event.posterUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={event.posterUrl}
                  alt={event.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-slate-500">
                  <Ticket className="w-16 h-16 mb-2 opacity-50" />
                  <span>Poster Event</span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-indigo-600/90 backdrop-blur-md text-white mb-2 shadow-lg">
                  {isOpen ? "Pendaftaran Terbuka" : "Pendaftaran Ditutup"}
                </span>
                <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight">
                  {event.title}
                </h1>
              </div>
            </div>

            {/* Event Info Card */}
            <div className="p-6 rounded-2xl glass-card space-y-5">
              <h2 className="text-lg font-bold text-white">Detail Pelaksanaan Acara</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                  <Calendar className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs text-slate-400 font-medium">Waktu Acara</div>
                    <div className="text-xs sm:text-sm font-semibold text-white mt-0.5">
                      {formattedStartDate}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                  <MapPin className="w-5 h-5 text-violet-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs text-slate-400 font-medium">Lokasi / Venue</div>
                    <div className="text-xs sm:text-sm font-semibold text-white mt-0.5">
                      {event.location || "Akan diumumkan"}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                  <Users className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs text-slate-400 font-medium">Sisa Kuota Kursi</div>
                    <div className="text-xs sm:text-sm font-semibold text-white mt-0.5">
                      {quotaRemaining} kursi tersisa{" "}
                      <span className="text-xs text-slate-400 font-normal">
                        (dari {event.quota})
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                  <Clock className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs text-slate-400 font-medium">Mode Konfirmasi</div>
                    <div className="text-xs sm:text-sm font-semibold text-white mt-0.5">
                      {event.rsvpMode === "AUTO" ? "Instan (Auto-Send)" : "Review Panitia"}
                    </div>
                  </div>
                </div>
              </div>

              {event.description && (
                <div className="pt-4 border-t border-slate-800">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Tentang Event
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                    {event.description}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Registration Form */}
          <div className="lg:col-span-5">
            <div className="p-6 sm:p-8 rounded-2xl glass-panel border border-slate-800 shadow-xl sticky top-24">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-white">Formulir Pendaftaran</h2>
                <p className="text-xs text-slate-400 mt-1">
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
