"use client";

import { Download, Printer } from "lucide-react";

interface TicketActionsProps {
  qrDataUrl: string;
  name: string;
}

export function TicketActions({ qrDataUrl, name }: TicketActionsProps) {
  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = `QR-Ticket-${name.replace(/\s+/g, "-")}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <button
        type="button"
        onClick={handlePrint}
        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl liquid-pill text-slate-800 text-xs font-bold cursor-pointer"
      >
        <Printer className="w-4 h-4 text-[#17449A]" />
        <span>Cetak Tiket</span>
      </button>

      <button
        type="button"
        onClick={handleDownload}
        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#17449A] hover:bg-[#12367B] text-white text-xs font-bold shadow-lg shadow-[#17449A]/25 transition-all cursor-pointer"
      >
        <Download className="w-4 h-4" />
        <span>Unduh QR Image</span>
      </button>
    </>
  );
}
