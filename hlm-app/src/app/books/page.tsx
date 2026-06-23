"use client";

import { useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase";
import { Book, BookStatus, formatIDR } from "@/lib/types";
import { exportToCSV, exportToExcel, parseCSV, parseExcelFile } from "@/lib/importExport";

const EMPTY = {
  publisher: "",
  isbn: "",
  title: "",
  format: "PB" as Book["format"],
  price_gbp: "",
  price_currency: "GBP" as "GBP" | "USD" | "AUD",
  price_idr: "",
  eta: "",
  status: "available" as BookStatus,
};

const FORMAT_LABELS: Record<Book["format"], string> = {
  PB: "Paperback (PB)",
  HC: "Hardcover (HC)",
  BB: "Boardbook (BB)",
  FB: "Flexibound (FB)",
  TOYS: "Educational Toys",
  MONTESSORI: "Montessori Apparatus",
};

const FORMAT_BADGE: Record<Book["format"], string> = {
  PB: "bg-blue-100 text-blue-700",
  HC: "bg-amber-100 text-amber-700",
  BB: "bg-teal-100 text-teal-700",
  FB: "bg-indigo-100 text-indigo-700",
  TOYS: "bg-pink-100 text-pink-700",
  MONTESSORI: "bg-green-100 text-green-700",
};

const STATUS_CONFIG: Record<BookStatus, { label: string; badge: string; icon: string }> = {
  available:   { label: "PO (Pre-Order)",  badge: "bg-green-100 text-green-700", icon: "🛒" },
  ready_stock: { label: "Ready Stock",     badge: "bg-blue-100 text-blue-700",   icon: "📦" },
  oos:         { label: "Out of Stock",    badge: "bg-red-100 text-red-700",     icon: "❌" },
  delay:       { label: "Delay",           badge: "bg-amber-100 text-amber-700", icon: "⏳" },
  cancelled:   { label: "Dibatalkan",      badge: "bg-red-200 text-red-900",     icon: "🚫" },
  damaged:     { label: "Cacat/Rusak",     badge: "bg-gray-200 text-gray-700",   icon: "⚠️" },
};

const ALERT_STATUSES: BookStatus[] = ["delay", "cancelled", "damaged"];
const CURRENCY_SYMBOL: Record<string, string> = { GBP: "£", USD: "$", AUD: "A$" };
const CSV_HEADERS = ["Publisher", "ISBN", "Judul", "Format", "Harga Asing", "Mata Uang", "Harga Rupiah", "ETA (Bulan/Tahun)", "Status"];

type AffectedOrder = {
  id: string;
  qty: number;
  status: string;
  customers: { whatsapp_name: string; whatsapp_number: string; whatsapp_group: string | null } | null;
};

export default function BooksPage() {
  const supabase = supabaseBrowser();
  const [books, setBooks] = useState<Book[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [affectedBookId, setAffectedBookId] = useState<string | null>(null);
  const [affectedOrders, setAffectedOrders] = useState<AffectedOrder[]>([]);
  const [loadingAffected, setLoadingAffected] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from("books").select("*").order("created_at", { ascending: false });
    if (error) setError(error.message);
    else setBooks(data as Book[]);
    setLoading(false);
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  async function openAffected(bookId: string) {
    if (affectedBookId === bookId) { setAffectedBookId(null); return; }
    setAffectedBookId(bookId);
    setLoadingAffected(true);
    const { data } = await supabase
      .from("orders")
      .select("id, qty, status, customers(whatsapp_name, whatsapp_number, whatsapp_group)")
      .eq("book_id", bookId)
      .not("status", "in", '("shipped","paid_off")');
    setAffectedOrders((data as unknown as AffectedOrder[]) ?? []);
    setLoadingAffected(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const payload = {
      publisher: form.publisher,
      isbn: form.isbn || null,
      title: form.title,
      format: form.format,
      price_gbp: form.price_gbp ? Number(form.price_gbp) : null,
      price_currency: form.price_currency,
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
    setAffectedBookId(null);
    setForm({
      publisher: b.publisher,
      isbn: b.isbn ?? "",
      title: b.title,
      format: b.format,
      price_gbp: b.price_gbp?.toString() ?? "",
      price_currency: (b.price_currency ?? "GBP") as "GBP" | "USD" | "AUD",
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

  async function cycleStatus(b: Book) {
    const cycle: Record<string, BookStatus> = {
      available: "ready_stock",
      ready_stock: "oos",
      oos: "available",
    };
    const next = cycle[b.status];
    if (!next) return;
    await supabase.from("books").update({ status: next }).eq("id", b.id);
    load();
  }

  function toRows(list: Book[]) {
    return list.map((b) => [b.publisher, b.isbn ?? "", b.title, b.format, b.price_gbp ?? "", b.price_currency ?? "GBP", b.price_idr, b.eta ?? "", b.status]);
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
    const VALID_FORMATS = ["PB", "HC", "BB", "FB", "TOYS", "MONTESSORI"];
    const VALID_CURRENCIES = ["GBP", "USD", "AUD"];
    const VALID_STATUSES: BookStatus[] = ["available", "ready_stock", "oos", "delay", "cancelled", "damaged"];
    const payload = rows
      .filter((r) => r[2])
      .map((r) => ({
        publisher: r[0] || "Unknown",
        isbn: r[1] || null,
        title: r[2],
        format: (VALID_FORMATS.includes(r[3]) ? r[3] : "PB") as Book["format"],
        price_gbp: r[4] ? Number(r[4]) : null,
        price_currency: (VALID_CURRENCIES.includes(r[5]) ? r[5] : "GBP") as "GBP" | "USD" | "AUD",
        price_idr: Number(r[6]) || 0,
        eta: r[7] || null,
        status: (VALID_STATUSES.includes(r[8] as BookStatus) ? r[8] : "available") as BookStatus,
      }));
    if (payload.length === 0) return setError("File tidak berisi data yang valid.");
    const { error } = await supabase.from("books").insert(payload);
    if (error) return setError("Import gagal: " + error.message);
    setImportMsg(`✅ ${payload.length} buku berhasil diimport!`);
    load();
    if (fileRef.current) fileRef.current.value = "";
  }

  const countByStatus = books.reduce((acc, b) => {
    acc[b.status] = (acc[b.status] ?? 0) + 1;
    return acc;
  }, {} as Record<BookStatus, number>);

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center text-xl shadow-sm">📚</div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Buku / PO</h1>
          <p className="text-sm text-gray-400">Daftar buku per batch - publisher, ISBN, harga, ETA, dan status stok.</p>
        </div>
      </div>
      <div className="h-1 w-16 rounded-full bg-gradient-to-r from-violet-400 to-purple-600 mb-6" />

      {ALERT_STATUSES.some(s => (countByStatus[s] ?? 0) > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3 mb-4 flex items-start gap-3">
          <span className="text-xl mt-0.5">⚠️</span>
          <div>
            <p className="text-sm font-semibold text-amber-800">Ada buku yang memerlukan tindakan:</p>
            <div className="flex gap-3 mt-1 flex-wrap">
              {ALERT_STATUSES.map(s => (countByStatus[s] ?? 0) > 0 && (
                <span key={s} className="text-xs text-amber-700">
                  {STATUS_CONFIG[s].icon} {countByStatus[s]} buku {STATUS_CONFIG[s].label}
                </span>
              ))}
            </div>
            <p className="text-xs text-amber-600 mt-1">Klik tombol &quot;Pembeli Terdampak&quot; di baris buku untuk melihat daftar customer yang perlu dihubungi.</p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-5 items-center bg-purple-50 border border-purple-100 rounded-2xl px-4 py-3">
        <span className="text-xs font-semibold text-purple-600">Import:</span>
        <label className="cursor-pointer px-3 py-1.5 border border-purple-200 rounded-lg text-xs font-medium text-purple-700 bg-white hover:bg-purple-50 transition-colors">
          📂 Upload Excel / CSV
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImportFile} />
        </label>
        <button type="button" className="text-xs text-blue-600 hover:underline"
          onClick={() => exportToCSV("template-buku.csv", CSV_HEADERS, [["Quarto", "9781234567890", "Contoh Judul Buku", "PB", "7.99", "GBP", "145000", "2024-09", "available"]])}>
          📄 Download template CSV
        </button>
        <span className="text-purple-200">|</span>
        <span className="text-xs font-semibold text-purple-600">Export:</span>
        <button onClick={handleExportCSV} className="px-3 py-1.5 border border-purple-200 rounded-lg text-xs font-medium text-purple-700 bg-white hover:bg-purple-50 transition-colors">📄 CSV</button>
        <button onClick={handleExportExcel} className="px-3 py-1.5 border border-purple-200 rounded-lg text-xs font-medium text-purple-700 bg-white hover:bg-purple-50 transition-colors">📊 Excel</button>
        {importMsg && <span className="text-xs text-green-600 font-medium">{importMsg}</span>}
      </div>

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
            <select className="border border-gray-200 rounded-lg px-3 py-2 bg-white text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              value={form.format} onChange={(e) => setForm({ ...form, format: e.target.value as Book["format"] })}>
              {Object.entries(FORMAT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <div className="text-sm flex flex-col gap-1">
            <span className="text-gray-600 font-medium text-xs">Harga Asing</span>
            <div className="flex gap-1.5">
              <select className="border border-gray-200 rounded-lg px-2 py-2 bg-white text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 w-24"
                value={form.price_currency} onChange={(e) => setForm({ ...form, price_currency: e.target.value as "GBP" | "USD" | "AUD" })}>
                <option value="GBP">GBP</option>
                <option value="USD">USD</option>
                <option value="AUD">AUD</option>
              </select>
              <input type="number" placeholder="7.99"
                className="border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all text-sm flex-1"
                value={form.price_gbp} onChange={(e) => setForm({ ...form, price_gbp: e.target.value })} />
            </div>
          </div>
          <Field label="Harga (Rupiah)" value={form.price_idr} onChange={(v) => setForm({ ...form, price_idr: v })} type="number" required placeholder="145000" />
          <Field label="ETA (Bulan/Tahun)" value={form.eta} onChange={(v) => setForm({ ...form, eta: v })} type="month" />
          <label className="text-sm flex flex-col gap-1">
            <span className="text-gray-600 font-medium text-xs">Status</span>
            <select className="border border-gray-200 rounded-lg px-3 py-2 bg-white text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as BookStatus })}>
              <option value="available">🛒 PO (Pre-Order)</option>
              <option value="ready_stock">📦 Ready Stock</option>
              <option value="oos">❌ Out of Stock (OOS)</option>
              <option disabled>──────────</option>
              <option value="delay">⏳ Delay (ETA bergeser)</option>
              <option value="cancelled">🚫 Dibatalkan (tidak jadi terbit)</option>
              <option value="damaged">⚠️ Cacat/Rusak (dari ekspedisi)</option>
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
            ) : books.map((b) => {
              const sc = STATUS_CONFIG[b.status] ?? STATUS_CONFIG.oos;
              const isAlert = ALERT_STATUSES.includes(b.status);
              const isAffectedOpen = affectedBookId === b.id;
              return (
                <>
                  <tr key={b.id} className={`border-t border-gray-50 transition-colors ${isAlert ? "bg-amber-50/40" : "hover:bg-violet-50/30"} ${isAffectedOpen ? "bg-amber-50/60" : ""}`}>
                    <td className="px-5 py-3">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{b.publisher}</span>
                    </td>
                    <td className="px-5 py-3 font-medium text-gray-800 max-w-xs">{b.title}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${FORMAT_BADGE[b.format] ?? "bg-gray-100 text-gray-700"}`}>
                        {b.format}
                      </span>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap text-gray-700 font-medium">
                      {formatIDR(b.price_idr)}
                      {b.price_gbp ? <span className="text-gray-400 text-xs ml-1">({CURRENCY_SYMBOL[b.price_currency ?? "GBP"]}{b.price_gbp})</span> : null}
                    </td>
                    <td className="px-5 py-3 text-gray-500">{b.eta}</td>
                    <td className="px-5 py-3">
                      {isAlert ? (
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${sc.badge}`}>
                          {sc.icon} {sc.label}
                        </span>
                      ) : (
                        <button onClick={() => cycleStatus(b)}
                          className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors hover:opacity-80 ${sc.badge}`}
                          title="Klik untuk ganti status">
                          {sc.icon} {sc.label}
                        </button>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      {isAlert && (
                        <button onClick={() => openAffected(b.id)}
                          className={`text-xs px-3 py-1 rounded-lg mr-1.5 transition-colors font-medium ${isAffectedOpen ? "bg-amber-200 text-amber-900" : "bg-amber-100 text-amber-700 hover:bg-amber-200"}`}>
                          👥 Pembeli Terdampak
                        </button>
                      )}
                      <button onClick={() => edit(b)} className="text-xs px-3 py-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 mr-1.5 transition-colors">Edit</button>
                      <button onClick={() => remove(b.id)} className="text-xs px-3 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors">Hapus</button>
                    </td>
                  </tr>

                  {isAffectedOpen && (
                    <tr key={`${b.id}-affected`} className="border-t border-amber-200">
                      <td colSpan={7} className="px-5 py-4 bg-amber-50/80">
                        <div>
                          <p className="text-xs font-semibold text-amber-800 mb-3 flex items-center gap-2">
                            👥 Pembeli Terdampak - <span className="font-bold">{b.title}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs ${sc.badge}`}>{sc.icon} {sc.label}</span>
                          </p>
                          {loadingAffected ? (
                            <p className="text-xs text-gray-400">Memuat...</p>
                          ) : affectedOrders.length === 0 ? (
                            <p className="text-xs text-gray-400">Tidak ada pembeli aktif untuk buku ini.</p>
                          ) : (
                            <>
                              <p className="text-xs text-amber-700 mb-3">{affectedOrders.length} pembeli perlu dihubungi. Klik tombol WA untuk kirim pesan langsung.</p>
                              <div className="space-y-2">
                                {affectedOrders.map((o) => {
                                  const name = o.customers?.whatsapp_name ?? "-";
                                  const phone = o.customers?.whatsapp_number ?? "";
                                  const group = o.customers?.whatsapp_group;
                                  const waNumber = phone.replace(/\D/g, "");
                                  const waMsg = encodeURIComponent(
                                    `Halo ${name}, kami ingin menginfokan bahwa buku "${b.title}" yang kamu pesan (x${o.qty}) ` +
                                    (b.status === "delay"
                                      ? `mengalami delay pengiriman. Kami akan update segera begitu ada info terbaru dari importir. Mohon maaf atas ketidaknyamanannya ya 🙏`
                                      : b.status === "cancelled"
                                      ? `sayangnya tidak bisa terbit/masuk ke Indonesia. Kami akan proses pengembalian dana DP kamu segera. Mohon maaf ya 🙏`
                                      : `tiba dalam kondisi cacat/rusak dari ekspedisi. Kami sedang proses klaim dan akan segera follow up. Mohon maaf ya 🙏`)
                                  );
                                  return (
                                    <div key={o.id} className="flex items-center gap-3 bg-white border border-amber-100 rounded-xl px-4 py-2.5">
                                      <div className="flex-1">
                                        <span className="font-medium text-sm text-gray-800">{name}</span>
                                        {group && <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">{group}</span>}
                                        <div className="text-xs text-gray-400">{phone} · x{o.qty} · {o.status}</div>
                                      </div>
                                      {waNumber && (
                                        <a href={`https://wa.me/${waNumber}?text=${waMsg}`} target="_blank" rel="noreferrer"
                                          className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold text-white flex items-center gap-1.5"
                                          style={{ background: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)" }}>
                                          <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                                          Kirim WA
                                        </a>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
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
        value={value} required={required} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
