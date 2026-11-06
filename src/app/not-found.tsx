import { AlertTriangle, ShieldAlert } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-white relative overflow-hidden flex flex-col items-center justify-center p-4 text-center">
      <div className="absolute -top-20 -left-20 w-96 h-96 bg-amber-300/15 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-indigo-300/15 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-md w-full liquid-glass rounded-3xl p-8 space-y-4 relative z-10">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mx-auto shadow-xs">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h1 className="text-xl font-extrabold text-slate-900">
          Halaman atau Event Tidak Ditemukan
        </h1>
        <p className="text-xs text-slate-600 leading-relaxed">
          Tautan registrasi atau tiket yang Anda akses tidak tersedia atau sudah tidak berlaku. Pastikan Anda membuka link undangan resmi dari penyelenggara acara.
        </p>
        <div className="pt-4 border-t border-slate-200/80 flex items-center justify-center gap-1.5 text-[11px] font-medium text-slate-500">
          <ShieldAlert className="w-3.5 h-3.5 text-slate-500" />
          <span>
            <span className="font-extrabold text-[#17449A]">YORINDO</span>{" "}
            <span className="font-bold text-black">registration</span> • Akses Terisolasi
          </span>
        </div>
      </div>
    </div>
  );
}

