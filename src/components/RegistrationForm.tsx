"use client";

import { useState } from "react";
import { FormField } from "@/types";
import { registerParticipant } from "@/actions/registrations";
import { CheckCircle2, AlertCircle, Loader2, ArrowRight, Ticket, Mail, User, Phone } from "lucide-react";
import Link from "next/link";

interface RegistrationFormProps {
  slug: string;
  formSchema: FormField[];
  quotaRemaining: number;
  isOpen: boolean;
  rsvpMode: string;
}

export function RegistrationForm({
  slug,
  formSchema,
  quotaRemaining,
  isOpen,
  rsvpMode,
}: RegistrationFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [customAnswers, setCustomAnswers] = useState<Record<string, any>>({});
  const [honeypot, setHoneypot] = useState(""); // Anti-bot honeypot

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    registrationId: string;
    qrToken: string;
    status: string;
  } | null>(null);

  if (!isOpen || quotaRemaining <= 0) {
    return (
      <div className="p-8 text-center glass-card rounded-2xl border border-rose-500/20">
        <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-3" />
        <h3 className="text-xl font-bold text-white mb-2">Pendaftaran Ditutup</h3>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          {quotaRemaining <= 0
            ? "Mohon maaf, kuota peserta untuk event ini telah terisi penuh."
            : "Pendaftaran saat ini sedang tidak menerima peserta baru."}
        </p>
      </div>
    );
  }

  const handleCustomFieldChange = (fieldId: string, value: any) => {
    setCustomAnswers((prev) => ({
      ...prev,
      [fieldId]: value,
    }));
  };

  const handleCheckboxChange = (fieldId: string, option: string, checked: boolean) => {
    const current = (customAnswers[fieldId] as string[]) || [];
    if (checked) {
      setCustomAnswers((prev) => ({
        ...prev,
        [fieldId]: [...current, option],
      }));
    } else {
      setCustomAnswers((prev) => ({
        ...prev,
        [fieldId]: current.filter((item) => item !== option),
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const answersToSend = { ...customAnswers };
      if (phone && !answersToSend.phone) {
        answersToSend.phone = phone;
      }

      const result = await registerParticipant(slug, {
        name,
        email,
        phone,
        answers: answersToSend,
        honeypot,
      });

      if (!result.success) {
        setError(result.message || "Terjadi kesalahan saat pendaftaran.");
      } else {
        setSuccessData({
          registrationId: result.registrationId!,
          qrToken: result.qrToken!,
          status: result.status!,
        });
      }
    } catch (err: any) {
      setError(err?.message || "Gagal menghubungi server.");
    } finally {
      setLoading(false);
    }
  };

  if (successData) {
    return (
      <div className="p-8 glass-panel rounded-2xl border border-emerald-500/30 text-center animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto mb-5 shadow-lg shadow-emerald-500/10">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h3 className="text-2xl font-bold text-white mb-2">Pendaftaran Berhasil!</h3>
        <p className="text-slate-300 text-sm max-w-md mx-auto mb-6">
          Terima kasih, <strong>{name}</strong>! Data registrasi Anda telah tersimpan ke sistem kami.
        </p>

        {successData.status === "APPROVED" ? (
          <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-5 mb-6 text-left max-w-md mx-auto">
            <div className="flex items-center gap-2 text-emerald-300 font-semibold text-sm mb-1">
              <Ticket className="w-4 h-4" />
              <span>RSVP Otomatis Disetujui</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Event ini menggunakan mode kirim otomatis. E-Ticket dengan QR Code unik telah diterbitkan untuk Anda.
            </p>
            <div className="mt-4">
              <Link
                href={`/ticket/${successData.qrToken}`}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-lg shadow-emerald-600/20 transition-all"
              >
                <span>Lihat E-Tiket & QR Code Saya</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-xl p-5 mb-6 text-left max-w-md mx-auto">
            <div className="flex items-center gap-2 text-indigo-300 font-semibold text-sm mb-1">
              <Mail className="w-4 h-4" />
              <span>Menunggu Konfirmasi Admin</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Pendaftaran Anda sedang ditinjau oleh panitia acara. Setelah disetujui, E-Tiket beserta QR Code RSVP akan otomatis dikirimkan ke <strong>{email}</strong>.
            </p>
          </div>
        )}

        <button
          onClick={() => {
            setSuccessData(null);
            setName("");
            setEmail("");
            setPhone("");
            setCustomAnswers({});
          }}
          className="text-xs text-slate-400 hover:text-white underline underline-offset-4"
        >
          Daftarkan Peserta Lain
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3 text-rose-300 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Hidden honeypot field for bot protection */}
      <div className="hidden" aria-hidden="true">
        <input
          type="text"
          name="honeypot"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
        />
      </div>

      {/* Default Fields */}
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Nama Lengkap <span className="text-rose-400">*</span>
          </label>
          <div className="relative">
            <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Masukkan nama lengkap Anda"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Alamat Email <span className="text-rose-400">*</span>
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@email.com"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">E-Ticket dan QR Code akan dikirim ke email ini.</p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Nomor WhatsApp / HP
          </label>
          <div className="relative">
            <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Contoh: 081234567890"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
          </div>
        </div>
      </div>

      {/* Dynamic Custom Fields */}
      {formSchema.filter((f) => f.id !== "phone" && f.id !== "email" && f.id !== "name").length > 0 && (
        <div className="pt-4 border-t border-slate-800/80 space-y-4">
          <div className="text-xs font-bold uppercase tracking-wider text-indigo-400">
            Informasi Tambahan Event
          </div>

          {formSchema
            .filter((f) => f.id !== "phone" && f.id !== "email" && f.id !== "name")
            .map((field) => {
            const fieldValue = customAnswers[field.id] || "";

            return (
              <div key={field.id} className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  {field.label} {field.required && <span className="text-rose-400">*</span>}
                </label>

                {field.type === "text" && (
                  <input
                    type="text"
                    required={field.required}
                    value={fieldValue}
                    onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                    placeholder={field.placeholder || ""}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                )}

                {field.type === "textarea" && (
                  <textarea
                    rows={3}
                    required={field.required}
                    value={fieldValue}
                    onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                    placeholder={field.placeholder || ""}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                )}

                {field.type === "dropdown" && (
                  <select
                    required={field.required}
                    value={fieldValue}
                    onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  >
                    <option value="" disabled>
                      {field.placeholder || "-- Pilih Salah Satu --"}
                    </option>
                    {field.options?.map((opt, idx) => (
                      <option key={idx} value={opt} className="bg-slate-900 text-white">
                        {opt}
                      </option>
                    ))}
                  </select>
                )}

                {field.type === "radio" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {field.options?.map((opt, idx) => (
                      <label
                        key={idx}
                        className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                          fieldValue === opt
                            ? "bg-indigo-600/20 border-indigo-500/50 text-white"
                            : "bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700"
                        }`}
                      >
                        <input
                          type="radio"
                          name={field.id}
                          value={opt}
                          checked={fieldValue === opt}
                          onChange={() => handleCustomFieldChange(field.id, opt)}
                          required={field.required && !fieldValue}
                          className="accent-indigo-600 w-3.5 h-3.5"
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                )}

                {field.type === "checkbox" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {field.options?.map((opt, idx) => {
                      const isChecked = Array.isArray(fieldValue) && fieldValue.includes(opt);
                      return (
                        <label
                          key={idx}
                          className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                            isChecked
                              ? "bg-indigo-600/20 border-indigo-500/50 text-white"
                              : "bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => handleCheckboxChange(field.id, opt, e.target.checked)}
                            className="accent-indigo-600 w-3.5 h-3.5 rounded"
                          />
                          <span>{opt}</span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {field.type === "number" && (
                  <input
                    type="number"
                    required={field.required}
                    value={fieldValue}
                    onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                    placeholder={field.placeholder || ""}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                )}

                {field.type === "date" && (
                  <input
                    type="date"
                    required={field.required}
                    value={fieldValue}
                    onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer text-sm"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Memproses Pendaftaran...</span>
          </>
        ) : (
          <>
            <span>Kirim Pendaftaran</span>
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>

      <p className="text-center text-[11px] text-slate-500">
        Dengan mendaftar, Anda menyetujui ketentuan privasi penyelenggaraan event ini.
      </p>
    </form>
  );
}
