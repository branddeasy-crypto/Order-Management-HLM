"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase";
import { Customer, Order, Payment, Shipment, OrderStatus, formatIDR } from "@/lib/types";

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Menunggu Konfirmasi",
  confirmed: "Dikonfirmasi",
  hold: "Ditahan (Hold)",
  dp_paid: "DP Terbayar",
  paid_off: "Lunas",
  queued: "Antri Pengiriman",
  shipped: "Sudah Dikirim",
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

export default function StatusPage() {
  const supabase = supabaseBrowser();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [error, setError] = useState<string | null>(null);

  function normalize(num: string) {
    let n = num.replace(/[^0-9]/g, "");
    if (n.startsWith("0")) n = "62" + n.slice(1);
    if (!n.startsWith("62")) n = "62" + n;
    return n;
  }

  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim()) return;
    setLoading(true);
    setError(null);
    setSearched(true);
    setCustomer(null);
    setOrders([]);
    setPayments([]);
    setShipments([]);

    const target = normalize(phone);

    const { data: customers, error: cErr } = await supabase
      .from("customers")
      .select("*");

    if (cErr) {
      setError("Terjadi kesalahan saat mencari data.");
      setLoading(false);
      return;
    }

    const found = (customers as Customer[] ?? []).find(
      (c) => normalize(c.whatsapp_number || "") === target
    );

    if (!found) {
      setLoading(false);
      return;
    }
    setCustomer(found);

    const { data: o } = await supabase
      .from("orders")
      .select("*, books(*)")
      .eq("customer_id", found.id);
    const ordersData = (o as unknown as Order[]) ?? [];
    setOrders(ordersData);

    const orderIds = ordersData.map((x) => x.id);
    if (orderIds.length > 0) {
      const [p, s] = await Promise.all([
        supabase.from("payments").select("*").in("order_id", orderIds),
        supabase.from("shipments").select("*").in("order_id", orderIds),
      ]);
      setPayments((p.data as Payment[]) ?? []);
      setShipments((s.data as Shipment[]) ?? []);
    }

    setLoading(false);
  }

  const total = orders.reduce((sum, o) => sum + (o.books?.price_idr ?? 0) * o.qty, 0);
  const totalDp = payments.filter((p) => p.kind === "dp").reduce((s, p) => s + p.amount, 0);
  const totalPelunasan = payments.filter((p) => p.kind === "pelunasan").reduce((s, p) => s + p.amount, 0);
  const sisa = total - totalDp - totalPelunasan;

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-10"
      style={{ background: "linear-gradient(135deg, #f5f3ff 0%, #fdf4ff 50%, #fff7ed 100%)" }}>

      {/* Header */}
      <div className="text-center mb-8">
        <div className="text-5xl mb-2">📖</div>
        <h1 className="text-2xl font-bold text-purple-800">Happy Little Minds</h1>
        <p className="text-purple-500 text-sm">Cek status pesanan & pengiriman Anda</p>
      </div>

      {/* Search form */}
      <form onSubmit={search} className="bg-white border border-purple-100 rounded-2xl p-5 w-full max-w-md shadow-sm mb-6">
        <label className="text-sm flex flex-col gap-1">
          <span className="text-gray-600 font-medium text-xs">Masukkan No. WhatsApp Anda</span>
          <div className="flex gap-2">
            <input
              className="border border-gray-200 rounded-lg px-3 py-2.5 bg-white text-sm flex-1 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="08xxxxxxxxxx"
              required
            />
            <button type="submit"
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md disabled:opacity-50"
              disabled={loading}
              style={{ background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)" }}>
              {loading ? "⏳" : "🔍 Cek"}
            </button>
          </div>
        </label>
      </form>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-4 max-w-md w-full text-center">
          ⚠️ {error}
        </div>
      )}

      {searched && !loading && !customer && !error && (
        <div className="text-center text-gray-400 max-w-md">
          <div className="text-4xl mb-2">🔍</div>
          <p className="text-sm">Nomor tidak ditemukan. Pastikan nomor WhatsApp sesuai dengan yang terdaftar saat order, atau hubungi admin.</p>
        </div>
      )}

      {customer && (
        <div className="w-full max-w-2xl space-y-5">
          {/* Greeting */}
          <div className="bg-white border border-purple-100 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-1">
              <span className="text-2xl">👋</span>
              <div>
                <div className="font-bold text-gray-800">Hai, {customer.whatsapp_name}!</div>
                {customer.whatsapp_group && <div className="text-xs text-purple-500">Grup: {customer.whatsapp_group}</div>}
              </div>
            </div>
          </div>

          {/* Order list */}
          <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-3 border-b border-gray-100 bg-blue-50">
              <span className="text-sm font-semibold text-blue-700">📋 Pesanan Anda</span>
            </div>
            {orders.length === 0 ? (
              <div className="px-5 py-8 text-center text-gray-400 text-sm">Belum ada pesanan tercatat.</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {orders.map((o) => (
                  <div key={o.id} className="px-5 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium text-gray-800 text-sm truncate">{o.books?.title}</div>
                      <div className="text-xs text-gray-400">{o.books?.format} · Qty {o.qty} · {formatIDR((o.books?.price_idr ?? 0) * o.qty)}</div>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${STATUS_COLOR[o.status]}`}>
                      {STATUS_LABEL[o.status]}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Payment summary */}
          {orders.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-5 py-3 border-b border-gray-100 bg-amber-50">
                <span className="text-sm font-semibold text-amber-700">🧾 Ringkasan Tagihan</span>
              </div>
              <div className="px-5 py-3 space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Total Tagihan</span><span className="font-semibold text-gray-800">{formatIDR(total)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Sudah Dibayar (DP)</span><span className="text-gray-700">{formatIDR(totalDp)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Sudah Dibayar (Pelunasan)</span><span className="text-gray-700">{formatIDR(totalPelunasan)}</span></div>
                <div className="flex justify-between pt-1.5 border-t border-gray-100">
                  <span className="text-amber-700 font-semibold">Estimasi Sisa Tagihan</span>
                  <span className="text-amber-800 font-bold">{formatIDR(Math.max(sisa, 0))}</span>
                </div>
                <p className="text-xs text-gray-400 pt-1">* Belum termasuk ongkos kirim. Hubungi admin untuk info pelunasan & ongkir.</p>
              </div>
            </div>
          )}

          {/* Shipment / resi */}
          <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-3 border-b border-gray-100 bg-green-50">
              <span className="text-sm font-semibold text-green-700">🚚 Status Pengiriman</span>
            </div>
            {shipments.length === 0 ? (
              <div className="px-5 py-8 text-center text-gray-400 text-sm">Belum masuk antrian pengiriman.</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {shipments.map((s) => (
                  <div key={s.id} className="px-5 py-3 flex items-center justify-between gap-3 text-sm">
                    <div>
                      <div className="text-gray-700">Antrian ke-<strong>{s.queue_no}</strong> {s.expedition ? `· ${s.expedition}` : ""}</div>
                      {s.tracking_number && <div className="text-xs text-gray-400 mt-0.5">No. Resi: <span className="font-mono">{s.tracking_number}</span></div>}
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${s.tracking_number ? "bg-green-100 text-green-700" : "bg-purple-100 text-purple-700"}`}>
                      {s.tracking_number ? "✅ Terkirim" : "📦 Dalam Antrian"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="text-center text-xs text-gray-400 pt-2">
            Ada pertanyaan? Hubungi admin Happy Little Minds via WhatsApp grup Anda. 💜
          </div>
        </div>
      )}
    </div>
  );
}
