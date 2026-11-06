"use client";

import { useState } from "react";
import { updateSystemSettings, testSmtpConnection } from "@/actions/settings";
import {
  Mail,
  Lock,
  Save,
  Send,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Loader2,
  Sparkles,
} from "lucide-react";

interface SettingsClientProps {
  initialSettings: {
    smtpHost: string | null;
    smtpPort: number | null;
    smtpUser: string | null;
    smtpPass: string | null;
    smtpFrom: string | null;
    adminPin: string | null;
  };
}

export function SettingsClient({ initialSettings }: SettingsClientProps) {
  // SMTP Form state
  const [smtpHost, setSmtpHost] = useState(initialSettings.smtpHost || "");
  const [smtpPort, setSmtpPort] = useState(initialSettings.smtpPort || 465);
  const [smtpUser, setSmtpUser] = useState(initialSettings.smtpUser || "");
  const [smtpPass, setSmtpPass] = useState(initialSettings.smtpPass || "");
  const [smtpFrom, setSmtpFrom] = useState(
    initialSettings.smtpFrom || "YORINDO registration <rsvp@yorindo.id>"
  );

  // Admin PIN state
  const [adminPin, setAdminPin] = useState(initialSettings.adminPin || "123456");

  // Status & loading states
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Test email state
  const [testEmail, setTestEmail] = useState(smtpUser || "daffaabdulj@gmail.com");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const applyGmailPreset = () => {
    setSmtpHost("smtp.gmail.com");
    setSmtpPort(465);
    if (!smtpFrom && smtpUser) {
      setSmtpFrom(`Panitia Event <${smtpUser}>`);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    try {
      await updateSystemSettings({
        smtpHost,
        smtpPort: Number(smtpPort),
        smtpUser,
        smtpPass,
        smtpFrom,
        adminPin,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setSaveError(err?.message || "Gagal menyimpan pengaturan.");
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail) {
      alert("Masukkan alamat email tujuan uji coba.");
      return;
    }
    setTesting(true);
    setTestResult(null);

    try {
      // First save settings so the test uses current inputs
      await updateSystemSettings({
        smtpHost,
        smtpPort: Number(smtpPort),
        smtpUser,
        smtpPass,
        smtpFrom,
        adminPin,
      });

      const res = await testSmtpConnection(testEmail);
      setTestResult(res);
    } catch (e: any) {
      setTestResult({
        success: false,
        message: e?.message || "Gagal mengirim email uji coba.",
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {saveSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
          <span>Pengaturan SMTP & Keamanan berhasil disimpan!</span>
        </div>
      )}

      {saveError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
          <span>{saveError}</span>
        </div>
      )}

      {/* SMTP Email Configuration */}
      <form onSubmit={handleSave} className="p-6 sm:p-8 rounded-3xl liquid-glass space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/80">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#17449A]/10 border border-[#17449A]/20 flex items-center justify-center text-[#17449A] shadow-xs">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">Pengaturan Pengiriman Email (SMTP)</h2>
              <p className="text-xs text-slate-600">
                Hubungkan akun email Anda agar E-Tiket QR Code langsung terkirim ke kotak masuk peserta saat di-ACC.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={applyGmailPreset}
            className="px-3.5 py-2 rounded-xl liquid-pill text-[#17449A] text-xs font-bold flex items-center gap-1.5 w-fit cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#17449A]" />
            <span>Pakai Preset Gmail</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              SMTP Host
            </label>
            <input
              type="text"
              required
              value={smtpHost}
              onChange={(e) => setSmtpHost(e.target.value)}
              placeholder="smtp.gmail.com"
              className="w-full px-3.5 py-2.5 rounded-xl liquid-input text-slate-900 text-xs font-mono"
            />
            <p className="text-[11px] text-slate-500 mt-1">Untuk Gmail: smtp.gmail.com</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              SMTP Port
            </label>
            <input
              type="number"
              required
              value={smtpPort}
              onChange={(e) => setSmtpPort(Number(e.target.value))}
              placeholder="465 (SSL) atau 587 (TLS)"
              className="w-full px-3.5 py-2.5 rounded-xl liquid-input text-slate-900 text-xs font-mono"
            />
            <p className="text-[11px] text-slate-500 mt-1">Gunakan 465 untuk SSL atau 587 untuk TLS</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Email Pengirim (SMTP User)
            </label>
            <input
              type="email"
              required
              value={smtpUser}
              onChange={(e) => {
                setSmtpUser(e.target.value);
                if (!testEmail) setTestEmail(e.target.value);
              }}
              placeholder="contoh: eventorganizer@gmail.com"
              className="w-full px-3.5 py-2.5 rounded-xl liquid-input text-slate-900 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Kata Sandi / Google App Password (16 Karakter)
            </label>
            <input
              type="password"
              required
              value={smtpPass}
              onChange={(e) => setSmtpPass(e.target.value)}
              placeholder="xxxx xxxx xxxx xxxx"
              className="w-full px-3.5 py-2.5 rounded-xl liquid-input text-slate-900 text-xs font-mono"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Bukan password akun biasa, gunakan 16-karakter App Password Google.
            </p>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Nama & Email Pengirim (Sender Header)
            </label>
            <input
              type="text"
              value={smtpFrom}
              onChange={(e) => setSmtpFrom(e.target.value)}
              placeholder="Panitia Event <emailanda@domain.com>"
              className="w-full px-3.5 py-2.5 rounded-xl liquid-input text-slate-900 text-xs"
            />
          </div>
        </div>

        {/* Instructions banner */}
        <div className="p-4 rounded-2xl liquid-card space-y-2">
          <div className="font-bold text-[#17449A] text-xs flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4 text-[#17449A]" />
            <span>Cara Mendapatkan Google App Password (Gmail):</span>
          </div>
          <ol className="list-decimal list-inside space-y-1 text-slate-600 pl-1 text-[11px] leading-relaxed">
            <li>Buka akun Google Anda di <strong>myaccount.google.com</strong> &gt; menu <strong>Keamanan (Security)</strong>.</li>
            <li>Pastikan <strong>Verifikasi 2 Langkah (2-Step Verification)</strong> sudah aktif.</li>
            <li>Cari menu <strong>Sandi Aplikasi (App Passwords)</strong>.</li>
            <li>Beri nama aplikasi misalnya <code className="px-1.5 py-0.5 rounded bg-[#17449A]/10 text-[#17449A] font-semibold">YORINDO registration</code> lalu klik Buat.</li>
            <li>Salin 16 huruf sandi yang muncul dan tempelkan ke kolom sandi di atas.</li>
          </ol>
        </div>

        {/* PIN Security Section */}
        <div className="pt-6 border-t border-slate-200/80 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-900">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Kode Akses / PIN Admin Dashboard</h3>
              <p className="text-[11px] text-slate-600">
                PIN ini digunakan untuk mengunci dan membuka dashboard agar peserta umum tidak bisa mengakses atau membuat event.
              </p>
            </div>
          </div>

          <div className="max-w-xs">
            <input
              type="text"
              value={adminPin}
              onChange={(e) => setAdminPin(e.target.value)}
              placeholder="Contoh: 123456"
              className="w-full px-3.5 py-2.5 rounded-xl liquid-input text-slate-900 text-xs font-mono font-bold tracking-widest"
            />
          </div>
        </div>

        {/* Save button */}
        <div className="pt-4 border-t border-slate-200/80 flex items-center justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#17449A] hover:bg-[#12367B] shadow-lg shadow-[#17449A]/25 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>Simpan Seluruh Pengaturan</span>
          </button>
        </div>
      </form>

      {/* Test Email Card */}
      <div className="p-6 rounded-3xl liquid-glass space-y-4">
        <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
          <Send className="w-4 h-4 text-[#17449A]" />
          <span>Uji Coba Pengiriman Email Nyata</span>
        </h3>
        <p className="text-xs text-slate-600 leading-relaxed">
          Kirimkan email uji coba ke alamat Anda untuk memastikan konfigurasi SMTP di atas sudah aktif dan mampu menjangkau inbox secara langsung.
        </p>

        {testResult && (
          <div
            className={`p-3.5 rounded-2xl text-xs font-medium flex items-center gap-2 animate-fade-in ${
              testResult.success
                ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                : "bg-rose-50 border border-rose-200 text-rose-700"
            }`}
          >
            {testResult.success ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
            )}
            <span>{testResult.message}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <input
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="Masukkan email penerima (contoh: daffaabdulj@gmail.com)"
            className="w-full sm:flex-1 px-3.5 py-2.5 rounded-xl liquid-input text-slate-900 text-xs"
          />

          <button
            type="button"
            onClick={handleTestEmail}
            disabled={testing || !testEmail}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {testing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Mengirim Email...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Kirim Email Test</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
