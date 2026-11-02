"use client";

import { useState } from "react";
import { FormField, FieldType } from "@/types";
import { updateEvent } from "@/actions/events";
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Save,
  Eye,
  Check,
  AlertCircle,
  HelpCircle,
  Loader2,
  Lock,
} from "lucide-react";

interface FormBuilderClientProps {
  eventId: string;
  initialSchema: FormField[];
  eventSlug: string;
}

export function FormBuilderClient({
  eventId,
  initialSchema,
  eventSlug,
}: FormBuilderClientProps) {
  const [fields, setFields] = useState<FormField[]>(initialSchema);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Field type options
  const fieldTypes: { label: string; value: FieldType }[] = [
    { label: "Teks Pendek (Input)", value: "text" },
    { label: "Teks Panjang (Textarea)", value: "textarea" },
    { label: "Dropdown Pilihan (Select)", value: "dropdown" },
    { label: "Pilihan Ganda (Radio)", value: "radio" },
    { label: "Kotak Centang (Checkbox)", value: "checkbox" },
    { label: "Angka (Number)", value: "number" },
    { label: "Tanggal (Date)", value: "date" },
  ];

  const handleAddField = () => {
    const newField: FormField = {
      id: `field_${Date.now()}`,
      label: "Field Baru",
      type: "text",
      placeholder: "",
      required: false,
      options: ["Pilihan 1", "Pilihan 2"],
    };
    setFields([...fields, newField]);
  };

  const handleUpdateField = (index: number, updates: Partial<FormField>) => {
    const updated = [...fields];
    updated[index] = { ...updated[index], ...updates };
    setFields(updated);
  };

  const handleDeleteField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const handleMoveField = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= fields.length) return;
    const updated = [...fields];
    const temp = updated[index];
    updated[index] = updated[newIndex];
    updated[newIndex] = temp;
    setFields(updated);
  };

  const handleAddOption = (fieldIndex: number) => {
    const field = fields[fieldIndex];
    const options = field.options || [];
    handleUpdateField(fieldIndex, {
      options: [...options, `Opsi ${options.length + 1}`],
    });
  };

  const handleUpdateOption = (fieldIndex: number, optionIndex: number, value: string) => {
    const field = fields[fieldIndex];
    const options = [...(field.options || [])];
    options[optionIndex] = value;
    handleUpdateField(fieldIndex, { options });
  };

  const handleDeleteOption = (fieldIndex: number, optionIndex: number) => {
    const field = fields[fieldIndex];
    const options = (field.options || []).filter((_, i) => i !== optionIndex);
    handleUpdateField(fieldIndex, { options });
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    try {
      await updateEvent(eventId, {
        formSchema: JSON.stringify(fields),
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e: any) {
      setSaveError(e?.message || "Gagal menyimpan formulir.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Left Column: Form Builder Editor */}
      <div className="lg:col-span-7 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Editor Field Formulir</h2>
            <p className="text-xs text-slate-400">
              Sesuaikan data apa saja yang perlu diisi peserta saat mendaftar event.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleAddField}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Field</span>
            </button>

            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : saveSuccess ? (
                <Check className="w-4 h-4" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{saving ? "Menyimpan..." : saveSuccess ? "Tersimpan!" : "Simpan Form"}</span>
            </button>
          </div>
        </div>

        {saveSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-fade-in">
            <Check className="w-4 h-4" />
            <span>Formulir berhasil disimpan dan aktif di halaman pendaftaran publik!</span>
          </div>
        )}

        {saveError && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{saveError}</span>
          </div>
        )}

        {/* Locked Core Fields (Nama & Email) */}
        <div className="p-4 rounded-xl glass-card border border-slate-800 space-y-3 bg-slate-900/40">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>Field Bawaan Sistem (Wajib, Tidak Dapat Dihapus)</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div>
                <div className="font-semibold text-white">Nama Lengkap</div>
                <div className="text-[11px] text-slate-400">Tipe: Teks Pendek</div>
              </div>
              <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded font-mono">
                REQUIRED
              </span>
            </div>
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div>
                <div className="font-semibold text-white">Alamat Email</div>
                <div className="text-[11px] text-slate-400">Tipe: Email (Unik)</div>
              </div>
              <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded font-mono">
                REQUIRED
              </span>
            </div>
          </div>
        </div>

        {/* Custom Fields List */}
        <div className="space-y-4">
          {fields.map((field, index) => {
            const hasOptions =
              field.type === "dropdown" || field.type === "radio" || field.type === "checkbox";

            return (
              <div
                key={field.id}
                className="p-5 rounded-2xl glass-panel border border-slate-800/90 hover:border-slate-700 transition-all space-y-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                    Field #{index + 1}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => handleMoveField(index, "up")}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
                      title="Geser ke Atas"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={index === fields.length - 1}
                      onClick={() => handleMoveField(index, "down")}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
                      title="Geser ke Bawah"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteField(index)}
                      className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                      title="Hapus Field Ini"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Label Pertanyaan
                    </label>
                    <input
                      type="text"
                      value={field.label}
                      onChange={(e) => handleUpdateField(index, { label: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Tipe Input
                    </label>
                    <select
                      value={field.type}
                      onChange={(e) =>
                        handleUpdateField(index, { type: e.target.value as FieldType })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    >
                      {fieldTypes.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Placeholder (Contoh Teks)
                    </label>
                    <input
                      type="text"
                      value={field.placeholder || ""}
                      onChange={(e) => handleUpdateField(index, { placeholder: e.target.value })}
                      placeholder="Contoh: PT ABC..."
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center pt-5">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={(e) => handleUpdateField(index, { required: e.target.checked })}
                        className="accent-indigo-600 w-4 h-4 rounded"
                      />
                      <span className="text-xs font-medium text-slate-300">
                        Wajib Diisi (Required)
                      </span>
                    </label>
                  </div>
                </div>

                {/* Options Editor for Dropdown / Radio / Checkbox */}
                {hasOptions && (
                  <div className="pt-3 border-t border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-400">
                        Daftar Opsi Pilihan
                      </span>
                      <button
                        type="button"
                        onClick={() => handleAddOption(index)}
                        className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Tambah Pilihan
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      {(field.options || []).map((opt, optIdx) => (
                        <div key={optIdx} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => handleUpdateOption(index, optIdx, e.target.value)}
                            className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleDeleteOption(index, optIdx)}
                            className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Column: Real-Time Live Preview */}
      <div className="lg:col-span-5 sticky top-24">
        <div className="p-6 rounded-2xl glass-card border border-indigo-500/20 shadow-xl space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-bold text-white">Live Form Preview</h3>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">Tampilan Peserta</span>
          </div>

          <div className="space-y-4 text-xs opacity-90">
            {/* Standard Name */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Nama Lengkap <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                disabled
                placeholder="Nama peserta..."
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-xs"
              />
            </div>

            {/* Standard Email */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Alamat Email <span className="text-rose-400">*</span>
              </label>
              <input
                type="email"
                disabled
                placeholder="email@peserta.com"
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-xs"
              />
            </div>

            {/* Custom fields preview */}
            {fields.map((f) => (
              <div key={f.id} className="space-y-1">
                <label className="block text-[11px] font-semibold text-slate-300">
                  {f.label} {f.required && <span className="text-rose-400">*</span>}
                </label>

                {f.type === "text" && (
                  <input
                    type="text"
                    disabled
                    placeholder={f.placeholder || ""}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-xs"
                  />
                )}

                {f.type === "textarea" && (
                  <textarea
                    rows={2}
                    disabled
                    placeholder={f.placeholder || ""}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-xs"
                  />
                )}

                {f.type === "dropdown" && (
                  <select
                    disabled
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-xs"
                  >
                    <option>{f.placeholder || "-- Pilih Salah Satu --"}</option>
                    {f.options?.map((o, idx) => (
                      <option key={idx}>{o}</option>
                    ))}
                  </select>
                )}

                {f.type === "radio" && (
                  <div className="space-y-1 pt-1">
                    {f.options?.map((o, idx) => (
                      <label key={idx} className="flex items-center gap-2 text-[11px] text-slate-400">
                        <input type="radio" disabled />
                        <span>{o}</span>
                      </label>
                    ))}
                  </div>
                )}

                {f.type === "checkbox" && (
                  <div className="space-y-1 pt-1">
                    {f.options?.map((o, idx) => (
                      <label key={idx} className="flex items-center gap-2 text-[11px] text-slate-400">
                        <input type="checkbox" disabled />
                        <span>{o}</span>
                      </label>
                    ))}
                  </div>
                )}

                {f.type === "number" && (
                  <input
                    type="number"
                    disabled
                    placeholder={f.placeholder || ""}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-xs"
                  />
                )}

                {f.type === "date" && (
                  <input
                    type="date"
                    disabled
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-xs"
                  />
                )}
              </div>
            ))}

            <button
              disabled
              className="w-full py-2.5 rounded-xl bg-indigo-600/40 text-indigo-200 text-xs font-semibold cursor-not-allowed mt-4"
            >
              Kirim Pendaftaran (Contoh Tombol)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
