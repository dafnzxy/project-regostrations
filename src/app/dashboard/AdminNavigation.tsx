"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarPlus,
  QrCode,
  Sparkles,
  Settings,
  Shield,
  Users,
  Menu,
  X,
  Plus,
} from "lucide-react";
import { LogoutButton } from "./LogoutButton";

interface AdminNavigationProps {
  latestEvent: {
    id: string;
    title: string;
    slug: string;
  } | null;
}

export function AdminNavigation({ latestEvent }: AdminNavigationProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Tutup drawer otomatis setiap kali berpindah halaman
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const isActive = (href: string, exact = false) => {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const navContent = (
    <>
      <div className="space-y-6">
        {/* Logo / Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200/70">
          <Link href="/dashboard" className="flex items-center gap-3 group min-w-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/yorindo-logo.png"
              alt="YORINDO Logo"
              width={40}
              height={40}
              className="w-10 h-10 object-contain shrink-0 mix-blend-multiply group-hover:scale-105 transition-transform"
            />
            <div className="min-w-0">
              <div className="text-base tracking-tight leading-tight truncate">
                <span className="font-extrabold text-[#17449A]">YORINDO</span>{" "}
                <span className="font-bold text-black">registration</span>
              </div>
              <span className="block text-[11px] text-slate-500 font-semibold mt-0.5">
                Admin Dashboard
              </span>
            </div>
          </Link>

          {/* Tombol tutup hanya muncul di drawer mobile/tablet */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-2 rounded-xl liquid-pill text-slate-500 hover:text-slate-900 cursor-pointer"
            aria-label="Tutup Menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="space-y-1.5 text-sm font-semibold">
          <Link
            href="/dashboard"
            className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl transition-all ${
              isActive("/dashboard", true)
                ? "bg-[#17449A]/10 text-[#17449A] border border-[#17449A]/20 shadow-xs"
                : "text-slate-800 hover:text-[#17449A] hover:bg-white/80"
            }`}
          >
            <div
              className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                isActive("/dashboard", true)
                  ? "bg-[#17449A] text-white"
                  : "bg-slate-100 border border-slate-200/80 text-slate-900"
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
            </div>
            <span>Semua Event</span>
          </Link>

          <Link
            href="/dashboard/events/new"
            className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl transition-all ${
              isActive("/dashboard/events/new")
                ? "bg-[#17449A]/10 text-[#17449A] border border-[#17449A]/20 shadow-xs"
                : "text-slate-800 hover:text-[#17449A] hover:bg-white/80"
            }`}
          >
            <div
              className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                isActive("/dashboard/events/new")
                  ? "bg-[#17449A] text-white"
                  : "bg-slate-100 border border-slate-200/80 text-slate-900"
              }`}
            >
              <CalendarPlus className="w-4 h-4" />
            </div>
            <span>Buat Event Baru</span>
          </Link>

          <Link
            href="/dashboard/settings"
            className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl transition-all ${
              isActive("/dashboard/settings")
                ? "bg-[#17449A]/10 text-[#17449A] border border-[#17449A]/20 shadow-xs"
                : "text-slate-800 hover:text-[#17449A] hover:bg-white/80"
            }`}
          >
            <div
              className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                isActive("/dashboard/settings")
                  ? "bg-[#17449A] text-white"
                  : "bg-slate-100 border border-slate-200/80 text-slate-900"
              }`}
            >
              <Settings className="w-4 h-4" />
            </div>
            <span>Pengaturan Email & PIN</span>
          </Link>

          {latestEvent && (
            <>
              <div className="pt-4 pb-1">
                <span className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block truncate">
                  Akses Cepat Event Aktif
                </span>
                <span className="px-3 text-[11px] font-bold text-slate-700 block truncate mt-0.5">
                  {latestEvent.title}
                </span>
              </div>

              <Link
                href={`/dashboard/events/${latestEvent.id}/registrations`}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                  isActive(`/dashboard/events/${latestEvent.id}/registrations`)
                    ? "bg-[#17449A]/10 text-[#17449A] border border-[#17449A]/20"
                    : "text-slate-700 hover:text-[#17449A] hover:bg-white/75"
                }`}
              >
                <Users className="w-4 h-4 text-[#17449A] shrink-0" />
                <span className="truncate">Data Peserta Aktif</span>
              </Link>

              <Link
                href={`/dashboard/events/${latestEvent.id}/checkin`}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                  isActive(`/dashboard/events/${latestEvent.id}/checkin`)
                    ? "bg-[#17449A]/10 text-[#17449A] border border-[#17449A]/20"
                    : "text-slate-700 hover:text-[#17449A] hover:bg-white/75"
                }`}
              >
                <QrCode className="w-4 h-4 text-slate-900 shrink-0" />
                <span className="truncate">Scanner Hari-H</span>
              </Link>

              <Link
                href={`/dashboard/events/${latestEvent.id}/doorprize`}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                  isActive(`/dashboard/events/${latestEvent.id}/doorprize`)
                    ? "bg-[#17449A]/10 text-[#17449A] border border-[#17449A]/20"
                    : "text-slate-700 hover:text-[#17449A] hover:bg-white/75"
                }`}
              >
                <Sparkles className="w-4 h-4 text-[#17449A] shrink-0" />
                <span className="truncate">Spin Wheel Doorprize</span>
              </Link>
            </>
          )}
        </nav>
      </div>

      {/* Footer info in sidebar */}
      <div className="pt-5 border-t border-slate-200/70 space-y-2.5">
        <div className="p-3.5 rounded-2xl liquid-card text-[11px] text-slate-600">
          <div className="font-bold text-slate-900 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-[#17449A] shrink-0" />
            <span className="truncate">Admin: Daffa</span>
          </div>
          <div className="text-slate-500 text-[10px] font-medium mt-0.5">
            Super Admin • Sesi Terproteksi
          </div>
        </div>

        <LogoutButton />
      </div>
    </>
  );

  return (
    <>
      {/* =================================================================== */}
      {/* 1. MOBILE & TABLET STICKY TOP HEADER (< 1024px)                     */}
      {/* =================================================================== */}
      <header className="lg:hidden sticky top-0 z-40 w-full liquid-glass border-b border-slate-200/80 px-4 h-16 flex items-center justify-between gap-3">
        <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/yorindo-logo.png"
            alt="YORINDO Logo"
            width={36}
            height={36}
            className="w-9 h-9 object-contain shrink-0 mix-blend-multiply"
          />
          <div className="min-w-0">
            <div className="text-sm sm:text-base tracking-tight leading-tight truncate">
              <span className="font-extrabold text-[#17449A]">YORINDO</span>{" "}
              <span className="font-bold text-black">registration</span>
            </div>
            <span className="block text-[10px] text-slate-500 font-semibold leading-none mt-0.5">
              Admin Dashboard
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/dashboard/events/new"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-[#17449A] hover:bg-[#12367B] shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Event Baru</span>
          </Link>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="p-2.5 rounded-xl liquid-pill text-slate-900 hover:text-[#17449A] cursor-pointer flex items-center gap-1.5"
            aria-label="Buka Menu Navigasi"
          >
            <Menu className="w-5 h-5" />
            <span className="text-xs font-bold hidden sm:inline">Menu</span>
          </button>
        </div>
      </header>

      {/* =================================================================== */}
      {/* 2. MOBILE & TABLET SLIDE-OVER DRAWER (< 1024px)                     */}
      {/* =================================================================== */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs animate-fade-in"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer Panel */}
          <aside className="relative z-10 w-72 max-w-[85vw] h-full bg-white/95 backdrop-blur-2xl border-r border-slate-200/90 p-5 flex flex-col justify-between overflow-y-auto shadow-2xl">
            {navContent}
          </aside>
        </div>
      )}

      {/* =================================================================== */}
      {/* 3. DESKTOP FLOATING LIQUID GLASS SIDEBAR (>= 1024px)                */}
      {/* =================================================================== */}
      <aside className="hidden lg:flex lg:w-72 lg:m-4 lg:mr-0 lg:rounded-3xl liquid-glass lg:h-[calc(100vh-2rem)] p-5 flex-col justify-between sticky top-4 shrink-0 overflow-y-auto">
        {navContent}
      </aside>

      {/* =================================================================== */}
      {/* 4. MOBILE BOTTOM QUICK NAVIGATION BAR (< 640px)                     */}
      {/* =================================================================== */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-40 liquid-glass border-t border-slate-200/90 px-2 py-1.5 grid grid-cols-4 gap-1">
        <Link
          href="/dashboard"
          className={`flex flex-col items-center justify-center py-1 rounded-xl text-[10px] font-bold transition-colors ${
            isActive("/dashboard", true)
              ? "text-[#17449A] bg-[#17449A]/10"
              : "text-slate-700"
          }`}
        >
          <LayoutDashboard className="w-4 h-4 mb-0.5" />
          <span>Event</span>
        </Link>

        <Link
          href="/dashboard/events/new"
          className={`flex flex-col items-center justify-center py-1 rounded-xl text-[10px] font-bold transition-colors ${
            isActive("/dashboard/events/new")
              ? "text-[#17449A] bg-[#17449A]/10"
              : "text-slate-700"
          }`}
        >
          <CalendarPlus className="w-4 h-4 mb-0.5" />
          <span>Buat Baru</span>
        </Link>

        <Link
          href={
            latestEvent
              ? `/dashboard/events/${latestEvent.id}/checkin`
              : "/dashboard"
          }
          className={`flex flex-col items-center justify-center py-1 rounded-xl text-[10px] font-bold transition-colors ${
            pathname.includes("/checkin")
              ? "text-[#17449A] bg-[#17449A]/10"
              : "text-slate-700"
          }`}
        >
          <QrCode className="w-4 h-4 mb-0.5" />
          <span>Scanner</span>
        </Link>

        <Link
          href="/dashboard/settings"
          className={`flex flex-col items-center justify-center py-1 rounded-xl text-[10px] font-bold transition-colors ${
            isActive("/dashboard/settings")
              ? "text-[#17449A] bg-[#17449A]/10"
              : "text-slate-700"
          }`}
        >
          <Settings className="w-4 h-4 mb-0.5" />
          <span>Setelan</span>
        </Link>
      </nav>
    </>
  );
}

