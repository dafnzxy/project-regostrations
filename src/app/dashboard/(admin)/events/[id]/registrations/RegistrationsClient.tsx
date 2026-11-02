"use client";

import { useState } from "react";
import { FormField } from "@/types";
import { StatusBadge } from "@/components/StatusBadge";
import {
  approveRegistration,
  bulkApproveRegistrations,
  rejectRegistration,
  deleteRegistration,
  resendRsvpEmail,
  addManualAttendee,
  manualCheckInById,
} from "@/actions/registrations";
import {
  Search,
  Filter,
  Download,
  UserPlus,
  CheckCircle2,
  XCircle,
  Mail,
  Trash2,
  Check,
  Loader2,
  QrCode,
  ExternalLink,
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
  formSchema: FormField[];
  initialRegistrations: RegistrationWithLogs[];
}

export function RegistrationsClient({
  eventId,
  eventTitle,
  formSchema,
  initialRegistrations,
}: RegistrationsClientProps) {
  const router = useRouter();
  const [registrations, setRegistrations] = useState(initialRegistrations);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  // Manual Add Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");

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

  const handleApprove = async (id: string) => {
    setLoadingAction(`approve_${id}`);
    try {
      const res = await approveRegistration(id);
      if (res.emailResult?.isRealEmail) {
        alert(
          `✓ Peserta Berhasil Disetujui (ACC)!\n\nEmail RSVP beserta QR Code telah dikirimkan langsung ke kotak masuk ${res.emailResult.recipientEmail}.`
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
    if (!confirm(`Setujui ${selectedIds.length} peserta terpilih sekaligus dan kirim email RSVP QR?`))
      return;

    setLoadingAction("bulk_approve");
    try {
      await bulkApproveRegistrations(selectedIds);
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

  const handleResendEmail = async (id: string) => {
    setLoadingAction(`email_${id}`);
    try {
      await resendRsvpEmail(id);
      alert("Email RSVP berhasil dikirim ulang!");
      router.refresh();
    } catch (e: any) {
      alert("Gagal kirim email: " + e.message);
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
      await addManualAttendee(eventId, {
        name: newName,
        email: newEmail,
        phone: newPhone,
      });
      setShowAddModal(false);
      setNewName("");
      setNewEmail("");
      setNewPhone("");
      router.refresh();
    } catch (e: any) {
      alert("Gagal menambah peserta: " + e.message);
    }
  };

  const exportToCsv = () => {
    if (registrations.length === 0) return;

    // Headers
    const headers = ["Nama", "Email", "Nomor WhatsApp", "Status", "Token QR"];
    formSchema.forEach((f) => headers.push(f.label));

    const rows = registrations.map((r) => {
      let answers: Record<string, any> = {};
      try {
        answers = JSON.parse(r.answers || "{}");
      } catch (e) {
        answers = {};
      }

      const row = [
        `"${r.name.replace(/"/g, '""')}"`,
        `"${r.email}"`,
        `"${r.phone || ""}"`,
        `"${r.status}"`,
        `"${r.qrToken}"`,
      ];

      formSchema.forEach((f) => {
        const val = answers[f.id] || "";
        const formattedVal = Array.isArray(val) ? val.join(", ") : String(val);
        row.push(`"${formattedVal.replace(/"/g, '""')}"`);
      });

      return row.join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Peserta-${eventTitle.replace(/\s+/g, "-")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Controls: Search, Filter, Bulk Actions, Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search */}
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama, email, no HP..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* Filter Status */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="ALL">Semua Status</option>
              <option value="PENDING">Pending (Menunggu Review)</option>
              <option value="APPROVED">Approved (Disetujui)</option>
              <option value="CHECKED_IN">Checked-In (Hadir)</option>
              <option value="REJECTED">Rejected (Ditolak)</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {selectedIds.length > 0 && (
            <button
              onClick={handleBulkApprove}
              disabled={loadingAction === "bulk_approve"}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all"
            >
              {loadingAction === "bulk_approve" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              <span>Setujui ({selectedIds.length})</span>
            </button>
          )}

          <button
            onClick={() => setShowAddModal(true)}
            className="px-3 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-all"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Tambah Manual</span>
          </button>

          <button
            onClick={exportToCsv}
            className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center gap-1.5 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="rounded-2xl glass-panel border border-slate-800/80 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900/90 border-b border-slate-800 text-slate-400 select-none">
                <th className="p-3.5 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === filtered.length && filtered.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="accent-indigo-600 w-3.5 h-3.5 rounded cursor-pointer"
                  />
                </th>
                <th className="p-3.5 font-semibold text-slate-300">Peserta</th>
                <th className="p-3.5 font-semibold text-slate-300">Status</th>
                {formSchema.slice(0, 3).map((f) => (
                  <th key={f.id} className="p-3.5 font-semibold text-slate-300 whitespace-nowrap">
                    {f.label}
                  </th>
                ))}
                <th className="p-3.5 font-semibold text-slate-300">Email RSVP</th>
                <th className="p-3.5 font-semibold text-slate-300 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={5 + Math.min(3, formSchema.length)}
                    className="p-8 text-center text-slate-500 text-xs"
                  >
                    Tidak ada peserta yang cocok dengan kriteria pencarian.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => {
                  let answers: Record<string, any> = {};
                  try {
                    answers = JSON.parse(r.answers || "{}");
                  } catch (e) {
                    answers = {};
                  }

                  const isSelected = selectedIds.includes(r.id);
                  const isPending = r.status === "PENDING";
                  const isApproved = r.status === "APPROVED";
                  const isCheckedIn = r.status === "CHECKED_IN";
                  const emailLog = r.emailLogs?.[0];

                  return (
                    <tr
                      key={r.id}
                      className={`hover:bg-slate-900/50 transition-colors ${
                        isSelected ? "bg-indigo-950/20" : ""
                      }`}
                    >
                      <td className="p-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleSelectOne(r.id, e.target.checked)}
                          className="accent-indigo-600 w-3.5 h-3.5 rounded cursor-pointer"
                        />
                      </td>

                      <td className="p-3.5">
                        <div className="font-semibold text-white">{r.name}</div>
                        <div className="text-[11px] text-slate-400">{r.email}</div>
                        {r.phone && (
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {r.phone}
                          </div>
                        )}
                      </td>

                      <td className="p-3.5">
                        <StatusBadge status={r.status} />
                      </td>

                      {formSchema.slice(0, 3).map((f) => {
                        const val = answers[f.id] || "-";
                        const displayVal = Array.isArray(val) ? val.join(", ") : String(val);
                        return (
                          <td key={f.id} className="p-3.5 text-slate-300 max-w-[160px] truncate">
                            {displayVal}
                          </td>
                        );
                      })}

                      <td className="p-3.5">
                        {emailLog ? (
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-mono ${
                              emailLog.status === "SENT"
                                ? "text-emerald-400"
                                : emailLog.status === "FAILED"
                                ? "text-rose-400"
                                : "text-amber-400"
                            }`}
                          >
                            <Mail className="w-3 h-3" />
                            {emailLog.status}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </td>

                      <td className="p-3.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          {/* Approve / Reject buttons for PENDING */}
                          {isPending && (
                            <>
                              <button
                                onClick={() => handleApprove(r.id)}
                                disabled={loadingAction === `approve_${r.id}`}
                                title="Setujui Pendaftar & Kirim RSVP"
                                className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-colors"
                              >
                                {loadingAction === `approve_${r.id}` ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Check className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <button
                                onClick={() => handleReject(r.id)}
                                disabled={loadingAction === `reject_${r.id}`}
                                title="Tolak Pendaftaran"
                                className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}

                          {/* Fast Check-In for APPROVED */}
                          {isApproved && (
                            <button
                              onClick={() => handleManualCheckIn(r.id)}
                              disabled={loadingAction === `checkin_${r.id}`}
                              title="Tandai Hadir (Check-In Manual)"
                              className="px-2 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 text-[11px] font-medium transition-colors"
                            >
                              Check-In
                            </button>
                          )}

                          {/* Resend RSVP Email */}
                          {(isApproved || isCheckedIn) && (
                            <button
                              onClick={() => handleResendEmail(r.id)}
                              disabled={loadingAction === `email_${r.id}`}
                              title="Kirim Ulang Email RSVP & QR"
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                            >
                              <Mail className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* View Digital Ticket */}
                          <Link
                            href={`/ticket/${r.qrToken}`}
                            target="_blank"
                            title="Buka E-Tiket Digital"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>

                          {/* Delete */}
                          <button
                            onClick={() => handleDelete(r.id)}
                            disabled={loadingAction === `delete_${r.id}`}
                            title="Hapus Peserta"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
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

      {/* Manual Add Attendee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="max-w-md w-full glass-panel rounded-2xl p-6 border border-slate-700 space-y-4">
            <h3 className="text-base font-bold text-white">Tambah Peserta Manual</h3>
            <p className="text-xs text-slate-400">
              Tambahkan peserta secara langsung dari meja registrasi atau panitia.
            </p>

            <form onSubmit={handleAddManualSubmit} className="space-y-4 pt-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Nama Lengkap <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Nama peserta..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Alamat Email <span className="text-rose-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="email@domain.com"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Nomor WhatsApp / HP
                </label>
                <input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="0812..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/25"
                >
                  Tambah & Setujui
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
