"use client";

import { useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase";
import { Book, formatIDR } from "@/lib/types";
import { exportToCSV, exportToExcel, parseCSV, parseExcelFile } from "@/lib/importExport";

const EMPTY = {
  publisher: "",
  isbn: "",
  title: "",
  format: "PB" as "PB" | "HC",
  price_gbp: "",
  price_idr: "",
  eta: "",
  status: "available" as "available" | "oos",
};

const CSV_HEADERS = ["Publisher", "ISBN", "Judul", "Format", "Harga GBP", "Harga Rupiah", "ETA", "Status"];

export default function BooksPage() {
  const supabase = supabaseBrowser();
  const [books, setBooks] = useState<Book[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from("books").select("*").order("created_at", { ascending: false });
    if (error) setError(error.message);
    else setBooks(data as Book[]);
    setLoading(false);
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const payload = {
      publisher: form.publisher,
      isbn: form.isbn || null,
      title: form.title,
      format: form.format,
      price_gbp: form.price_gbp ? Number(form.price_gbp) : null,
      price_idr: Number(form.price_idr),
      eta: form.eta || null,
      status: form.status,
    };
    if (editingId) {
      const { error } = await supabase.from("books").update(payload).eq("id", editingId);
      if (error) return setError(error.message);
    } else {
      const { error } = await supabase.from("books").insert(payload);
      if (error) return setError(error.message);
    }
    setForm(EMPTY);
    setEditingId(null);
    load();
  }

  function edit(b: Book) {
    setEditingId(b.id);
    setForm({
      publisher: b.publisher,
      isbn: b.isbn ?? "",
      title: b.title,
      format: b.format,
      price_gbp: b.price_gbp?.toString() ?? "",
      price_idr: b.price_idr?.toString() ?? "",
      eta: b.eta ?? "",
      status: b.status,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function remove(id: string) {
    if (!confirm("Hapus buku ini?")) return;
    await supabase.from("books").delete().eq("id", id);
    load();
  }

  async function toggleStatus(b: Book) {
    await supabase.from("books").update({ status: b.status === "available" ? "oos" : "available" }).eq("id", b.id);
    load();
  }

  function toRows(list: Book[]) {
    return list.map((b) => [b.publisher, b.isbn ?? "", b.title, b.format, b.price_gbp ?? "", b.price_idr, b.eta ?? "", b.status]);
  }

  function handleExportCSV() { exportToCSV("buku-hlm.csv", CSV_HEADERS, toRows(books)); }
  async function handleExportExcel() { await exportToExcel("buku-hlm.xlsx", "Buku", CSV_HEADERS, toRows(books)); }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportMsg(null);
    setError(null);
    let rows: string[][];
    if (file.name.endsWith(".csv")) {
      const text = await file.text();
      rows = parseCSV(text).slice(1);
    } else {
      const all = await parseExcelFile(file);
      rows = (all as unknown as (string | number)[][]).slice(1).map((r) => r.map(String));
    }
    const payload = rows
      .filter((r) => r[2])
      .map((r) => ({
        publisher: r[0] || "Unknown",
        isbn: r[1] || null,
        title: r[2],
        format: (r[3] === "HC" ? "HC" : "PB") as "PB" | "HC",
        price_gbp: r[4] ? Number(r[4]) : null,
        price_idr: Number(r[5]) || 0,
        eta: r[6] || null,
        status: (r[7] === "oos" ? "oos" : "available") as "available" | "oos",
      }));
    if (payload.length === 0) return setError("File tidak berisi data yang valid.");
    const { error } = await supabase.from("books").insert(payload);
    if (error) return setError("Import gagal: " + error.message);
    setImportMsg(`✅ ${payload.length} buku berhasil diimport!`);
    load();
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center text-xl shadow-sm">📚</div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Buku / PO</h1>
          <p className="text-sm text-gray-400">Daftar buku per batch — publisher, ISBN, harga, ETA, dan status stok.</p>
        </div>
      </div>
      <div className="h-1 w-16 rounded-full bg-gradient-to-r from-violet-400 to-purple-600 mb-6" />

      {/* Import/Export toolbar */}
      <div className="flex flex-wrap gap-2 mb-5 items-center bg-purple-50 border border-purple-100 rounded-2xl px-4 py-3">
        <span className="text-xs font-semibold text-purple-600">Import:</span>
        <label className="cursor-pointer px-3 py-1.5 border border-purple-200 rounded-lg text-xs font-medium text-purple-700 bg-white hover:bg-purple-50 transition-colors">
          📂 Upload Excel / CSV
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImportFile} />
        </label>
        <button
          type="button"
          className="text-xs text-blue-600 hover:underline"
          onClick={() => exportToCSV("template-buku.csv", CSV_HEADERS, [["Quarto", "9781234567890", "Contoh Judul Buku", "PB", "7.99", "145000", "2024-09-01", "available"]])}
        >
          📄 Download template CSV
        </button>
        <span className="text-purple-200">|</span>
        <span className="text-xs font-semibold text-purple-600">Export:</span>
        <button onClick={handleExportCSV} className="px-3 py-1.5 border border-purple-200 rounded-lg text-xs font-medium text-purple-700 bg-white hover:bg-purple-50 transition-colors">📄 CSV</button>
        <button onClick={handleExportExcel} className="px-3 py-1.5 border border-purple-200 rounded-lg text-xs font-medium text-purple-700 bg-white hover:bg-purple-50 transition-colors">📊 Excel</button>
        {importMsg && <span className="text-xs text-green-600 font-medium">{importMsg}</span>}
      </div>

      {/* Form */}
      <div className="bg-violet-50 border border-violet-100 rounded-2xl p-5 mb-6">
        <h2 className="text-sm font-semibold text-violet-700 mb-3">
          {editingId ? "✏️ Edit Buku" : "➕ Tambah Buku Baru"}
        </h2>
        <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Field label="Publisher" value={form.publisher} onChange={(v) => setForm({ ...form, publisher: v })} required />
          <Field label="ISBN" value={form.isbn} onChange={(v) => setForm({ ...form, isbn: v })} />
          <Field label="Judul Buku" value={form.title} onChange={(v) => setForm({ ...form, title: v })} required className="lg:col-span-2" />
          <label className="text-sm flex flex-col gap-1">
            <span className="text-gray-600 font-medium text-xs">Format</span>
            <select className="border border-gray-200 rounded-lg px-3 py-2 bg-white text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" value={form.format} onChange={(e) => setForm({ ...form, format: e.target.value as "PB" | "HC" })}>
              <option value="PB">Paperback (PB)</option>
              <option value="HC">Hardcover (HC)</option>
            </select>
          </label>
          <Field label="Harga (GBP)" value={form.price_gbp} onChange={(v) => setForm({ ...form, price_gbp: v })} type="number" placeholder="7.99" />
          <Field label="Harga (Rupiah)" value={form.price_idr} onChange={(v) => setForm({ ...form, price_idr: v })} type="number" required placeholder="145000" />
          <Field label="ETA" value={form.eta} onChange={(v) => setForm({ ...form, eta: v })} type="date" />
          <label className="text-sm flex flex-col gap-1">
            <span className="text-gray-600 font-medium text-xs">Status</span>
            <select className="border border-gray-200 rounded-lg px-3 py-2 bg-white text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as "available" | "oos" })}>
              <option value="available">Tersedia</option>
              <option value="oos">Out of Stock (OOS)</option>
            </select>
          </label>
          <div className="flex items-end gap-2">
            <button type="submit"
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md"
              style={{ background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)" }}>
              {editingId ? "💾 Simpan" : "➕ Tambah"}
            </button>
            {editingId && (
              <button type="button" onClick={() => { setEditingId(null); setForm(EMPTY); }}
                className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-600 hover:bg-gray-100 transition-colors">
                Batal
              </button>
            )}
          </div>
        </form>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-4 flex items-center gap-2">
          <span>⚠️</span> {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-gray-100 rounded-2xl overflow-x-auto shadow-sm">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-600">Daftar Buku</span>
          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{books.length} buku</span>
        </div>
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-gray-400 uppercase tracking-wide">
            <tr>
              <th className="px-5 py-3">Publisher</th>
              <th className="px-5 py-3">Judul</th>
              <th className="px-5 py-3">Format</th>
              <th className="px-5 py-3">Harga</th>
              <th className="px-5 py-3">ETA</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-5 py-8 text-gray-300 text-center" colSpan={7}>⏳ Memuat data...</td></tr>
            ) : books.length === 0 ? (
              <tr><td className="px-5 py-8 text-gray-400 text-center" colSpan={7}>📚 Belum ada buku. Tambah atau import dari Excel!</td></tr>
            ) : books.map((b) => (
              <tr key={b.id} className="border-t border-gray-50 hover:bg-violet-50/30 transition-colors">
                <td className="px-5 py-3">
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{b.publisher}</span>
                </td>
                <td className="px-5 py-3 font-medium text-gray-800 max-w-xs">{b.title}</td>
                <td className="px-5 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${b.format === "HC" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>
                    {b.format}
                  </span>
                </td>
                <td className="px-5 py-3 whitespace-nowrap text-gray-700 font-medium">
                  {formatIDR(b.price_idr)}
                  {b.price_gbp ? <span className="text-gray-400 text-xs ml-1">(£{b.price_gbp})</span> : null}
                </td>
                <td className="px-5 py-3 text-gray-500">{b.eta}</td>
                <td className="px-5 py-3">
                  <button onClick={() => toggleStatus(b)}
                    className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${b.status === "oos" ? "bg-red-100 text-red-700 hover:bg-red-200" : "bg-green-100 text-green-700 hover:bg-green-200"}`}>
                    {b.status === "oos" ? "❌ OOS" : "✅ Tersedia"}
                  </button>
                </td>
                <td className="px-5 py-3 text-right whitespace-nowrap">
                  <button onClick={() => edit(b)} className="text-xs px-3 py-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 mr-2 transition-colors">Edit</button>
                  <button onClick={() => remove(b.id)} className="text-xs px-3 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors">Hapus</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, required, className, type = "text", placeholder }: {
  label: string; value: string; onChange: (v: string) => void;
  required?: boolean; className?: string; type?: string; placeholder?: string;
}) {
  return (
    <label className={`text-sm flex flex-col gap-1 ${className ?? ""}`}>
      <span className="text-gray-600 font-medium text-xs">{label}{required && <span className="text-violet-500"> *</span>}</span>
      <input
        type={type}
        className="border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all text-sm"
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
