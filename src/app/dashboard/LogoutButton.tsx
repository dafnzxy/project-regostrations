"use client";

import { logoutAdmin } from "@/actions/auth";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  return (
    <button
      type="button"
      onClick={() => logoutAdmin()}
      className="w-full mt-2 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-2xl liquid-pill text-slate-600 hover:text-rose-600 text-xs font-bold transition-all cursor-pointer"
    >
      <LogOut className="w-3.5 h-3.5" />
      <span>Kunci Dashboard (Keluar)</span>
    </button>
  );
}
