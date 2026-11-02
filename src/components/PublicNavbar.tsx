import Link from "next/link";
import { QrCode, ShieldCheck, Ticket } from "lucide-react";

interface PublicNavbarProps {
  title?: string;
}

export function PublicNavbar({ title }: PublicNavbarProps) {
  return (
    <header className="sticky top-0 z-50 w-full glass-panel border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand without admin links */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <QrCode className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-base font-bold text-white tracking-tight">
              EventPass
            </span>
            <span className="hidden sm:inline-block ml-2 text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              Registrasi Resmi
            </span>
          </div>
        </div>

        {/* Security badge for registrants */}
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="hidden sm:inline font-medium">Formulir Pendaftaran Aman</span>
          <span className="sm:hidden font-medium">Aman</span>
        </div>
      </div>
    </header>
  );
}
