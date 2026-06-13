"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase";
import { Customer, Order, Shipment, formatIDR } from "@/lib/types";

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
  const [editingWeight, setEditingWeight] = useState<Record<string, string>>({});
  const [editingCost, setEditingCost] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [csvBusy, setCsvBusy] = useState(false);
  const [csvResult, setCsvResult] = useState<string | null>(null);

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

  async function saveTracking(id: string, shipment: Shipment) {
    const trackingValue = editing[id];
    const weightValue = editingWeight[id];
    const costValue = editingCost[id];

    const update: Record<string, unknown> = {};
    if (trackingValue !== undefined) {
      update.tracking_number = trackingValue;
      update.shipped_at = new Date().toISOString().slice(0, 10);
    }
    if (weightValue !== undefined) {
      update.weight_actual = weightValue === "" ? null : Number(weightValue);
    }
    if (costValue !== undefined) {
      update.shipping_cost_actual = costValue === "" ? null : Number(costValue);
    }
    if (Object.keys(update).length === 0) return;

    await supabase.from("shipments").update(update).eq("id", shipment.id);
    setEditing((e) => { const n = { ...e }; delete n[id]; return n; });
    setEditingWeight((e) => { const n = { ...e }; delete n[id]; return n; });
    setEditingCost((e) => { const n = { ...e }; delete n[id]; return n; });
    setSaved((s) => ({ ...s, [id]: true }));
    setTimeout(() => setSaved((s) => { const n = { ...s }; delete n[id]; return n; }), 2000);
    load();
  }

  function copyWA(shipment: Shipment, customer?: Customer) {
    const text = [
      `Halo ${customer?.whatsapp_name ?? ""}, paket pesananmu sudah dikirim ya! 📦`,
      `Ekspedisi : ${shipment.expedition ?? "-"}`,
      `No. Resi  : ${shipment.tracking_number ?? "-"}`,
      `Tanggal Kirim : ${shipment.shipped_at ?? "-"}`,
      `Terima kasih sudah berbelanja di Happy Little Minds 💜`,
    ].join("\n");
    navigator.clipboard.writeText(text);
    setCopiedId(shipment.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  // Upload CSV dari ekspedisi: cocokkan kolom nama (mengandung nama customer) dan no resi,
  // lalu isi otomatis tracking_number + shipped_at untuk shipment yang belum ada resinya.
  async function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvBusy(true);
    setCsvResult(null);
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length < 2) { setCsvResult("File CSV kosong atau format tidak dikenali."); return; }

      const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const nameIdx = header.findIndex((h) => h.includes("nama") || h.includes("name") || h.includes("penerima"));
      const resiIdx = header.findIndex((h) => h.includes("resi") || h.includes("awb") || h.includes("tracking"));

      if (nameIdx === -1 || resiIdx === -1) {
        setCsvResult("Kolom 'Nama'/'Penerima' dan 'Resi'/'AWB' tidak ditemukan di header CSV.");
        return;
      }

      let matched = 0;
      let unmatched = 0;
      const today = new Date().toISOString().slice(0, 10);

      for (const line of lines.slice(1)) {
        const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
        const name = cols[nameIdx];
        const resi = cols[resiIdx];
        if (!name || !resi) continue;

        const row = rows.find((r) =>
          !r.shipment.tracking_number &&
          (r.customer?.receiver_name?.toLowerCase().includes(name.toLowerCase()) ||
           r.customer?.whatsapp_name?.toLowerCase().includes(name.toLowerCase()) ||
           name.toLowerCase().includes((r.customer?.whatsapp_name ?? "").toLowerCase()))
        );

        if (row) {
          await supabase.from("shipments").update({
            tracking_number: resi,
            shipped_at: today,
          }).eq("id", row.shipment.id);
          matched++;
        } else {
          unmatched++;
        }
      }

      setCsvResult(`✅ ${matched} resi terisi otomatis. ${unmatched > 0 ? `⚠️ ${unmatched} baris tidak cocok dengan customer manapun.` : ""}`);
      load();
    } catch {
      setCsvResult("Gagal membaca file CSV.");
    } finally {
      setCsvBusy(false);
      e.target.value = "";
    }
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
      <div className="flex items-center gap-3 mb-3 flex-wrap">
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
        <label className="ml-auto text-xs px-3 py-1.5 rounded-lg font-medium bg-green-50 text-green-700 hover:bg-green-100 transition-colors cursor-pointer">
          {csvBusy ? "⏳ Memproses..." : "📤 Upload CSV Resi dari Ekspedisi"}
          <input type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} disabled={csvBusy} />
        </label>
      </div>
      {csvResult && (
        <div className="text-xs bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 mb-3 text-gray-600">
          {csvResult}
        </div>
      )}
      <p className="text-xs text-gray-400 mb-4">
        💡 Format CSV: harus ada kolom nama (mis. &quot;Nama Penerima&quot;) dan kolom No. Resi/AWB. Export file ekspedisi sebagai CSV lalu upload di sini.
      </p>

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
              <th className="px-5 py-3">Berat Aktual</th>
              <th className="px-5 py-3">Ongkir Aktual</th>
              <th className="px-5 py-3">Tanggal Kirim</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td className="px-5 py-8 text-gray-400 text-center" colSpan={7}>🚚 Tidak ada data resi bulan {MONTHS[month]}.</td></tr>
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
                    className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-40 focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 bg-white"
                    value={editing[shipment.id] ?? shipment.tracking_number ?? ""}
                    onChange={(e) => setEditing((ed) => ({ ...ed, [shipment.id]: e.target.value }))}
                    placeholder="Masukkan no resi"
                  />
                </td>
                <td className="px-5 py-3">
                  <input type="number" step="0.01"
                    className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-24 focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 bg-white"
                    value={editingWeight[shipment.id] ?? (shipment.weight_actual ?? "")}
                    onChange={(e) => setEditingWeight((ed) => ({ ...ed, [shipment.id]: e.target.value }))}
                    placeholder="kg"
                  />
                </td>
                <td className="px-5 py-3">
                  <input type="number"
                    className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-28 focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 bg-white"
                    value={editingCost[shipment.id] ?? (shipment.shipping_cost_actual ?? "")}
                    onChange={(e) => setEditingCost((ed) => ({ ...ed, [shipment.id]: e.target.value }))}
                    placeholder="Rp"
                  />
                  {shipment.shipping_cost_actual != null && editingCost[shipment.id] === undefined && (
                    <div className="text-xs text-gray-400 mt-0.5">{formatIDR(shipment.shipping_cost_actual)}</div>
                  )}
                </td>
                <td className="px-5 py-3 text-gray-500 text-xs">
                  {shipment.shipped_at ? (
                    <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">{shipment.shipped_at}</span>
                  ) : (
                    <span className="bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full">Belum terkirim</span>
                  )}
                </td>
                <td className="px-5 py-3 text-right whitespace-nowrap">
                  <button onClick={() => copyWA(shipment, customer)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors mr-1 ${copiedId === shipment.id ? "bg-blue-100 text-blue-700" : "bg-blue-50 text-blue-700 hover:bg-blue-100"}`}>
                    {copiedId === shipment.id ? "✅ Tersalin!" : "📋 Salin WA"}
                  </button>
                  <button onClick={() => saveTracking(shipment.id, shipment)}
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
