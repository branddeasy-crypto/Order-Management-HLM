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

  // group ready-to-ship orders by customer
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
      await supabase.from("shipments").insert({
        order_id: o.id,
        expedition,
        queue_no: nextQueueNo,
      });
      await supabase.from("orders").update({ status: "queued" }).eq("id", o.id);
    }
    setCustomerId("");
    setExpedition("");
    load();
  }

  // packing slip text grouped by queue
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
    alert("Format kemas disalin — siap ditempel untuk tim packing.");
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">Antrian Pengiriman</h1>
      <p className="text-gray-500 mb-6">
        Antrian dibentuk first-pay-first-queue dari order berstatus &quot;Lunas&quot;. Generate format siap-tempel untuk tim packing.
      </p>

      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-end">
        <label className="text-sm flex flex-col gap-1">
          <span className="text-gray-600">Customer (sudah lunas, belum antri)</span>
          <select className="border border-gray-300 rounded-md px-3 py-2" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">-- pilih customer --</option>
            {readyCustomers.map((g) => (
              <option key={g.customer.id} value={g.customer.id}>{g.customer.whatsapp_name} ({g.orders.length} item)</option>
            ))}
          </select>
        </label>
        <label className="text-sm flex flex-col gap-1">
          <span className="text-gray-600">Ekspedisi</span>
          <input className="border border-gray-300 rounded-md px-3 py-2" value={expedition} onChange={(e) => setExpedition(e.target.value)} placeholder="JNE / J&T / SiCepat ..." />
        </label>
        <button onClick={addToQueue} disabled={!selected} className="px-4 py-2 bg-gray-900 text-white rounded-md text-sm disabled:opacity-40">
          Masukkan ke Antrian
        </button>
      </div>

      <h2 className="font-medium mb-3">Daftar Antrian</h2>
      {loading ? (
        <p className="text-gray-400 text-sm">Memuat...</p>
      ) : queueGroups.length === 0 ? (
        <p className="text-gray-400 text-sm">Belum ada antrian.</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {queueGroups.map(([qn, group]) => (
            <div key={qn} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="font-medium">Antrian ke-{qn} — {group.customer?.whatsapp_name}</div>
                  <div className="text-xs text-gray-500">{group.expedition || "Ekspedisi belum diisi"}</div>
                </div>
                <button onClick={() => copySlip(qn, group)} className="text-sm text-blue-600 hover:underline">Salin Format Kemas</button>
              </div>
              <ul className="text-sm text-gray-700 list-disc list-inside">
                {group.items.map((o) => (
                  <li key={o.id}>{o.books?.title} || {o.books?.format} || {o.books?.publisher} || QTY {o.qty}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
