"use client";

import { useState } from "react";
import { duplicateEvent } from "@/actions/events";
import { Copy, ExternalLink, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface EventCardActionsProps {
  eventId: string;
  slug: string;
}

export function EventCardActions({ eventId, slug }: EventCardActionsProps) {
  const router = useRouter();
  const [duplicating, setDuplicating] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleDuplicate = async () => {
    if (!confirm("Apakah Anda ingin menduplikasi event ini beserta pengaturan form dan doorprize-nya?")) return;
    setDuplicating(true);
    try {
      await duplicateEvent(eventId);
      router.refresh();
    } catch (e: any) {
      alert("Gagal menduplikasi event: " + e.message);
    } finally {
      setDuplicating(false);
    }
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/e/${slug}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleCopyLink}
        title="Salin Link Publik"
        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors flex items-center gap-1.5"
      >
        <Copy className="w-3.5 h-3.5" />
        <span>{copied ? "Tersalin!" : "Salin Link"}</span>
      </button>

      <button
        onClick={handleDuplicate}
        disabled={duplicating}
        title="Duplikasi Event"
        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors flex items-center gap-1.5"
      >
        {duplicating ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
        ) : (
          <Copy className="w-3.5 h-3.5 text-slate-400" />
        )}
        <span>Duplikasi</span>
      </button>

      <Link
        href={`/e/${slug}`}
        target="_blank"
        className="px-2.5 py-1.5 rounded-lg bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 text-xs font-medium border border-indigo-500/20 transition-colors flex items-center gap-1"
      >
        <span>Lihat Publik</span>
        <ExternalLink className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}
