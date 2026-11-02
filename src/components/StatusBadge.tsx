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
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
            className
          )}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Disetujui
        </span>
      );
    case "CHECKED_IN":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20",
            className
          )}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
          Hadir (Checked-In)
        </span>
      );
    case "PENDING":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20",
            className
          )}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          Menunggu Review
        </span>
      );
    case "REJECTED":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20",
            className
          )}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
          Ditolak
        </span>
      );
    case "OPEN":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
            className
          )}
        >
          Buka
        </span>
      );
    case "DRAFT":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-500/15 text-slate-400 border border-slate-500/30",
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
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-rose-500/15 text-rose-400 border border-rose-500/30",
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
            "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-700 text-slate-300",
            className
          )}
        >
          {status}
        </span>
      );
  }
}
