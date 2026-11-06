"use client";

import { useEffect, useRef, useState } from "react";
import { validateAndCheckIn, manualCheckInById } from "@/actions/registrations";
import {
  Camera,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Volume2,
  VolumeX,
  Search,
  Users,
  RefreshCw,
  Clock,
  Sparkles,
} from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { useRouter } from "next/navigation";

interface ScannerClientProps {
  eventId: string;
  eventTitle: string;
  totalApproved: number;
  totalCheckedIn: number;
  initialAttendees: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    status: string;
    qrToken: string;
    checkedInAt: Date | null;
  }[];
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
  const [scanResult, setScanResult] = useState<{
    success: boolean;
    code: string;
    message: string;
    registration?: any;
  } | null>(null);

  const [attendees, setAttendees] = useState(initialAttendees);
  const [searchManual, setSearchManual] = useState("");
  const [manualLoadingId, setManualLoadingId] = useState<string | null>(null);

  useEffect(() => {
    setAttendees(initialAttendees);
  }, [initialAttendees]);

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

  // Audio cues using Web Audio API
  const playSound = (type: "success" | "error") => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === "success") {
        // High pleasant ding
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.1); // A5
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.35);
      } else {
        // Low double buzz
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(220, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      }
    } catch (e) {
      // AudioContext not allowed or unsupported
    }
  };

  const handleScanSuccess = async (decodedText: string) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    try {
      // If the scanned text is a full URL like http://localhost:3000/ticket/uuid
      let token = decodedText.trim();
      if (token.includes("/ticket/")) {
        token = token.split("/ticket/")[1]?.split("?")[0] || token;
      }

      const res = await validateAndCheckIn(eventId, token);
      setScanResult(res);

      if (res.success) {
        playSound("success");
        // Update local attendees list
        setAttendees((prev) =>
          prev.map((a) => (a.qrToken === token ? { ...a, status: "CHECKED_IN", checkedInAt: new Date() } : a))
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
      // Pause slightly before allowing next scan to prevent duplicate scans of same badge
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
        () => {
          // Frame scan error (no QR detected in frame), silent ignore
        }
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

  const handleManualCheckInClick = async (attendeeId: string) => {
    setManualLoadingId(attendeeId);
    try {
      await manualCheckInById(attendeeId);
      playSound("success");
      setAttendees((prev) =>
        prev.map((a) => (a.id === attendeeId ? { ...a, status: "CHECKED_IN", checkedInAt: new Date() } : a))
      );
      router.refresh();
    } catch (e: any) {
      playSound("error");
      alert("Gagal check-in: " + e.message);
    } finally {
      setManualLoadingId(null);
    }
  };

  const filteredAttendees = attendees.filter((a) =>
    a.name.toLowerCase().includes(searchManual.toLowerCase()) ||
    a.email.toLowerCase().includes(searchManual.toLowerCase()) ||
    (a.phone && a.phone.includes(searchManual))
  );

  const liveApprovedCount = attendees.length || totalApproved;
  const liveCheckedInCount = attendees.filter((a) => a.status === "CHECKED_IN").length;
  const attendancePercent =
    liveApprovedCount > 0 ? Math.round((liveCheckedInCount / liveApprovedCount) * 100) : 0;

  return (
    <div className="space-y-8">
      {/* Real-time Attendance Progress Meter */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl liquid-card">
          <div className="text-xs font-bold text-slate-600">Total Peserta Disetujui</div>
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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-[#17449A]" />
                <h2 className="text-base font-extrabold text-slate-900">Kamera Scanner QR</h2>
              </div>

              <div className="flex items-center gap-2">
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
                  <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-3">
                    <Camera className="w-8 h-8" />
                  </div>
                  <p className="text-xs text-slate-600 max-w-xs leading-relaxed">
                    Klik tombol <strong className="text-slate-900">&ldquo;Nyalakan Kamera&rdquo;</strong> di atas untuk memindai tiket QR Code peserta dari kamera HP atau webcam laptop.
                  </p>
                </div>
              )}
            </div>

            <p className="text-[11px] font-medium text-slate-500 text-center">
              Arahkan QR Code peserta ke dalam kotak pemindai kamera. Sistem akan memverifikasi secara instan.
            </p>
          </div>
        </div>

        {/* Right Column: Scan Result Feedback Card */}
        <div className="lg:col-span-6 space-y-4">
          <div className="p-6 rounded-3xl liquid-glass min-h-[360px] flex flex-col justify-center">
            {scanResult ? (
              <div className="animate-fade-in space-y-4">
                {scanResult.success ? (
                  <div className="p-6 rounded-2xl bg-emerald-50/90 border border-emerald-200 text-center space-y-3">
                    <div className="w-16 h-16 rounded-2xl bg-white border border-emerald-200 flex items-center justify-center text-emerald-600 mx-auto shadow-xs">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <div className="inline-block px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-600 text-white">
                      CHECK-IN BERHASIL
                    </div>
                    <h3 className="text-2xl font-black text-slate-900">
                      {scanResult.registration?.name}
                    </h3>
                    <p className="text-xs text-slate-600">{scanResult.registration?.email}</p>
                    <div className="pt-2 text-[11px] font-bold text-emerald-700 font-mono">
                      Waktu Check-In: {formatTimeWib(new Date())} WIB
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
                    <p className="text-xs text-slate-700 leading-relaxed">{scanResult.message}</p>
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
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mx-auto">
                  <RefreshCw className="w-8 h-8 opacity-75" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900">Menunggu Pemindaian QR</h3>
                <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                  Hasil verifikasi identitas, status persetujuan, dan jam check-in peserta akan langsung tampil di sini dalam &lt; 1 detik.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Manual Search & Check-in Table (PRD Section 4.6 Fallback) */}
      <div className="space-y-4 pt-6 border-t border-slate-200/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">Pencarian & Check-In Manual</h3>
            <p className="text-xs text-slate-600">
              Gunakan jika layar ponsel peserta bermasalah, kamera tidak tersedia, atau sinyal drop.
            </p>
          </div>

          <div className="relative min-w-[260px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchManual}
              onChange={(e) => setSearchManual(e.target.value)}
              placeholder="Ketik nama / email peserta..."
              className="w-full pl-9 pr-4 py-2 rounded-xl liquid-input text-slate-900 placeholder-slate-400 text-xs"
            />
          </div>
        </div>

        <div className="rounded-3xl liquid-glass overflow-hidden max-h-96 overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-slate-100/95 border-b border-slate-200 text-slate-700 z-10">
              <tr>
                <th className="p-3.5 font-bold">Nama Lengkap</th>
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
                filteredAttendees.map((att) => (
                  <tr key={att.id} className="hover:bg-white/80">
                    <td className="p-3.5 font-bold text-slate-900">{att.name}</td>
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
                        <span className="text-[11px] text-slate-500 font-mono font-semibold">
                          {formatTimeWib(att.checkedInAt)}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleManualCheckInClick(att.id)}
                          disabled={manualLoadingId === att.id}
                          className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          {manualLoadingId === att.id ? "Memproses..." : "Tandai Hadir"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
