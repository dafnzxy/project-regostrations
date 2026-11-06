"use client";

import { useState } from "react";
import { loginAdmin } from "@/actions/auth";
import { useRouter } from "next/navigation";
import { ShieldCheck, Lock, ArrowRight, Loader2 } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [passcode, setPasscode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await loginAdmin(passcode);
      if (!res.success) {
        setError(res.message || "Kode akses salah.");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err: any) {
      setError(err?.message || "Terjadi kesalahan sistem.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white relative overflow-hidden flex flex-col items-center justify-center p-4">
      {/* Ambient Liquid Light Orbs on White Canvas */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-400/15 blur-[110px] rounded-full pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-sky-400/15 blur-[110px] rounded-full pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[28rem] h-[28rem] bg-violet-300/10 blur-[130px] rounded-full pointer-events-none" />

      <div className="max-w-md w-full liquid-glass rounded-3xl p-8 space-y-6 relative z-10">
        <div className="text-center space-y-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/yorindo-logo.png"
            alt="YORINDO Logo"
            className="w-16 h-16 object-contain mx-auto mix-blend-multiply"
          />
          <h1 className="text-2xl tracking-tight">
            <span className="font-extrabold text-[#17449A]">YORINDO</span>{" "}
            <span className="font-bold text-black">registration</span>
          </h1>
          <p className="text-xs text-slate-600 leading-relaxed">
            Sistem Manajemen Registrasi, QR Check-In & Doorprize. Masukkan PIN / kata sandi pengelola untuk membuka dashboard.
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-50/90 border border-rose-200/90 text-rose-700 text-xs font-medium text-center shadow-xs backdrop-blur-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Kode Akses / PIN Admin
            </label>
            <div className="relative">
              <input
                type="password"
                required
                autoFocus
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Masukkan PIN Admin"
                className="w-full px-4 py-3.5 rounded-2xl liquid-input text-slate-900 placeholder-slate-400 text-sm tracking-widest text-center font-mono font-bold"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !passcode}
            className="w-full py-3.5 px-4 rounded-2xl text-xs font-bold text-white bg-[#17449A] hover:bg-[#12367B] active:scale-[0.99] shadow-lg shadow-[#17449A]/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Memverifikasi...</span>
              </>
            ) : (
              <>
                <span>Masuk ke Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="pt-4 border-t border-slate-200/70 flex items-center justify-center gap-2 text-[11px] font-medium text-slate-500">
          <ShieldCheck className="w-4 h-4 text-[#17449A]" />
          <span>Akses Terbatas • Khusus Administrator & Panitia</span>
        </div>
      </div>
    </div>
  );
}
