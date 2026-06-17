"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase";
import { Customer, Order, Payment, formatIDR } from "@/lib/types";

const BANK_OPTIONS = [
  "Seabank 901335299369 a.n. Deasy Sherliya Trajadi",
  "BCA 5930374395 a.n. Deasy Sherliya Trajadi",
];

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-gray-100 text-gray-600",
  confirmed: "bg-blue-100 text-blue-700",
  hold: "bg-red-100 text-red-700",
  dp_paid: "bg-amber-100 text-amber-700",
  paid_off: "bg-emerald-100 text-emerald-700",
  queued: "bg-purple-100 text-purple-700",
  shipped: "bg-green-100 text-green-700",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  confirmed: "Dikonfirmasi",
  hold: "Hold",
  dp_paid: "DP Terbayar",
  paid_off: "Lunas",
  queued: "Antri Kirim",
  shipped: "Terkirim",
};

export default function InvoicesPage() {
  const supabase = supabaseBrowser();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [bankAccount, setBankAccount] = useState(BANK_OPTIONS[0]);
  const [shippingCost, setShippingCost] = useState("");
  const [estimasiBerat, setEstimasiBerat] = useState("");
  const [packingFee, setPackingFee] = useState("");
  const [deadlinePayment, setDeadlinePayment] = useState("");
  const [kind, setKind] = useState<"dp" | "pelunasan" | "mix">("dp");
  const [dpPercent, setDpPercent] = useState("50");
  const [customDpAmount, setCustomDpAmount] = useState("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [receivedAmount, setReceivedAmount] = useState("");

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

  // Saat customer berganti, default pilih semua bukunya
  useEffect(() => {
    setSelectedOrderIds(new Set(customerOrders.map((o) => o.id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  function toggleOrder(id: string) {
    setSelectedOrderIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Hanya buku yang dicentang yang masuk ke perhitungan & invoice
  const selectedOrders = customerOrders.filter((o) => selectedOrderIds.has(o.id));
  const selectedOrderIdsArr = selectedOrders.map((o) => o.id);
  const selectedPayments = payments.filter((p) => selectedOrderIdsArr.includes(p.order_id));

  const total = selectedOrders.reduce((sum, o) => sum + (o.books?.price_idr ?? 0) * o.qty, 0);
  const totalDp = selectedPayments.filter((p) => p.kind === "dp").reduce((s, p) => s + p.amount, 0);
  const totalPelunasan = selectedPayments.filter((p) => p.kind === "pelunasan").reduce((s, p) => s + p.amount, 0);
  const sisaSetelahDp = total - totalDp;
  const sisaAkhir = total + Number(shippingCost || 0) + Number(packingFee || 0) - totalDp - totalPelunasan;

  const dpAmount = dpPercent === "custom" ? Number(customDpAmount || 0) : Math.round(total * (Number(dpPercent) / 100));

  // Klasifikasi otomatis per-buku berdasarkan status order: pending/confirmed/hold -> perlu DP, dp_paid -> perlu Pelunasan
  const dpOrders = selectedOrders.filter((o) => o.status === "pending" || o.status === "confirmed" || o.status === "hold");
  const pelunasanOrders = selectedOrders.filter((o) => o.status === "dp_paid");
  const totalDpOrders = dpOrders.reduce((sum, o) => sum + (o.books?.price_idr ?? 0) * o.qty, 0);
  const totalPelunasanOrders = pelunasanOrders.reduce((sum, o) => sum + (o.books?.price_idr ?? 0) * o.qty, 0);

  // Tagihan sebelum dikurangi saldo deposit (kelebihan transfer sebelumnya)
  const billedMixDpAmount = dpPercent === "custom" ? dpAmount : Math.round(totalDpOrders * (Number(dpPercent) / 100));
  const billedAmount = kind === "pelunasan" ? sisaAkhir : kind === "dp" ? dpAmount : (totalPelunasanOrders + billedMixDpAmount + Number(shippingCost || 0) + Number(packingFee || 0));
  const creditAvailable = customer?.credit_balance ?? 0;
  const creditUsed = Math.min(creditAvailable, Math.max(0, billedAmount));
  const amountAfterCredit = billedAmount - creditUsed;

  // Auto-detect jenis invoice (hanya untuk judul) berdasarkan buku yang dipilih
  useEffect(() => {
    if (selectedOrders.length === 0) return;
    const hasDpPaid = selectedOrders.some((o) => o.status === "dp_paid");
    const hasPending = selectedOrders.some((o) => o.status === "pending" || o.status === "confirmed" || o.status === "hold");
    if (hasDpPaid && hasPending) setKind("mix");
    else if (hasDpPaid) setKind("pelunasan");
    else setKind("dp");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOrderIds, customerId]);

  const invoiceText = useMemo(() => {
    if (!customer) return "";
    const lines = selectedOrders.map(
      (o, i) => `${i + 1}. ${o.books?.title} (${o.books?.format}) x${o.qty} - ${formatIDR((o.books?.price_idr ?? 0) * o.qty)}${o.books?.status === "oos" ? " [OOS - akan dikonfirmasi ulang]" : ""}`
    );

    if (kind === "dp") {
      return [
        `*INVOICE DP - ${customer.whatsapp_name}*`,
        `Grup: ${customer.whatsapp_group ?? "-"}`,
        ``,
        ...lines,
        ``,
        `Total Tagihan: ${formatIDR(total)}`,
        `DP yang harus dibayar: ${formatIDR(dpAmount)}`,
        ...(creditUsed > 0 ? [
          `Dikurangi Saldo Deposit: -${formatIDR(creditUsed)}`,
          `*DP Setelah Saldo Deposit: ${formatIDR(amountAfterCredit)}*`,
        ] : []),
        `Sisa setelah DP: ${formatIDR(total - dpAmount)}`,
        ...(estimasiBerat ? [`Estimasi Berat: ${estimasiBerat}`] : []),
        ...(deadlinePayment ? [`Deadline Pembayaran: ${deadlinePayment}`] : []),
        ``,
        `Pembayaran ke: ${bankAccount}`,
        `Mohon kirim bukti transfer setelah melakukan pembayaran. Terima kasih 🙏`,
      ].join("\n");
    }

    if (kind === "pelunasan") {
      return [
        `*INVOICE PELUNASAN - ${customer.whatsapp_name}*`,
        `Grup: ${customer.whatsapp_group ?? "-"}`,
        ``,
        ...lines,
        ``,
        `Total Tagihan Buku: ${formatIDR(total)}`,
        `Sudah DP: ${formatIDR(totalDp)}`,
        `Ongkos Kirim: ${formatIDR(Number(shippingCost || 0))}`,
        ...(packingFee ? [`Packing Fee: ${formatIDR(Number(packingFee || 0))}`] : []),
        ...(estimasiBerat ? [`Estimasi Berat: ${estimasiBerat}`] : []),
        `Sisa yang harus dilunasi: ${formatIDR(sisaAkhir)}`,
        ...(creditUsed > 0 ? [
          `Dikurangi Saldo Deposit: -${formatIDR(creditUsed)}`,
          `*Total Pelunasan Setelah Saldo Deposit: ${formatIDR(amountAfterCredit)}*`,
        ] : []),
        ...(deadlinePayment ? [`Deadline Pembayaran: ${deadlinePayment}`] : []),
        ``,
        `Pembayaran ke: ${bankAccount}`,
        `Mohon kirim bukti transfer setelah melakukan pelunasan. Terima kasih 🙏`,
      ].join("\n");
    }

    // mix: kombinasi Pelunasan (untuk order yang sudah DP) & DownPayment (untuk order baru)
    const dpLines = dpOrders.map(
      (o, i) => `${i + 1}. ${o.books?.title} (${o.books?.format}) x${o.qty} - ${formatIDR((o.books?.price_idr ?? 0) * o.qty)}${o.books?.status === "oos" ? " [OOS - akan dikonfirmasi ulang]" : ""}`
    );
    const pelunasanLines = pelunasanOrders.map(
      (o, i) => `${i + 1}. ${o.books?.title} (${o.books?.format}) x${o.qty} - ${formatIDR((o.books?.price_idr ?? 0) * o.qty)}${o.books?.status === "oos" ? " [OOS - akan dikonfirmasi ulang]" : ""}`
    );
    const mixDpAmount = dpPercent === "custom" ? dpAmount : Math.round(totalDpOrders * (Number(dpPercent) / 100));
    const totalPembayaran = totalPelunasanOrders + mixDpAmount + Number(shippingCost || 0) + Number(packingFee || 0);

    return [
      `*Invoice  - ${customer.whatsapp_name}*`,
      `Grup ${customer.whatsapp_group ?? "-"}`,
      ``,
      ...(pelunasanOrders.length > 0 ? [
        `*Pelunasan*`,
        ...pelunasanLines,
        ``,
      ] : []),
      ...(dpOrders.length > 0 ? [
        `*DownPayment*`,
        ...dpLines,
        `Total PO ${formatIDR(totalDpOrders)}`,
        `DP yang harus dibayar (${dpPercent === "custom" ? "Custom" : `${dpPercent}%`}) ${formatIDR(mixDpAmount)}`,
        ``,
      ] : []),
      `Ongkos Kirim ${formatIDR(Number(shippingCost || 0))}`,
      ...(packingFee ? [`Packing fee ${formatIDR(Number(packingFee || 0))}`] : []),
      ...(creditUsed > 0 ? [
        `Dikurangi Saldo Deposit: -${formatIDR(creditUsed)}`,
        `*Total Pembayaran Setelah Saldo Deposit: ${formatIDR(amountAfterCredit)}*`,
      ] : [`*Total Pembayaran ${formatIDR(totalPembayaran)}*`]),
      ...(estimasiBerat ? [``, `Estimasi Berat: ${estimasiBerat}`] : []),
      ``,
      `Mohon selesaikan pembayaran ke rek Seabank 901335299369 atau BCA 5930374395 an Deasy Sherliya Trajadi${deadlinePayment ? ` paling lambat ${deadlinePayment}` : ""} 🙏`,
    ].join("\n");
  }, [customer, selectedOrders, kind, dpAmount, dpPercent, total, totalDp, shippingCost, packingFee, estimasiBerat, deadlinePayment, sisaAkhir, bankAccount, dpOrders, pelunasanOrders, totalDpOrders, totalPelunasanOrders, creditUsed, amountAfterCredit]);

  async function recordPayment() {
    if (!customer || selectedOrders.length === 0) return;

    const mixDpAmount = dpPercent === "custom" ? dpAmount : Math.round(totalDpOrders * (Number(dpPercent) / 100));
    const ongkirPacking = Number(shippingCost || 0) + Number(packingFee || 0);
    const today = new Date().toISOString().slice(0, 10);

    // Helper: buat payment rows per-order secara proporsional berdasarkan harga buku
    // agar saat invoice per-buku nanti, DP tercatat benar per buku (tidak menumpuk di order[0])
    function splitPayments(
      orderList: Order[],
      totalValue: number,
      totalPayment: number,
      payKind: "dp" | "pelunasan"
    ) {
      if (orderList.length === 0 || totalValue === 0) return [];
      let remaining = totalPayment;
      return orderList.map((o, idx) => {
        const orderValue = (o.books?.price_idr ?? 0) * o.qty;
        const isLast = idx === orderList.length - 1;
        const portion = isLast ? remaining : Math.round((orderValue / totalValue) * totalPayment);
        remaining -= portion;
        return {
          order_id: o.id,
          kind: payKind,
          amount: portion,
          paid_at: today,
          bank_account: bankAccount,
        };
      });
    }

    let rows: { order_id: string; kind: "dp" | "pelunasan"; amount: number; paid_at: string; bank_account: string }[] = [];

    if (kind === "dp") {
      // DP: split proporsional ke semua dpOrders (buku Pending/Dikonfirmasi/Hold yang dicentang)
      rows = splitPayments(dpOrders.length > 0 ? dpOrders : selectedOrders, total, dpAmount, "dp");
    } else if (kind === "pelunasan") {
      // Pelunasan: split proporsional ke semua pelunasanOrders, ongkir masuk ke buku terakhir
      const baseRows = splitPayments(
        pelunasanOrders.length > 0 ? pelunasanOrders : selectedOrders,
        total,
        total - totalDp,
        "pelunasan"
      );
      // Tambahkan ongkir+packing ke row terakhir
      if (baseRows.length > 0 && ongkirPacking > 0) {
        baseRows[baseRows.length - 1].amount += ongkirPacking;
      }
      rows = baseRows;
    } else {
      // mix: split DP ke dpOrders, split pelunasan ke pelunasanOrders (ongkir ke buku terakhir pelunasan)
      const dpRows = splitPayments(dpOrders, totalDpOrders, mixDpAmount, "dp");
      const pelRows = splitPayments(pelunasanOrders, totalPelunasanOrders, totalPelunasanOrders - totalDp, "pelunasan");
      if (pelRows.length > 0 && ongkirPacking > 0) {
        pelRows[pelRows.length - 1].amount += ongkirPacking;
      }
      rows = [...pelRows, ...dpRows];
    }

    const totalRecorded = rows.reduce((s, r) => s + r.amount, 0);
    if (totalRecorded <= 0 || rows.length === 0) return;

    await supabase.from("payments").insert(rows);

    // Update status buku otomatis sesuai jenis invoice
    const idsToDpPaid = (kind === "dp" || kind === "mix") ? dpOrders.map((o) => o.id) : [];
    const idsToPaidOff = (kind === "pelunasan" || kind === "mix") ? pelunasanOrders.map((o) => o.id) : [];
    if (idsToDpPaid.length > 0) {
      await supabase.from("orders").update({ status: "dp_paid" }).in("id", idsToDpPaid);
    }
    if (idsToPaidOff.length > 0) {
      await supabase.from("orders").update({ status: "paid_off" }).in("id", idsToPaidOff);
    }

    // Update saldo deposit customer
    const received = Number(receivedAmount || amountAfterCredit);
    const excess = Math.max(0, received - amountAfterCredit);
    const newCreditBalance = creditAvailable - creditUsed + excess;
    if (newCreditBalance !== creditAvailable) {
      await supabase.from("customers").update({ credit_balance: newCreditBalance }).eq("id", customer.id);
    }

    setReceivedAmount("");
    load();
    if (excess > 0) {
      alert(`Pembayaran berhasil dicatat & status buku diperbarui! ✅\n\nKelebihan transfer ${formatIDR(excess)} disimpan sebagai Saldo Deposit untuk invoice berikutnya.`);
    } else {
      alert("Pembayaran berhasil dicatat & status buku diperbarui! ✅");
    }
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
              value={kind} onChange={(e) => setKind(e.target.value as "dp" | "pelunasan" | "mix")}>
              <option value="dp">Invoice DP</option>
              <option value="pelunasan">Invoice Pelunasan</option>
              <option value="mix">Invoice</option>
            </select>
          </label>
          <label className="text-sm flex flex-col gap-1">
            <span className="text-gray-600 font-medium text-xs">No. Rekening</span>
            <select className="border border-gray-200 rounded-lg px-3 py-2 bg-white text-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
              value={bankAccount} onChange={(e) => setBankAccount(e.target.value)}>
              {BANK_OPTIONS.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </label>

          {(kind === "dp" || kind === "mix") && (
            <>
              <label className="text-sm flex flex-col gap-1">
                <span className="text-gray-600 font-medium text-xs">Nominal DP</span>
                <select className="border border-gray-200 rounded-lg px-3 py-2 bg-white text-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                  value={dpPercent} onChange={(e) => setDpPercent(e.target.value)}>
                  <option value="15">15%</option>
                  <option value="25">25%</option>
                  <option value="50">50%</option>
                  <option value="custom">Custom</option>
                </select>
              </label>
              {dpPercent === "custom" && (
                <label className="text-sm flex flex-col gap-1">
                  <span className="text-gray-600 font-medium text-xs">Nominal DP (Custom)</span>
                  <input type="number"
                    className="border border-gray-200 rounded-lg px-3 py-2 bg-white text-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                    value={customDpAmount} onChange={(e) => setCustomDpAmount(e.target.value)} placeholder="0" />
                </label>
              )}
            </>
          )}
          {(kind === "pelunasan" || kind === "mix") && (
            <label className="text-sm flex flex-col gap-1">
              <span className="text-gray-600 font-medium text-xs">Ongkos Kirim</span>
              <input type="number"
                className="border border-gray-200 rounded-lg px-3 py-2 bg-white text-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                value={shippingCost} onChange={(e) => setShippingCost(e.target.value)} placeholder="0" />
            </label>
          )}
          {(kind === "pelunasan" || kind === "mix") && (
            <label className="text-sm flex flex-col gap-1">
              <span className="text-gray-600 font-medium text-xs">Packing Fee</span>
              <input type="number"
                className="border border-gray-200 rounded-lg px-3 py-2 bg-white text-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                value={packingFee} onChange={(e) => setPackingFee(e.target.value)} placeholder="0" />
            </label>
          )}
          <label className="text-sm flex flex-col gap-1">
            <span className="text-gray-600 font-medium text-xs">Estimasi Berat</span>
            <input
              className="border border-gray-200 rounded-lg px-3 py-2 bg-white text-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
              value={estimasiBerat} onChange={(e) => setEstimasiBerat(e.target.value)} placeholder="contoh: 1.5 kg" />
          </label>
          <label className="text-sm flex flex-col gap-1">
            <span className="text-gray-600 font-medium text-xs">Deadline Payment</span>
            <input type="date"
              className="border border-gray-200 rounded-lg px-3 py-2 bg-white text-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
              value={deadlinePayment} onChange={(e) => setDeadlinePayment(e.target.value)} />
          </label>
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
          {/* Pilih Buku */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm lg:col-span-2">
            <h2 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
              <span className="text-lg">📚</span> Pilih Buku yang Ditagih
            </h2>
            {customerOrders.length === 0 ? (
              <p className="text-sm text-gray-400">Belum ada order untuk customer ini.</p>
            ) : (
              <div className="space-y-1.5">
                {customerOrders.map((o) => (
                  <label key={o.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer border border-gray-50">
                    <input type="checkbox"
                      className="w-4 h-4 accent-amber-500"
                      checked={selectedOrderIds.has(o.id)}
                      onChange={() => toggleOrder(o.id)} />
                    <span className="flex-1 text-sm text-gray-700">
                      {o.books?.title} <span className="text-gray-400">({o.books?.format}) x{o.qty}</span>
                    </span>
                    <span className="text-xs text-gray-500">{formatIDR((o.books?.price_idr ?? 0) * o.qty)}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[o.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {STATUS_LABEL[o.status] ?? o.status}
                    </span>
                  </label>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-400 mt-3">
              💡 Buku dengan status &quot;Pending/Dikonfirmasi/Hold&quot; otomatis masuk sebagai tagihan <strong>DP</strong>, dan buku dengan status &quot;DP Terbayar&quot; otomatis masuk sebagai tagihan <strong>Pelunasan</strong>.
            </p>
          </div>

          {/* Summary */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <h2 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
              <span className="text-lg">📊</span> Ringkasan Tagihan
            </h2>
            <div className="space-y-2 text-sm">
              {[
                { label: "Total Tagihan Buku (terpilih)", value: formatIDR(total), bold: true, color: "text-gray-800" },
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
              {kind === "dp" && (
                <div className="flex justify-between py-2 bg-amber-50 rounded-lg px-3 mt-2">
                  <span className="text-amber-700 font-semibold">Nominal DP ({dpPercent === "custom" ? "Custom" : `${dpPercent}%`})</span>
                  <span className="text-amber-800 font-bold text-base">{formatIDR(dpAmount)}</span>
                </div>
              )}
              {creditAvailable > 0 && (
                <div className="flex justify-between py-1.5 border-b border-gray-50">
                  <span className="text-gray-500">Saldo Deposit Customer</span>
                  <span className="font-semibold text-purple-600">{formatIDR(creditAvailable)}</span>
                </div>
              )}
              {creditUsed > 0 && (
                <div className="flex justify-between py-2 bg-purple-50 rounded-lg px-3 mt-2">
                  <span className="text-purple-700 font-semibold">Tagihan Setelah Dikurangi Saldo Deposit</span>
                  <span className="text-purple-800 font-bold text-base">{formatIDR(amountAfterCredit)}</span>
                </div>
              )}
            </div>

            <label className="text-sm flex flex-col gap-1 mt-3">
              <span className="text-gray-600 font-medium text-xs">Nominal Diterima (isi jika berbeda dari tagihan, mis. customer transfer lebih)</span>
              <input type="number"
                className="border border-gray-200 rounded-lg px-3 py-2 bg-white text-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                value={receivedAmount} onChange={(e) => setReceivedAmount(e.target.value)}
                placeholder={String(amountAfterCredit)} />
              {Number(receivedAmount || 0) > amountAfterCredit && (
                <span className="text-xs text-purple-600">
                  💜 Kelebihan {formatIDR(Number(receivedAmount) - amountAfterCredit)} akan otomatis disimpan sebagai Saldo Deposit.
                </span>
              )}
            </label>

            <div className="mt-3 flex gap-2 flex-wrap">
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
