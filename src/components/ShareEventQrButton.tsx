"use client";

import { useState } from "react";
import { QrCode } from "lucide-react";
import { EventQrModal } from "./EventQrModal";

interface ShareEventQrButtonProps {
  slug: string;
  eventTitle: string;
}

export function ShareEventQrButton({ slug, eventTitle }: ShareEventQrButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold text-[#17449A] bg-[#17449A]/10 hover:bg-[#17449A]/20 border border-[#17449A]/20 transition-all cursor-pointer shadow-2xs active:scale-95"
        title="Tampilkan & Download QR Code Pendaftaran Event"
      >
        <QrCode className="w-3.5 h-3.5 text-[#17449A] shrink-0" />
        <span>QR Pendaftaran</span>
      </button>

      <EventQrModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        slug={slug}
        eventTitle={eventTitle}
      />
    </>
  );
}

