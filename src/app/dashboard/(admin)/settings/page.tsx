import { getSystemSettings } from "@/actions/settings";
import { SettingsClient } from "./SettingsClient";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Pengaturan Email & Sistem | EventPass",
};

export default async function SettingsPage() {
  const settings = await getSystemSettings();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white mb-2 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Kembali ke Dashboard</span>
        </Link>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Pengaturan Email & Keamanan Dashboard
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Atur koneksi SMTP untuk pengiriman otomatis RSVP ke kotak masuk peserta dan amankan dashboard.
        </p>
      </div>

      <SettingsClient initialSettings={settings} />
    </div>
  );
}
