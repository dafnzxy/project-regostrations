"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { validateAndCheckIn, manualCheckInById } from "@/actions/registrations";
import {
  Camera,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
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
  Copy,
  ScanLine,
  UploadCloud,
  RotateCcw,
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

interface CameraDevice {
  id: string;
  label: string;
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

  // Cameras and hardware
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraStarting, setIsCameraStarting] = useState(false);

  // Barcode gun / manual input
  const [barcodeGunInput, setBarcodeGunInput] = useState("");

  const [scanResult, setScanResult] = useState<{
    success: boolean;
    code: string;
    message: string;
    scannedText?: string;
    otherEventTitle?: string;
    registration?: any;
  } | null>(null);

  // Enhanced Toast system: supports success, error, warning
  const [activeToast, setActiveToast] = useState<{
    type: "success" | "error" | "warning";
    title: string;
    name?: string;
    company?: string;
    time?: string;
    detail?: string;
    printed?: boolean;
  } | null>(null);

  const [attendees, setAttendees] = useState<AttendeeItem[]>(initialAttendees);
  const [searchManual, setSearchManual] = useState("");
  const [manualLoadingId, setManualLoadingId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const isProcessingRef = useRef(false);
  const lastScannedRef = useRef<{ text: string; time: number }>({ text: "", time: 0 });

  useEffect(() => {
    setAttendees(initialAttendees);
  }, [initialAttendees]);

  // Load preferences from localStorage & Enumerate Cameras
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

    // Enumerate cameras
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length > 0) {
          setCameras(devices);
          // Prefer rear/environment camera if available
          const backCam = devices.find((d) =>
            /back|rear|environment|belakang/i.test(d.label)
          );
          setSelectedCameraId(backCam ? backCam.id : devices[0].id);
        }
      })
      .catch((err) => {
        console.warn("Could not list cameras upfront:", err);
      });
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

  const formatTimeWib = (dateInput: Date | string | null | undefined) => {
    if (!dateInput) return "OK";
    try {
      return new Intl.DateTimeFormat("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZone: "Asia/Jakarta",
      }).format(new Date(dateInput));
    } catch {
      return "OK";
    }
  };

  // High quality chime notification using Web Audio API + vibration
  const playSound = (type: "success" | "error" | "warning") => {
    if (!soundEnabled || typeof window === "undefined") return;
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
      } else if (type === "warning") {
        // Attention chime: 2 medium pings
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.setValueAtTime(440, now + 0.18); // A4
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.45);

        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate([150, 80, 150]);
        }
      } else {
        // Low error buzz: 220Hz saw wave
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.setValueAtTime(150, now + 0.15);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.4);

        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate([250]);
        }
      }
    } catch {
      // AudioContext unsupported
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

  // Main scan processor: Handles valid, invalid, unrecognized QR codes with clear detection
  const handleScanSuccess = useCallback(async (decodedText: string) => {
    const rawText = (decodedText || "").trim();
    if (!rawText) return;

    const now = Date.now();
    // Prevent debounce spam if the exact same text is scanned within 3 seconds
    if (
      lastScannedRef.current.text === rawText &&
      now - lastScannedRef.current.time < 3000
    ) {
      return;
    }

    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    lastScannedRef.current = { text: rawText, time: now };

    try {
      const res = await validateAndCheckIn(eventId, rawText);
      setScanResult(res);

      if (res.success) {
        playSound("success");
        const companyName = extractCompany(res.registration?.answers);

        // Trigger Instant Notification Banner
        setActiveToast({
          type: "success",
          title: "Check-In Berhasil!",
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
            a.id === res.registration?.id || a.qrToken === res.registration?.qrToken
              ? { ...a, status: "CHECKED_IN", checkedInAt: new Date() }
              : a
          )
        );
        router.refresh();
      } else if (res.code === "ALREADY_CHECKED_IN") {
        playSound("warning");
        const companyName = extractCompany(res.registration?.answers);
        setActiveToast({
          type: "warning",
          title: "Sudah Check-In Sebelumnya!",
          name: res.registration?.name,
          company: companyName,
          detail: res.message,
        });
      } else if (res.code === "WRONG_EVENT") {
        playSound("error");
        setActiveToast({
          type: "error",
          title: "Tiket Acara Lain!",
          detail: res.message,
        });
      } else {
        // UNRECOGNIZED_QR or other errors
        playSound("error");
        setActiveToast({
          type: "error",
          title: "QR Tidak Dikenali!",
          detail: rawText.length > 45 ? rawText.slice(0, 45) + "..." : rawText,
        });
      }
    } catch (err: any) {
      playSound("error");
      const errorMsg = err?.message || "Gagal memproses QR Code.";
      setScanResult({
        success: false,
        code: "UNRECOGNIZED_QR",
        scannedText: rawText,
        message: errorMsg,
      });
      setActiveToast({
        type: "error",
        title: "QR Tidak Dikenali!",
        detail: errorMsg,
      });
    } finally {
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 1500);
    }
  }, [eventId, autoPrint, soundEnabled, router]);

  // Robust Camera Startup with graceful fallback and dynamic qrbox
  const startScanner = async (overrideCameraId?: string) => {
    setIsCameraStarting(true);
    setCameraError(null);
    const camIdToUse = overrideCameraId || selectedCameraId;

    try {
      // 1. Clean up existing instance if any
      if (html5QrCodeRef.current) {
        try {
          if (html5QrCodeRef.current.isScanning) {
            await html5QrCodeRef.current.stop();
          }
          html5QrCodeRef.current.clear();
        } catch {
          // ignore cleanup
        }
      }

      // Check if #reader element exists
      const readerElem = document.getElementById("reader");
      if (!readerElem) {
        throw new Error("Elemen scanner (#reader) belum siap di layar.");
      }

      // Clear any leftover DOM inside reader
      readerElem.innerHTML = "";

      const qrScanner = new Html5Qrcode("reader");
      html5QrCodeRef.current = qrScanner;

      // Safe responsive qrbox calculation prevents crashes on low-res cameras
      const config = {
        fps: 10,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          const size = Math.max(160, Math.floor(minEdge * 0.72));
          return { width: size, height: size };
        },
        aspectRatio: 1.0,
      };

      // Try starting with specified camera or fallback to environment/user
      if (camIdToUse) {
        await qrScanner.start(camIdToUse, config, handleScanSuccess, () => {});
      } else {
        try {
          await qrScanner.start({ facingMode: "environment" }, config, handleScanSuccess, () => {});
        } catch (envErr) {
          console.warn("Back camera failed, falling back to front/default camera:", envErr);
          await qrScanner.start({ facingMode: "user" }, config, handleScanSuccess, () => {});
        }
      }

      setIsScanning(true);

      // Re-fetch cameras to get readable labels after permission granted
      Html5Qrcode.getCameras()
        .then((devices) => {
          if (devices && devices.length > 0) {
            setCameras(devices);
            if (!selectedCameraId) {
              setSelectedCameraId(devices[0].id);
            }
          }
        })
        .catch(() => {});
    } catch (err: any) {
      console.error("Camera start failed:", err);
      setCameraError(
        err?.message?.includes("NotAllowedError")
          ? "Izin akses kamera ditolak. Harap izinkan kamera di browser Anda."
          : err?.message || "Tidak dapat mengakses kamera."
      );
      setIsScanning(false);
    } finally {
      setIsCameraStarting(false);
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        html5QrCodeRef.current.clear();
      } catch (e) {
        console.error(e);
      }
      setIsScanning(false);
    }
  };

  const handleCameraChange = async (newCamId: string) => {
    setSelectedCameraId(newCamId);
    if (isScanning) {
      await stopScanner();
      await startScanner(newCamId);
    }
  };

  // Scan from uploaded image file
  const handleScanImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const tempScanner = new Html5Qrcode("reader-hidden-file");
      const decoded = await tempScanner.scanFile(file, true);
      tempScanner.clear();
      handleScanSuccess(decoded);
    } catch (err: any) {
      playSound("error");
      setScanResult({
        success: false,
        code: "UNRECOGNIZED_QR",
        scannedText: file.name,
        message: "Tidak ditemukan QR Code yang valid pada gambar tersebut. Pastikan foto jelas dan tidak blur.",
      });
      setActiveToast({
        type: "error",
        title: "QR Tidak Terbaca",
        detail: "Tidak ada QR Code yang terdeteksi pada gambar.",
      });
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        try {
          if (html5QrCodeRef.current.isScanning) {
            html5QrCodeRef.current.stop().catch(() => {});
          }
        } catch {
          // ignore
        }
      }
    };
  }, []);

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
        type: "success",
        title: "Check-In Berhasil!",
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
      (a.phone && a.phone.includes(searchManual)) ||
      (a.qrToken && a.qrToken.toLowerCase().includes(q))
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
      {/* Hidden container for file-based QR decoding */}
      <div id="reader-hidden-file" className="hidden" />
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleScanImageFile}
        accept="image/*"
        className="hidden"
      />

      {/* =================================================================== */}
      {/* FLOATING NOTIFICATION TOAST (Appears on every scan)                */}
      {/* =================================================================== */}
      {activeToast && (
        <div
          className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 max-w-md w-[92%] p-4 rounded-2xl text-white shadow-2xl backdrop-blur-md flex items-center gap-3.5 animate-in fade-in slide-in-from-top-4 duration-300 border ${
            activeToast.type === "success"
              ? "bg-slate-900/95 border-emerald-500/50"
              : activeToast.type === "warning"
              ? "bg-amber-950/95 border-amber-500/50"
              : "bg-rose-950/95 border-rose-500/60"
          }`}
        >
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
              activeToast.type === "success"
                ? "bg-emerald-500/20 border-emerald-400/40 text-emerald-400"
                : activeToast.type === "warning"
                ? "bg-amber-500/20 border-amber-400/40 text-amber-400"
                : "bg-rose-500/20 border-rose-400/40 text-rose-400"
            }`}
          >
            {activeToast.type === "success" ? (
              <CheckCircle2 className="w-6 h-6 animate-pulse" />
            ) : activeToast.type === "warning" ? (
              <Clock className="w-6 h-6" />
            ) : (
              <AlertCircle className="w-6 h-6 animate-pulse" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] font-extrabold uppercase tracking-wider ${
                  activeToast.type === "success"
                    ? "text-emerald-400"
                    : activeToast.type === "warning"
                    ? "text-amber-400"
                    : "text-rose-400"
                }`}
              >
                {activeToast.title} {activeToast.time ? `(${activeToast.time} WIB)` : ""}
              </span>
              {activeToast.printed && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-emerald-300 flex items-center gap-1">
                  <Printer className="w-3 h-3" />
                  <span>37x75mm Dicetak</span>
                </span>
              )}
            </div>

            {activeToast.name && (
              <div className="font-extrabold text-sm text-white truncate mt-0.5">
                {activeToast.name}
              </div>
            )}

            {activeToast.company && (
              <div className="text-xs text-slate-300 truncate">
                {activeToast.company}
              </div>
            )}

            {activeToast.detail && (
              <div className="text-xs text-slate-300 line-clamp-2 mt-0.5">
                {activeToast.detail}
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

      {/* Fast Input Barcode Gun / Manual Scanner */}
      <div className="p-4 rounded-2xl liquid-glass border border-slate-200/80 flex flex-col sm:flex-row items-center gap-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 shrink-0">
          <ScanLine className="w-4 h-4 text-[#17449A]" />
          <span>Scanner Gun USB / Input Token:</span>
        </div>
        <div className="flex-1 w-full flex items-center gap-2">
          <input
            type="text"
            placeholder="Arahkan Barcode Scanner Gun ke sini atau ketik token / email..."
            value={barcodeGunInput}
            onChange={(e) => setBarcodeGunInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && barcodeGunInput.trim()) {
                handleScanSuccess(barcodeGunInput.trim());
                setBarcodeGunInput("");
              }
            }}
            className="flex-1 px-3.5 py-2 rounded-xl text-xs liquid-input text-slate-900 placeholder-slate-400"
          />
          <button
            type="button"
            onClick={() => {
              if (barcodeGunInput.trim()) {
                handleScanSuccess(barcodeGunInput.trim());
                setBarcodeGunInput("");
              }
            }}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#17449A] hover:bg-[#12367B] shrink-0 cursor-pointer shadow-xs"
          >
            Verifikasi
          </button>
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
                    onClick={() => startScanner()}
                    disabled={isCameraStarting}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#17449A] hover:bg-[#12367B] shadow-md shadow-[#17449A]/25 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>{isCameraStarting ? "Menghubungkan..." : "Nyalakan Kamera"}</span>
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

            {/* Camera Selector Dropdown (Shown if multiple cameras detected) */}
            {cameras.length > 1 && (
              <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] font-bold text-slate-600 shrink-0">Pilih Kamera:</span>
                <select
                  value={selectedCameraId}
                  onChange={(e) => handleCameraChange(e.target.value)}
                  className="w-full text-xs font-medium text-slate-800 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#17449A]"
                >
                  {cameras.map((cam, idx) => (
                    <option key={cam.id} value={cam.id}>
                      {cam.label || `Kamera ${idx + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Camera Error Alert */}
            {cameraError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{cameraError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => startScanner()}
                  className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-bold text-[11px] shrink-0"
                >
                  Coba Lagi
                </button>
              </div>
            )}

            {/* Viewfinder Element */}
            <div className="relative rounded-2xl overflow-hidden bg-slate-900 aspect-square flex flex-col items-center justify-center border border-slate-200">
              <div id="reader" className="w-full h-full" />
              {!isScanning && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-50/95">
                  <div className="w-16 h-16 rounded-2xl bg-[#17449A]/10 border border-[#17449A]/20 flex items-center justify-center text-[#17449A] mb-3">
                    <Camera className="w-8 h-8" />
                  </div>
                  <p className="text-xs text-slate-600 max-w-xs leading-relaxed mb-4">
                    Klik tombol <strong className="text-slate-900">&ldquo;Nyalakan Kamera&rdquo;</strong> di atas untuk memindai tiket QR Code peserta dari kamera HP atau webcam laptop.
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => startScanner()}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#17449A] hover:bg-[#12367B] shadow-sm cursor-pointer"
                    >
                      Buka Kamera
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 liquid-card hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer"
                      title="Unggah screenshot / foto tiket QR"
                    >
                      <UploadCloud className="w-3.5 h-3.5 text-[#17449A]" />
                      <span>Scan dari File Foto</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-[11px] font-medium text-slate-500">
              <span>Arahkan QR Code peserta ke tengah kotak kamera.</span>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-[#17449A] font-bold hover:underline cursor-pointer flex items-center gap-1"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Upload Foto QR</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Scan Result Feedback Card */}
        <div className="lg:col-span-6 space-y-4">
          <div className="p-6 rounded-3xl liquid-glass min-h-[360px] flex flex-col justify-center">
            {scanResult ? (
              <div className="animate-fade-in space-y-4">
                {scanResult.success ? (
                  /* ========================================================= */
                  /* SUCCESS CHECK-IN CARD                                     */
                  /* ========================================================= */
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
                  /* ========================================================= */
                  /* ALREADY CHECKED IN (DUPLICATE) CARD                       */
                  /* ========================================================= */
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
                ) : scanResult.code === "WRONG_EVENT" ? (
                  /* ========================================================= */
                  /* WRONG EVENT CARD                                          */
                  /* ========================================================= */
                  <div className="p-6 rounded-2xl bg-amber-50/95 border-2 border-amber-300 text-center space-y-3.5">
                    <div className="w-16 h-16 rounded-2xl bg-white border border-amber-200 flex items-center justify-center text-amber-600 mx-auto shadow-xs">
                      <AlertTriangle className="w-9 h-9 text-amber-600" />
                    </div>
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-600 text-white shadow-2xs">
                        <span>⚠️ TIKET ACARA LAIN</span>
                      </div>
                      <h3 className="text-xl font-black text-slate-900 mt-2">
                        Tiket Terdaftar di Acara Berbeda
                      </h3>
                      <p className="text-xs text-amber-900 font-semibold mt-1">
                        {scanResult.message}
                      </p>
                    </div>

                    {scanResult.registration?.name && (
                      <div className="p-3 bg-white rounded-xl border border-amber-200 text-center">
                        <div className="text-[11px] font-bold text-slate-500">Nama Pemilik Tiket:</div>
                        <div className="text-base font-extrabold text-slate-900">{scanResult.registration.name}</div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* ========================================================= */
                  /* UNRECOGNIZED QR CODE DETECTION CARD                       */
                  /* ========================================================= */
                  <div className="p-6 rounded-2xl bg-rose-50/95 border-2 border-rose-300 text-center space-y-3.5 shadow-sm">
                    <div className="w-16 h-16 rounded-2xl bg-white border border-rose-200 flex items-center justify-center text-rose-600 mx-auto shadow-xs">
                      <AlertCircle className="w-9 h-9 text-rose-600 animate-pulse" />
                    </div>

                    <div>
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-600 text-white shadow-2xs">
                        <span>⚠️ QR CODE TIDAK DIKENALI</span>
                      </div>
                      <h3 className="text-xl font-black text-slate-900 mt-2">
                        Format QR Tidak Dikenal Sistem
                      </h3>
                      <p className="text-xs text-rose-800 font-medium mt-1 leading-relaxed">
                        Kamera berhasil mendeteksi QR Code, namun datanya <strong>tidak terdaftar</strong> sebagai tiket resmi pada event ini.
                      </p>
                    </div>

                    {/* Raw Scanned Payload Preview */}
                    <div className="p-3.5 rounded-xl bg-white border border-rose-200 text-left space-y-1.5 shadow-inner">
                      <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                        <span>Data Terbaca dari Scanner:</span>
                        <span className="font-mono text-[9px] text-rose-600 font-bold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                          UNRECOGNIZED
                        </span>
                      </div>
                      <div className="font-mono text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-slate-800 break-all select-all max-h-24 overflow-y-auto">
                        {scanResult.scannedText || scanResult.message}
                      </div>
                    </div>

                    {/* Actionable buttons */}
                    <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const query = (scanResult.scannedText || "").trim();
                          setSearchManual(query);
                          document.getElementById("manual-checkin-section")?.scrollIntoView({ behavior: "smooth" });
                        }}
                        className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#17449A] hover:bg-[#12367B] shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Search className="w-3.5 h-3.5" />
                        <span>Cari di Tabel Manual</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (scanResult.scannedText) {
                            navigator.clipboard?.writeText(scanResult.scannedText);
                            alert("Data QR berhasil disalin!");
                          }
                        }}
                        className="w-full sm:w-auto px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 liquid-card hover:bg-slate-100 flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Salin Teks QR</span>
                      </button>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setScanResult(null)}
                  className="w-full py-2.5 rounded-xl liquid-pill text-xs font-bold text-slate-700 hover:text-slate-900 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset / Siap Scan Peserta Berikutnya</span>
                </button>
              </div>
            ) : (
              <div className="text-center p-8 space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-[#17449A]/10 border border-[#17449A]/20 flex items-center justify-center text-[#17449A] mx-auto">
                  <RefreshCw className="w-8 h-8 opacity-75" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900">Menunggu Pemindaian QR</h3>
                <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                  Hasil verifikasi identitas, notifikasi suara, dan cetak label tiket thermal (37 x 75 mm) akan otomatis berjalan dalam &lt; 1 detik.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Manual Search & Check-in Table */}
      <div id="manual-checkin-section" className="space-y-4 pt-6 border-t border-slate-200/80">
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
