"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import {
  X,
  QrCode,
  Download,
  Copy,
  Check,
  Printer,
  ExternalLink,
  Share2,
} from "lucide-react";

interface EventQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  slug: string;
  eventTitle: string;
}

export function EventQrModal({
  isOpen,
  onClose,
  slug,
  eventTitle,
}: EventQrModalProps) {
  const [dataUrl, setDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  const fullUrl = origin ? `${origin}/e/${slug}` : `/e/${slug}`;

  useEffect(() => {
    if (isOpen && fullUrl) {
      QRCode.toDataURL(fullUrl, {
        width: 600,
        margin: 2,
        color: {
          dark: "#0f172a",
          light: "#ffffff",
        },
        errorCorrectionLevel: "H",
      })
        .then((url) => setDataUrl(url))
        .catch((err) => console.error("Gagal membuat QR Code:", err));
    }
  }, [isOpen, fullUrl]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `QR-Registrasi-${slug}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePrint = () => {
    if (!dataUrl) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code Registrasi - ${eventTitle}</title>
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              text-align: center;
              padding: 40px;
              color: #0f172a;
            }
            .card {
              max-width: 480px;
              margin: 0 auto;
              border: 2px solid #e2e8f0;
              border-radius: 24px;
              padding: 32px;
            }
            .brand {
              font-size: 13px;
              font-weight: 800;
              color: #17449a;
              text-transform: uppercase;
              letter-spacing: 1px;
              margin-bottom: 8px;
            }
            h1 {
              font-size: 22px;
              font-weight: 800;
              margin: 0 0 8px 0;
            }
            p {
              font-size: 13px;
              color: #64748b;
              margin: 0 0 20px 0;
            }
            img {
              max-width: 320px;
              width: 100%;
              margin: 0 auto 16px auto;
              display: block;
              border-radius: 16px;
            }
            .url {
              font-family: monospace;
              font-size: 12px;
              color: #17449a;
              font-weight: bold;
              word-break: break-all;
              padding: 8px 12px;
              background: #f1f5f9;
              border-radius: 8px;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="brand">YORINDO REGISTRATION</div>
            <h1>${eventTitle}</h1>
            <p>Scan QR Code di bawah untuk membuka formulir pendaftaran resmi:</p>
            <img src="${dataUrl}" alt="QR Code Registrasi" />
            <div class="url">${fullUrl}</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-md animate-fade-in">
      <div className="max-w-md w-full liquid-glass rounded-3xl p-6 sm:p-7 space-y-5 shadow-2xl relative">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200/80">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#17449A]/10 border border-[#17449A]/20 flex items-center justify-center text-[#17449A] shrink-0">
              <QrCode className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-extrabold text-slate-900">
                QR Code Link Registrasi
              </h3>
              <p className="text-xs text-slate-500 truncate max-w-[240px]">
                {eventTitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl liquid-pill text-slate-400 hover:text-slate-900 transition-colors cursor-pointer"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* QR Display Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-inner flex flex-col items-center justify-center text-center space-y-3">
          {dataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={dataUrl}
              alt={`QR Code Registrasi ${eventTitle}`}
              className="w-56 h-56 object-contain rounded-xl shadow-xs"
            />
          ) : (
            <div className="w-56 h-56 flex items-center justify-center bg-slate-50 rounded-xl text-slate-400 text-xs">
              Membuat QR Code...
            </div>
          )}

          <div className="w-full">
            <div className="text-[11px] font-semibold text-slate-500 mb-1">
              Link Pendaftaran Acara:
            </div>
            <div className="font-mono text-[11px] text-[#17449A] bg-slate-100/90 py-1.5 px-3 rounded-xl border border-slate-200/80 break-all select-all font-semibold">
              {fullUrl}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-1 text-xs font-bold">
          <button
            type="button"
            onClick={handleDownload}
            disabled={!dataUrl}
            className="col-span-2 py-2.5 px-4 rounded-xl text-white bg-[#17449A] hover:bg-[#12367B] shadow-md shadow-[#17449A]/20 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>Unduh Gambar QR (HD PNG)</span>
          </button>

          <button
            type="button"
            onClick={handleCopyLink}
            className="py-2 px-3 rounded-xl liquid-pill text-slate-800 hover:text-[#17449A] flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">Tersalin!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-[#17449A]" />
                <span>Salin Link</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handlePrint}
            disabled={!dataUrl}
            className="py-2 px-3 rounded-xl liquid-pill text-slate-800 hover:text-[#17449A] flex items-center justify-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
          >
            <Printer className="w-3.5 h-3.5 text-slate-700" />
            <span>Cetak QR</span>
          </button>
        </div>

        {/* Hint footer */}
        <div className="text-center pt-1 text-[11px] text-slate-500">
          💡 Gunakan QR ini pada standing banner, poster cetak, atau media sosial agar peserta langsung diarahkan ke form pendaftaran.
        </div>
      </div>
    </div>
  );
}

