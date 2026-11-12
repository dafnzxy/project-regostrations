"use client";

import { useState, useMemo, useRef } from "react";
import { FormField } from "@/types";
import {
  Printer,
  X,
  ChevronLeft,
  ChevronRight,
  Sliders,
  Check,
  FileText,
  ExternalLink,
  Sparkles,
  Info,
  Building2,
  Users,
} from "lucide-react";

export interface AttendeeForLabel {
  id: string;
  name: string;
  email: string;
  status: string;
  answers?: string | null;
}

interface PrintStickerLabelsModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventTitle: string;
  registrations: AttendeeForLabel[];
  selectedIds?: string[];
  formSchema?: FormField[];
}

export function extractAttendeeCompany(
  answersJsonOrObj?: any,
  formSchema?: FormField[]
): string {
  if (!answersJsonOrObj) return "";
  let obj = answersJsonOrObj;
  if (typeof answersJsonOrObj === "string") {
    try {
      obj = JSON.parse(answersJsonOrObj);
    } catch {
      return "";
    }
  }
  if (!obj || typeof obj !== "object") return "";

  // 1. Direct standard keys
  const direct =
    obj.nama_perusahaan ||
    obj.perusahaan ||
    obj.instansi ||
    obj.institusi ||
    obj.pt ||
    obj.company ||
    obj.organization ||
    obj.kantor;
  if (direct) return String(direct).trim();

  // 2. Match formSchema labels
  if (formSchema && Array.isArray(formSchema)) {
    for (const f of formSchema) {
      const lbl = (f.label || "").toLowerCase();
      if (
        lbl.includes("perusahaan") ||
        lbl.includes("pt") ||
        lbl.includes("instansi") ||
        lbl.includes("institusi") ||
        lbl.includes("organisasi") ||
        lbl.includes("kantor") ||
        lbl.includes("company")
      ) {
        if (obj[f.id]) {
          return String(obj[f.id]).trim();
        }
      }
    }
  }

  // 3. Fallback search in keys
  for (const [k, v] of Object.entries(obj)) {
    const lk = k.toLowerCase();
    if (
      (lk.includes("perusahaan") || lk.includes("instansi") || lk.includes("pt")) &&
      v
    ) {
      return String(v).trim();
    }
  }

  return "";
}

