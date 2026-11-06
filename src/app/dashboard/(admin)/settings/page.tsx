import { getSystemSettings } from "@/actions/settings";
import { SettingsClient } from "./SettingsClient";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Pengaturan Email & Sistem | YORINDO registration",
};

export default async function SettingsPage() {
  const settings = await getSystemSettings();

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-3xl liquid-glass">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 mb-2 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Kembali ke Dashboard</span>
        </Link>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Pengaturan Email & Keamanan Dashboard
        </h1>
        <p className="text-xs text-slate-600 mt-0.5">
          Atur koneksi SMTP untuk pengiriman otomatis RSVP ke kotak masuk peserta dan amankan dashboard.
        </p>
      </div>

      <SettingsClient initialSettings={settings} />
    </div>
  );
}
