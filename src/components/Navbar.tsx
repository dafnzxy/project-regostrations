"use client";

import Link from "next/link";
import { QrCode, Calendar, Sparkles, LayoutDashboard, Ticket } from "lucide-react";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full glass-panel border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform duration-200">
            <QrCode className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-lg font-bold bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
              EventPass
            </span>
            <span className="hidden sm:inline-block ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              v0.1
            </span>
          </div>
        </Link>

        <nav className="flex items-center gap-1.5 sm:gap-3">
          <Link
            href="/e/tech-innovators-summit-2026"
            className="hidden md:flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-300 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-800/60 transition-colors"
          >
            <Ticket className="w-4 h-4 text-emerald-400" />
            <span>Live Demo Event</span>
          </Link>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 px-4 py-2 rounded-xl shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/40 transition-all duration-200"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Admin Dashboard</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