function escapeHtml(str: string): string {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function PrintStickerLabelsModal({
  isOpen,
  onClose,
  eventTitle,
  registrations,
  selectedIds = [],
  formSchema = [],
}: PrintStickerLabelsModalProps) {
  // Filter settings
  const [targetScope, setTargetScope] = useState<"approved_or_checkedin" | "selected" | "all">("approved_or_checkedin");
  const [startOffset, setStartOffset] = useState<number>(1); // 1-12
  const [paperSize, setPaperSize] = useState<"label103" | "a4">("label103");
  const [showBorder, setShowBorder] = useState<boolean>(false);
  const [fontSizeMode, setFontSizeMode] = useState<"auto" | "small" | "medium" | "large">("auto");
  const [topMarginMm, setTopMarginMm] = useState<number>(9.5);
  const [leftMarginMm, setLeftMarginMm] = useState<number>(5.0);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState<boolean>(false);

  // Pagination for preview
  const [currentPreviewPage, setCurrentPreviewPage] = useState<number>(1);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Filter attendees to print
  const attendeesToPrint = useMemo(() => {
    let list: AttendeeForLabel[] = [];
    if (targetScope === "selected") {
      list = registrations.filter((r) => selectedIds.includes(r.id));
    } else if (targetScope === "all") {
      list = [...registrations];
    } else {
      // approved_or_checkedin
      list = registrations.filter(
        (r) => r.status === "APPROVED" || r.status === "CHECKED_IN"
      );
    }

    return list.map((att) => ({
      id: att.id,
      name: att.name || "PESERTA",
      company: extractAttendeeCompany(att.answers, formSchema),
    }));
  }, [registrations, targetScope, selectedIds, formSchema]);

  // Total pages calculation (12 labels per sheet)
  const totalSlots = (startOffset - 1) + attendeesToPrint.length;
  const totalPages = Math.max(1, Math.ceil(totalSlots / 12));

  // Ensure preview page in range
  const validPreviewPage = Math.min(Math.max(1, currentPreviewPage), totalPages);

  // Get 12 slots for the currently viewed preview page
  const currentSheetSlots = useMemo(() => {
    const slots: Array<{
      slotNumber: number; // 1-12
      globalIndex: number;
      attendee: { name: string; company: string } | null;
      isEmptyOffset?: boolean;
    }> = [];

    const pageStartIndex = (validPreviewPage - 1) * 12;

    for (let i = 0; i < 12; i++) {
      const globalSlotIndex = pageStartIndex + i;
      const slotNumber = i + 1;

      if (globalSlotIndex < startOffset - 1) {
        // Empty offset slot on first page
        slots.push({
          slotNumber,
          globalIndex: globalSlotIndex,
          attendee: null,
          isEmptyOffset: true,
        });
      } else {
        const attendeeIndex = globalSlotIndex - (startOffset - 1);
        if (attendeeIndex < attendeesToPrint.length) {
          slots.push({
            slotNumber,
            globalIndex: globalSlotIndex,
            attendee: attendeesToPrint[attendeeIndex],
          });
        } else {
          // Empty slot after last attendee
          slots.push({
            slotNumber,
            globalIndex: globalSlotIndex,
            attendee: null,
          });
        }
      }
    }

    return slots;
  }, [validPreviewPage, startOffset, attendeesToPrint]);

  // Generate full printable HTML
  const generatePrintHtml = () => {
    const pagesCount = Math.max(1, Math.ceil(((startOffset - 1) + attendeesToPrint.length) / 12));
    let pagesHtml = "";

    const paperHeight = paperSize === "a4" ? "297mm" : "180mm";

    for (let page = 1; page <= pagesCount; page++) {
      let cellsHtml = "";
      const pageStartIndex = (page - 1) * 12;

      for (let i = 0; i < 12; i++) {
        const globalSlotIndex = pageStartIndex + i;

        if (globalSlotIndex < startOffset - 1) {
          // Empty slot offset
          cellsHtml += `<div class="label-cell empty-cell ${showBorder ? "show-border" : ""}"></div>`;
        } else {
          const attendeeIndex = globalSlotIndex - (startOffset - 1);
          if (attendeeIndex < attendeesToPrint.length) {
            const att = attendeesToPrint[attendeeIndex];
            const cleanName = att.name.trim();
            const cleanComp = att.company.trim();

            let nameSize = "11pt";
            if (fontSizeMode === "small") nameSize = "9pt";
            else if (fontSizeMode === "large") nameSize = "13pt";
            else if (fontSizeMode === "medium") nameSize = "11pt";
            else {
              // auto
              if (cleanName.length > 28) nameSize = "9pt";
              else if (cleanName.length > 18) nameSize = "10.5pt";
              else nameSize = "12pt";
            }

            let compSize = "8.5pt";
            if (fontSizeMode === "small") compSize = "7.5pt";
            else if (fontSizeMode === "large") compSize = "9.5pt";
            else {
              if (cleanComp.length > 30) compSize = "8pt";
            }

            cellsHtml += `
              <div class="label-cell ${showBorder ? "show-border" : ""}">
                <div class="label-name" style="font-size: ${nameSize};">
                  ${escapeHtml(cleanName)}
                </div>
                ${
                  cleanComp
                    ? `<div class="label-company" style="font-size: ${compSize};">${escapeHtml(
                        cleanComp
                      )}</div>`
                    : ""
                }
              </div>`;
          } else {
            // Empty slot after end
            cellsHtml += `<div class="label-cell empty-cell ${showBorder ? "show-border" : ""}"></div>`;
          }
        }
      }

      pagesHtml += `
        <div class="sheet-page">
          <div class="labels-grid">
            ${cellsHtml}
          </div>
        </div>`;
    }

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Cetak Label Stiker 103 - ${escapeHtml(eventTitle)}</title>
  <style>
    @page {
      size: ${paperSize === "a4" ? "210mm 297mm" : "235mm 180mm"};
      margin: 0;
    }
    @media print {
      html, body {
        margin: 0;
        padding: 0;
        width: 210mm;
        background: #ffffff;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .sheet-page {
        page-break-after: always;
        break-after: page;
      }
    }
    * {
      box-sizing: border-box;
      -webkit-font-smoothing: antialiased;
    }
    html, body {
      margin: 0;
      padding: 0;
      width: 210mm;
      background: #ffffff;
      color: #000000;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
    }
    .sheet-page {
      width: 210mm;
      height: ${paperHeight};
      box-sizing: border-box;
      overflow: hidden;
      position: relative;
      padding-top: ${topMarginMm}mm;
      padding-left: ${leftMarginMm}mm;
    }
    .labels-grid {
      display: grid;
      grid-template-columns: repeat(3, 75mm);
      grid-template-rows: repeat(4, 37mm);
      column-gap: 2mm;
      row-gap: 3mm;
      width: 229mm;
      height: 157mm;
    }
    .label-cell {
      width: 75mm;
      height: 37mm;
      box-sizing: border-box;
      padding: 2.2mm 3.2mm;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      overflow: hidden;
      border: 0.5pt solid transparent;
    }
    .label-cell.show-border {
      border: 0.5pt dashed #94a3b8;
    }
    .label-name {
      font-weight: 800;
      text-transform: uppercase;
      color: #000000;
      line-height: 1.15;
      letter-spacing: -0.2px;
      max-width: 100%;
      word-break: break-word;
      margin: 0 0 1.2mm 0;
    }
    .label-company {
      font-weight: 600;
      color: #1e293b;
      line-height: 1.2;
      max-width: 100%;
      word-break: break-word;
      margin: 0;
    }
    .empty-cell {
      visibility: ${showBorder ? "visible" : "hidden"};
    }
  </style>
</head>
<body>
  ${pagesHtml}
</body>
</html>`;
  };

  const handlePrint = () => {
    if (typeof window === "undefined") return;

    let iframe = iframeRef.current;
    if (!iframe) {
      iframe = document.createElement("iframe");
      iframe.id = "label-sheet-print-iframe";
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      iframe.style.visibility = "hidden";
      document.body.appendChild(iframe);
      iframeRef.current = iframe;
    }

    const html = generatePrintHtml();
    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!doc) return;

    doc.open();
    doc.write(html);
    doc.close();

    setTimeout(() => {
      try {
        iframe?.contentWindow?.focus();
        iframe?.contentWindow?.print();
      } catch (e) {
        console.error("Print dialog failed:", e);
      }
    }, 300);
  };

  const handleOpenInNewTab = () => {
    const html = generatePrintHtml();
    const newWindow = window.open("", "_blank");
    if (newWindow) {
      newWindow.document.open();
      newWindow.document.write(html);
      newWindow.document.close();
      setTimeout(() => {
        newWindow.print();
      }, 500);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="max-w-4xl w-full bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col my-auto max-h-[92vh] overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200/90 flex items-center justify-between gap-3 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#17449A]/10 border border-[#17449A]/20 flex items-center justify-center text-[#17449A] shrink-0">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-slate-900">
                  Cetak Label Stiker Massal (12 Label / Lembar)
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#17449A] text-white">
                  Okey / TJ No. 103
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Format 3 Kolom × 4 Baris (Ukuran Label: 75 × 37 mm) • {eventTitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-200/60 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Top Options Bar */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Target Data Selector */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Peserta yang Dicetak:
                </label>
                <select
                  value={targetScope}
                  onChange={(e) => setTargetScope(e.target.value as any)}
                  className="w-full text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#17449A]"
                >
                  <option value="approved_or_checkedin">
                    Approved / Hadir ({registrations.filter((r) => r.status === "APPROVED" || r.status === "CHECKED_IN").length} Peserta)
                  </option>
                  {selectedIds.length > 0 && (
                    <option value="selected">
                      Hanya Dicentang ({selectedIds.length} Peserta)
                    </option>
                  )}
                  <option value="all">
                    Semua Peserta ({registrations.length} Peserta)
                  </option>
                </select>
              </div>

              {/* Start Position Offset */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Mulai dari Label Ke-:
                </label>
                <select
                  value={startOffset}
                  onChange={(e) => setStartOffset(Number(e.target.value))}
                  className="w-full text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#17449A]"
                  title="Jika kertas stiker lembar pertama sudah terpakai sebagian, pilih label awal di sini"
                >
                  {[...Array(12)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>
                      Label #{i + 1} {i === 0 ? "(Pojok Kiri Atas - Penuh)" : `(Lewati ${i} label)`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Border Helper for Test Prints */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Garis Bantu Kotak:
                </label>
                <button
                  type="button"
                  onClick={() => setShowBorder(!showBorder)}
                  className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                    showBorder
                      ? "bg-amber-100 border-amber-300 text-amber-900"
                      : "bg-white border-slate-300 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <div
                    className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
                      showBorder
                        ? "bg-amber-600 border-amber-600 text-white"
                        : "border-slate-400"
                    }`}
                  >
                    {showBorder && <Check className="w-2.5 h-2.5" />}
                  </div>
                  <span>{showBorder ? "Garis Bantu AKTIF (Tes HVS)" : "Tanpa Garis (Stiker Asli)"}</span>
                </button>
              </div>
            </div>

            {/* Advanced Settings Toggle */}
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                className="text-xs font-bold text-[#17449A] hover:underline flex items-center gap-1.5 cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>{showAdvancedSettings ? "Sembunyikan Pengaturan Margin" : "Pengaturan Margin & Ukuran Kertas"}</span>
              </button>

              <div className="text-[11px] font-semibold text-slate-500">
                Total: <strong className="text-slate-900">{attendeesToPrint.length}</strong> Nama •{" "}
                <strong className="text-slate-900">{totalPages}</strong> Lembar Stiker
              </div>
            </div>

            {/* Advanced Settings Drawer */}
            {showAdvancedSettings && (
              <div className="pt-3 border-t border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-3 rounded-xl border">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">
                    Format Kertas:
                  </label>
                  <select
                    value={paperSize}
                    onChange={(e) => setPaperSize(e.target.value as any)}
                    className="w-full text-xs font-medium border rounded-lg px-2 py-1.5"
                  >
                    <option value="label103">Label 103 (210 × 165 mm)</option>
                    <option value="a4">Kertas A4 (210 × 297 mm)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">
                    Ukuran Font Nama:
                  </label>
                  <select
                    value={fontSizeMode}
                    onChange={(e) => setFontSizeMode(e.target.value as any)}
                    className="w-full text-xs font-medium border rounded-lg px-2 py-1.5"
                  >
                    <option value="auto">Otomatis (Menyesuaikan)</option>
                    <option value="medium">Sedang (11 pt)</option>
                    <option value="large">Besar (13 pt)</option>
                    <option value="small">Kecil (9 pt)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">
                    Margin Atas (mm):
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={topMarginMm}
                    onChange={(e) => setTopMarginMm(Number(e.target.value))}
                    className="w-full text-xs font-medium border rounded-lg px-2 py-1.5"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">
                    Margin Kiri (mm):
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={leftMarginMm}
                    onChange={(e) => setLeftMarginMm(Number(e.target.value))}
                    className="w-full text-xs font-medium border rounded-lg px-2 py-1.5"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Interactive Sheet Preview Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-slate-800">
                  Pratinjau Lembar #{validPreviewPage} dari {totalPages}
                </span>
                <span className="text-[11px] text-slate-500">
                  (12 Kotak Label per Lembar)
                </span>
              </div>

              {/* Page Navigator */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={validPreviewPage <= 1}
                  onClick={() => setCurrentPreviewPage((prev) => Math.max(1, prev - 1))}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                  title="Lembar Sebelumnya"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-bold text-slate-700 px-2">
                  {validPreviewPage} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={validPreviewPage >= totalPages}
                  onClick={() => setCurrentPreviewPage((prev) => Math.min(totalPages, prev + 1))}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                  title="Lembar Berikutnya"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* The Visual 12-Label Sheet (3 Columns x 4 Rows) */}
            <div className="p-4 sm:p-6 bg-amber-50/70 border-2 border-dashed border-amber-200 rounded-3xl overflow-x-auto shadow-inner flex justify-center">
              <div className="bg-white rounded-2xl shadow-md border border-slate-300 p-3.5 sm:p-4 w-full max-w-[700px]">
                {/* 3x4 Grid Representation */}
                <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                  {currentSheetSlots.map((slot) => {
                    const isFilled = !!slot.attendee;
                    return (
                      <div
                        key={slot.slotNumber}
                        className={`h-24 sm:h-28 rounded-xl p-2.5 flex flex-col items-center justify-center text-center transition-all relative overflow-hidden ${
                          isFilled
                            ? "bg-slate-50 border border-slate-300 shadow-2xs hover:border-[#17449A]/50"
                            : slot.isEmptyOffset
                            ? "bg-amber-50/50 border border-dashed border-amber-200 text-amber-700/60"
                            : "bg-slate-100/40 border border-dashed border-slate-200 text-slate-400"
                        }`}
                      >
                        <span className="absolute top-1.5 left-2 text-[9px] font-mono font-bold opacity-35">
                          #{slot.slotNumber}
                        </span>

                        {isFilled && slot.attendee ? (
                          <>
                            <div className="text-[11px] sm:text-xs font-black text-slate-900 uppercase leading-snug line-clamp-2 max-w-full">
                              {slot.attendee.name}
                            </div>
                            {slot.attendee.company && (
                              <div className="text-[10px] sm:text-[11px] font-semibold text-slate-600 leading-tight mt-1 line-clamp-2 max-w-full">
                                {slot.attendee.company}
                              </div>
                            )}
                          </>
                        ) : slot.isEmptyOffset ? (
                          <div className="text-[10px] font-semibold italic text-amber-700/80">
                            (Dilewati)
                          </div>
                        ) : (
                          <div className="text-[10px] font-medium text-slate-400">
                            (Kosong)
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-200 flex items-center justify-between text-[10px] font-medium text-slate-400">
                  <span>Ukuran Label: 75 × 37 mm per kotak stiker (3 kolom × 4 baris)</span>
                  <span>Kertas Stiker Okey / T&J No. 103 (Isi 12 Label)</span>
                </div>
              </div>
            </div>

            {/* Informational Hint */}
            <div className="p-3.5 rounded-2xl bg-blue-50/80 border border-blue-200 text-xs text-blue-900 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-[#17449A] shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong>💡 Panduan Cetak Presisi:</strong> Jika Anda pertama kali mencetak di printer ini, centang opsi{" "}
                <strong>&ldquo;Garis Bantu Kotak (Tes HVS)&rdquo;</strong> dan cetak 1 lembar sample di kertas HVS biasa. Terawang di bawah cahaya bersama lembar stiker asli untuk memastikan posisi margin sudah pas. Jika sudah tepat, matikan garis bantu dan masukkan lembar stiker asli.
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-600 font-semibold text-center sm:text-left">
            Siap mencetak <strong className="text-slate-900">{attendeesToPrint.length} label</strong> dalam{" "}
            <strong className="text-slate-900">{totalPages} lembar</strong>.
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleOpenInNewTab}
              className="flex-1 sm:flex-initial px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              title="Buka tampilan cetak di tab browser baru"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Buka di Tab Baru</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={attendeesToPrint.length === 0}
              className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-extrabold text-white bg-[#17449A] hover:bg-[#12367B] shadow-md shadow-[#17449A]/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Sekarang ({totalPages} Lembar)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

