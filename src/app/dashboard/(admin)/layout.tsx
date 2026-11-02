import Link from "next/link";
import {
  LayoutDashboard,
  CalendarPlus,
  QrCode,
  Sparkles,
  ArrowLeft,
  Settings,
  Mail,
  Shield,
} from "lucide-react";
import { checkAdminAuth } from "@/actions/auth";
import { redirect } from "next/navigation";
import { LogoutButton } from "../LogoutButton";

export const dynamic = "force-dynamic";

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isAuth = await checkAdminAuth();
  if (!isAuth) {
    redirect("/dashboard/login");
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-950 text-slate-100">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-slate-800/80 glass-panel md:min-h-screen p-5 flex flex-col justify-between">
        <div className="space-y-6">
          {/* Logo / Header */}
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
                <QrCode className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="font-bold text-base text-white tracking-tight">EventPass</span>
                <span className="block text-[11px] text-indigo-400 font-medium">Dashboard Admin</span>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1 text-sm font-medium">
            <Link
              href="/dashboard"
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
            >
              <LayoutDashboard className="w-4 h-4 text-indigo-400" />
              <span>Semua Event</span>
            </Link>

            <Link
              href="/dashboard/events/new"
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
            >
              <CalendarPlus className="w-4 h-4 text-emerald-400" />
              <span>Buat Event Baru</span>
            </Link>

            <Link
              href="/dashboard/settings"
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
            >
              <Settings className="w-4 h-4 text-pink-400" />
              <span>Pengaturan Email & PIN</span>
            </Link>

            <div className="pt-4 pb-1">
              <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Akses Cepat Demo
              </span>
            </div>

            <Link
              href="/dashboard/events/tech-innovators-summit-2026/checkin"
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors"
            >
              <QrCode className="w-3.5 h-3.5 text-indigo-400" />
              <span>Scanner Hari-H</span>
            </Link>

            <Link
              href="/dashboard/events/tech-innovators-summit-2026/doorprize"
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-pink-400" />
              <span>Spin Wheel Doorprize</span>
            </Link>
          </nav>
        </div>

        {/* Footer info in sidebar */}
        <div className="pt-6 border-t border-slate-800/80 space-y-3">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs text-slate-400 hover:text-white py-1 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Ke Halaman Depan</span>
          </Link>

          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] text-slate-400">
            <div className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-indigo-400" />
              <span>Admin: Daffa</span>
            </div>
            <div className="text-slate-400 text-[10px] mt-0.5">Super Admin • Sesi Aktif</div>
          </div>

          <LogoutButton />
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-8 lg:p-10 max-w-7xl mx-auto w-full overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
