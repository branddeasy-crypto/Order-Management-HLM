"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase";
import { Customer, Book, Order, OrderStatus, formatIDR } from "@/lib/types";
import { exportToCSV, exportToExcel } from "@/lib/importExport";

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Dikonfirmasi",
  hold: "Hold",
  dp_paid: "DP Terbayar",
  paid_off: "Lunas",
  queued: "Antri Kirim",
  shipped: "Terkirim",
};

const STATUS_COLOR: Record<OrderStatus, string> = {
  pending: "bg-gray-100 text-gray-600",
  confirmed: "bg-blue-100 text-blue-700",
  hold: "bg-red-100 text-red-700",
  dp_paid: "bg-amber-100 text-amber-700",
  paid_off: "bg-emerald-100 text-emerald-700",
  queued: "bg-purple-100 text-purple-700",
  shipped: "bg-green-100 text-green-700",
};

const BOOK_STATUS_BADGE: Record<string, string> = {
  available: "bg-green-100 text-green-700",
  oos: "bg-red-100 text-red-700",
};

const BOOK_STATUS_LABEL: Record<string, string> = {
  available: "✅ Tersedia",
  oos: "❌ OOS",
};

export default function OrdersPage() {
  const supabase = supabaseBrowser();
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [bookId, setBookId] = useState("");
  const [qty, setQty] = useState("1");
  const [groupFilter, setGroupFilter] = useState("");
  const [publisherFilter, setPublisherFilter] = useState("");
  const [etaFilter, setEtaFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noteEdits, setNoteEdits] = useState<Record<string, string>>({});
  const [noteSaved, setNoteSaved] = useState<Record<string, boolean>>({});
  // Input pembayaran opsional saat tambah order (untuk migrasi data lama)
  const [payKind, setPayKind] = useState<"none" | "dp" | "pelunasan">("none");
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState("");

  async function load() {
    setLoading(true);
    const [o, c, b] = await Promise.all([
      supabase.from("orders").select("*, customers(*), books(*)").order("created_at", { ascending: false }),
      supabase.from("customers").select("*").order("whatsapp_name"),
      supabase.from("books").select("*").order("title"),
    ]);
    if (o.error) setError(o.error.message);
    else setOrders(o.data as unknown as Order[]);
    setCustomers((c.data as Customer[]) ?? []);
    setBooks((b.data as Book[]) ?? []);
    setLoading(false);
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  async function addOrder(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!customerId || !bookId) return setError("Pilih customer dan buku.");

    // Tentukan status awal berdasarkan pembayaran yang diinput
    const initialStatus: OrderStatus =
      payKind === "pelunasan" ? "paid_off" :
      payKind === "dp" ? "dp_paid" :
      "pending";

    const { data: newOrder, error } = await supabase
      .from("orders")
      .insert({ customer_id: customerId, book_id: bookId, qty: Number(qty), status: initialStatus })
      .select()
      .single();
    if (error) return setError(error.message);

    // Kalau ada pembayaran yang diisi, simpan sekaligus
    if (payKind !== "none" && payAmount && Number(payAmount) > 0 && newOrder) {
      await supabase.from("payments").insert({
        order_id: newOrder.id,
        kind: payKind,
        amount: Number(payAmount),
        paid_at: payDate || new Date().toISOString().slice(0, 10),
        bank_account: "-",
      });
    }

    setBookId("");
    setQty("1");
    setPayKind("none");
    setPayAmount("");
    setPayDate("");
    load();
  }

  async function setStatus(id: string, status: OrderStatus) {
    await supabase.from("orders").update({ status }).eq("id", id);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Hapus order ini?")) return;
    await supabase.from("orders").delete().eq("id", id);
    load();
  }

  async function saveNote(id: string) {
    const value = noteEdits[id];
    if (value === undefined) return;
    await supabase.from("orders").update({ note: value }).eq("id", id);
    setNoteSaved((s) => ({ ...s, [id]: true }));
    setTimeout(() => setNoteSaved((s) => { const n = { ...s }; delete n[id]; return n; }), 2000);
    load();
  }

  const groups = Array.from(new Set(customers.map((c) => c.whatsapp_group).filter(Boolean))) as string[];
  const publishers = Array.from(new Set(books.map((b) => b.publisher).filter(Boolean))) as string[];
  const etas = Array.from(new Set(
    books
      .filter((b) => !publisherFilter || b.publisher === publisherFilter)
      .map((b) => b.eta)
      .filter(Boolean)
  )) as string[];

  const filtered = orders.filter((o) =>
    (!groupFilter || o.customers?.whatsapp_group === groupFilter) &&
    (!publisherFilter || o.books?.publisher === publisherFilter) &&
    (!etaFilter || o.books?.eta === etaFilter)
  );

  const totalValue = filtered.reduce((sum, o) => sum + (o.books?.price_idr ?? 0) * o.qty, 0);

  const ORDER_HEADERS = ["Customer", "Grup", "Publisher", "ETA", "Judul Buku", "Format", "Status Buku", "Qty", "Harga Satuan", "Subtotal", "Status Order", "Note"];
  function ordersToRows(list: Order[]) {
    return list.map((o) => [
      o.customers?.whatsapp_name ?? "", o.customers?.whatsapp_group ?? "",
      o.books?.publisher ?? "", o.books?.eta ?? "", o.books?.title ?? "", o.books?.format ?? "",
      o.books?.status ?? "", o.qty, o.books?.price_idr ?? 0, (o.books?.price_idr ?? 0) * o.qty,
      STATUS_LABEL[o.status], o.note ?? "",
    ]);
  }

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-xl shadow-sm">📋</div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Compile Order</h1>
          <p className="text-sm text-gray-400">Pengganti rekap manual dari grup WhatsApp ke Excel.</p>
        </div>
      </div>
      <div className="h-1 w-16 rounded-full bg-gradient-to-r from-blue-400 to-indigo-500 mb-6" />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total Order", value: filtered.length, icon: "📋", color: "blue" },
          { label: "Nilai Total", value: formatIDR(totalValue), icon: "💰", color: "green" },
          { label: "Belum Lunas", value: filtered.filter(o => o.status !== "paid_off" && o.status !== "shipped").length, icon: "⏳", color: "amber" },
          { label: "Terkirim", value: filtered.filter(o => o.status === "shipped").length, icon: "✅", color: "emerald" },
        ].map(s => (
          <div key={s.label} className={`bg-${s.color}-50 border border-${s.color}-100 rounded-xl p-3`}>
            <div className="text-lg">{s.icon}</div>
            <div className={`font-bold text-${s.color}-700 text-sm mt-0.5 truncate`}>{s.value}</div>
            <div className={`text-${s.color}-500 text-xs`}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Form */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 mb-6">
        <h2 className="text-sm font-semibold text-blue-700 mb-3">➕ Tambah Order Baru</h2>
        <form onSubmit={addOrder} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          <label className="text-sm flex flex-col gap-1">
            <span className="text-gray-600 font-medium text-xs">Customer <span className="text-blue-500">*</span></span>
            <select className="border border-gray-200 rounded-lg px-3 py-2 bg-white text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              value={customerId} onChange={(e) => setCustomerId(e.target.value)} required>
              <option value="">-- pilih customer --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.whatsapp_name} {c.whatsapp_group ? `(${c.whatsapp_group})` : ""}</option>
              ))}
            </select>
          </label>
          <label className="text-sm flex flex-col gap-1 lg:col-span-2">
            <span className="text-gray-600 font-medium text-xs">Buku <span className="text-blue-500">*</span></span>
            <select className="border border-gray-200 rounded-lg px-3 py-2 bg-white text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              value={bookId} onChange={(e) => setBookId(e.target.value)} required>
              <option value="">-- pilih buku --</option>
              {books.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title} · {b.format} · {formatIDR(b.price_idr)} {b.status === "oos" ? "(OOS)" : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm flex flex-col gap-1">
            <span className="text-gray-600 font-medium text-xs">Qty</span>
            <input type="number" min={1}
              className="border border-gray-200 rounded-lg px-3 py-2 bg-white text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              value={qty} onChange={(e) => setQty(e.target.value)} />
          </label>
          {/* Pembayaran opsional (untuk data lama) */}
          <div className="sm:col-span-2 lg:col-span-4">
            <div className="border border-dashed border-blue-200 rounded-xl p-3 bg-blue-50/50">
              <p className="text-xs text-blue-500 font-medium mb-2">💳 Pembayaran (opsional — isi jika order ini sudah ada pembayaran sebelumnya)</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <select
                  className="border border-gray-200 rounded-lg px-3 py-2 bg-white text-sm focus:outline-none focus:border-blue-400"
                  value={payKind}
                  onChange={(e) => setPayKind(e.target.value as "none" | "dp" | "pelunasan")}
                >
                  <option value="none">-- Belum ada pembayaran --</option>
                  <option value="dp">Sudah bayar DP</option>
                  <option value="pelunasan">Sudah lunas</option>
                </select>
                {payKind !== "none" && (
                  <>
                    <input
                      type="number"
                      placeholder="Nominal yang dibayar (Rp)"
                      className="border border-gray-200 rounded-lg px-3 py-2 bg-white text-sm focus:outline-none focus:border-blue-400"
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                    />
                    <input
                      type="date"
                      className="border border-gray-200 rounded-lg px-3 py-2 bg-white text-sm focus:outline-none focus:border-blue-400"
                      value={payDate}
                      onChange={(e) => setPayDate(e.target.value)}
                    />
                  </>
                )}
              </div>
            </div>
          </div>

          <button type="submit"
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md col-span-1"
            style={{ background: "linear-gradient(135deg, #60a5fa 0%, #6366f1 100%)" }}>
            ➕ Tambah ke Rekap
          </button>
        </form>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-4 flex items-center gap-2">
          <span>⚠️</span> {error}
        </div>
      )}

      {/* Export + Filter */}
      <div className="flex flex-wrap gap-3 mb-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-500 font-medium">Filter:</span>
          <select className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:border-blue-400"
            value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)}>
            <option value="">Semua grup</option>
            {groups.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
          <select className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:border-blue-400"
            value={publisherFilter} onChange={(e) => { setPublisherFilter(e.target.value); setEtaFilter(""); }}>
            <option value="">Semua publisher</option>
            {publishers.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:border-blue-400"
            value={etaFilter} onChange={(e) => setEtaFilter(e.target.value)}>
            <option value="">Semua ETA</option>
            {etas.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <button onClick={() => exportToCSV("rekap-order.csv", ORDER_HEADERS, ordersToRows(filtered))}
            className="px-3 py-1.5 border border-blue-200 rounded-lg text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors">
            📄 Export CSV
          </button>
          <button onClick={() => exportToExcel("rekap-order.xlsx", "Order", ORDER_HEADERS, ordersToRows(filtered))}
            className="px-3 py-1.5 border border-blue-200 rounded-lg text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors">
            📊 Export Excel
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-100 rounded-2xl overflow-x-auto shadow-sm">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-600">Rekap Order</span>
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{filtered.length} order</span>
        </div>
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-gray-400 uppercase tracking-wide">
            <tr>
              <th className="px-5 py-3">Customer</th>
              <th className="px-5 py-3">Grup</th>
              <th className="px-5 py-3">Judul Buku</th>
              <th className="px-5 py-3">Status Buku</th>
              <th className="px-5 py-3">Qty</th>
              <th className="px-5 py-3">Subtotal</th>
              <th className="px-5 py-3">Status Order</th>
              <th className="px-5 py-3">Note</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-5 py-8 text-gray-300 text-center" colSpan={9}>⏳ Memuat data...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td className="px-5 py-8 text-gray-400 text-center" colSpan={9}>📋 Belum ada order. Tambah order di atas!</td></tr>
            ) : filtered.map((o) => (
              <tr key={o.id} className="border-t border-gray-50 hover:bg-blue-50/30 transition-colors">
                <td className="px-5 py-3 font-medium text-gray-800">{o.customers?.whatsapp_name}</td>
                <td className="px-5 py-3">
                  {o.customers?.whatsapp_group && (
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{o.customers.whatsapp_group}</span>
                  )}
                </td>
                <td className="px-5 py-3 text-gray-700">{o.books?.title}</td>
                <td className="px-5 py-3">
                  {o.books?.status && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${BOOK_STATUS_BADGE[o.books.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {BOOK_STATUS_LABEL[o.books.status] ?? o.books.status}
                    </span>
                  )}
                </td>
                <td className="px-5 py-3 text-gray-600">{o.qty}</td>
                <td className="px-5 py-3 whitespace-nowrap font-medium text-gray-800">
                  {o.books ? formatIDR(o.books.price_idr * o.qty) : "-"}
                </td>
                <td className="px-5 py-3">
                  <select
                    className={`text-xs px-2.5 py-1 rounded-full font-medium border-0 focus:outline-none cursor-pointer ${STATUS_COLOR[o.status]}`}
                    value={o.status}
                    onChange={(e) => setStatus(o.id, e.target.value as OrderStatus)}
                  >
                    {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-1">
                    <input
                      className="border border-gray-200 rounded-lg px-2 py-1 text-xs w-32 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-white"
                      value={noteEdits[o.id] ?? o.note ?? ""}
                      onChange={(e) => setNoteEdits((ne) => ({ ...ne, [o.id]: e.target.value }))}
                      placeholder="catatan..."
                    />
                    <button onClick={() => saveNote(o.id)}
                      className={`text-xs px-2 py-1 rounded-lg font-medium transition-colors ${noteSaved[o.id] ? "bg-green-100 text-green-700" : "bg-blue-50 text-blue-600 hover:bg-blue-100"}`}>
                      {noteSaved[o.id] ? "✅" : "💾"}
                    </button>
                  </div>
                </td>
                <td className="px-5 py-3 text-right">
                  <button onClick={() => remove(o.id)} className="text-xs px-3 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors">Hapus</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
