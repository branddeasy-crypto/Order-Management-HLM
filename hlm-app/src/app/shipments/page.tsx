"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase";
import { Customer, Order, Shipment } from "@/lib/types";

export default function ShipmentsPage() {
  const supabase = supabaseBrowser();
  const [orders, setOrders] = useState<Order[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [expedition, setExpedition] = useState("");
  const [loading, setLoading] = useState(true);
  const [copiedQn, setCopiedQn] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    const [o, s] = await Promise.all([
      supabase.from("orders").select("*, customers(*), books(*)").in("status", ["paid_off", "queued", "shipped"]),
      supabase.from("shipments").select("*").order("queue_no"),
    ]);
    setOrders((o.data as unknown as Order[]) ?? []);
    setShipments((s.data as Shipment[]) ?? []);
    setLoading(false);
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const byCustomer = useMemo(() => {
    const map = new Map<string, { customer: Customer; orders: Order[] }>();
    for (const o of orders) {
      if (!o.customers) continue;
      if (!map.has(o.customer_id)) map.set(o.customer_id, { customer: o.customers, orders: [] });
      map.get(o.customer_id)!.orders.push(o);
    }
    return Array.from(map.values());
  }, [orders]);

  const queuedOrderIds = new Set(shipments.map((s) => s.order_id));
  const readyCustomers = byCustomer.filter((g) => !g.orders.every((o) => queuedOrderIds.has(o.id)));
  const selected = byCustomer.find((g) => g.customer.id === customerId);

  async function addToQueue() {
    if (!selected) return;
    const nextQueueNo = (shipments.reduce((max, s) => Math.max(max, s.queue_no ?? 0), 0)) + 1;
    for (const o of selected.orders) {
      if (queuedOrderIds.has(o.id)) continue;
      await supabase.from("shipments").insert({ order_id: o.id, expedition, queue_no: nextQueueNo });
      await supabase.from("orders").update({ status: "queued" }).eq("id", o.id);
    }
    setCustomerId("");
    setExpedition("");
    load();
  }

  const queueGroups = useMemo(() => {
    const map = new Map<number, { customer?: Customer; expedition?: string | null; items: Order[] }>();
    for (const s of shipments) {
      const order = orders.find((o) => o.id === s.order_id);
      if (!order) continue;
      const qn = s.queue_no ?? 0;
      if (!map.has(qn)) map.set(qn, { customer: order.customers, expedition: s.expedition, items: [] });
      map.get(qn)!.items.push(order);
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [shipments, orders]);

  function copySlip(qn: number, group: { customer?: Customer; expedition?: string | null; items: Order[] }) {
    const text = [
      `Antrian ke-${qn}`,
      `Nama Penerima : ${group.customer?.receiver_name || group.customer?.whatsapp_name}`,
      `Alamat        : ${group.customer?.address ?? "-"}`,
      `No telp       : ${group.customer?.receiver_phone || group.customer?.whatsapp_number}`,
      `Ekspedisi     : ${group.expedition ?? "-"}`,
      ``,
      ...group.items.map((o, i) => `${i + 1}. ${o.books?.title} || ${o.books?.format} || ${o.books?.publisher} || QTY ${o.qty}`),
    ].join("\n");
    navigator.clipboard.writeText(text);
    setCopiedQn(qn);
    setTimeout(() => setCopiedQn(null), 2000);
  }

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-xl shadow-sm">📦</div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Antrian Pengiriman</h1>
          <p className="text-sm text-gray-400">First-pay-first-queue dari order berstatus Lunas. Generate format kemas untuk tim packing.</p>
        </div>
      </div>
      <div className="h-1 w-16 rounded-full bg-gradient-to-r from-teal-400 to-cyan-500 mb-6" />

      {/* Add to queue form */}
      <div className="bg-teal-50 border border-teal-100 rounded-2xl p-5 mb-6">
        <h2 className="text-sm font-semibold text-teal-700 mb-3">➕ Masukkan ke Antrian</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-end">
          <label className="text-sm flex flex-col gap-1">
            <span className="text-gray-600 font-medium text-xs">Customer (sudah lunas, belum antri)</span>
            <select className="border border-gray-200 rounded-lg px-3 py-2 bg-white text-sm focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
              value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">-- pilih customer --</option>
              {readyCustomers.map((g) => (
                <option key={g.customer.id} value={g.customer.id}>
                  {g.customer.whatsapp_name} ({g.orders.length} item)
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm flex flex-col gap-1">
            <span className="text-gray-600 font-medium text-xs">Ekspedisi</span>
            <input className="border border-gray-200 rounded-lg px-3 py-2 bg-white text-sm focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
              value={expedition} onChange={(e) => setExpedition(e.target.value)} placeholder="JNE / J&T / SiCepat ..." />
          </label>
          <button onClick={addToQueue} disabled={!selected}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: "linear-gradient(135deg, #2dd4bf 0%, #06b6d4 100%)" }}>
            📦 Masukkan ke Antrian
          </button>
        </div>
        {readyCustomers.length === 0 && !loading && (
          <p className="text-xs text-teal-600 mt-2">ℹ️ Belum ada customer dengan status Lunas yang siap dikirim. Update status order ke &quot;Lunas&quot; di Compile Order.</p>
        )}
      </div>

      {/* Queue stats */}
      {queueGroups.length > 0 && (
        <div className="flex items-center gap-3 mb-4">
          <span className="text-sm font-semibold text-gray-600">Antrian Pengiriman</span>
          <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">{queueGroups.length} paket</span>
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-gray-300">⏳ Memuat data...</div>
      ) : queueGroups.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-3">📦</div>
          <p className="text-sm">Belum ada antrian pengiriman.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {queueGroups.map(([qn, group]) => (
            <div key={qn} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="bg-teal-100 text-teal-700 text-xs font-bold px-2.5 py-0.5 rounded-full">Antrian ke-{qn}</span>
                    {group.expedition && (
                      <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">{group.expedition}</span>
                    )}
                  </div>
                  <div className="font-bold text-gray-800 mt-1">{group.customer?.whatsapp_name}</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    📍 {group.customer?.address || "Alamat belum diisi"} · 📞 {group.customer?.receiver_phone || group.customer?.whatsapp_number}
                  </div>
                </div>
                <button onClick={() => copySlip(qn, group)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${copiedQn === qn ? "bg-green-100 text-green-700" : "bg-teal-50 text-teal-700 hover:bg-teal-100"}`}>
                  {copiedQn === qn ? "✅ Tersalin!" : "📋 Salin Slip Kemas"}
                </button>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 mt-2">
                <ul className="text-sm text-gray-700 space-y-1">
                  {group.items.map((o, i) => (
                    <li key={o.id} className="flex items-start gap-2">
                      <span className="text-teal-500 font-bold text-xs mt-0.5 w-4 shrink-0">{i + 1}.</span>
                      <span><strong>{o.books?.title}</strong> · {o.books?.format} · {o.books?.publisher} · QTY {o.qty}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
