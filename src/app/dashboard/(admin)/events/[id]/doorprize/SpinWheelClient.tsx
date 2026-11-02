"use client";

import { useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import {
  drawWinner,
  redrawWinner,
  createPrize,
  deletePrize,
  getEligibleParticipants,
} from "@/actions/doorprize";
import {
  Sparkles,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Plus,
  Trash2,
  RefreshCw,
  Trophy,
  Users,
  Download,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface PrizeItem {
  id: string;
  name: string;
  quantity: number;
  order: number;
  prizeDraws?: {
    id: string;
    registration: {
      name: string;
      email: string;
    };
  }[];
}

interface WinnerDrawItem {
  id: string;
  prize: { name: string };
  registration: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
  };
  drawnAt: Date;
  status: string;
}

interface SpinWheelClientProps {
  eventId: string;
  eventTitle: string;
  initialPrizes: PrizeItem[];
  initialWinners: WinnerDrawItem[];
}

export function SpinWheelClient({
  eventId,
  eventTitle,
  initialPrizes,
  initialWinners,
}: SpinWheelClientProps) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Configuration States
  const [prizes, setPrizes] = useState(initialPrizes);
  const [selectedPrizeId, setSelectedPrizeId] = useState<string>(
    initialPrizes[0]?.id || ""
  );
  const [poolType, setPoolType] = useState<"CHECKED_IN" | "APPROVED">("CHECKED_IN");
  const [excludePrevious, setExcludePrevious] = useState(true);

  // Participant pool
  const [participants, setParticipants] = useState<
    { id: string; name: string; email: string }[]
  >([]);
  const [loadingPool, setLoadingPool] = useState(true);

  // Sound & Fullscreen
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Wheel Animation State
  const [isSpinning, setIsSpinning] = useState(false);
  const currentRotationRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);

  // Winner Modal
  const [currentWinner, setCurrentWinner] = useState<{
    drawId: string;
    prizeName: string;
    winnerName: string;
    winnerEmail: string;
  } | null>(null);

  // Add Prize Modal
  const [showAddPrize, setShowAddPrize] = useState(false);
  const [newPrizeName, setNewPrizeName] = useState("");
  const [newPrizeQty, setNewPrizeQty] = useState(1);

  // Load eligible participants whenever settings change
  const fetchPool = async () => {
    setLoadingPool(true);
    try {
      const list = await getEligibleParticipants(eventId, {
        poolType,
        excludePreviousWinners: excludePrevious,
      });
      setParticipants(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPool(false);
    }
  };

  useEffect(() => {
    fetchPool();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, poolType, excludePrevious]);

  // Audio effects
  const playSound = (type: "tick" | "fanfare") => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (type === "tick") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
      } else if (type === "fanfare") {
        const notes = [523.25, 659.25, 783.99, 1046.5]; // C, E, G, C
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.12);
          gain.gain.setValueAtTime(0.2, ctx.currentTime + idx * 0.12);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.12 + 0.5);
          osc.start(ctx.currentTime + idx * 0.12);
          osc.stop(ctx.currentTime + idx * 0.12 + 0.5);
        });
      }
    } catch (e) {}
  };

  // Color palette for slices
  const sliceColors = [
    "#4f46e5", // Indigo
    "#7c3aed", // Violet
    "#ec4899", // Pink
    "#06b6d4", // Cyan
    "#10b981", // Emerald
    "#f59e0b", // Amber
    "#3b82f6", // Blue
    "#8b5cf6", // Purple
  ];

  // Draw wheel on canvas
  const drawWheel = (rotation: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) - 24;

    ctx.clearRect(0, 0, width, height);

    // If pool is empty
    if (participants.length === 0) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.fillStyle = "#1e293b";
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = "#475569";
      ctx.stroke();

      ctx.fillStyle = "#94a3b8";
      ctx.font = "bold 15px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Tidak ada peserta di pool", centerX, centerY);
      ctx.restore();
      return;
    }

    const numSlices = participants.length;
    const arc = (2 * Math.PI) / numSlices;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(rotation);

    for (let i = 0; i < numSlices; i++) {
      const angle = i * arc;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, angle, angle + arc);
      ctx.fillStyle = sliceColors[i % sliceColors.length];
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
      ctx.stroke();

      // Text label on slice
      ctx.save();
      ctx.rotate(angle + arc / 2);
      ctx.textAlign = "right";
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 13px sans-serif";
      ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
      ctx.shadowBlur = 4;

      const participantName = participants[i].name;
      const truncatedName =
        participantName.length > 15 ? participantName.slice(0, 14) + "…" : participantName;
      ctx.fillText(truncatedName, radius - 20, 4);
      ctx.restore();
    }

    // Center circular badge
    ctx.beginPath();
    ctx.arc(0, 0, 40, 0, 2 * Math.PI);
    ctx.fillStyle = "#090d16";
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#ffffff";
    ctx.stroke();

    ctx.restore();

    // Top Pointer Needle
    ctx.save();
    ctx.translate(centerX, centerY - radius + 10);
    ctx.beginPath();
    ctx.moveTo(-16, -18);
    ctx.lineTo(16, -18);
    ctx.lineTo(0, 16);
    ctx.closePath();
    ctx.fillStyle = "#f43f5e"; // Rose
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "#ffffff";
    ctx.stroke();
    ctx.restore();
  };

  useEffect(() => {
    drawWheel(currentRotationRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participants]);

  // Handle Spin Action (Server-Authoritative Fair Randomization)
  const handleSpin = async () => {
    if (isSpinning || participants.length === 0 || !selectedPrizeId) return;

    setIsSpinning(true);
    setCurrentWinner(null);

    try {
      // 1. Get server-selected fair winner
      const result = await drawWinner(eventId, selectedPrizeId, {
        poolType,
        excludePreviousWinners: excludePrevious,
      });

      if (!result.success || !result.winner) {
        alert(result.message || "Gagal mengundi pemenang.");
        setIsSpinning(false);
        return;
      }

      const winnerIdx = result.winnerIndex!;
      const numSlices = participants.length;
      const sliceAngle = (2 * Math.PI) / numSlices;

      // Calculate target angle so pointer at top (3*PI/2) points directly at winner slice center
      const winnerSliceCenter = winnerIdx * sliceAngle + sliceAngle / 2;
      const pointerAngle = (3 * Math.PI) / 2;
      const normalizedTarget = pointerAngle - winnerSliceCenter;

      // Add 5-7 full spins for dramatic suspense
      const fullRotations = 6 * (2 * Math.PI);
      const startRotation = currentRotationRef.current % (2 * Math.PI);
      const totalDistance = fullRotations + (normalizedTarget - startRotation);

      const duration = 6500; // 6.5 seconds
      const startTime = performance.now();
      let lastSliceIndex = -1;

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(1, elapsed / duration);

        // Cubic ease-out
        const easeOut = 1 - Math.pow(1 - progress, 3.5);
        const currentAngle = startRotation + totalDistance * easeOut;
        currentRotationRef.current = currentAngle;

        drawWheel(currentAngle);

        // Play tick sound when slice changes
        const currentSlice =
          Math.floor((pointerAngle - (currentAngle % (2 * Math.PI))) / sliceAngle + numSlices) %
          numSlices;
        if (currentSlice !== lastSliceIndex) {
          lastSliceIndex = currentSlice;
          playSound("tick");
        }

        if (progress < 1) {
          animationFrameRef.current = requestAnimationFrame(animate);
        } else {
          // Finished!
          setIsSpinning(false);
          playSound("fanfare");

          // Confetti explosion
          confetti({
            particleCount: 150,
            spread: 90,
            origin: { y: 0.55 },
          });

          const chosenPrize = prizes.find((p) => p.id === selectedPrizeId);
          setCurrentWinner({
            drawId: result.drawId!,
            prizeName: chosenPrize?.name || "Doorprize",
            winnerName: result.winner.name,
            winnerEmail: result.winner.email,
          });

          // Refresh pool & page history
          fetchPool();
          router.refresh();
        }
      };

      animationFrameRef.current = requestAnimationFrame(animate);
    } catch (err: any) {
      alert("Terjadi kesalahan saat mengundi: " + err.message);
      setIsSpinning(false);
    }
  };

  const handleRedraw = async (drawId: string) => {
    if (!confirm("Undi ulang doorprize ini? Pemenang sebelumnya akan ditandai redrawn.")) return;
    try {
      await redrawWinner(drawId);
      setCurrentWinner(null);
      await fetchPool();
      router.refresh();
    } catch (e: any) {
      alert("Gagal undi ulang: " + e.message);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleAddPrize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPrizeName) return;
    try {
      const created = await createPrize(eventId, newPrizeName, Number(newPrizeQty));
      setPrizes((prev) => [...prev, created]);
      setSelectedPrizeId(created.id);
      setShowAddPrize(false);
      setNewPrizeName("");
      router.refresh();
    } catch (e: any) {
      alert("Gagal menambah hadiah: " + e.message);
    }
  };

  const handleDeletePrize = async (id: string) => {
    if (!confirm("Hapus kategori hadiah ini?")) return;
    try {
      await deletePrize(id);
      setPrizes((prev) => prev.filter((p) => p.id !== id));
      if (selectedPrizeId === id) {
        setSelectedPrizeId(prizes[0]?.id || "");
      }
      router.refresh();
    } catch (e: any) {
      alert("Gagal menghapus hadiah: " + e.message);
    }
  };

  const exportWinnersToCsv = () => {
    if (initialWinners.length === 0) return;
    const headers = ["Hadiah", "Nama Pemenang", "Email", "Nomor HP", "Waktu Diundi", "Status"];
    const rows = initialWinners.map((w) => [
      `"${w.prize.name}"`,
      `"${w.registration.name}"`,
      `"${w.registration.email}"`,
      `"${w.registration.phone || ""}"`,
      `"${new Date(w.drawnAt).toLocaleString("id-ID")}"`,
      `"${w.status}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Pemenang-Doorprize-${eventTitle.replace(/\s+/g, "-")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div ref={containerRef} className="space-y-8 bg-slate-950 p-2 sm:p-4 rounded-3xl">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl glass-card">
        <div className="flex flex-wrap items-center gap-3">
          {/* Select Prize */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Pilih Hadiah yang Diundi
            </label>
            <div className="flex items-center gap-2">
              <select
                value={selectedPrizeId}
                onChange={(e) => setSelectedPrizeId(e.target.value)}
                disabled={isSpinning}
                className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {prizes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.quantity} unit)
                  </option>
                ))}
              </select>

              <button
                onClick={() => setShowAddPrize(true)}
                disabled={isSpinning}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                title="Tambah Kategori Hadiah"
              >
                <Plus className="w-4 h-4 text-emerald-400" />
              </button>
            </div>
          </div>

          {/* Pool Settings */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Sumber Peserta (Pool)
            </label>
            <div className="flex items-center gap-2">
              <select
                value={poolType}
                onChange={(e) => setPoolType(e.target.value as any)}
                disabled={isSpinning}
                className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="CHECKED_IN">Hanya yang Sudah Hadir (Checked-In)</option>
                <option value="APPROVED">Semua Peserta Terdaftar (Approved)</option>
              </select>

              <label className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={excludePrevious}
                  onChange={(e) => setExcludePrevious(e.target.checked)}
                  disabled={isSpinning}
                  className="accent-indigo-600 rounded"
                />
                <span>Cegah Menang Ganda</span>
              </label>
            </div>
          </div>
        </div>

        {/* Presentation Screen Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title={soundEnabled ? "Matikan Efek Suara" : "Aktifkan Efek Suara"}
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-500" />
            )}
          </button>

          <button
            onClick={toggleFullscreen}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Layar Penuh Proyektor"
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-4 h-4" />
                <span>Keluar Layar Penuh</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-4 h-4 text-indigo-400" />
                <span>Mode Proyektor Panggung</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Spin Wheel Stage Area */}
      <div className="relative flex flex-col items-center justify-center p-6 sm:p-10 rounded-3xl glass-panel border border-indigo-500/20 overflow-hidden shadow-2xl">
        {/* Glow ambient background */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/15 blur-[120px] rounded-full pointer-events-none -z-10" />

        {/* Selected Prize Banner */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-300 text-xs font-semibold mb-2">
            <Trophy className="w-4 h-4 text-pink-400" />
            <span>Sedang Mengundi:</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {prizes.find((p) => p.id === selectedPrizeId)?.name || "Pilih Hadiah"}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Total {participants.length} peserta berpartisipasi di dalam roda undian
          </p>
        </div>

        {/* Canvas Wheel */}
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={480}
            height={480}
            className="w-[320px] h-[320px] sm:w-[480px] sm:h-[480px] rounded-full shadow-2xl border-4 border-slate-800"
          />
        </div>

        {/* Big Spin Action Button */}
        <div className="mt-8">
          <button
            onClick={handleSpin}
            disabled={isSpinning || participants.length === 0}
            className="px-8 py-4 rounded-2xl font-black text-base sm:text-lg text-white bg-gradient-to-r from-pink-600 via-indigo-600 to-violet-600 hover:from-pink-500 hover:to-violet-500 active:scale-95 disabled:opacity-40 shadow-2xl shadow-indigo-600/50 hover:shadow-indigo-600/70 transition-all cursor-pointer flex items-center gap-3"
          >
            <Sparkles className="w-6 h-6 animate-pulse" />
            <span>{isSpinning ? "Memutar Roda Doorprize..." : "PUTAR SPIN WHEEL!"}</span>
          </button>
        </div>
      </div>

      {/* Winner Congratulations Modal */}
      {currentWinner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="max-w-lg w-full glass-panel rounded-3xl p-8 border border-pink-500/40 text-center space-y-6 shadow-2xl shadow-pink-500/20">
            <div className="w-20 h-20 rounded-3xl bg-pink-500/20 border border-pink-500/40 flex items-center justify-center text-pink-400 mx-auto shadow-xl shadow-pink-500/30">
              <Trophy className="w-10 h-10 animate-bounce" />
            </div>

            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-pink-400 bg-pink-500/10 px-3 py-1 rounded-full border border-pink-500/20">
                SELAMAT KEPADA PEMENANG!
              </span>
              <h3 className="text-3xl font-extrabold text-white mt-3">
                {currentWinner.winnerName}
              </h3>
              <p className="text-sm text-slate-300 mt-1">{currentWinner.winnerEmail}</p>
            </div>

            <div className="p-4 rounded-2xl bg-indigo-950/60 border border-indigo-500/30 text-center">
              <div className="text-xs text-indigo-300 font-medium">Memenangkan Hadiah:</div>
              <div className="text-xl font-bold text-white mt-0.5">
                {currentWinner.prizeName}
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => handleRedraw(currentWinner.drawId)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-rose-300 hover:text-white bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 transition-colors flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Undi Ulang (Jika Tidak Hadir)</span>
              </button>

              <button
                onClick={() => setCurrentWinner(null)}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 transition-all"
              >
                Selesai / Lanjut Undian Berikutnya
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Prize Modal */}
      {showAddPrize && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="max-w-md w-full glass-panel rounded-2xl p-6 border border-slate-700 space-y-4">
            <h3 className="text-base font-bold text-white">Tambah Kategori Hadiah</h3>

            <form onSubmit={handleAddPrize} className="space-y-4 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Nama Hadiah <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newPrizeName}
                  onChange={(e) => setNewPrizeName(e.target.value)}
                  placeholder="Contoh: iPad Air Gen 6"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Jumlah Kuota Pemenang <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={newPrizeQty}
                  onChange={(e) => setNewPrizeQty(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddPrize(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500"
                >
                  Simpan Hadiah
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History of Winners Table (PRD Section 4.7) */}
      <div className="space-y-4 pt-6 border-t border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Trophy className="w-4 h-4 text-pink-400" />
              <span>Riwayat Pemenang Doorprize</span>
            </h3>
            <p className="text-xs text-slate-400">
              Daftar seluruh pemenang yang telah diundi beserta opsi undi ulang jika pemenang berhalangan hadir.
            </p>
          </div>

          <button
            onClick={exportWinnersToCsv}
            disabled={initialWinners.length === 0}
            className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center gap-1.5 transition-all w-fit disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Rekap Pemenang (CSV)</span>
          </button>
        </div>

        <div className="rounded-2xl glass-panel border border-slate-800/80 overflow-hidden shadow-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900/90 border-b border-slate-800 text-slate-400 select-none">
                <th className="p-3.5 font-semibold text-slate-300">Hadiah</th>
                <th className="p-3.5 font-semibold text-slate-300">Nama Pemenang</th>
                <th className="p-3.5 font-semibold text-slate-300">Email</th>
                <th className="p-3.5 font-semibold text-slate-300">Waktu Diundi</th>
                <th className="p-3.5 font-semibold text-slate-300">Status</th>
                <th className="p-3.5 font-semibold text-slate-300 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {initialWinners.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    Belum ada undian doorprize yang dilakukan untuk event ini.
                  </td>
                </tr>
              ) : (
                initialWinners.map((w) => (
                  <tr key={w.id} className="hover:bg-slate-900/50">
                    <td className="p-3.5 font-semibold text-white">{w.prize.name}</td>
                    <td className="p-3.5 text-indigo-300 font-medium">{w.registration.name}</td>
                    <td className="p-3.5 text-slate-400">{w.registration.email}</td>
                    <td className="p-3.5 text-slate-400 font-mono">
                      {new Date(w.drawnAt).toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="p-3.5">
                      {w.status === "VALID" ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                          Sah (Pemenang)
                        </span>
                      ) : (
                        <span className="text-[11px] text-rose-400">Diundi Ulang</span>
                      )}
                    </td>
                    <td className="p-3.5 text-right">
                      {w.status === "VALID" && (
                        <button
                          onClick={() => handleRedraw(w.id)}
                          className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[11px] font-medium transition-colors"
                        >
                          Undi Ulang
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
