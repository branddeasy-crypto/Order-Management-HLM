"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase";
import { Customer, Book, Order, OrderStatus, formatIDR } from "@/lib/types";

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Dikonfirmasi",
  dp_paid: "DP Terbayar",
  paid_off: "Lunas",
  queued: "Antri Kirim",
  shipped: "Terkirim",
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    const { error } = await supabase.from("orders").insert({
      customer_id: customerId,
      book_id: bookId,
      qty: Number(qty),
      status: "pending",
    });
    if (error) return setError(error.message);
    setBookId("");
    setQty("1");
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

  const groups = Array.from(new Set(customers.map((c) => c.whatsapp_group).filter(Boolean))) as string[];
  const filtered = groupFilter ? orders.filter((o) => o.customers?.whatsapp_group === groupFilter) : orders;

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">Compile Order</h1>
      <p className="text-gray-500 mb-6">
        Pengganti rekap manual dari grup WhatsApp ke Excel — catat pesanan customer di sini setelah dikonfirmasi.
      </p>

      <form onSubmit={addOrder} className="bg-white border border-gray-200 rounded-lg p-4 mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
        <label className="text-sm flex flex-col gap-1">
          <span className="text-gray-600">Customer *</span>
          <select className="border border-gray-300 rounded-md px-3 py-2" value={customerId} onChange={(e) => setCustomerId(e.target.value)} required>
            <option value="">-- pilih customer --</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.whatsapp_name} {c.whatsapp_group ? `(${c.whatsapp_group})` : ""}</option>
            ))}
          </select>
        </label>
        <label className="text-sm flex flex-col gap-1 lg:col-span-2">
          <span className="text-gray-600">Buku *</span>
          <select className="border border-gray-300 rounded-md px-3 py-2" value={bookId} onChange={(e) => setBookId(e.target.value)} required>
            <option value="">-- pilih buku --</option>
            {books.map((b) => (
              <option key={b.id} value={b.id}>
                {b.title} · {b.format} · {formatIDR(b.price_idr)} {b.status === "oos" ? "(OOS)" : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm flex flex-col gap-1">
          <span className="text-gray-600">Qty</span>
          <input type="number" min={1} className="border border-gray-300 rounded-md px-3 py-2" value={qty} onChange={(e) => setQty(e.target.value)} />
        </label>
        <button type="submit" className="px-4 py-2 bg-gray-900 text-white rounded-md text-sm h-fit">Tambah ke Rekap</button>
      </form>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      <div className="flex items-center gap-3 mb-3">
        <span className="text-sm text-gray-600">Filter grup:</span>
        <select className="border border-gray-300 rounded-md px-3 py-1.5 text-sm" value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)}>
          <option value="">Semua grup</option>
          {groups.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-2">Customer</th>
              <th className="px-4 py-2">Grup</th>
              <th className="px-4 py-2">Judul Buku</th>
              <th className="px-4 py-2">Qty</th>
              <th className="px-4 py-2">Subtotal</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-4 py-4 text-gray-400" colSpan={7}>Memuat...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td className="px-4 py-4 text-gray-400" colSpan={7}>Belum ada order terkompilasi.</td></tr>
            ) : filtered.map((o) => (
              <tr key={o.id} className="border-t border-gray-100">
                <td className="px-4 py-2">{o.customers?.whatsapp_name}</td>
                <td className="px-4 py-2">{o.customers?.whatsapp_group}</td>
                <td className="px-4 py-2">
                  {o.books?.title}
                  {o.books?.status === "oos" && <span className="ml-2 text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">OOS</span>}
                </td>
                <td className="px-4 py-2">{o.qty}</td>
                <td className="px-4 py-2 whitespace-nowrap">{o.books ? formatIDR(o.books.price_idr * o.qty) : "-"}</td>
                <td className="px-4 py-2">
                  <select
                    className="border border-gray-300 rounded text-xs px-2 py-1"
                    value={o.status}
                    onChange={(e) => setStatus(o.id, e.target.value as OrderStatus)}
                  >
                    {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => remove(o.id)} className="text-red-600 hover:underline">Hapus</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
