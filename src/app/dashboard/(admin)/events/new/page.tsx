"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createEvent } from "@/actions/events";
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  UploadCloud,
  Trash2,
  RefreshCw,
  FileImage,
} from "lucide-react";
import Link from "next/link";

export default function NewEventPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  // Form states
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [quota, setQuota] = useState(100);
  const [posterUrl, setPosterUrl] = useState("");
  const [status, setStatus] = useState("OPEN");
  const [rsvpMode, setRsvpMode] = useState("MANUAL");

  // Poster file upload states
  const [posterPreview, setPosterPreview] = useState<string | null>(null);
  const [posterFileName, setPosterFileName] = useState<string | null>(null);
  const [posterFileSize, setPosterFileSize] = useState<string | null>(null);
  const [uploadingPoster, setUploadingPoster] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [useUrlFallback, setUseUrlFallback] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-send confirmation dialog state
  const [showAutoSendModal, setShowAutoSendModal] = useState(false);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const handleFileChange = async (file: File) => {
    if (!file) return;

    const validTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/svg+xml",
    ];
    if (!validTypes.includes(file.type)) {
      setUploadError("Format file tidak didukung. Harap pilih gambar JPG, PNG, WebP, atau GIF.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError("Ukuran file terlalu besar. Maksimal ukuran gambar adalah 10MB.");
      return;
    }

    setUploadError(null);
    setPosterFileName(file.name);
    setPosterFileSize(formatFileSize(file.size));

    // Preview lokal instan
    const localUrl = URL.createObjectURL(file);
    setPosterPreview(localUrl);

    // Upload otomatis ke server
    setUploadingPoster(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Gagal mengunggah file poster.");
      }

      setPosterUrl(data.url);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal mengunggah poster.";
      setUploadError(msg);
      setPosterPreview(null);
      setPosterUrl("");
      setPosterFileName(null);
      setPosterFileSize(null);
    } finally {
      setUploadingPoster(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleRemovePoster = () => {
    setPosterPreview(null);
    setPosterUrl("");
    setPosterFileName(null);
    setPosterFileSize(null);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!slug || slug === title.toLowerCase().replace(/[^a-z0-9]+/g, "-")) {
      setSlug(
        val
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, "-")
      );
    }
  };

  const handleRsvpModeChange = (mode: string) => {
    if (mode === "AUTO") {
      setShowAutoSendModal(true);
    } else {
      setRsvpMode("MANUAL");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !slug || !startsAt) {
      setError("Nama event, slug, dan tanggal pelaksanaan wajib diisi.");
      return;
    }

    if (uploadingPoster) {
      setError("Mohon tunggu beberapa detik hingga berkas poster selesai diunggah.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const event = await createEvent({
        title,
        slug,
        description,
        location,
        startsAt,
        endsAt: endsAt || undefined,
        quota: Number(quota),
        status,
        posterUrl: posterUrl || undefined,
        rsvpMode,
      });

      router.push(`/dashboard/events/${event.id}/form-builder`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal membuat event.";
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Breadcrumb & Heading */}
      <div className="p-6 rounded-3xl liquid-glass">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 mb-2 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Kembali ke Semua Event</span>
        </Link>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Buat Event Baru</h1>
        <p className="text-xs text-slate-600 mt-0.5">
          Atur informasi dasar event sebelum mengkustomisasi form pendaftaran.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50/90 border border-rose-200 text-rose-700 text-xs font-medium shadow-xs">
          {error}
        </div>
      )}

      {/* Form Container */}
      <form onSubmit={handleSubmit} className="p-6 sm:p-8 rounded-3xl liquid-glass space-y-6">
        {/* Title & Slug */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Nama Event <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Contoh: Digital Transformation Summit 2026"
              className="w-full px-4 py-2.5 rounded-xl liquid-input text-slate-900 placeholder-slate-400 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Slug URL Publik <span className="text-rose-500">*</span>
            </label>
            <div className="flex items-center">
              <span className="px-3.5 py-2.5 rounded-l-xl bg-slate-100/90 border border-r-0 border-slate-300/80 text-xs font-bold text-slate-600 select-none">
                /e/
              </span>
              <input
                type="text"
                required
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-"))}
                placeholder="digital-transformation-summit-2026"
                className="w-full px-4 py-2.5 rounded-r-xl liquid-input text-slate-900 placeholder-slate-400 text-sm font-mono"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Link publik formulir: <span className="font-mono text-indigo-600">{origin}/e/{slug || "slug-event"}</span>
            </p>
          </div>
        </div>

        {/* Date, Time & Quota */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Waktu Mulai <span className="text-rose-500">*</span>
            </label>
            <input
              type="datetime-local"
              required
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl liquid-input text-slate-900 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Waktu Selesai (Opsional)
            </label>
            <input
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl liquid-input text-slate-900 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Kuota Maksimal Peserta <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min={1}
              required
              value={quota}
              onChange={(e) => setQuota(Number(e.target.value))}
              className="w-full px-4 py-2.5 rounded-xl liquid-input text-slate-900 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Status Event
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl liquid-input text-slate-900 text-sm"
            >
              <option value="OPEN">OPEN (Pendaftaran Dibuka)</option>
              <option value="DRAFT">DRAFT (Belum Dipublikasikan)</option>
            </select>
          </div>
        </div>

        {/* Location & Poster Banner */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Lokasi / Venue Acara
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Contoh: Ballroom Hotel Grand Sahid Jaya, Jakarta"
              className="w-full px-4 py-2.5 rounded-xl liquid-input text-slate-900 placeholder-slate-400 text-sm"
            />
          </div>

          {/* File Upload Poster Banner */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700">
                Poster / Banner Event (JPG/PNG/WebP)
              </label>
              <button
                type="button"
                onClick={() => setUseUrlFallback(!useUrlFallback)}
                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-500 hover:underline transition-colors cursor-pointer"
              >
                {useUrlFallback ? "← Kembali ke Upload File" : "Atau gunakan URL gambar luar"}
              </button>
            </div>

            {useUrlFallback ? (
              <div className="space-y-2">
                <input
                  type="url"
                  value={posterUrl}
                  onChange={(e) => {
                    setPosterUrl(e.target.value);
                    setPosterPreview(e.target.value);
                  }}
                  placeholder="https://..."
                  className="w-full px-4 py-2.5 rounded-xl liquid-input text-slate-900 placeholder-slate-400 font-mono text-xs"
                />
                {posterUrl && (
                  <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100/70 p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={posterUrl}
                      alt="Preview Poster"
                      className="w-full h-auto max-h-48 sm:max-h-56 object-contain mx-auto block rounded-xl"
                      onError={() => setUploadError("Gagal memuat pratinjau dari link URL tersebut.")}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileChange(e.target.files[0]);
                    }
                  }}
                />

                {!posterPreview && !posterUrl ? (
                  /* Empty state: Dropzone */
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                      isDragging
                        ? "border-indigo-500 bg-indigo-50/70 scale-[1.01]"
                        : "border-slate-300 hover:border-indigo-400 bg-white/60 hover:bg-white/90"
                    }`}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-[#17449A]/10 border border-[#17449A]/20 flex items-center justify-center text-[#17449A] mb-3 transition-transform">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <div className="text-sm font-bold text-slate-900">
                      Pilih file gambar poster <span className="text-slate-500 font-normal">atau seret ke sini</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Format didukung: PNG, JPG, WebP, GIF (Maksimal 10MB)
                    </p>
                    <div className="mt-3.5 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl liquid-pill text-[#17449A] text-xs font-bold">
                      <FileImage className="w-3.5 h-3.5" />
                      <span>Pilih File dari Komputer</span>
                    </div>
                  </div>
                ) : (
                  /* Selected / Uploaded state with preview */
                  <div className="space-y-2">
                    <div className="relative w-fit max-w-full mx-auto rounded-2xl overflow-hidden border border-slate-200 bg-white/80 p-1.5 shadow-sm group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={posterPreview || posterUrl}
                        alt="Poster Preview"
                        className="w-auto max-w-full max-h-[300px] sm:max-h-[340px] object-contain mx-auto block rounded-xl"
                      />

                      {uploadingPoster && (
                        <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex flex-col items-center justify-center gap-2 text-slate-900 z-10">
                          <Loader2 className="w-7 h-7 text-[#17449A] animate-spin" />
                          <span className="text-xs font-bold">Mengunggah file poster...</span>
                        </div>
                      )}

                      {/* Top floating actions */}
                      <div className="absolute top-3 right-3 flex items-center gap-2 z-20">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingPoster}
                          className="px-2.5 py-1.5 rounded-xl bg-white/95 hover:bg-white text-xs font-bold text-slate-900 border border-slate-200 backdrop-blur-md transition-colors flex items-center gap-1.5 cursor-pointer shadow-md"
                          title="Ganti File"
                        >
                          <RefreshCw className="w-3.5 h-3.5 text-[#17449A]" />
                          <span>Ganti File</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleRemovePoster}
                          disabled={uploadingPoster}
                          className="p-1.5 rounded-xl bg-rose-500/95 hover:bg-rose-600 text-white border border-rose-400/50 backdrop-blur-md transition-colors cursor-pointer shadow-md"
                          title="Hapus Poster"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Bottom info */}
                      <div className="p-2.5 bg-white/90 border-t border-slate-200/80 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="truncate max-w-[200px] sm:max-w-[360px]">
                            {posterFileName || "File poster siap digunakan"}
                          </span>
                          {posterFileSize && (
                            <span className="text-slate-500 text-[10px]">({posterFileSize})</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {uploadError && (
                  <div className="mt-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                    <span>{uploadError}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Deskripsi Event
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tuliskan latar belakang, rundown, atau fasilitas yang didapatkan peserta..."
              className="w-full px-4 py-2.5 rounded-xl liquid-input text-slate-900 placeholder-slate-400 text-sm"
            />
          </div>
        </div>

        {/* Mode Approval & RSVP (Sesuai PRD Bab 4.4a) */}
        <div className="pt-4 border-t border-slate-200/80 space-y-3">
          <label className="block text-xs font-extrabold uppercase tracking-wider text-indigo-600">
            Mode Persetujuan (Approval) & RSVP
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div
              onClick={() => handleRsvpModeChange("MANUAL")}
              className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                rsvpMode === "MANUAL"
                  ? "bg-indigo-50/90 border-indigo-400 text-slate-900 shadow-sm"
                  : "liquid-card text-slate-600 hover:border-slate-300"
              }`}
            >
              <div className="font-bold text-sm text-slate-900 mb-1">Manual Approval (Default)</div>
              <p className="text-xs leading-relaxed text-slate-600">
                Pendaftar berstatus Pending. Admin meninjau data sebelum menyetujui dan mengirimkan QR code RSVP.
              </p>
            </div>

            <div
              onClick={() => handleRsvpModeChange("AUTO")}
              className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                rsvpMode === "AUTO"
                  ? "bg-emerald-50/90 border-emerald-400 text-slate-900 shadow-sm"
                  : "liquid-card text-slate-600 hover:border-slate-300"
              }`}
            >
              <div className="font-bold text-sm text-slate-900 mb-1">Kirim Otomatis (Auto-Send)</div>
              <p className="text-xs leading-relaxed text-slate-600">
                Tiap pendaftar baru langsung disetujui secara otomatis dan menerima email RSVP serta QR code instan.
              </p>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="pt-4 border-t border-slate-200/80 flex items-center justify-end gap-3">
          <Link
            href="/dashboard"
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 liquid-pill"
          >
            Batal
          </Link>
          <button
            type="submit"
            disabled={loading || uploadingPoster}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#17449A] hover:bg-[#12367B] shadow-lg shadow-[#17449A]/25 transition-all cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Menyimpan Event...</span>
              </>
            ) : uploadingPoster ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Mengunggah File Poster...</span>
              </>
            ) : (
              <span>Lanjut ke Custom Form Builder →</span>
            )}
          </button>
        </div>
      </form>

      {/* Confirmation Modal for Auto-Send (PRD 4.4a requirement) */}
      {showAutoSendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-fade-in">
          <div className="max-w-md w-full liquid-glass rounded-3xl p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-extrabold text-slate-900">Konfirmasi Pengaktifan Kirim Otomatis</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Dengan mengaktifkan mode <strong>Kirim Otomatis</strong>, sistem akan langsung menerbitkan QR Code dan mengirimkan email konfirmasi RSVP kepada siapapun yang mengisi formulir pendaftaran tanpa persetujuan manual terlebih dahulu.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => {
                  setShowAutoSendModal(false);
                  setRsvpMode("MANUAL");
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 liquid-pill cursor-pointer"
              >
                Gunakan Manual Saja
              </button>
              <button
                type="button"
                onClick={() => {
                  setRsvpMode("AUTO");
                  setShowAutoSendModal(false);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/25 cursor-pointer"
              >
                Saya Mengerti & Aktifkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
