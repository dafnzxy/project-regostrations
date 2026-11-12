"use client";

import { useState, useEffect } from "react";
import { FormField } from "@/types";
import { StatusBadge } from "@/components/StatusBadge";
import { EventQrModal } from "@/components/EventQrModal";
import { PrintStickerLabelsModal } from "@/components/PrintStickerLabelsModal";
import {
  approveRegistration,
  bulkApproveRegistrations,
  rejectRegistration,
  deleteRegistration,
  resendRsvpEmail,
  sendWhatsAppTicket,
  addManualAttendee,
  manualCheckInById,
} from "@/actions/registrations";
import { updateEvent } from "@/actions/events";
import {
  EMAIL_TEMPLATE_PRESETS,
  resolveEmailTemplateVars,
} from "@/lib/email-templates";
import {
  Search,
  Filter,
  FileSpreadsheet,
  UserPlus,
  Printer,
  CheckCircle2,
  XCircle,
  Mail,
  Trash2,
  Check,
  Loader2,
  QrCode,
  ExternalLink,
  Send,
  Sparkles,
  Eye,
  Edit3,
  Save,
  X,
  MessageCircle,
  Crown,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface RegistrationWithLogs {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  answers: string;
  status: string;
  qrToken: string;
  isVip: boolean;
  approvedBy: string | null;
  approvedAt: Date | null;
  checkedInAt: Date | null;
  createdAt: Date;
  emailLogs?: {
    id: string;
    status: string;
    sentAt: Date | null;
  }[];
}

interface RegistrationsClientProps {
  eventId: string;
  eventTitle: string;
  eventLocation?: string | null;
  eventStartsAt: string;
  eventSlug?: string;
  initialEmailSubject?: string | null;
  initialEmailBody?: string | null;
  formSchema: FormField[];
  initialRegistrations: RegistrationWithLogs[];
  vipQuota: number;
}

export function RegistrationsClient({
  eventId,
  eventTitle,
  eventLocation,
  eventStartsAt,
  eventSlug,
  initialEmailSubject,
  initialEmailBody,
  formSchema,
  initialRegistrations,
  vipQuota,
}: RegistrationsClientProps) {
  const router = useRouter();
  const [registrations, setRegistrations] = useState(initialRegistrations);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [showEventQrModal, setShowEventQrModal] = useState(false);
  const [showPrintLabelsModal, setShowPrintLabelsModal] = useState(false);

  useEffect(() => {
    setRegistrations(initialRegistrations);
  }, [initialRegistrations]);

  // Manual Add Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newCompany, setNewCompany] = useState("");
  const [newJobTitle, setNewJobTitle] = useState("");
  const [newIsVip, setNewIsVip] = useState(false);

  // Email Template & Send Ticket Modal state
  const defaultPreset = EMAIL_TEMPLATE_PRESETS[0];
  const [selectedPresetId, setSelectedPresetId] = useState<string>("formal");
  const [emailSubject, setEmailSubject] = useState<string>(
    initialEmailSubject || defaultPreset.subject
  );
  const [emailBody, setEmailBody] = useState<string>(
    initialEmailBody || defaultPreset.body
  );
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Target participant for "Kirim Tiket Email" modal (null = global template config / bulk)
  const [emailModalTarget, setEmailModalTarget] =
    useState<RegistrationWithLogs | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [sendingModalEmail, setSendingModalEmail] = useState(false);
  const [sendingModalWhatsApp, setSendingModalWhatsApp] = useState(false);
  const [origin, setOrigin] = useState("https://yorindoregistration.id");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const formattedEventDate = (() => {
    try {
      return new Intl.DateTimeFormat("id-ID", {
        dateStyle: "full",
        timeStyle: "short",
        timeZone: "Asia/Jakarta",
      }).format(new Date(eventStartsAt));
    } catch {
      return "-";
    }
  })();

  // Filter registrations
  const filtered = registrations.filter((reg) => {
    const matchesSearch =
      reg.name.toLowerCase().includes(search.toLowerCase()) ||
      reg.email.toLowerCase().includes(search.toLowerCase()) ||
      (reg.phone && reg.phone.includes(search));

    const matchesStatus = statusFilter === "ALL" || reg.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filtered.map((r) => r.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((i) => i !== id));
    }
  };

  const applyPreset = (presetId: string) => {
    const found = EMAIL_TEMPLATE_PRESETS.find((p) => p.id === presetId);
    if (found) {
      setSelectedPresetId(found.id);
      setEmailSubject(found.subject);
      setEmailBody(found.body);
    }
  };

  const openSendTicketModal = (reg?: RegistrationWithLogs) => {
    setEmailModalTarget(reg || null);
    setShowEmailModal(true);
  };

  const handleSaveDefaultTemplate = async () => {
    setSavingTemplate(true);
    try {
      await updateEvent(eventId, {
        emailSubject,
        emailBody,
      });
      alert("✓ Template email default berhasil disimpan untuk event ini!");
      router.refresh();
    } catch (e: any) {
      alert("Gagal menyimpan template: " + e.message);
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleSendFromModal = async () => {
    if (!emailModalTarget) return;
    setSendingModalEmail(true);
    try {
      let res: any;
      if (emailModalTarget.status === "PENDING") {
        const approveRes = await approveRegistration(
          emailModalTarget.id,
          "Admin",
          {
            subject: emailSubject,
            body: emailBody,
          }
        );
        res = approveRes.emailResult;
      } else {
        res = await resendRsvpEmail(emailModalTarget.id, {
          subject: emailSubject,
          body: emailBody,
        });
      }

      setShowEmailModal(false);
      if (res?.isRealEmail) {
        alert(
          `✓ E-Tiket & QR Code berhasil dikirim ke kotak masuk ${emailModalTarget.email}!`
        );
      } else if (res?.error) {
        alert(
          `✓ Peserta Disetujui & E-Tiket Terbit!\n\nNamun pengiriman SMTP otomatis gagal karena: ${res.error}\n\nTips: Gmail mewajibkan 16-digit "App Password" (bukan password login biasa) di menu Pengaturan Email & PIN, ATAU gunakan tombol "Buka di Gmail Web" pada menu Kirim Tiket.`
        );
      } else {
        alert(
          `✓ E-Tiket telah diterbitkan untuk ${emailModalTarget.name}!\n\nCatatan: Pengiriman email masih dalam mode simulasi karena SMTP belum diatur. Anda dapat mengisi App Password Gmail di menu "Pengaturan Email & PIN" agar email langsung masuk ke inbox peserta.`
        );
      }
      router.refresh();
    } catch (e: any) {
      alert("Gagal mengirim tiket: " + e.message);
    } finally {
      setSendingModalEmail(false);
    }
  };

  const handleSendWhatsAppAuto = async () => {
    if (!emailModalTarget) return;
    setSendingModalWhatsApp(true);
    try {
      const res = await sendWhatsAppTicket(emailModalTarget.id, {
        body: emailBody,
      });

      if (res.success) {
        alert(
          `✓ Tiket & QR Code resmi berhasil dikirim otomatis ke WhatsApp ${emailModalTarget.name} (${emailModalTarget.phone})!`
        );
        setShowEmailModal(false);
      } else {
        alert(`Gagal mengirim WhatsApp otomatis: ${res.error}`);
      }
      router.refresh();
    } catch (e: any) {
      alert("Gagal mengirim WhatsApp: " + e.message);
    } finally {
      setSendingModalWhatsApp(false);
    }
  };

  const handleApprove = async (id: string) => {
    setLoadingAction(`approve_${id}`);
    try {
      const res = await approveRegistration(id, "Admin", {
        subject: emailSubject,
        body: emailBody,
      });
      if (res.emailResult?.isRealEmail) {
        alert(
          `✓ Peserta Berhasil Disetujui (ACC)!\n\nEmail E-Tiket beserta QR Code telah dikirimkan langsung ke kotak masuk ${res.emailResult.recipientEmail}.`
        );
      } else {
        alert(
          `✓ Peserta Berhasil Disetujui (ACC)!\n\nCatatan: E-Tiket telah terbit, namun email masih dalam mode simulasi (karena akun SMTP belum dimasukkan). Buka menu "Pengaturan Email & PIN" di dashboard jika ingin RSVP terkirim langsung ke kotak masuk Gmail peserta!`
        );
      }
      router.refresh();
    } catch (e: any) {
      alert("Gagal menyetujui: " + e.message);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return;
    if (
      !confirm(
        `Setujui ${selectedIds.length} peserta terpilih sekaligus dan kirim E-Tiket QR Code sesuai template aktif?`
      )
    )
      return;

    setLoadingAction("bulk_approve");
    try {
      await bulkApproveRegistrations(selectedIds, "Admin", {
        subject: emailSubject,
        body: emailBody,
      });
      setSelectedIds([]);
      router.refresh();
    } catch (e: any) {
      alert("Gagal approve massal: " + e.message);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm("Tolak pendaftaran peserta ini?")) return;
    setLoadingAction(`reject_${id}`);
    try {
      await rejectRegistration(id);
      router.refresh();
    } catch (e: any) {
      alert("Gagal menolak: " + e.message);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus peserta ini secara permanen dari database?")) return;
    setLoadingAction(`delete_${id}`);
    try {
      await deleteRegistration(id);
      router.refresh();
    } catch (e: any) {
      alert("Gagal menghapus: " + e.message);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleManualCheckIn = async (id: string) => {
    setLoadingAction(`checkin_${id}`);
    try {
      await manualCheckInById(id);
      router.refresh();
    } catch (e: any) {
      alert("Gagal check-in: " + e.message);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleAddManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const answers: Record<string, any> = {};
      if (newCompany) answers.company = newCompany;
      if (newJobTitle) answers.jobTitle = newJobTitle;

      await addManualAttendee(eventId, {
        name: newName,
        email: newEmail,
        phone: newPhone,
        answers,
        isVip: newIsVip,
      });
      setShowAddModal(false);
      setNewName("");
      setNewEmail("");
      setNewPhone("");
      setNewCompany("");
      setNewJobTitle("");
      setNewIsVip(false);
      router.refresh();
    } catch (e: any) {
      alert("Gagal menambah peserta: " + e.message);
    }
  };

  const handleExportExcel = () => {
    const url = `/api/events/${eventId}/export?status=${encodeURIComponent(
      statusFilter
    )}`;
    window.location.href = url;
  };

  const previewName = emailModalTarget?.name || "Budi Santoso (Contoh Peserta)";
  const previewToken = emailModalTarget?.qrToken || "EVT-2026-SAMPLE88";
  const resolvedPreviewSubject = resolveEmailTemplateVars(emailSubject, {
    name: previewName,
    event: eventTitle,
    location: eventLocation,
    date: formattedEventDate,
  });
  const resolvedPreviewBody = resolveEmailTemplateVars(emailBody, {
    name: previewName,
    event: eventTitle,
    location: eventLocation,
    date: formattedEventDate,
  });

  const buildWhatsAppUrl = (reg: RegistrationWithLogs) => {
    let digits = (reg.phone || "").replace(/[^0-9]/g, "");
    if (digits.startsWith("0")) {
      digits = "62" + digits.slice(1);
    } else if (!digits.startsWith("62") && digits.length > 0) {
      digits = "62" + digits;
    }

    const bodyForParticipant = resolveEmailTemplateVars(emailBody, {
      name: reg.name,
      event: eventTitle,
      location: eventLocation,
      date: formattedEventDate,
    }).replace(
      /\[ATTENDEE QR CODE\]|\{\{\s*qr_code\s*\}\}/gi,
      `👉 *Buka & Simpan QR Code Personal Anda di sini:*\n${origin}/ticket/${reg.qrToken}`
    );

    return `https://wa.me/${digits}?text=${encodeURIComponent(bodyForParticipant)}`;
  };

  return (
    <div className="space-y-6">
      {/* Controls: Search, Filter, Bulk Actions, Email Template, Export Excel */}
      <div className="p-4 sm:p-5 rounded-3xl liquid-card flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
          {/* Search */}
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama, email, no HP..."
              className="w-full pl-9 pr-4 py-2.5 sm:py-2 rounded-xl liquid-input text-slate-900 placeholder-slate-400 text-xs"
            />
          </div>

          {/* Filter Status */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-500 hidden sm:inline" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-auto px-3 py-2.5 sm:py-2 rounded-xl liquid-input text-slate-900 text-xs font-semibold"
            >
              <option value="ALL">Semua Status ({registrations.length})</option>
              <option value="PENDING">Pending (Menunggu Review)</option>
              <option value="APPROVED">Approved (Disetujui)</option>
              <option value="CHECKED_IN">Checked-In (Hadir)</option>
              <option value="REJECTED">Rejected (Ditolak)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
          {selectedIds.length > 0 && (
            <>
              <button
                type="button"
                onClick={handleBulkApprove}
                disabled={loadingAction === "bulk_approve"}
                className="col-span-2 sm:col-span-1 px-3.5 py-2.5 sm:py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                {loadingAction === "bulk_approve" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                )}
                <span>ACC & Kirim ({selectedIds.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setShowPrintLabelsModal(true)}
                className="px-3.5 py-2.5 sm:py-2 rounded-xl text-xs font-bold text-slate-800 liquid-pill flex items-center justify-center gap-1.5 cursor-pointer"
                title="Cetak stiker label untuk peserta yang dicentang"
              >
                <Printer className="w-3.5 h-3.5 text-[#17449A] shrink-0" />
                <span>Cetak Label ({selectedIds.length})</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setShowPrintLabelsModal(true)}
            className="px-3.5 py-2.5 sm:py-2 rounded-xl text-xs font-bold text-white bg-[#17449A] hover:bg-[#12367B] shadow-md shadow-[#17449A]/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            title="Cetak Massal Label Stiker 103 (12 label per lembar: Nama & PT)"
          >
            <Printer className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Cetak Stiker (12/Lembar)</span>
          </button>

          <button
            type="button"
            onClick={() => setShowEventQrModal(true)}
            className="px-3 py-2.5 sm:py-2 rounded-xl text-xs font-bold text-[#17449A] liquid-pill flex items-center justify-center gap-1.5 cursor-pointer"
            title="Tampilkan & Download QR Code Pendaftaran Event"
          >
            <QrCode className="w-3.5 h-3.5 text-[#17449A] shrink-0" />
            <span className="truncate">QR Link</span>
          </button>

          <button
            type="button"
            onClick={() => openSendTicketModal()}
            className="px-3 py-2.5 sm:py-2 rounded-xl text-xs font-bold text-[#17449A] liquid-pill flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Mail className="w-3.5 h-3.5 text-[#17449A] shrink-0" />
            <span className="truncate">Template Email</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-3 py-2.5 sm:py-2 rounded-xl text-xs font-bold text-white bg-[#17449A] hover:bg-[#12367B] shadow-md shadow-[#17449A]/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Tambah Manual</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            className="col-span-2 sm:col-span-1 px-3.5 py-2.5 sm:py-2 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 shadow-md shadow-slate-900/15 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
            <span>Export Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* =================================================================== */}
      {/* MOBILE PARTICIPANT CARDS (< 768px)                                  */}
      {/* =================================================================== */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 ? (
          <div className="p-8 rounded-3xl liquid-glass text-center text-slate-500 text-xs font-medium">
            Tidak ada peserta yang cocok dengan kriteria pencarian.
          </div>
        ) : (
          filtered.map((r) => {
            let answers: Record<string, any> = {};
            try {
              answers = JSON.parse(r.answers || "{}");
            } catch {
              answers = {};
            }

            const isSelected = selectedIds.includes(r.id);
            const isPending = r.status === "PENDING";
            const isApproved = r.status === "APPROVED";
            const emailLog = r.emailLogs?.[0];

            return (
              <div
                key={r.id}
                className={`p-4 rounded-2xl liquid-glass space-y-3 ${
                  isSelected ? "ring-2 ring-[#17449A]/40 bg-[#17449A]/5" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => handleSelectOne(r.id, e.target.checked)}
                      className="accent-[#17449A] w-4 h-4 rounded mt-0.5 cursor-pointer shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 font-extrabold text-sm text-slate-900 break-words">
                        {r.name}
                        {r.isVip && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 border border-amber-200 text-amber-800 text-[10px] font-bold">
                            <Crown className="w-3 h-3" />
                            VIP
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-600 break-all">
                        {r.email}
                      </div>
                      {r.phone && (
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          {r.phone}
                        </div>
                      )}
                    </div>
                  </div>
                  <StatusBadge status={r.status} className="shrink-0" />
                </div>

                {/* Custom answers & email status */}
                <div className="p-2.5 rounded-xl liquid-card grid grid-cols-2 gap-2 text-[11px]">
                  {formSchema.slice(0, 2).map((f) => {
                    const val = answers[f.id] || "-";
                    const displayVal = Array.isArray(val)
                      ? val.join(", ")
                      : String(val);
                    return (
                      <div key={f.id} className="min-w-0">
                        <span className="text-slate-400 font-semibold block truncate">
                          {f.label}
                        </span>
                        <span className="font-bold text-slate-800 block truncate">
                          {displayVal}
                        </span>
                      </div>
                    );
                  })}
                  <div>
                    <span className="text-slate-400 font-semibold block">
                      Status Email
                    </span>
                    {emailLog ? (
                      <span
                        className={`font-bold font-mono ${
                          emailLog.status === "SENT"
                            ? "text-emerald-600"
                            : "text-rose-600"
                        }`}
                      >
                        {emailLog.status === "SENT" ? "TERKIRIM" : emailLog.status}
                      </span>
                    ) : (
                      <span className="text-slate-400">Belum dikirim</span>
                    )}
                  </div>
                </div>

                {/* Mobile Actions */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {isPending && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleApprove(r.id)}
                        disabled={loadingAction === `approve_${r.id}`}
                        className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        {loadingAction === `approve_${r.id}` ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        <span>ACC & Kirim</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReject(r.id)}
                        disabled={loadingAction === `reject_${r.id}`}
                        className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 cursor-pointer"
                        title="Tolak"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </>
                  )}

                  {isApproved && (
                    <button
                      type="button"
                      onClick={() => handleManualCheckIn(r.id)}
                      disabled={loadingAction === `checkin_${r.id}`}
                      className="flex-1 py-2 px-3 rounded-xl bg-[#17449A]/10 hover:bg-[#17449A]/15 text-[#17449A] border border-[#17449A]/20 text-xs font-bold cursor-pointer"
                    >
                      Check-In Manual
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => openSendTicketModal(r)}
                    className="flex-1 py-2 px-3 rounded-xl liquid-pill text-slate-800 hover:text-[#17449A] inline-flex items-center justify-center gap-1.5 text-xs font-bold cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5 text-[#17449A]" />
                    <span>Kirim Tiket</span>
                  </button>

                  {r.phone && (
                    <a
                      href={buildWhatsAppUrl(r)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 inline-flex items-center justify-center gap-1 text-xs font-bold cursor-pointer"
                      title="Kirim Tiket & QR via WhatsApp"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WA</span>
                    </a>
                  )}

                  <Link
                    href={`/ticket/${r.qrToken}`}
                    target="_blank"
                    className="p-2 rounded-xl liquid-pill text-slate-800 hover:text-[#17449A]"
                    title="Buka E-Tiket"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedIds([r.id]);
                      setShowPrintLabelsModal(true);
                    }}
                    className="p-2 rounded-xl liquid-pill text-slate-800 hover:text-[#17449A] cursor-pointer"
                    title="Cetak Stiker Label Peserta Ini (12/Lembar)"
                  >
                    <Printer className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(r.id)}
                    disabled={loadingAction === `delete_${r.id}`}
                    className="p-2 rounded-xl liquid-pill text-slate-500 hover:text-rose-600 cursor-pointer"
                    title="Hapus"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* =================================================================== */}
      {/* TABLET & DESKTOP TABLE CONTAINER (>= 768px)                         */}
      {/* =================================================================== */}
      <div className="hidden md:block rounded-3xl liquid-glass overflow-hidden shadow-sm">
        <div className="overflow-x-auto scroll-smooth">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/90 border-b border-slate-200/80 text-slate-700 select-none">
                <th className="p-3 w-10 text-center sticky left-0 z-20 bg-slate-100/95 backdrop-blur-md">
                  <input
                    type="checkbox"
                    checked={
                      selectedIds.length === filtered.length &&
                      filtered.length > 0
                    }
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="accent-[#17449A] w-3.5 h-3.5 rounded cursor-pointer"
                  />
                </th>
                <th className="p-3 font-bold text-slate-800 sticky left-10 z-20 bg-slate-100/95 backdrop-blur-md border-r border-slate-200/80 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.07)] min-w-[170px]">
                  Peserta
                </th>
                <th className="p-3 font-bold text-slate-800 whitespace-nowrap min-w-[100px]">
                  Status
                </th>
                {formSchema.slice(0, 3).map((f) => (
                  <th
                    key={f.id}
                    className="p-3 font-bold text-slate-800 whitespace-nowrap max-w-[140px] truncate"
                  >
                    {f.label}
                  </th>
                ))}
                <th className="p-3 font-bold text-slate-800 whitespace-nowrap min-w-[95px]">
                  Status Email
                </th>
                <th className="p-3 font-bold text-slate-800 text-right pr-3.5 whitespace-nowrap sticky right-0 z-20 bg-slate-100/95 backdrop-blur-md border-l border-slate-200/80 shadow-[-3px_0_6px_-2px_rgba(0,0,0,0.07)] min-w-[160px]">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={5 + Math.min(3, formSchema.length)}
                    className="p-8 text-center text-slate-500 text-xs font-medium"
                  >
                    Tidak ada peserta yang cocok dengan kriteria pencarian.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => {
                  let answers: Record<string, any> = {};
                  try {
                    answers = JSON.parse(r.answers || "{}");
                  } catch {
                    answers = {};
                  }

                  const isSelected = selectedIds.includes(r.id);
                  const isPending = r.status === "PENDING";
                  const isApproved = r.status === "APPROVED";
                  const emailLog = r.emailLogs?.[0];

                  return (
                    <tr
                      key={r.id}
                      className={`hover:bg-white/90 transition-colors ${
                        isSelected ? "bg-[#17449A]/5" : ""
                      }`}
                    >
                      <td className="p-3 text-center sticky left-0 z-10 bg-white/95 backdrop-blur-md transition-colors">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) =>
                            handleSelectOne(r.id, e.target.checked)
                          }
                          className="accent-[#17449A] w-3.5 h-3.5 rounded cursor-pointer"
                        />
                      </td>

                      <td className="p-3 sticky left-10 z-10 bg-white/95 backdrop-blur-md border-r border-slate-200/80 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.07)] transition-colors min-w-[170px]">
                        <div className="flex items-center gap-2 font-bold text-slate-900 truncate max-w-[170px]">
                          {r.name}
                          {r.isVip && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 border border-amber-200 text-amber-800 text-[10px] font-bold shrink-0">
                              <Crown className="w-3 h-3" />
                              VIP
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-600 truncate max-w-[170px]">
                          {r.email}
                        </div>
                        {r.phone && (
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                            {r.phone}
                          </div>
                        )}
                      </td>

                      <td className="p-3 whitespace-nowrap min-w-[100px]">
                        <StatusBadge status={r.status} />
                      </td>

                      {formSchema.slice(0, 3).map((f) => {
                        const val = answers[f.id] || "-";
                        const displayVal = Array.isArray(val)
                          ? val.join(", ")
                          : String(val);
                        return (
                          <td
                            key={f.id}
                            className="p-3 text-slate-700 font-medium max-w-[140px] truncate"
                          >
                            {displayVal}
                          </td>
                        );
                      })}

                      <td className="p-3 whitespace-nowrap min-w-[95px]">
                        {emailLog ? (
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-bold font-mono ${
                              emailLog.status === "SENT"
                                ? "text-emerald-600"
                                : emailLog.status === "FAILED"
                                ? "text-rose-600"
                                : "text-amber-600"
                            }`}
                          >
                            <Mail className="w-3 h-3" />
                            {emailLog.status === "SENT"
                              ? "TERKIRIM"
                              : emailLog.status}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px] font-medium">
                            Belum dikirim
                          </span>
                        )}
                      </td>

                      <td className="p-3 text-right pr-3.5 whitespace-nowrap sticky right-0 z-10 bg-white/95 backdrop-blur-md border-l border-slate-200/80 shadow-[-3px_0_6px_-2px_rgba(0,0,0,0.07)] min-w-[160px]">
                        <div className="inline-flex items-center gap-1 justify-end">
                          {/* Approve / Reject buttons for PENDING */}
                          {isPending && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleApprove(r.id)}
                                disabled={loadingAction === `approve_${r.id}`}
                                title="ACC Cepat & Langsung Kirim E-Tiket"
                                className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition-colors inline-flex items-center gap-1 cursor-pointer shadow-xs"
                              >
                                {loadingAction === `approve_${r.id}` ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Check className="w-3.5 h-3.5" />
                                )}
                                <span>ACC</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleReject(r.id)}
                                disabled={loadingAction === `reject_${r.id}`}
                                title="Tolak Pendaftaran"
                                className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 transition-colors cursor-pointer"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}

                          {/* Fast Check-In for APPROVED */}
                          {isApproved && (
                            <button
                              type="button"
                              onClick={() => handleManualCheckIn(r.id)}
                              disabled={loadingAction === `checkin_${r.id}`}
                              title="Tandai Hadir (Check-In Manual)"
                              className="px-2.5 py-1.5 rounded-xl bg-[#17449A]/10 hover:bg-[#17449A]/15 text-[#17449A] border border-[#17449A]/20 text-[11px] font-bold transition-colors cursor-pointer"
                            >
                              Check-In
                            </button>
                          )}

                          {/* Open Ready-to-Send Email Template Modal */}
                          <button
                            type="button"
                            onClick={() => openSendTicketModal(r)}
                            title="Buka Template Email & Kirim E-Tiket"
                            className="p-1.5 rounded-xl liquid-pill text-slate-800 hover:text-[#17449A] inline-flex items-center gap-1 text-[11px] font-bold cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5 text-[#17449A]" />
                            <span className="hidden xl:inline">Tiket</span>
                          </button>

                          {/* Direct WhatsApp Ticket Send */}
                          {r.phone && (
                            <a
                              href={buildWhatsAppUrl(r)}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={`Kirim Tiket via WhatsApp (${r.phone})`}
                              className="p-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 inline-flex items-center gap-1 text-[11px] font-bold cursor-pointer transition-colors"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span className="hidden xl:inline">WA</span>
                            </a>
                          )}

                          {/* View Digital Ticket */}
                          <Link
                            href={`/ticket/${r.qrToken}`}
                            target="_blank"
                            title="Buka E-Tiket Digital"
                            className="p-1.5 rounded-xl liquid-pill text-slate-700 hover:text-[#17449A]"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>

                          {/* Print Label for this Attendee */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedIds([r.id]);
                              setShowPrintLabelsModal(true);
                            }}
                            title="Cetak Stiker Label Peserta Ini (12/Lembar)"
                            className="p-1.5 rounded-xl liquid-pill text-slate-700 hover:text-[#17449A] cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => handleDelete(r.id)}
                            disabled={loadingAction === `delete_${r.id}`}
                            title="Hapus Peserta"
                            className="p-1.5 rounded-xl liquid-pill text-slate-400 hover:text-rose-600 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* MODAL TEMPLATE EMAIL E-TIKET SIAP KIRIM                               */}
      {/* ===================================================================== */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="max-w-3xl w-full liquid-glass rounded-3xl p-6 sm:p-8 space-y-6 my-8 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200/80">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#17449A]/10 border border-[#17449A]/20 flex items-center justify-center text-[#17449A] flex-shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900">
                    {emailModalTarget
                      ? `Kirim E-Tiket ke ${emailModalTarget.name}`
                      : "Template Email E-Tiket Siap Pakai"}
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {emailModalTarget
                      ? `Tujuan: ${emailModalTarget.email} • Pilih template di bawah lalu klik Kirim Sekarang.`
                      : "Pilih desain kalimat email E-Tiket yang otomatis dikirim saat peserta disetujui (ACC)."}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowEmailModal(false)}
                className="p-2 rounded-xl liquid-pill text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 1. Preset Selector Cards */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold uppercase tracking-wider text-[#17449A] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>1. Pilih Template Siap Pakai (1-Klik Terisi)</span>
                </label>

                <button
                  type="button"
                  onClick={() => setShowTemplateEditor(!showTemplateEditor)}
                  className="text-xs font-bold text-[#17449A] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  {showTemplateEditor ? (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      <span>Lihat Tampilan Preview Saja</span>
                    </>
                  ) : (
                    <>
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Ubah Kata-Kata / Kustomisasi</span>
                    </>
                  )}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {EMAIL_TEMPLATE_PRESETS.map((preset) => {
                  const isSelected = selectedPresetId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyPreset(preset.id)}
                      className={`text-left p-3.5 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-[#17449A]/10 border-[#17449A]/40 text-slate-900 shadow-sm"
                          : "liquid-card text-slate-700 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-extrabold text-xs text-slate-900">
                          {preset.name}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isSelected
                              ? "bg-[#17449A] text-white"
                              : "bg-slate-200/80 text-slate-600"
                          }`}
                        >
                          {preset.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-snug">
                        {preset.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Optional Custom Text Editor */}
            {showTemplateEditor && (
              <div className="p-4 rounded-2xl liquid-card space-y-3 animate-fade-in">
                <div className="text-[11px] text-slate-600 flex flex-wrap items-center gap-1.5">
                  <span className="font-semibold">Variabel otomatis:</span>
                  <code className="px-1.5 py-0.5 rounded bg-[#17449A]/10 text-[#17449A] font-bold">
                    {"[Participant Name]"}
                  </code>
                  <code className="px-1.5 py-0.5 rounded bg-[#17449A]/10 text-[#17449A] font-bold">
                    {"[ATTENDEE QR CODE]"}
                  </code>
                  <code className="px-1.5 py-0.5 rounded bg-[#17449A]/10 text-[#17449A] font-bold">
                    {"{{event}}"}
                  </code>
                  <code className="px-1.5 py-0.5 rounded bg-[#17449A]/10 text-[#17449A] font-bold">
                    {"{{date}}"}
                  </code>
                  <code className="px-1.5 py-0.5 rounded bg-[#17449A]/10 text-[#17449A] font-bold">
                    {"{{location}}"}
                  </code>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Subjek Email
                  </label>
                  <input
                    type="text"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl liquid-input text-slate-900 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Isi Surat Konfirmasi Email
                  </label>
                  <textarea
                    rows={8}
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl liquid-input text-slate-900 text-xs leading-relaxed"
                  />
                </div>
              </div>
            )}

            {/* 2. Live Preview of E-Ticket Email */}
            <div className="space-y-2">
              <div className="text-xs font-extrabold uppercase tracking-wider text-emerald-600 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" />
                <span>2. Pratinjau Email Formal yang Diterima Peserta</span>
              </div>

              <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm">
                {/* Email Header Bar */}
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-xs space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 w-14">Kepada:</span>
                    <span className="text-slate-800 font-semibold">
                      {emailModalTarget
                        ? `${emailModalTarget.name} <${emailModalTarget.email}>`
                        : "peserta@email.com"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 w-14">Subjek:</span>
                    <span className="text-slate-900 font-bold">
                      {resolvedPreviewSubject}
                    </span>
                  </div>
                </div>

                {/* Formal Email Letter Body */}
                <div className="p-6 bg-white text-slate-800 text-xs space-y-4 border-t-4 border-[#17449A]">
                  {(() => {
                    const qrRegex = /\[ATTENDEE QR CODE\]|\{\{\s*qr_code\s*\}\}/i;
                    const parts = resolvedPreviewBody.split(qrRegex);
                    const beforeQr = parts[0] || "";
                    const afterQr = parts.length > 1 ? parts.slice(1).join("\n\n") : "";

                    return (
                      <>
                        <div className="text-slate-800 leading-relaxed whitespace-pre-line text-xs">
                          {beforeQr.trim()}
                        </div>

                        <div className="my-4 p-5 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-2">
                          <div className="inline-flex items-center justify-center w-24 h-24 rounded-lg bg-white border border-slate-300 text-slate-900 mx-auto shadow-2xs">
                            <QrCode className="w-16 h-16" />
                          </div>
                          <div className="font-mono text-[11px] text-slate-600">
                            ID: {previewToken}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            [Personal QR Code Image Attached Automatically]
                          </div>
                        </div>

                        {afterQr.trim() && (
                          <div className="text-slate-800 leading-relaxed whitespace-pre-line text-xs">
                            {afterQr.trim()}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200/80">
              <button
                type="button"
                onClick={handleSaveDefaultTemplate}
                disabled={savingTemplate}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold text-slate-800 liquid-pill flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {savingTemplate ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5 text-[#17449A]" />
                )}
                <span>Simpan Sebagai Default Event</span>
              </button>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setShowEmailModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 liquid-pill cursor-pointer"
                >
                  Tutup
                </button>

                {emailModalTarget && (
                  <>
                    {emailModalTarget.phone && (
                      <a
                        href={buildWhatsAppUrl(emailModalTarget)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2.5 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Kirim via WhatsApp</span>
                      </a>
                    )}

                    <a
                      href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
                        emailModalTarget.email
                      )}&su=${encodeURIComponent(
                        resolvedPreviewSubject
                      )}&body=${encodeURIComponent(
                        resolvedPreviewBody.replace(
                          /\[ATTENDEE QR CODE\]|\{\{\s*qr_code\s*\}\}/gi,
                          `Personal QR Code Link:\n${origin}/ticket/${emailModalTarget.qrToken}`
                        )
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2.5 rounded-xl text-xs font-bold text-[#17449A] liquid-pill flex items-center gap-1.5 cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-[#17449A]" />
                      <span>Kirim via Gmail Web</span>
                    </a>

                    {emailModalTarget.phone && (
                      <button
                        type="button"
                        onClick={handleSendWhatsAppAuto}
                        disabled={sendingModalWhatsApp}
                        className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/25 flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
                        title="Kirim pesan konfirmasi resmi & link tiket langsung via Fonnte Gateway"
                      >
                        {sendingModalWhatsApp ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <MessageCircle className="w-3.5 h-3.5" />
                        )}
                        <span>Kirim WA Otomatis</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleSendFromModal}
                      disabled={sendingModalEmail}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#17449A] hover:bg-[#12367B] shadow-md shadow-[#17449A]/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {sendingModalEmail ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Mengirim E-Tiket...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>
                            {emailModalTarget.status === "PENDING"
                              ? "Setujui (ACC) & Kirim Otomatis"
                              : "Kirim E-Tiket Sekarang"}
                          </span>
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Add Attendee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-md animate-fade-in">
          <div className="max-w-md w-full liquid-glass rounded-3xl p-6 space-y-4">
            <h3 className="text-base font-extrabold text-slate-900">
              Tambah Peserta Manual
            </h3>
            <p className="text-xs text-slate-600">
              Tambahkan peserta secara langsung dari meja registrasi atau
              panitia.
            </p>

            <form onSubmit={handleAddManualSubmit} className="space-y-4 pt-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Nama Lengkap <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Nama peserta..."
                  className="w-full px-3 py-2 rounded-xl liquid-input text-slate-900 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Alamat Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="email@domain.com"
                  className="w-full px-3 py-2 rounded-xl liquid-input text-slate-900 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Nomor WhatsApp / HP
                </label>
                <input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="0812..."
                  className="w-full px-3 py-2 rounded-xl liquid-input text-slate-900 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Nama Perusahaan / PT
                </label>
                <input
                  type="text"
                  value={newCompany}
                  onChange={(e) => setNewCompany(e.target.value)}
                  placeholder="Contoh: PT Maju Bersama"
                  className="w-full px-3 py-2 rounded-xl liquid-input text-slate-900 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Jabatan
                </label>
                <input
                  type="text"
                  value={newJobTitle}
                  onChange={(e) => setNewJobTitle(e.target.value)}
                  placeholder="Contoh: Manager Marketing"
                  className="w-full px-3 py-2 rounded-xl liquid-input text-slate-900 text-xs"
                />
              </div>

              {vipQuota > 0 && (
                <div className="p-3 rounded-xl bg-amber-50/90 border border-amber-200">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newIsVip}
                      onChange={(e) => setNewIsVip(e.target.checked)}
                      className="accent-amber-600 w-4 h-4 rounded border-2 border-amber-300 checked:border-amber-600"
                    />
                    <div className="text-left">
                      <span className="font-bold text-slate-900 block text-xs">Peserta VIP</span>
                      <span className="text-[10px] text-slate-600 block">Akses prioritas check-in & area khusus</span>
                    </div>
                  </label>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 liquid-pill cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#17449A] hover:bg-[#12367B] shadow-md shadow-[#17449A]/20 cursor-pointer"
                >
                  Tambah & Setujui
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Event Registration Link QR Modal */}
      <EventQrModal
        isOpen={showEventQrModal}
        onClose={() => setShowEventQrModal(false)}
        slug={eventSlug || ""}
        eventTitle={eventTitle}
      />

      {/* Bulk Sticker Label 103 Print Modal (12 labels per sheet) */}
      <PrintStickerLabelsModal
        isOpen={showPrintLabelsModal}
        onClose={() => setShowPrintLabelsModal(false)}
        eventTitle={eventTitle}
        registrations={registrations}
        selectedIds={selectedIds}
        formSchema={formSchema}
      />
    </div>
  );
}
