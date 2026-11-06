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
      <div className="p-8 text-center liquid-card rounded-3xl border border-rose-200">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h3 className="text-xl font-extrabold text-slate-900 mb-2">Pendaftaran Ditutup</h3>
        <p className="text-sm text-slate-600 max-w-md mx-auto">
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
      <div className="p-6 sm:p-8 liquid-card rounded-3xl text-center animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mx-auto mb-5 shadow-md shadow-emerald-500/10">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h3 className="text-2xl font-extrabold text-slate-900 mb-2">Pendaftaran Berhasil!</h3>
        <p className="text-slate-600 text-sm max-w-md mx-auto mb-6">
          Terima kasih, <strong className="text-slate-900">{name}</strong>! Data registrasi Anda telah tersimpan ke sistem kami.
        </p>

        {successData.status === "APPROVED" ? (
          <div className="bg-emerald-50/90 border border-emerald-200 rounded-2xl p-5 mb-6 text-left max-w-md mx-auto">
            <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm mb-1">
              <Ticket className="w-4 h-4" />
              <span>RSVP Otomatis Disetujui</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Event ini menggunakan mode kirim otomatis. E-Ticket dengan QR Code unik telah diterbitkan untuk Anda.
            </p>
            <div className="mt-4">
              <Link
                href={`/ticket/${successData.qrToken}`}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/20 transition-all"
              >
                <span>Lihat E-Tiket & QR Code Saya</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-indigo-50/90 border border-indigo-200 rounded-2xl p-5 mb-6 text-left max-w-md mx-auto">
            <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm mb-1">
              <Mail className="w-4 h-4" />
              <span>Menunggu Konfirmasi Admin</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Pendaftaran Anda sedang ditinjau oleh panitia acara. Setelah disetujui, E-Tiket beserta QR Code RSVP akan otomatis dikirimkan ke <strong className="text-slate-900">{email}</strong>.
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            setSuccessData(null);
            setName("");
            setEmail("");
            setPhone("");
            setCustomAnswers({});
          }}
          className="text-xs font-bold text-indigo-600 hover:text-indigo-500 underline underline-offset-4 cursor-pointer"
        >
          Daftarkan Peserta Lain
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" suppressHydrationWarning>
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-700 text-sm font-medium">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-600" />
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
          suppressHydrationWarning
        />
      </div>

      {/* Default Fields */}
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Nama Lengkap <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <User className="w-4 h-4 text-[#17449A] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Masukkan nama lengkap Anda"
              suppressHydrationWarning
              className="w-full pl-10 pr-4 py-2.5 rounded-xl liquid-input text-slate-900 placeholder-slate-400 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Alamat Email <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-900 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@email.com"
              suppressHydrationWarning
              className="w-full pl-10 pr-4 py-2.5 rounded-xl liquid-input text-slate-900 placeholder-slate-400 text-sm"
            />
          </div>
          <p className="text-[11px] text-slate-500 mt-1">E-Ticket dan QR Code akan dikirim ke email ini.</p>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Nomor WhatsApp / HP
          </label>
          <div className="relative">
            <Phone className="w-4 h-4 text-[#17449A] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Contoh: 081234567890"
              suppressHydrationWarning
              className="w-full pl-10 pr-4 py-2.5 rounded-xl liquid-input text-slate-900 placeholder-slate-400 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Dynamic Custom Fields */}
      {formSchema.filter((f) => f.id !== "phone" && f.id !== "email" && f.id !== "name").length > 0 && (
        <div className="pt-4 border-t border-slate-200/80 space-y-4">
          <div className="text-xs font-extrabold uppercase tracking-wider text-[#17449A]">
            Informasi Tambahan Event
          </div>

          {formSchema
            .filter((f) => f.id !== "phone" && f.id !== "email" && f.id !== "name")
            .map((field) => {
            const fieldValue = customAnswers[field.id] || "";

            return (
              <div key={field.id} className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  {field.label} {field.required && <span className="text-rose-500">*</span>}
                </label>

                {field.type === "text" && (
                  <input
                    type="text"
                    required={field.required}
                    value={fieldValue}
                    onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                    placeholder={field.placeholder || ""}
                    suppressHydrationWarning
                    className="w-full px-4 py-2.5 rounded-xl liquid-input text-slate-900 placeholder-slate-400 text-sm"
                  />
                )}

                {field.type === "textarea" && (
                  <textarea
                    rows={3}
                    required={field.required}
                    value={fieldValue}
                    onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                    placeholder={field.placeholder || ""}
                    suppressHydrationWarning
                    className="w-full px-4 py-2.5 rounded-xl liquid-input text-slate-900 placeholder-slate-400 text-sm"
                  />
                )}

                {field.type === "dropdown" && (
                  <select
                    required={field.required}
                    value={fieldValue}
                    onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                    suppressHydrationWarning
                    className="w-full px-4 py-2.5 rounded-xl liquid-input text-slate-900 text-sm"
                  >
                    <option value="" disabled>
                      {field.placeholder || "-- Pilih Salah Satu --"}
                    </option>
                    {field.options?.map((opt, idx) => (
                      <option key={idx} value={opt} className="bg-white text-slate-900">
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
                        className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                          fieldValue === opt
                            ? "bg-indigo-50 border-indigo-400 text-indigo-900"
                            : "liquid-card text-slate-700 hover:border-slate-300"
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
                          className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                            isChecked
                              ? "bg-indigo-50 border-indigo-400 text-indigo-900"
                              : "liquid-card text-slate-700 hover:border-slate-300"
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
                    suppressHydrationWarning
                    className="w-full px-4 py-2.5 rounded-xl liquid-input text-slate-900 placeholder-slate-400 text-sm"
                  />
                )}

                {field.type === "date" && (
                  <input
                    type="date"
                    required={field.required}
                    value={fieldValue}
                    onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                    suppressHydrationWarning
                    className="w-full px-4 py-2.5 rounded-xl liquid-input text-slate-900 text-sm"
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
        className="w-full flex items-center justify-center gap-2 py-3.5 px-5 rounded-2xl font-bold text-white bg-[#17449A] hover:bg-[#12367B] active:scale-[0.99] disabled:opacity-50 shadow-lg shadow-[#17449A]/25 transition-all cursor-pointer text-sm"
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
