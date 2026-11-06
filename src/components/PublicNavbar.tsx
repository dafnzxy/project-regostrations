import { ShieldCheck } from "lucide-react";

interface PublicNavbarProps {
  title?: string;
}

export function PublicNavbar({ title }: PublicNavbarProps) {
  return (
    <header className="sticky top-0 z-50 w-full liquid-glass border-b border-slate-200/80 select-none">
      <div className="max-w-6xl mx-auto px-3.5 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2.5 sm:gap-4">
        {/* Static brand header - strictly isolated from admin dashboard */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/yorindo-logo.png"
            alt="YORINDO Logo"
            className="w-8 h-8 sm:w-9 sm:h-9 object-contain flex-shrink-0 mix-blend-multiply"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm sm:text-base tracking-tight whitespace-nowrap">
                <span className="font-extrabold text-[#17449A]">YORINDO</span>{" "}
                <span className="font-bold text-black">registration</span>
              </span>
              <span className="hidden md:inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#17449A]/10 text-[#17449A] border border-[#17449A]/20 whitespace-nowrap">
                Portal Registrasi Peserta
              </span>
            </div>
            {title && (
              <p className="text-[10px] sm:text-[11px] font-medium text-slate-600 truncate">
                {title}
              </p>
            )}
          </div>
        </div>

        {/* Security badge for registrants */}
        <div className="flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs font-semibold text-slate-800 bg-slate-100/90 border border-slate-200/90 px-2.5 sm:px-3 py-1 rounded-full flex-shrink-0">
          <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#17449A] shrink-0" />
          <span className="hidden sm:inline">Formulir Pendaftaran Resmi</span>
          <span className="sm:hidden">Resmi</span>
        </div>
      </div>
    </header>
  );
}
