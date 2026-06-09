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
  const customerOrders = useMemo(
    () => orders.filter((o) => o.customer_id === customerId),
    [orders, customerId]
  );
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
    // record against the first order of this customer as a representative reference
    await supabase.from("payments").insert({
      order_id: customerOrders[0].id,
      kind,
      amount,
      paid_at: new Date().toISOString().slice(0, 10),
      bank_account: bankAccount,
    });
    load();
  }

  function copyInvoice() {
    navigator.clipboard.writeText(invoiceText);
    alert("Invoice disalin — siap ditempel ke WhatsApp.");
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">Invoice DP & Pelunasan</h1>
      <p className="text-gray-500 mb-6">
        Generate teks invoice siap-tempel ke WhatsApp berdasarkan order yang sudah dikompilasi.
      </p>

      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <label className="text-sm flex flex-col gap-1 lg:col-span-2">
          <span className="text-gray-600">Customer</span>
          <select className="border border-gray-300 rounded-md px-3 py-2" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">-- pilih customer --</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.whatsapp_name} ({c.whatsapp_group})</option>)}
          </select>
        </label>
        <label className="text-sm flex flex-col gap-1">
          <span className="text-gray-600">Jenis Invoice</span>
          <select className="border border-gray-300 rounded-md px-3 py-2" value={kind} onChange={(e) => setKind(e.target.value as "dp" | "pelunasan")}>
            <option value="dp">Invoice DP</option>
            <option value="pelunasan">Invoice Pelunasan</option>
          </select>
        </label>
        <label className="text-sm flex flex-col gap-1">
          <span className="text-gray-600">No. Rekening</span>
          <input className="border border-gray-300 rounded-md px-3 py-2" value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} />
        </label>
        {kind === "dp" ? (
          <label className="text-sm flex flex-col gap-1">
            <span className="text-gray-600">Nominal DP</span>
            <input type="number" className="border border-gray-300 rounded-md px-3 py-2" value={dpAmount} onChange={(e) => setDpAmount(e.target.value)} placeholder={`Saran: ${Math.round(total * 0.5)}`} />
          </label>
        ) : (
          <label className="text-sm flex flex-col gap-1">
            <span className="text-gray-600">Ongkos Kirim</span>
            <input type="number" className="border border-gray-300 rounded-md px-3 py-2" value={shippingCost} onChange={(e) => setShippingCost(e.target.value)} />
          </label>
        )}
      </div>

      {customer && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h2 className="font-medium mb-3">Ringkasan</h2>
            <ul className="text-sm space-y-1 text-gray-700">
              <li>Total Tagihan Buku: <strong>{formatIDR(total)}</strong></li>
              <li>Total DP Tercatat: {formatIDR(totalDp)}</li>
              <li>Total Pelunasan Tercatat: {formatIDR(totalPelunasan)}</li>
              <li>Sisa setelah DP: {formatIDR(sisaSetelahDp)}</li>
              {kind === "pelunasan" && <li>Sisa Akhir (+ ongkir): <strong>{formatIDR(sisaAkhir)}</strong></li>}
            </ul>
            <div className="mt-4 flex gap-2">
              <button onClick={copyInvoice} className="px-4 py-2 bg-gray-900 text-white rounded-md text-sm">Salin Invoice</button>
              <button onClick={recordPayment} className="px-4 py-2 border border-gray-300 rounded-md text-sm">Catat Pembayaran</button>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h2 className="font-medium mb-3">Preview Invoice (siap kirim ke WA)</h2>
            <pre className="text-sm whitespace-pre-wrap bg-gray-50 border border-gray-100 rounded-md p-3">{invoiceText || "Pilih customer untuk melihat preview."}</pre>
          </div>
        </div>
      )}

      {!customer && !loading && <p className="text-gray-400 text-sm">Pilih customer untuk membuat invoice.</p>}
    </div>
  );
}
