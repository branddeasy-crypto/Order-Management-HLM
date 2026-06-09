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
    return list.map((b) => [
      b.publisher, b.isbn ?? "", b.title, b.format,
      b.price_gbp ?? "", b.price_idr, b.eta ?? "", b.status,
    ]);
  }

  function handleExportCSV() {
    exportToCSV("buku-hlm.csv", CSV_HEADERS, toRows(books));
  }

  async function handleExportExcel() {
    await exportToExcel("buku-hlm.xlsx", "Buku", CSV_HEADERS, toRows(books));
  }

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
      <h1 className="text-2xl font-semibold mb-1">Buku / PO</h1>
      <p className="text-gray-500 mb-4">Daftar buku per batch pemesanan — publisher, ISBN, format, harga, ETA, dan status stok (OOS).</p>

      <div className="flex flex-wrap gap-2 mb-6 items-center">
        <span className="text-sm text-gray-500">Import:</span>
        <label className="cursor-pointer px-3 py-1.5 border border-gray-300 rounded-md text-sm bg-white hover:bg-gray-50">
          📂 Upload Excel / CSV
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImportFile} />
        </label>
        <a
          href="/template-buku.csv"
          download
          className="text-xs text-blue-600 hover:underline"
          onClick={(e) => {
            e.preventDefault();
            exportToCSV("template-buku.csv", CSV_HEADERS, [
              ["Quarto", "9781234567890", "Contoh Judul Buku", "PB", "7.99", "145000", "2024-09-01", "available"],
            ]);
          }}
        >
          Download template CSV
        </a>
        <span className="text-gray-300">|</span>
        <span className="text-sm text-gray-500">Export:</span>
        <button onClick={handleExportCSV} className="px-3 py-1.5 border border-gray-300 rounded-md text-sm bg-white hover:bg-gray-50">
          📄 Export CSV
        </button>
        <button onClick={handleExportExcel} className="px-3 py-1.5 border border-gray-300 rounded-md text-sm bg-white hover:bg-gray-50">
          📊 Export Excel
        </button>
        {importMsg && <span className="text-sm text-green-600">{importMsg}</span>}
      </div>

      <form onSubmit={submit} className="bg-white border border-gray-200 rounded-lg p-4 mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Field label="Publisher" value={form.publisher} onChange={(v) => setForm({ ...form, publisher: v })} required />
        <Field label="ISBN" value={form.isbn} onChange={(v) => setForm({ ...form, isbn: v })} />
        <Field label="Judul Buku" value={form.title} onChange={(v) => setForm({ ...form, title: v })} required className="lg:col-span-2" />
        <label className="text-sm flex flex-col gap-1">
          <span className="text-gray-600">Format</span>
          <select className="border border-gray-300 rounded-md px-3 py-2" value={form.format} onChange={(e) => setForm({ ...form, format: e.target.value as "PB" | "HC" })}>
            <option value="PB">Paperback (PB)</option>
            <option value="HC">Hardcover (HC)</option>
          </select>
        </label>
        <Field label="Harga (GBP)" value={form.price_gbp} onChange={(v) => setForm({ ...form, price_gbp: v })} type="number" />
        <Field label="Harga (Rupiah)" value={form.price_idr} onChange={(v) => setForm({ ...form, price_idr: v })} type="number" required />
        <Field label="ETA" value={form.eta} onChange={(v) => setForm({ ...form, eta: v })} type="date" />
        <label className="text-sm flex flex-col gap-1">
          <span className="text-gray-600">Status</span>
          <select className="border border-gray-300 rounded-md px-3 py-2" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as "available" | "oos" })}>
            <option value="available">Tersedia</option>
            <option value="oos">Out of Stock (OOS)</option>
          </select>
        </label>
        <div className="flex items-end gap-2">
          <button type="submit" className="px-4 py-2 bg-gray-900 text-white rounded-md text-sm">
            {editingId ? "Simpan Perubahan" : "Tambah Buku"}
          </button>
          {editingId && (
            <button type="button" onClick={() => { setEditingId(null); setForm(EMPTY); }} className="px-4 py-2 border border-gray-300 rounded-md text-sm">
              Batal
            </button>
          )}
        </div>
      </form>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-2">Publisher</th>
              <th className="px-4 py-2">Judul</th>
              <th className="px-4 py-2">Format</th>
              <th className="px-4 py-2">Harga</th>
              <th className="px-4 py-2">ETA</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-4 py-4 text-gray-400" colSpan={7}>Memuat...</td></tr>
            ) : books.length === 0 ? (
              <tr><td className="px-4 py-4 text-gray-400" colSpan={7}>Belum ada buku.</td></tr>
            ) : books.map((b) => (
              <tr key={b.id} className="border-t border-gray-100">
                <td className="px-4 py-2">{b.publisher}</td>
                <td className="px-4 py-2">{b.title}</td>
                <td className="px-4 py-2">{b.format}</td>
                <td className="px-4 py-2 whitespace-nowrap">{formatIDR(b.price_idr)}{b.price_gbp ? <span className="text-gray-400"> (£{b.price_gbp})</span> : null}</td>
                <td className="px-4 py-2">{b.eta}</td>
                <td className="px-4 py-2">
                  <button
                    onClick={() => toggleStatus(b)}
                    className={`px-2 py-0.5 rounded text-xs ${b.status === "oos" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}
                  >
                    {b.status === "oos" ? "OOS" : "Tersedia"}
                  </button>
                </td>
                <td className="px-4 py-2 text-right whitespace-nowrap">
                  <button onClick={() => edit(b)} className="text-blue-600 hover:underline mr-3">Edit</button>
                  <button onClick={() => remove(b.id)} className="text-red-600 hover:underline">Hapus</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, required, className, type = "text" }: { label: string; value: string; onChange: (v: string) => void; required?: boolean; className?: string; type?: string }) {
  return (
    <label className={`text-sm flex flex-col gap-1 ${className ?? ""}`}>
      <span className="text-gray-600">{label}{required && " *"}</span>
      <input
        type={type}
        className="border border-gray-300 rounded-md px-3 py-2"
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
