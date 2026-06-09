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
  const [saved, setSaved] = useState<Record<string, boolean>>({});

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
        if (!r.shipment.shipped_at) return true; // show unshipped in all months
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
    setSaved((s) => ({ ...s, [id]: true }));
    setTimeout(() => setSaved((s) => { const n = { ...s }; delete n[id]; return n; }), 2000);
    load();
  }

  const hasResi = rows.filter(r => r.shipment.tracking_number);
  const noResi = rows.filter(r => !r.shipment.tracking_number);

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-xl shadow-sm">🚚</div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Resi / Tracking Number</h1>
          <p className="text-sm text-gray-400">Input & rekap nomor resi pengiriman per bulan.</p>
        </div>
      </div>
      <div className="h-1 w-16 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 mb-6" />

      {/* Month filter */}
      <div className="flex items-center gap-3 mb-6">
        <label className="text-sm flex items-center gap-2">
          <span className="text-gray-600 font-medium text-xs">Filter Bulan:</span>
          <select className="border border-gray-200 rounded-lg px-3 py-2 bg-white text-sm focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100"
            value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
          </select>
        </label>
        <div className="flex gap-2 text-xs">
          <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">{hasResi.length} sudah ada resi</span>
          <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">{noResi.length} belum ada resi</span>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl overflow-x-auto shadow-sm">
        <div className="px-5 py-3 border-b border-gray-100">
          <span className="text-sm font-semibold text-gray-600">Daftar Resi — {MONTHS[month]}</span>
        </div>
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-gray-400 uppercase tracking-wide">
            <tr>
              <th className="px-5 py-3">Customer</th>
              <th className="px-5 py-3">Ekspedisi</th>
              <th className="px-5 py-3">No. Resi</th>
              <th className="px-5 py-3">Tanggal Kirim</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td className="px-5 py-8 text-gray-400 text-center" colSpan={5}>🚚 Tidak ada data resi bulan {MONTHS[month]}.</td></tr>
            ) : rows.map(({ shipment, customer }) => (
              <tr key={shipment.id} className={`border-t border-gray-50 transition-colors ${shipment.tracking_number ? "hover:bg-green-50/30" : "hover:bg-amber-50/30"}`}>
                <td className="px-5 py-3 font-medium text-gray-800">{customer?.whatsapp_name ?? "-"}</td>
                <td className="px-5 py-3">
                  {shipment.expedition ? (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{shipment.expedition}</span>
                  ) : <span className="text-gray-400">-</span>}
                </td>
                <td className="px-5 py-3">
                  <input
                    className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-48 focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 bg-white"
                    value={editing[shipment.id] ?? shipment.tracking_number ?? ""}
                    onChange={(e) => setEditing((ed) => ({ ...ed, [shipment.id]: e.target.value }))}
                    placeholder="Masukkan no resi"
                  />
                </td>
                <td className="px-5 py-3 text-gray-500 text-xs">
                  {shipment.shipped_at ? (
                    <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">{shipment.shipped_at}</span>
                  ) : (
                    <span className="bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full">Belum terkirim</span>
                  )}
                </td>
                <td className="px-5 py-3 text-right">
                  <button onClick={() => saveTracking(shipment.id)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${saved[shipment.id] ? "bg-green-100 text-green-700" : "bg-green-50 text-green-700 hover:bg-green-100"}`}>
                    {saved[shipment.id] ? "✅ Tersimpan!" : "💾 Simpan"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
