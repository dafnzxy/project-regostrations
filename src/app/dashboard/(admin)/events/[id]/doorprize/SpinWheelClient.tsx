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

  useEffect(() => {
    setPrizes(initialPrizes);
    if (!selectedPrizeId && initialPrizes[0]?.id) {
      setSelectedPrizeId(initialPrizes[0].id);
    }
  }, [initialPrizes, selectedPrizeId]);

  const formatTimeWib = (dateInput: Date | string) => {
    try {
      return new Intl.DateTimeFormat("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Jakarta",
      }).format(new Date(dateInput));
    } catch {
      return "-";
    }
  };

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
      ctx.fillStyle = "#f1f5f9";
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = "#cbd5e1";
      ctx.stroke();

      ctx.fillStyle = "#64748b";
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
    <div ref={containerRef} className="space-y-6 sm:space-y-8 bg-white/60 p-1 sm:p-4 rounded-3xl">
      {/* Top Action Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 sm:p-5 rounded-3xl liquid-card">
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3">
          {/* Select Prize */}
          <div className="w-full sm:w-auto">
            <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
              Pilih Hadiah yang Diundi
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedPrizeId}
                onChange={(e) => setSelectedPrizeId(e.target.value)}
                disabled={isSpinning}
                className="flex-1 sm:flex-initial px-3 py-2 rounded-xl liquid-input text-slate-900 text-xs font-bold min-w-0"
              >
                {prizes.length === 0 && (
                  <option value="">-- Belum Ada Hadiah --</option>
                )}
                {prizes.map((p) => {
                  const usedCount = p.prizeDraws?.length || 0;
                  const remaining = Math.max(0, p.quantity - usedCount);
                  return (
                    <option key={p.id} value={p.id}>
                      {p.name} (Sisa {remaining}/{p.quantity} unit)
                    </option>
                  );
                })}
              </select>

              <button
                type="button"
                onClick={() => setShowAddPrize(true)}
                disabled={isSpinning}
                className="px-3 py-2 rounded-xl liquid-pill text-[#17449A] text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0"
                title="Tambah Kategori Hadiah"
              >
                <Plus className="w-4 h-4 text-[#17449A]" />
                <span>Tambah Hadiah</span>
              </button>

              {selectedPrizeId && (
                <button
                  type="button"
                  onClick={() => handleDeletePrize(selectedPrizeId)}
                  disabled={isSpinning}
                  className="p-2 rounded-xl liquid-pill text-slate-700 hover:text-rose-600 transition-colors cursor-pointer shrink-0"
                  title="Hapus Kategori Hadiah Ini"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Pool Settings */}
          <div className="w-full sm:w-auto">
            <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
              Sumber Peserta (Pool)
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={poolType}
                onChange={(e) => setPoolType(e.target.value as any)}
                disabled={isSpinning}
                className="flex-1 sm:flex-initial px-3 py-2 rounded-xl liquid-input text-slate-900 text-xs font-bold min-w-0"
              >
                <option value="CHECKED_IN">Hanya yang Sudah Hadir (Checked-In)</option>
                <option value="APPROVED">Semua Peserta Terdaftar (Approved)</option>
              </select>

              <label className="flex items-center gap-1.5 px-3 py-2 rounded-xl liquid-pill text-xs font-bold text-slate-700 cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={excludePrevious}
                  onChange={(e) => setExcludePrevious(e.target.checked)}
                  disabled={isSpinning}
                  className="accent-[#17449A] rounded"
                />
                <span>Cegah Menang Ganda</span>
              </label>
            </div>
          </div>
        </div>

        {/* Presentation Screen Controls */}
        <div className="flex items-center justify-end gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-200/60">
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2.5 rounded-xl liquid-pill text-slate-900 cursor-pointer"
            title={soundEnabled ? "Matikan Efek Suara" : "Aktifkan Efek Suara"}
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-[#17449A]" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-400" />
            )}
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl liquid-pill text-slate-900 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
            title="Layar Penuh Proyektor"
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-4 h-4 text-slate-900" />
                <span>Keluar Layar Penuh</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-4 h-4 text-[#17449A]" />
                <span>Mode Proyektor Panggung</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Spin Wheel Stage Area */}
      <div className="relative flex flex-col items-center justify-center p-4 sm:p-8 md:p-10 rounded-3xl liquid-glass overflow-hidden">
        {/* Glow ambient background */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 sm:w-96 h-72 sm:h-96 bg-[#17449A]/10 blur-[120px] rounded-full pointer-events-none -z-10" />

        {/* Selected Prize Banner */}
        <div className="text-center mb-5 sm:mb-6">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#17449A]/10 border border-[#17449A]/20 text-[#17449A] text-xs font-bold mb-2">
            <Trophy className="w-4 h-4 text-[#17449A]" />
            <span>Sedang Mengundi:</span>
          </div>
          <h2 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight px-2">
            {prizes.find((p) => p.id === selectedPrizeId)?.name || "Pilih / Tambah Hadiah"}
          </h2>
          <p className="text-xs font-medium text-slate-600 mt-1">
            Total {participants.length} peserta berpartisipasi di dalam roda undian
          </p>
        </div>

        {/* Canvas Wheel */}
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={480}
            height={480}
            className="w-[260px] h-[260px] sm:w-[380px] sm:h-[380px] md:w-[460px] md:h-[460px] rounded-full shadow-2xl border-4 border-white"
          />
        </div>

        {/* Big Spin Action Button */}
        <div className="mt-6 sm:mt-8 w-full sm:w-auto flex justify-center">
          <button
            type="button"
            onClick={handleSpin}
            disabled={isSpinning || participants.length === 0 || !selectedPrizeId}
            className="w-full sm:w-auto justify-center px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl font-black text-sm sm:text-lg text-white bg-[#17449A] hover:bg-[#12367B] active:scale-95 disabled:opacity-40 shadow-2xl shadow-[#17449A]/35 transition-all cursor-pointer flex items-center gap-2.5"
          >
            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse shrink-0" />
            <span>{isSpinning ? "Memutar Roda Doorprize..." : "PUTAR SPIN WHEEL!"}</span>
          </button>
        </div>
      </div>

      {/* Winner Congratulations Modal */}
      {currentWinner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-md animate-fade-in">
          <div className="max-w-lg w-full liquid-glass rounded-3xl p-8 text-center space-y-6">
            <div className="w-20 h-20 rounded-3xl bg-pink-50 border border-pink-200 flex items-center justify-center text-pink-600 mx-auto shadow-lg shadow-pink-500/15">
              <Trophy className="w-10 h-10 animate-bounce" />
            </div>

            <div>
              <span className="text-xs font-extrabold uppercase tracking-wider text-pink-700 bg-pink-50 px-3 py-1 rounded-full border border-pink-200">
                SELAMAT KEPADA PEMENANG!
              </span>
              <h3 className="text-3xl font-black text-slate-900 mt-3">
                {currentWinner.winnerName}
              </h3>
              <p className="text-sm text-slate-600 mt-1">{currentWinner.winnerEmail}</p>
            </div>

            <div className="p-4 rounded-2xl bg-indigo-50/90 border border-indigo-200 text-center">
              <div className="text-xs text-indigo-700 font-bold">Memenangkan Hadiah:</div>
              <div className="text-xl font-black text-slate-900 mt-0.5">
                {currentWinner.prizeName}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleRedraw(currentWinner.drawId)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Undi Ulang (Jika Tidak Hadir)</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentWinner(null)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
              >
                Selesai / Lanjut Undian Berikutnya
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Prize Modal */}
      {showAddPrize && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-md animate-fade-in">
          <div className="max-w-md w-full liquid-glass rounded-3xl p-6 space-y-4">
            <h3 className="text-base font-extrabold text-slate-900">Tambah Kategori Hadiah</h3>

            <form onSubmit={handleAddPrize} className="space-y-4 pt-1">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Nama Hadiah <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newPrizeName}
                  onChange={(e) => setNewPrizeName(e.target.value)}
                  placeholder="Contoh: iPad Air Gen 6"
                  className="w-full px-3 py-2 rounded-xl liquid-input text-slate-900 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Jumlah Kuota Pemenang <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={newPrizeQty}
                  onChange={(e) => setNewPrizeQty(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl liquid-input text-slate-900 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddPrize(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 liquid-pill cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 cursor-pointer"
                >
                  Simpan Hadiah
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History of Winners Table (PRD Section 4.7) */}
      <div className="space-y-4 pt-6 border-t border-slate-200/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-pink-600" />
              <span>Riwayat Pemenang Doorprize</span>
            </h3>
            <p className="text-xs text-slate-600">
              Daftar seluruh pemenang yang telah diundi beserta opsi undi ulang jika pemenang berhalangan hadir.
            </p>
          </div>

          <button
            type="button"
            onClick={exportWinnersToCsv}
            disabled={initialWinners.length === 0}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-800 liquid-pill flex items-center gap-1.5 w-fit disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-indigo-600" />
            <span>Export Rekap Pemenang (CSV)</span>
          </button>
        </div>

        <div className="rounded-3xl liquid-glass overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[540px]">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200/80 text-slate-700 select-none">
                <th className="p-3.5 font-bold">Hadiah</th>
                <th className="p-3.5 font-bold">Nama Pemenang</th>
                <th className="p-3.5 font-bold">Email</th>
                <th className="p-3.5 font-bold">Waktu Diundi</th>
                <th className="p-3.5 font-bold">Status</th>
                <th className="p-3.5 font-bold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70">
              {initialWinners.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    Belum ada undian doorprize yang dilakukan untuk event ini.
                  </td>
                </tr>
              ) : (
                initialWinners.map((w) => (
                  <tr key={w.id} className="hover:bg-white/80">
                    <td className="p-3.5 font-bold text-slate-900">{w.prize.name}</td>
                    <td className="p-3.5 text-indigo-700 font-bold">{w.registration.name}</td>
                    <td className="p-3.5 text-slate-600">{w.registration.email}</td>
                    <td className="p-3.5 text-slate-500 font-mono">
                      {formatTimeWib(w.drawnAt)}
                    </td>
                    <td className="p-3.5">
                      {w.status === "VALID" ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                          Sah (Pemenang)
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-rose-600">Diundi Ulang</span>
                      )}
                    </td>
                    <td className="p-3.5 text-right">
                      {w.status === "VALID" && (
                        <button
                          type="button"
                          onClick={() => handleRedraw(w.id)}
                          className="px-2.5 py-1 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 text-[11px] font-bold transition-colors cursor-pointer"
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
    </div>
  );
}
