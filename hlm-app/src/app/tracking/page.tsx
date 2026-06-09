"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase";
import { Customer, Order, Shipment } from "@/lib/types";

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export default function TrackingPage() {
  const supabase = supabaseBrowser();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [month, setMonth] = useState(new Date().getMonth());
  const [editing, setEditing] = useState<Record<string, string>>({});

  async function load() {
    const [s, o] = await Promise.all([
      supabase.from("shipments").select("*"),
      supabase.from("orders").select("*, customers(*), books(*)"),
    ]);
    setShipments((s.data as Shipment[]) ?? []);
    setOrders((o.data as unknown as Order[]) ?? []);
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const rows = useMemo(() => {
    return shipments
      .map((s) => {
        const order = orders.find((o) => o.id === s.order_id);
        return { shipment: s, customer: order?.customers as Customer | undefined };
      })
      .filter((r) => {
        if (!r.shipment.shipped_at) return month === new Date().getMonth();
        return new Date(r.shipment.shipped_at).getMonth() === month;
      });
  }, [shipments, orders, month]);

  async function saveTracking(id: string) {
    const value = editing[id];
    if (value === undefined) return;
    await supabase.from("shipments").update({
      tracking_number: value,
      shipped_at: new Date().toISOString().slice(0, 10),
    }).eq("id", id);
    setEditing((e) => { const n = { ...e }; delete n[id]; return n; });
    load();
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">Tracking Number</h1>
      <p className="text-gray-500 mb-6">Input & rekap nomor resi pengiriman per bulan — bisa diinfokan ke masing-masing customer.</p>

      <label className="text-sm flex flex-col gap-1 w-48 mb-4">
        <span className="text-gray-600">Bulan</span>
        <select className="border border-gray-300 rounded-md px-3 py-2" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
          {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
        </select>
      </label>

      <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-2">Customer</th>
              <th className="px-4 py-2">Ekspedisi</th>
              <th className="px-4 py-2">No. Resi</th>
              <th className="px-4 py-2">Tanggal Kirim</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td className="px-4 py-4 text-gray-400" colSpan={5}>Tidak ada data resi bulan ini.</td></tr>
            ) : rows.map(({ shipment, customer }) => (
              <tr key={shipment.id} className="border-t border-gray-100">
                <td className="px-4 py-2">{customer?.whatsapp_name ?? "-"}</td>
                <td className="px-4 py-2">{shipment.expedition ?? "-"}</td>
                <td className="px-4 py-2">
                  <input
                    className="border border-gray-300 rounded px-2 py-1 text-sm w-40"
                    value={editing[shipment.id] ?? shipment.tracking_number ?? ""}
                    onChange={(e) => setEditing((ed) => ({ ...ed, [shipment.id]: e.target.value }))}
                    placeholder="Masukkan no resi"
                  />
                </td>
                <td className="px-4 py-2">{shipment.shipped_at ?? "-"}</td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => saveTracking(shipment.id)} className="text-blue-600 hover:underline">Simpan</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
