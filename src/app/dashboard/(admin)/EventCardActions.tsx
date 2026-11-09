"use client";

import { useState } from "react";
import { duplicateEvent, updateEvent, deleteEvent } from "@/actions/events";
import { Copy, ExternalLink, Loader2, Power, Trash2, QrCode } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EventQrModal } from "@/components/EventQrModal";

interface EventCardActionsProps {
  eventId: string;
  slug: string;
  status: string;
  eventTitle?: string;
}

export function EventCardActions({ eventId, slug, status, eventTitle }: EventCardActionsProps) {
  const router = useRouter();
  const [duplicating, setDuplicating] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

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

  const handleToggleStatus = async () => {
    const nextStatus = status === "OPEN" ? "CLOSED" : "OPEN";
    setToggling(true);
    try {
      await updateEvent(eventId, { status: nextStatus });
      router.refresh();
    } catch (e: any) {
      alert("Gagal mengubah status event: " + e.message);
    } finally {
      setToggling(false);
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "PERINGATAN: Menghapus event ini akan menghapus seluruh data peserta dan riwayat doorprize di dalamnya secara permanen. Lanjutkan?"
      )
    )
      return;
    setDeleting(true);
    try {
      await deleteEvent(eventId);
      router.refresh();
    } catch (e: any) {
      alert("Gagal menghapus event: " + e.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/e/${slug}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full lg:w-auto pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-200/60">
        <button
          type="button"
          onClick={handleCopyLink}
          title="Salin Link Publik"
          className="px-3 py-2 sm:py-1.5 rounded-xl liquid-pill text-slate-800 hover:text-[#17449A] text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Copy className="w-3.5 h-3.5 text-[#17449A] shrink-0" />
          <span>{copied ? "Tersalin!" : "Salin Link"}</span>
        </button>

        <button
          type="button"
          onClick={() => setShowQrModal(true)}
          title="Buka QR Code Registrasi (Link to QR)"
          className="px-3 py-2 sm:py-1.5 rounded-xl liquid-pill text-slate-800 hover:text-[#17449A] text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <QrCode className="w-3.5 h-3.5 text-[#17449A] shrink-0" />
          <span>QR Link</span>
        </button>

        <button
          type="button"
          onClick={handleToggleStatus}
          disabled={toggling}
          title={status === "OPEN" ? "Tutup Pendaftaran" : "Buka Pendaftaran"}
          className="px-3 py-2 sm:py-1.5 rounded-xl liquid-pill text-slate-800 hover:text-[#17449A] text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          {toggling ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#17449A] shrink-0" />
          ) : (
            <Power className="w-3.5 h-3.5 text-slate-900 shrink-0" />
          )}
          <span>{status === "OPEN" ? "Tutup Form" : "Buka Form"}</span>
        </button>

        <button
          type="button"
          onClick={handleDuplicate}
          disabled={duplicating}
          title="Duplikasi Event"
          className="px-3 py-2 sm:py-1.5 rounded-xl liquid-pill text-slate-800 hover:text-[#17449A] text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          {duplicating ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#17449A] shrink-0" />
          ) : (
            <Copy className="w-3.5 h-3.5 text-slate-900 shrink-0" />
          )}
          <span>Duplikasi</span>
        </button>

        <div className="flex items-center gap-2">
          <Link
            href={`/e/${slug}`}
            target="_blank"
            className="flex-1 sm:flex-initial px-3 py-2 sm:py-1.5 rounded-xl bg-[#17449A]/10 hover:bg-[#17449A]/15 text-[#17449A] text-xs font-bold border border-[#17449A]/20 shadow-xs transition-all flex items-center justify-center gap-1"
          >
            <span>Lihat Publik</span>
            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
          </Link>

          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            title="Hapus Event"
            className="p-2 sm:p-1.5 rounded-xl liquid-pill text-slate-700 hover:text-rose-600 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
          >
            {deleting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      <EventQrModal
        isOpen={showQrModal}
        onClose={() => setShowQrModal(false)}
        slug={slug}
        eventTitle={eventTitle || `Event: ${slug}`}
      />
    </>
  );
}
