"use client";

import { useEffect, useRef, useState } from "react";
import { validateAndCheckIn, manualCheckInById } from "@/actions/registrations";
import {
  Camera,
  CheckCircle2,
  AlertCircle,
  Clock,
  Volume2,
  VolumeX,
  Search,
  Users,
  RefreshCw,
  Printer,
  Building2,
  Settings2,
  X,
  Check,
  Sparkles,
} from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { useRouter } from "next/navigation";

interface AttendeeItem {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  answers?: string | null;
  status: string;
  qrToken: string;
  checkedInAt: Date | null;
}

interface ScannerClientProps {
  eventId: string;
  eventTitle: string;
  totalApproved: number;
  totalCheckedIn: number;
  initialAttendees: AttendeeItem[];
}

function extractCompany(answersJsonOrObj?: any): string {
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
  return (
    obj.nama_perusahaan ||
    obj.perusahaan ||
    obj.instansi ||
    obj.institusi ||
    obj.pt ||
    obj.company ||
    obj.organization ||
    ""
  );
}

function escapeHtml(str: string): string {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function ScannerClient({
  eventId,
  eventTitle,
  totalApproved,
  totalCheckedIn,
  initialAttendees,
}: ScannerClientProps) {
  const router = useRouter();
  const [isScanning, setIsScanning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoPrint, setAutoPrint] = useState(true);
  const [printOrientation, setPrintOrientation] = useState<"landscape" | "portrait">("landscape");
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const [scanResult, setScanResult] = useState<{
    success: boolean;
    code: string;
    message: string;
    registration?: any;
  } | null>(null);

  const [activeToast, setActiveToast] = useState<{
    name: string;
    company: string;
    time: string;
    printed: boolean;
  } | null>(null);

  const [attendees, setAttendees] = useState<AttendeeItem[]>(initialAttendees);
  const [searchManual, setSearchManual] = useState("");
  const [manualLoadingId, setManualLoadingId] = useState<string | null>(null);

  useEffect(() => {
    setAttendees(initialAttendees);
  }, [initialAttendees]);

  // Load preferences from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedAutoPrint = localStorage.getItem("scanner_auto_print");
    if (savedAutoPrint !== null) {
      setAutoPrint(savedAutoPrint === "true");
    }
    const savedOrientation = localStorage.getItem("scanner_print_orientation");
    if (savedOrientation === "portrait" || savedOrientation === "landscape") {
      setPrintOrientation(savedOrientation);
    }
  }, []);

  const handleToggleAutoPrint = (val: boolean) => {
    setAutoPrint(val);
    if (typeof window !== "undefined") {
      localStorage.setItem("scanner_auto_print", String(val));
    }
  };

  const handleToggleOrientation = (val: "landscape" | "portrait") => {
    setPrintOrientation(val);
    if (typeof window !== "undefined") {
      localStorage.setItem("scanner_print_orientation", val);
    }
  };

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const isProcessingRef = useRef(false);

  const formatTimeWib = (dateInput: Date | string | null | undefined) => {
    if (!dateInput) return "OK";
    try {
      return new Intl.DateTimeFormat("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Jakarta",
      }).format(new Date(dateInput));
    } catch {
      return "OK";
    }
  };

  // High quality chime notification using Web Audio API + vibration
  const playSound = (type: "success" | "error") => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const now = audioCtx.currentTime;

      if (type === "success") {
        // Melodic dual-tone chime: Note 1 (G5: 784Hz) -> Note 2 (C6: 1046.5Hz)
        const osc1 = audioCtx.createOscillator();
        const gain1 = audioCtx.createGain();
        osc1.type = "sine";
        osc1.frequency.setValueAtTime(784, now);
        gain1.gain.setValueAtTime(0.35, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc1.connect(gain1);
        gain1.connect(audioCtx.destination);
        osc1.start(now);
        osc1.stop(now + 0.3);

        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(1046.5, now + 0.12);
        gain2.gain.setValueAtTime(0.4, now + 0.12);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.start(now + 0.12);
        osc2.stop(now + 0.55);

        // Haptic feedback for mobile devices
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate([100, 50, 150]);
        }
      } else {
        // Low double buzz
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(220, now);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.3);

        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate([250]);
        }
      }
    } catch {
      // AudioContext not allowed or unsupported
    }
  };

  // Thermal Label Print Engine (Exact 37 x 75 mm / 75 x 37 mm)
  const triggerPrintLabel = (name: string, company: string) => {
    if (typeof window === "undefined") return;

    const widthMm = printOrientation === "portrait" ? 37 : 75;
    const heightMm = printOrientation === "portrait" ? 75 : 37;

    const cleanName = (name || "").trim();
    const cleanCompany = (company || "").trim();

    // Dynamic typography scaling based on name and company length
    let nameFontSize = "16pt";
    if (cleanName.length > 28) {
      nameFontSize = "11pt";
    } else if (cleanName.length > 18) {
      nameFontSize = "13pt";
    }

    let companyFontSize = "11pt";
    if (cleanCompany.length > 32) {
      companyFontSize = "8.5pt";
    } else if (cleanCompany.length > 20) {
      companyFontSize = "9.5pt";
    }

    let iframe = document.getElementById("thermal-badge-print-iframe") as HTMLIFrameElement | null;
    if (!iframe) {
      iframe = document.createElement("iframe");
      iframe.id = "thermal-badge-print-iframe";
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      iframe.style.visibility = "hidden";
      document.body.appendChild(iframe);
    }

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Badge - ${cleanName}</title>
  <style>
    @page {
      size: ${widthMm}mm ${heightMm}mm;
      margin: 0;
    }
    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
    * {
      box-sizing: border-box;
      -webkit-font-smoothing: antialiased;
    }
    html, body {
      margin: 0;
      padding: 0;
      width: ${widthMm}mm;
      height: ${heightMm}mm;
      background: #ffffff;
      color: #000000;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
      overflow: hidden;
    }
    .badge-card {
      width: ${widthMm}mm;
      height: ${heightMm}mm;
      padding: 2.5mm 3.5mm;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
    }
    .badge-name {
      font-size: ${nameFontSize};
      font-weight: 800;
      line-height: 1.15;
      text-transform: uppercase;
      color: #000000;
      max-width: 100%;
      word-break: break-word;
      margin: 0 0 1.5mm 0;
      letter-spacing: -0.2px;
    }
    .badge-company {
      font-size: ${companyFontSize};
      font-weight: 600;
      line-height: 1.25;
      color: #1a1a1a;
      max-width: 100%;
      word-break: break-word;
      margin: 0;
    }
  </style>
</head>
<body>
  <div class="badge-card">
    <div class="badge-name">${escapeHtml(cleanName)}</div>
    ${cleanCompany ? `<div class="badge-company">${escapeHtml(cleanCompany)}</div>` : ""}
  </div>
</body>
</html>`;

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
        console.error("Print error:", e);
      }
    }, 250);
  };

  const handleScanSuccess = async (decodedText: string) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    try {
      let token = decodedText.trim();
      if (token.includes("/ticket/")) {
        token = token.split("/ticket/")[1]?.split("?")[0] || token;
      }

      const res = await validateAndCheckIn(eventId, token);
      setScanResult(res);

      if (res.success) {
        playSound("success");
        const companyName = extractCompany(res.registration?.answers);

        // Trigger Instant Notification Banner
        setActiveToast({
          name: res.registration?.name || "Peserta",
          company: companyName,
          time: formatTimeWib(new Date()),
          printed: autoPrint,
        });

        // Trigger Auto-Print Badge Label if enabled
        if (autoPrint && res.registration?.name) {
          triggerPrintLabel(res.registration.name, companyName);
        }

        // Update local attendees list
        setAttendees((prev) =>
          prev.map((a) =>
            a.qrToken === token
              ? { ...a, status: "CHECKED_IN", checkedInAt: new Date() }
              : a
          )
        );
        router.refresh();
      } else {
        playSound("error");
      }
    } catch (err: any) {
      playSound("error");
      setScanResult({
        success: false,
        code: "ERROR",
        message: err?.message || "Gagal memproses QR Code.",
      });
    } finally {
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 2000);
    }
  };

  const startScanner = async () => {
    try {
      const qrScanner = new Html5Qrcode("reader");
      html5QrCodeRef.current = qrScanner;

      await qrScanner.start(
        { facingMode: "environment" },
        {
          fps: 15,
          qrbox: { width: 250, height: 250 },
        },
        handleScanSuccess,
        () => {}
      );
      setIsScanning(true);
    } catch (err: any) {
      alert("Tidak dapat mengakses kamera: " + err.message);
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (e) {
        console.error(e);
      }
      setIsScanning(false);
    }
  };

  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current && isScanning) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
    };
  }, [isScanning]);

  const handleManualCheckInClick = async (attendee: AttendeeItem) => {
    setManualLoadingId(attendee.id);
    try {
      const updated = await manualCheckInById(attendee.id);
      playSound("success");
      const companyName = extractCompany(updated.answers || attendee.answers);

      // Trigger Notification Card & Toast
      setScanResult({
        success: true,
        code: "SUCCESS",
        message: "Check-in BERHASIL! Selamat datang di acara.",
        registration: updated,
      });

      setActiveToast({
        name: updated.name,
        company: companyName,
        time: formatTimeWib(new Date()),
        printed: autoPrint,
      });

      // Trigger Auto-Print if enabled
      if (autoPrint) {
        triggerPrintLabel(updated.name, companyName);
      }

      setAttendees((prev) =>
        prev.map((a) =>
          a.id === attendee.id
            ? { ...a, status: "CHECKED_IN", checkedInAt: new Date() }
            : a
        )
      );
      router.refresh();
    } catch (e: any) {
      playSound("error");
      alert("Gagal check-in: " + e.message);
    } finally {
      setManualLoadingId(null);
    }
  };

  const filteredAttendees = attendees.filter((a) => {
    const comp = extractCompany(a.answers).toLowerCase();
    const q = searchManual.toLowerCase();
    return (
      a.name.toLowerCase().includes(q) ||
      a.email.toLowerCase().includes(q) ||
      comp.includes(q) ||
      (a.phone && a.phone.includes(searchManual))
    );
  });

  const liveApprovedCount = attendees.length || totalApproved;
  const liveCheckedInCount = attendees.filter((a) => a.status === "CHECKED_IN").length;
  const attendancePercent =
    liveApprovedCount > 0
      ? Math.round((liveCheckedInCount / liveApprovedCount) * 100)
      : 0;

  const currentResultCompany = extractCompany(scanResult?.registration?.answers);

  return (
    <div className="space-y-8 relative">
      {/* =================================================================== */}
      {/* FLOATING SUCCESS NOTIFICATION TOAST (Appears on every scan)        */}
      {/* =================================================================== */}
      {activeToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 max-w-md w-[92%] p-4 rounded-2xl bg-slate-900/95 text-white shadow-2xl backdrop-blur-md border border-emerald-500/50 flex items-center gap-3.5 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shrink-0">
            <CheckCircle2 className="w-6 h-6 animate-pulse" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400">
                Check-In Berhasil! ({activeToast.time} WIB)
              </span>
              {activeToast.printed && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-emerald-300 flex items-center gap-1">
                  <Printer className="w-3 h-3" />
                  <span>37x75mm Dicetak</span>
                </span>
              )}
            </div>
            <div className="font-extrabold text-sm text-white truncate mt-0.5">
              {activeToast.name}
            </div>
            {activeToast.company && (
              <div className="text-xs text-slate-300 truncate">
                {activeToast.company}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setActiveToast(null)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white cursor-pointer"
            title="Tutup Notifikasi"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Real-time Attendance Progress Meter */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl liquid-card">
          <div className="text-xs font-bold text-slate-600">Total Peserta Terdaftar</div>
          <div className="text-3xl font-extrabold text-slate-900 mt-1">{liveApprovedCount}</div>
          <div className="text-[11px] font-medium text-slate-500 mt-0.5">Memiliki E-Ticket RSVP</div>
        </div>

        <div className="p-5 rounded-3xl liquid-card">
          <div className="text-xs font-bold text-slate-600">Total Hadir (Checked-In)</div>
          <div className="text-3xl font-extrabold text-[#17449A] mt-1">{liveCheckedInCount}</div>
          <div className="text-[11px] font-medium text-slate-500 mt-0.5">Sudah melewati meja masuk</div>
        </div>

        <div className="p-5 rounded-3xl liquid-card">
          <div className="text-xs font-bold text-slate-600">Tingkat Kehadiran</div>
          <div className="text-3xl font-extrabold text-slate-900 mt-1">{attendancePercent}%</div>
          <div className="w-full h-2 bg-slate-200/80 rounded-full mt-2 overflow-hidden p-0.5">
            <div
              className="h-full bg-[#17449A] rounded-full transition-all duration-300"
              style={{ width: `${attendancePercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Scanner Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Camera Viewfinder */}
        <div className="lg:col-span-6 space-y-4">
          <div className="p-6 rounded-3xl liquid-glass space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-[#17449A]" />
                <h2 className="text-base font-extrabold text-slate-900">Kamera Scanner QR</h2>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Auto-Print Toggle Pill */}
                <button
                  type="button"
                  onClick={() => handleToggleAutoPrint(!autoPrint)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    autoPrint
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "liquid-pill text-slate-600"
                  }`}
                  title={
                    autoPrint
                      ? "Cetak Otomatis Aktif (Ukuran 37x75mm)"
                      : "Cetak Otomatis Mati"
                  }
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Auto-Print: {autoPrint ? "ON" : "OFF"}</span>
                </button>

                {/* Print Settings Button */}
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(true)}
                  className="p-2 rounded-xl liquid-pill text-slate-700 hover:text-[#17449A] cursor-pointer"
                  title="Pengaturan Ukuran Print Label (37x75mm)"
                >
                  <Settings2 className="w-4 h-4" />
                </button>

                {/* Sound Effect Toggle */}
                <button
                  type="button"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className="p-2 rounded-xl liquid-pill text-slate-900 cursor-pointer"
                  title={soundEnabled ? "Matikan Efek Suara" : "Aktifkan Efek Suara"}
                >
                  {soundEnabled ? (
                    <Volume2 className="w-4 h-4 text-[#17449A]" />
                  ) : (
                    <VolumeX className="w-4 h-4 text-slate-400" />
                  )}
                </button>

                {!isScanning ? (
                  <button
                    type="button"
                    onClick={startScanner}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#17449A] hover:bg-[#12367B] shadow-md shadow-[#17449A]/25 flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Nyalakan Kamera</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopScanner}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 shadow-md shadow-rose-600/25 flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <span>Matikan Kamera</span>
                  </button>
                )}
              </div>
            </div>

            {/* Viewfinder Element */}
            <div className="relative rounded-2xl overflow-hidden bg-slate-900 aspect-square flex flex-col items-center justify-center border border-slate-200">
              <div id="reader" className="w-full h-full" />
              {!isScanning && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-50/95">
                  <div className="w-16 h-16 rounded-2xl bg-[#17449A]/10 border border-[#17449A]/20 flex items-center justify-center text-[#17449A] mb-3">
                    <Camera className="w-8 h-8" />
                  </div>
                  <p className="text-xs text-slate-600 max-w-xs leading-relaxed">
                    Klik tombol <strong className="text-slate-900">&ldquo;Nyalakan Kamera&rdquo;</strong> di atas untuk memindai tiket QR Code peserta dari kamera HP atau webcam laptop.
                  </p>
                </div>
              )}
            </div>

            <p className="text-[11px] font-medium text-slate-500 text-center">
              Arahkan QR Code peserta ke dalam kotak pemindai kamera. Sistem akan memverifikasi dan mengeluarkan suara notifikasi secara instan.
            </p>
          </div>
        </div>

        {/* Right Column: Scan Result Feedback Card */}
        <div className="lg:col-span-6 space-y-4">
          <div className="p-6 rounded-3xl liquid-glass min-h-[360px] flex flex-col justify-center">
            {scanResult ? (
              <div className="animate-fade-in space-y-4">
                {scanResult.success ? (
                  <div className="p-6 rounded-2xl bg-emerald-50/90 border border-emerald-200 text-center space-y-3 relative overflow-hidden">
                    <div className="w-16 h-16 rounded-2xl bg-white border border-emerald-200 flex items-center justify-center text-emerald-600 mx-auto shadow-xs">
                      <CheckCircle2 className="w-8 h-8 animate-bounce-short" />
                    </div>

                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-600 text-white shadow-2xs">
                      <Check className="w-3.5 h-3.5" />
                      <span>CHECK-IN BERHASIL</span>
                    </div>

                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                      {scanResult.registration?.name}
                    </h3>

                    {currentResultCompany ? (
                      <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white border border-emerald-200 text-xs font-bold text-slate-800 shadow-2xs">
                        <Building2 className="w-3.5 h-3.5 text-[#17449A]" />
                        <span>{currentResultCompany}</span>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-600">{scanResult.registration?.email}</p>
                    )}

                    <div className="pt-2 text-[11px] font-bold text-emerald-700 font-mono">
                      Waktu Check-In: {formatTimeWib(new Date())} WIB
                    </div>

                    {/* Print Label Action Button */}
                    <div className="pt-3 border-t border-emerald-200/70 flex flex-col sm:flex-row items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          triggerPrintLabel(
                            scanResult.registration?.name,
                            currentResultCompany
                          )
                        }
                        className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-[#17449A] hover:bg-[#12367B] shadow-md shadow-[#17449A]/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
                      >
                        <Printer className="w-4 h-4" />
                        <span>Cetak Label Tiket (37x75mm)</span>
                      </button>
                    </div>
                  </div>
                ) : scanResult.code === "ALREADY_CHECKED_IN" ? (
                  <div className="p-6 rounded-2xl bg-amber-50/90 border border-amber-200 text-center space-y-3">
                    <div className="w-16 h-16 rounded-2xl bg-white border border-amber-200 flex items-center justify-center text-amber-600 mx-auto shadow-xs">
                      <Clock className="w-8 h-8" />
                    </div>
                    <div className="inline-block px-3 py-1 rounded-full text-xs font-extrabold bg-amber-500 text-white">
                      SUDAH CHECK-IN SEBELUMNYA
                    </div>
                    <h3 className="text-xl font-extrabold text-slate-900">
                      {scanResult.registration?.name}
                    </h3>
                    {currentResultCompany && (
                      <p className="text-xs font-bold text-slate-700">
                        {currentResultCompany}
                      </p>
                    )}
                    <p className="text-xs text-slate-700 leading-relaxed">{scanResult.message}</p>

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() =>
                          triggerPrintLabel(
                            scanResult.registration?.name,
                            currentResultCompany
                          )
                        }
                        className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-800 liquid-pill inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5 text-[#17449A]" />
                        <span>Cetak Ulang Label (37x75mm)</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 rounded-2xl bg-rose-50/90 border border-rose-200 text-center space-y-3">
                    <div className="w-16 h-16 rounded-2xl bg-white border border-rose-200 flex items-center justify-center text-rose-600 mx-auto shadow-xs">
                      <AlertCircle className="w-8 h-8" />
                    </div>
                    <div className="inline-block px-3 py-1 rounded-full text-xs font-extrabold bg-rose-600 text-white">
                      TIKET TIDAK VALID
                    </div>
                    <p className="text-xs text-rose-700 font-medium leading-relaxed">{scanResult.message}</p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setScanResult(null)}
                  className="w-full py-2.5 rounded-xl liquid-pill text-xs font-bold text-slate-700 cursor-pointer"
                >
                  Reset / Siap Scan Peserta Berikutnya
                </button>
              </div>
            ) : (
              <div className="text-center p-8 space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-[#17449A]/10 border border-[#17449A]/20 flex items-center justify-center text-[#17449A] mx-auto">
                  <RefreshCw className="w-8 h-8 opacity-75" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900">Menunggu Pemindaian QR</h3>
                <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                  Hasil verifikasi identitas, suara notifikasi, dan cetak label tiket thermal (37 x 75 mm) akan otomatis berjalan dalam &lt; 1 detik.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Manual Search & Check-in Table */}
      <div className="space-y-4 pt-6 border-t border-slate-200/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">Pencarian & Check-In Manual</h3>
            <p className="text-xs text-slate-600">
              Gunakan jika layar ponsel peserta bermasalah, kamera tidak tersedia, atau cetak ulang label peserta.
            </p>
          </div>

          <div className="relative min-w-[260px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchManual}
              onChange={(e) => setSearchManual(e.target.value)}
              placeholder="Cari nama, PT / perusahaan, email..."
              className="w-full pl-9 pr-4 py-2 rounded-xl liquid-input text-slate-900 placeholder-slate-400 text-xs"
            />
          </div>
        </div>

        <div className="rounded-3xl liquid-glass overflow-hidden max-h-96 overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-slate-100/95 border-b border-slate-200 text-slate-700 z-10">
              <tr>
                <th className="p-3.5 font-bold">Nama Lengkap & PT</th>
                <th className="p-3.5 font-bold">Email</th>
                <th className="p-3.5 font-bold">Status</th>
                <th className="p-3.5 font-bold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70">
              {filteredAttendees.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-slate-500">
                    Tidak ditemukan peserta yang cocok.
                  </td>
                </tr>
              ) : (
                filteredAttendees.map((att) => {
                  const comp = extractCompany(att.answers);
                  return (
                    <tr key={att.id} className="hover:bg-white/80">
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900">{att.name}</div>
                        {comp ? (
                          <div className="text-[11px] font-semibold text-slate-500 mt-0.5 flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-[#17449A]" />
                            <span className="truncate max-w-[240px]">{comp}</span>
                          </div>
                        ) : null}
                      </td>
                      <td className="p-3.5 text-slate-600">{att.email}</td>
                      <td className="p-3.5">
                        {att.status === "CHECKED_IN" ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Sudah Hadir
                          </span>
                        ) : att.status === "APPROVED" ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                            Belum Hadir
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold text-amber-600">{att.status}</span>
                        )}
                      </td>
                      <td className="p-3.5 text-right">
                        {att.status === "CHECKED_IN" ? (
                          <div className="inline-flex items-center gap-2 justify-end">
                            <span className="text-[11px] text-slate-500 font-mono font-semibold">
                              {formatTimeWib(att.checkedInAt)}
                            </span>
                            <button
                              type="button"
                              onClick={() => triggerPrintLabel(att.name, comp)}
                              title="Cetak Ulang Label Badge (37x75mm)"
                              className="px-2.5 py-1.5 rounded-xl liquid-pill text-slate-800 hover:text-[#17449A] inline-flex items-center gap-1 text-[11px] font-bold cursor-pointer transition-colors"
                            >
                              <Printer className="w-3.5 h-3.5 text-[#17449A]" />
                              <span className="hidden sm:inline">Cetak Label</span>
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleManualCheckInClick(att)}
                            disabled={manualLoadingId === att.id}
                            className="px-3 py-1.5 rounded-xl bg-[#17449A] hover:bg-[#12367B] text-white text-[11px] font-bold transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
                          >
                            {manualLoadingId === att.id ? "Memproses..." : "Tandai Hadir"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* =================================================================== */}
      {/* MODAL PENGATURAN CETAK LABEL (37 x 75 mm)                          */}
      {/* =================================================================== */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-md animate-fade-in">
          <div className="max-w-md w-full liquid-glass rounded-3xl p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200/80">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#17449A]/10 border border-[#17449A]/20 flex items-center justify-center text-[#17449A] shrink-0">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Pengaturan Cetak Label Badge
                  </h3>
                  <p className="text-xs text-slate-500">
                    Ukuran Standar: 37 x 75 mm
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="p-1.5 rounded-xl liquid-pill text-slate-400 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Settings Options */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Orientasi Kertas Thermal Printer
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleOrientation("landscape")}
                    className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                      printOrientation === "landscape"
                        ? "bg-[#17449A] text-white border-[#17449A] shadow-xs"
                        : "liquid-card text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    <span>Landscape (Default)</span>
                    <span className="text-[10px] opacity-80">Lebar 75mm x Tinggi 37mm</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleOrientation("portrait")}
                    className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                      printOrientation === "portrait"
                        ? "bg-[#17449A] text-white border-[#17449A] shadow-xs"
                        : "liquid-card text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    <span>Portrait</span>
                    <span className="text-[10px] opacity-80">Lebar 37mm x Tinggi 75mm</span>
                  </button>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="text-xs font-bold text-slate-800">
                  Pratinjau Format Cetak (Hanya Nama & PT):
                </div>
                <div className="p-3 bg-white border border-slate-300 rounded-xl text-center shadow-inner">
                  <div className="text-sm font-black text-slate-900 uppercase">
                    BUDI SANTOSO
                  </div>
                  <div className="text-xs font-semibold text-slate-600 mt-0.5">
                    PT Bank Central Asia Tbk
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 pt-1">
                  💡 Format print dirancang bersih dan minimalis sesuai permintaan, hanya memuat <strong>Nama Peserta</strong> dan <strong>PT/Perusahaan</strong> untuk disematkan di name tag / badge dada.
                </p>
              </div>

              <div>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoPrint}
                    onChange={(e) => handleToggleAutoPrint(e.target.checked)}
                    className="accent-[#17449A] w-4 h-4 rounded cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-800">
                    Otomatis Buka Dialog Cetak saat Scan Berhasil
                  </span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/80">
              <button
                type="button"
                onClick={() =>
                  triggerPrintLabel("CONTOH NAMA PESERTA", "PT CONTOH PERUSAHAAN")
                }
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-800 liquid-pill cursor-pointer"
              >
                Tes Cetak Sample
              </button>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#17449A] hover:bg-[#12367B] shadow-md shadow-[#17449A]/20 cursor-pointer"
              >
                Simpan & Selesai
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
