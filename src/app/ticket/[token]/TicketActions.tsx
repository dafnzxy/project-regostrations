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
        onClick={handlePrint}
        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
      >
        <Printer className="w-4 h-4 text-slate-400" />
        <span>Cetak Tiket</span>
      </button>

      <button
        onClick={handleDownload}
        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/25 transition-all"
      >
        <Download className="w-4 h-4" />
        <span>Unduh QR Image</span>
      </button>
    </>
  );
}
