"use client";

import { logoutAdmin } from "@/actions/auth";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  return (
    <button
      onClick={() => logoutAdmin()}
      className="w-full mt-2 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-rose-500/10 border border-slate-800 hover:border-rose-500/20 text-slate-400 hover:text-rose-400 text-xs font-semibold transition-colors cursor-pointer"
    >
      <LogOut className="w-3.5 h-3.5" />
      <span>Kunci Dashboard (Keluar)</span>
    </button>
  );
}
