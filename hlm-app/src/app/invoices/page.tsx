"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase";
import { Customer, Order, Payment, formatIDR } from "@/lib/types";

export default function InvoicesPage() {
  const supabase = supabaseBrowser();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [bankAccount, setBankAccount] = useState("BCA 123-456-7890 a.n. Vita");
  const [shippingCost, setShippingCost] = useState("");
  const [kind, setKind] = useState<"dp" | "pelunasan">("dp");
  const [dpAmount, setDpAmount] = useState("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  async function load() {
    setLoading(true);
    const [c, o, p] = await Promise.all([
      supabase.from("customers").select("*").order("whatsapp_name"),
      supabase.from("orders").select("*, customers(*), books(*)"),
      supabase.from("payments").select("*"),
    ]);
    setCustomers((c.data as Customer[]) ?? []);
    setOrders((o.data as unknown as Order[]) ?? []);
    setPayments((p.data as Payment[]) ?? []);
    setLoading(false);
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const customer = customers.find((c) => c.id === customerId);
  const customerOrders = useMemo(() => orders.filter((o) => o.customer_id === customerId), [orders, customerId]);
  const customerOrderIds = customerOrders.map((o) => o.id);
  const customerPayments = payments.filter((p) => customerOrderIds.includes(p.order_id));

  const total = customerOrders.reduce((sum, o) => sum + (o.books?.price_idr ?? 0) * o.qty, 0);
  const totalDp = customerPayments.filter((p) => p.kind === "dp").reduce((s, p) => s + p.amount, 0);
  const totalPelunasan = customerPayments.filter((p) => p.kind === "pelunasan").reduce((s, p) => s + p.amount, 0);
  const sisaSetelahDp = total - totalDp;
  const sisaAkhir = total + Number(shippingCost || 0) - totalDp - totalPelunasan;

  const invoiceText = useMemo(() => {
    if (!customer) return "";
    const lines = customerOrders.map(
      (o, i) => `${i + 1}. ${o.books?.title} (${o.books?.format}) x${o.qty} — ${formatIDR((o.books?.price_idr ?? 0) * o.qty)}${o.books?.status === "oos" ? " [OOS - akan dikonfirmasi ulang]" : ""}`
    );
    if (kind === "dp") {
      return [
        `*INVOICE DP — ${customer.whatsapp_name}*`,
        `Grup: ${customer.whatsapp_group ?? "-"}`,
        ``,
        ...lines,
        ``,
        `Total Tagihan: ${formatIDR(total)}`,
        `DP yang harus dibayar: ${formatIDR(Number(dpAmount || 0))}`,
        `Sisa setelah DP: ${formatIDR(total - Number(dpAmount || 0))}`,
        ``,
        `Pembayaran ke: ${bankAccount}`,
        `Mohon kirim bukti transfer setelah melakukan pembayaran. Terima kasih 🙏`,
      ].join("\n");
    }
    return [
      `*INVOICE PELUNASAN — ${customer.whatsapp_name}*`,
      `Grup: ${customer.whatsapp_group ?? "-"}`,
      ``,
      ...lines,
      ``,
      `Total Tagihan Buku: ${formatIDR(total)}`,
      `Sudah DP: ${formatIDR(totalDp)}`,
      `Ongkos Kirim: ${formatIDR(Number(shippingCost || 0))}`,
      `*Sisa yang harus dilunasi: ${formatIDR(sisaAkhir)}*`,
      ``,
      `Pembayaran ke: ${bankAccount}`,
      `Mohon kirim bukti transfer setelah melakukan pelunasan. Terima kasih 🙏`,
    ].join("\n");
  }, [customer, customerOrders, kind, dpAmount, total, totalDp, shippingCost, sisaAkhir, bankAccount]);

  async function recordPayment() {
    if (!customer || customerOrders.length === 0) return;
    const amount = kind === "dp" ? Number(dpAmount || 0) : sisaAkhir;
    if (amount <= 0) return;
    await supabase.from("payments").insert({
      order_id: customerOrders[0].id,
      kind,
      amount,
      paid_at: new Date().toISOString().slice(0, 10),
      bank_account: bankAccount,
    });
    load();
    alert("Pembayaran berhasil dicatat! ✅");
  }

  function copyInvoice() {
    navigator.clipboard.writeText(invoiceText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-xl shadow-sm">🧾</div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Invoice DP & Pelunasan</h1>
          <p className="text-sm text-gray-400">Generate teks invoice siap-tempel ke WhatsApp per customer.</p>
        </div>
      </div>
      <div className="h-1 w-16 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 mb-6" />

      {/* Settings form */}
      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 mb-6">
        <h2 className="text-sm font-semibold text-amber-700 mb-3">⚙️ Pengaturan Invoice</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <label className="text-sm flex flex-col gap-1 lg:col-span-2">
            <span className="text-gray-600 font-medium text-xs">Customer</span>
            <select className="border border-gray-200 rounded-lg px-3 py-2 bg-white text-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
              value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">-- pilih customer --</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.whatsapp_name} {c.whatsapp_group ? `(${c.whatsapp_group})` : ""}</option>)}
            </select>
          </label>
          <label className="text-sm flex flex-col gap-1">
            <span className="text-gray-600 font-medium text-xs">Jenis Invoice</span>
            <select className="border border-gray-200 rounded-lg px-3 py-2 bg-white text-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
              value={kind} onChange={(e) => setKind(e.target.value as "dp" | "pelunasan")}>
              <option value="dp">Invoice DP</option>
              <option value="pelunasan">Invoice Pelunasan</option>
            </select>
          </label>
          <label className="text-sm flex flex-col gap-1">
            <span className="text-gray-600 font-medium text-xs">No. Rekening</span>
            <input className="border border-gray-200 rounded-lg px-3 py-2 bg-white text-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
              value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} />
          </label>
          {kind === "dp" ? (
            <label className="text-sm flex flex-col gap-1">
              <span className="text-gray-600 font-medium text-xs">Nominal DP</span>
              <input type="number"
                className="border border-gray-200 rounded-lg px-3 py-2 bg-white text-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                value={dpAmount} onChange={(e) => setDpAmount(e.target.value)}
                placeholder={total > 0 ? `Saran: ${Math.round(total * 0.5)}` : "0"} />
            </label>
          ) : (
            <label className="text-sm flex flex-col gap-1">
              <span className="text-gray-600 font-medium text-xs">Ongkos Kirim</span>
              <input type="number"
                className="border border-gray-200 rounded-lg px-3 py-2 bg-white text-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                value={shippingCost} onChange={(e) => setShippingCost(e.target.value)} placeholder="0" />
            </label>
          )}
        </div>
      </div>

      {!customer && !loading && (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-3">🧾</div>
          <p className="text-sm">Pilih customer di atas untuk membuat invoice.</p>
        </div>
      )}

      {customer && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Summary */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <h2 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
              <span className="text-lg">📊</span> Ringkasan Tagihan
            </h2>
            <div className="space-y-2 text-sm">
              {[
                { label: "Total Tagihan Buku", value: formatIDR(total), bold: true, color: "text-gray-800" },
                { label: "Total DP Tercatat", value: formatIDR(totalDp), color: "text-gray-600" },
                { label: "Total Pelunasan Tercatat", value: formatIDR(totalPelunasan), color: "text-gray-600" },
                { label: "Sisa setelah DP", value: formatIDR(sisaSetelahDp), color: "text-amber-700" },
              ].map(row => (
                <div key={row.label} className="flex justify-between py-1.5 border-b border-gray-50">
                  <span className="text-gray-500">{row.label}</span>
                  <span className={`font-semibold ${row.color}`}>{row.value}</span>
                </div>
              ))}
              {kind === "pelunasan" && (
                <div className="flex justify-between py-2 bg-amber-50 rounded-lg px-3 mt-2">
                  <span className="text-amber-700 font-semibold">Sisa Akhir (+ ongkir)</span>
                  <span className="text-amber-800 font-bold text-base">{formatIDR(sisaAkhir)}</span>
                </div>
              )}
            </div>
            <div className="mt-5 flex gap-2 flex-wrap">
              <button onClick={copyInvoice}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md"
                style={{ background: "linear-gradient(135deg, #f59e0b 0%, #f97316 100%)" }}>
                {copied ? "✅ Tersalin!" : "📋 Salin Invoice"}
              </button>
              <button onClick={recordPayment}
                className="px-4 py-2.5 border border-green-300 rounded-xl text-sm font-semibold text-green-700 bg-green-50 hover:bg-green-100 transition-colors">
                ✅ Catat Pembayaran
              </button>
            </div>
          </div>

          {/* Invoice preview */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <h2 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
              <span className="text-lg">💬</span> Preview Invoice (siap kirim ke WA)
            </h2>
            <pre className="text-sm whitespace-pre-wrap bg-gray-50 border border-gray-100 rounded-xl p-4 leading-relaxed text-gray-700 font-sans">
              {invoiceText || "Pilih customer untuk melihat preview."}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
