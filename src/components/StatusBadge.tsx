import React from "react";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  switch (status) {
    case "APPROVED":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50/90 text-emerald-700 border border-emerald-200/90 shadow-xs backdrop-blur-md",
            className
          )}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Disetujui
        </span>
      );
    case "CHECKED_IN":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50/90 text-indigo-700 border border-indigo-200/90 shadow-xs backdrop-blur-md",
            className
          )}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
          Hadir (Checked-In)
        </span>
      );
    case "PENDING":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50/90 text-amber-700 border border-amber-200/90 shadow-xs backdrop-blur-md",
            className
          )}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          Menunggu Review
        </span>
      );
    case "REJECTED":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50/90 text-rose-700 border border-rose-200/90 shadow-xs backdrop-blur-md",
            className
          )}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          Ditolak
        </span>
      );
    case "OPEN":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50/90 text-emerald-700 border border-emerald-200/90 shadow-xs backdrop-blur-md",
            className
          )}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Buka
        </span>
      );
    case "DRAFT":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100/90 text-slate-600 border border-slate-200/90 shadow-xs backdrop-blur-md",
            className
          )}
        >
          Draft
        </span>
      );
    case "CLOSED":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50/90 text-rose-700 border border-rose-200/90 shadow-xs backdrop-blur-md",
            className
          )}
        >
          Ditutup
        </span>
      );
    default:
      return (
        <span
          className={cn(
            "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200",
            className
          )}
        >
          {status}
        </span>
      );
  }
}
