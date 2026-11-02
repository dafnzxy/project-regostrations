import Link from "next/link";
import {
  QrCode,
  Calendar,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Users,
  Sliders,
  ArrowRight,
  Zap,
  Ticket,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-24 md:pt-20 md:pb-32">
        {/* Subtle background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-indigo-600/20 blur-[130px] rounded-full pointer-events-none -z-10" />
        <div className="absolute top-1/3 right-1/4 w-[400px] h-[250px] bg-violet-600/15 blur-[100px] rounded-full pointer-events-none -z-10" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs sm:text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>Sistem Manajemen Registrasi Event & Doorprize End-to-End</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight sm:leading-none">
            Kelola Registrasi Event, RSVP QR Code, &{" "}
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">
              Doorprize Spin Wheel
            </span>{" "}
            Tanpa Ribet
          </h1>

          <p className="mt-6 text-base sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Dari pembuatan form dinamis tanpa coding, approval peserta, pengiriman tiket RSVP ber-QR code via email, scan check-in cepat di hari-H, hingga undian doorprize interaktif.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl text-base font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 shadow-xl shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:scale-[1.02] transition-all duration-200"
            >
              <span>Buka Admin Dashboard</span>
              <ArrowRight className="w-5 h-5" />
            </Link>

            <Link
              href="/e/tech-innovators-summit-2026"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-base font-semibold text-slate-200 bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 hover:border-slate-600 transition-all duration-200"
            >
              <Ticket className="w-5 h-5 text-emerald-400" />
              <span>Coba Formulir Pendaftaran Demo</span>
            </Link>
          </div>

          {/* Quick Metrics Bar */}
          <div className="mt-16 pt-10 border-t border-slate-800/80 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="p-4 rounded-xl glass-card">
              <div className="text-2xl sm:text-3xl font-extrabold text-white">100%</div>
              <div className="text-xs sm:text-sm text-slate-400 mt-1">Tanpa Coding (No-Code Form)</div>
            </div>
            <div className="p-4 rounded-xl glass-card">
              <div className="text-2xl sm:text-3xl font-extrabold text-indigo-400">&lt; 1 Detik</div>
              <div className="text-xs sm:text-sm text-slate-400 mt-1">Validasi Scan QR Hari-H</div>
            </div>
            <div className="p-4 rounded-xl glass-card">
              <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400">Otomatis</div>
              <div className="text-xs sm:text-sm text-slate-400 mt-1">RSVP Email & E-Ticket</div>
            </div>
            <div className="p-4 rounded-xl glass-card">
              <div className="text-2xl sm:text-3xl font-extrabold text-pink-400">Fair Play</div>
              <div className="text-xs sm:text-sm text-slate-400 mt-1">Server-Side Doorprize Wheel</div>
            </div>
          </div>
        </div>
      </section>

      {/* Key Feature Pillars */}
      <section className="py-16 bg-slate-900/40 border-y border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">
              Semua Fitur yang Dibutuhkan Penyelenggara Event
            </h2>
            <p className="mt-3 text-slate-400 text-sm sm:text-base">
              Dirancang sesuai spesifikasi PRD v0.1 untuk alur operasional event yang mulus dan profesional.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-6 rounded-2xl glass-card glass-card-hover flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-5">
                  <Sliders className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Custom Form Builder</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Field wajib bawaan (Nama & Email) ditambah field kustom bebas: perusahaan, jabatan, dropdown industri, pilihan konsumsi, nomor WhatsApp, dan lainnya dalam format JSON schema.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-800 flex items-center gap-2 text-xs text-indigo-400 font-medium">
                <CheckCircle2 className="w-4 h-4" /> Live preview form sebelum publish
              </div>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-2xl glass-card glass-card-hover flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-5">
                  <QrCode className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">RSVP QR Code & Hari-H Scanner</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Token QR unik dikirim ke email peserta saat pendaftaran disetujui (manual atau auto-send). Panitia melakukan check-in cepat memakai kamera HP/laptop dengan status validasi instan.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-800 flex items-center gap-2 text-xs text-emerald-400 font-medium">
                <CheckCircle2 className="w-4 h-4" /> Audio-visual feedback & manual search
              </div>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-2xl glass-card glass-card-hover flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 mb-5">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Doorprize Spin Wheel Interaktif</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Layar undian mode panggung/proyektor layar penuh. Peserta diambil otomatis dari data yang hadir (checked-in). Diundi dengan server-side fair random, animasi putaran roda, efek suara, dan konfeti.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-800 flex items-center gap-2 text-xs text-pink-400 font-medium">
                <CheckCircle2 className="w-4 h-4" /> Log riwayat pemenang & tombol undi ulang
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-8 border-t border-slate-900 bg-slate-950 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4">
          <p>© 2026 EventPass – Sistem Registrasi Event & Doorprize. Dibuat berdasarkan PRD v0.1.</p>
        </div>
      </footer>
    </div>
  );
}
