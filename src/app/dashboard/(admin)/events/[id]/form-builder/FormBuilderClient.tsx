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
            <h2 className="text-lg font-extrabold text-slate-900">Editor Field Formulir</h2>
            <p className="text-xs text-slate-600">
              Sesuaikan data apa saja yang perlu diisi peserta saat mendaftar event.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAddField}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-900 liquid-pill cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#17449A]" />
              <span>Tambah Field</span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#17449A] hover:bg-[#12367B] shadow-md shadow-[#17449A]/20 transition-all cursor-pointer disabled:opacity-50"
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
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2 animate-fade-in">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Formulir berhasil disimpan dan aktif di halaman pendaftaran publik!</span>
          </div>
        )}

        {saveError && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>{saveError}</span>
          </div>
        )}

        {/* Locked Core Fields (Nama & Email) */}
        <div className="p-5 rounded-3xl liquid-card space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <Lock className="w-3.5 h-3.5 text-[#17449A]" />
            <span>Field Bawaan Sistem (Wajib, Tidak Dapat Dihapus)</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-white/80 border border-slate-200/80 flex items-center justify-between shadow-2xs">
              <div>
                <div className="font-bold text-slate-900">Nama Lengkap</div>
                <div className="text-[11px] text-slate-500">Tipe: Teks Pendek</div>
              </div>
              <span className="text-[10px] font-bold bg-[#17449A]/10 text-[#17449A] border border-[#17449A]/20 px-2 py-0.5 rounded-full font-mono">
                REQUIRED
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-white/80 border border-slate-200/80 flex items-center justify-between shadow-2xs">
              <div>
                <div className="font-bold text-slate-900">Alamat Email</div>
                <div className="text-[11px] text-slate-500">Tipe: Email (Unik)</div>
              </div>
              <span className="text-[10px] font-bold bg-[#17449A]/10 text-[#17449A] border border-[#17449A]/20 px-2 py-0.5 rounded-full font-mono">
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
                className="p-5 rounded-3xl liquid-glass space-y-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-extrabold text-[#17449A] uppercase tracking-wider">
                    Field #{index + 1}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => handleMoveField(index, "up")}
                      className="p-1.5 rounded-xl liquid-pill text-slate-800 hover:text-[#17449A] disabled:opacity-30 cursor-pointer"
                      title="Geser ke Atas"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={index === fields.length - 1}
                      onClick={() => handleMoveField(index, "down")}
                      className="p-1.5 rounded-xl liquid-pill text-slate-800 hover:text-[#17449A] disabled:opacity-30 cursor-pointer"
                      title="Geser ke Bawah"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteField(index)}
                      className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 transition-colors cursor-pointer"
                      title="Hapus Field Ini"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Label Pertanyaan
                    </label>
                    <input
                      type="text"
                      value={field.label}
                      onChange={(e) => handleUpdateField(index, { label: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl liquid-input text-slate-900 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Tipe Input
                    </label>
                    <select
                      value={field.type}
                      onChange={(e) =>
                        handleUpdateField(index, { type: e.target.value as FieldType })
                      }
                      className="w-full px-3 py-2 rounded-xl liquid-input text-slate-900 text-xs"
                    >
                      {fieldTypes.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Placeholder (Contoh Teks)
                    </label>
                    <input
                      type="text"
                      value={field.placeholder || ""}
                      onChange={(e) => handleUpdateField(index, { placeholder: e.target.value })}
                      placeholder="Contoh: PT ABC..."
                      className="w-full px-3 py-2 rounded-xl liquid-input text-slate-900 placeholder-slate-400 text-xs"
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
                      <span className="text-xs font-bold text-slate-700">
                        Wajib Diisi (Required)
                      </span>
                    </label>
                  </div>
                </div>

                {/* Options Editor for Dropdown / Radio / Checkbox */}
                {hasOptions && (
                  <div className="pt-3 border-t border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-600">
                        Daftar Opsi Pilihan
                      </span>
                      <button
                        type="button"
                        onClick={() => handleAddOption(index)}
                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-500 flex items-center gap-1 cursor-pointer"
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
                            className="flex-1 px-3 py-1.5 rounded-xl liquid-input text-slate-900 text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => handleDeleteOption(index, optIdx)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
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
        <div className="p-6 rounded-3xl liquid-glass space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/80">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-[#17449A]" />
              <h3 className="text-sm font-extrabold text-slate-900">Live Form Preview</h3>
            </div>
            <span className="text-[11px] text-[#17449A] bg-[#17449A]/10 border border-[#17449A]/20 px-2.5 py-0.5 rounded-full font-semibold">
              Tampilan Peserta
            </span>
          </div>

          <div className="space-y-4 text-xs">
            {/* Standard Name */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Nama Lengkap <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                disabled
                placeholder="Nama peserta..."
                className="w-full px-3 py-2 rounded-xl liquid-input text-slate-500 text-xs"
              />
            </div>

            {/* Standard Email */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Alamat Email <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                disabled
                placeholder="email@peserta.com"
                className="w-full px-3 py-2 rounded-xl liquid-input text-slate-500 text-xs"
              />
            </div>

            {/* Custom fields preview */}
            {fields.map((f) => (
              <div key={f.id} className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700">
                  {f.label} {f.required && <span className="text-rose-500">*</span>}
                </label>

                {f.type === "text" && (
                  <input
                    type="text"
                    disabled
                    placeholder={f.placeholder || ""}
                    className="w-full px-3 py-2 rounded-xl liquid-input text-slate-500 text-xs"
                  />
                )}

                {f.type === "textarea" && (
                  <textarea
                    rows={2}
                    disabled
                    placeholder={f.placeholder || ""}
                    className="w-full px-3 py-2 rounded-xl liquid-input text-slate-500 text-xs"
                  />
                )}

                {f.type === "dropdown" && (
                  <select
                    disabled
                    className="w-full px-3 py-2 rounded-xl liquid-input text-slate-500 text-xs"
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
                      <label key={idx} className="flex items-center gap-2 text-[11px] text-slate-600">
                        <input type="radio" disabled />
                        <span>{o}</span>
                      </label>
                    ))}
                  </div>
                )}

                {f.type === "checkbox" && (
                  <div className="space-y-1 pt-1">
                    {f.options?.map((o, idx) => (
                      <label key={idx} className="flex items-center gap-2 text-[11px] text-slate-600">
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
                    className="w-full px-3 py-2 rounded-xl liquid-input text-slate-500 text-xs"
                  />
                )}

                {f.type === "date" && (
                  <input
                    type="date"
                    disabled
                    className="w-full px-3 py-2 rounded-xl liquid-input text-slate-500 text-xs"
                  />
                )}
              </div>
            ))}

            <button
              disabled
              className="w-full py-2.5 rounded-xl bg-indigo-600/80 text-white text-xs font-bold cursor-not-allowed mt-4 shadow-sm"
            >
              Kirim Pendaftaran (Contoh Tombol)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
