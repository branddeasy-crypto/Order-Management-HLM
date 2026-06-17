"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase";
import { Customer, formatIDR } from "@/lib/types";

const EMPTY: Omit<Customer, "id"> = {
  whatsapp_name: "",
  whatsapp_number: "",
  address: "",
  receiver_name: "",
  receiver_phone: "",
  whatsapp_group: "",
  credit_balance: 0,
};

export default function CustomersPage() {
  const supabase = supabaseBrowser();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Deposit top-up state
  const [depositCustomerId, setDepositCustomerId] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState("");
  const [depositDate, setDepositDate] = useState("");
  const [depositNote, setDepositNote] = useState("");
  const [depositSaving, setDepositSaving] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .order("whatsapp_name");
    if (error) setError(error.message);
    else setCustomers(data as Customer[]);
    setLoading(false);
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (editingId) {
      const { error } = await supabase.from("customers").update(form).eq("id", editingId);
      if (error) return setError(error.message);
    } else {
      const { error } = await supabase.from("customers").insert(form);
      if (error) return setError(error.message);
    }
    setForm(EMPTY);
    setEditingId(null);
    load();
  }

  function edit(c: Customer) {
    setEditingId(c.id);
    setDepositCustomerId(null);
    setForm({
      whatsapp_name: c.whatsapp_name,
      whatsapp_number: c.whatsapp_number,
      address: c.address ?? "",
      receiver_name: c.receiver_name ?? "",
      receiver_phone: c.receiver_phone ?? "",
      whatsapp_group: c.whatsapp_group ?? "",
      credit_balance: c.credit_balance ?? 0,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function remove(id: string) {
    if (!confirm("Hapus customer ini?")) return;
    await supabase.from("customers").delete().eq("id", id);
    load();
  }

  function openDeposit(id: string) {
    if (depositCustomerId === id) {
      setDepositCustomerId(null);
      return;
    }
    setDepositCustomerId(id);
    setDepositAmount("");
    setDepositDate(new Date().toISOString().slice(0, 10));
    setDepositNote("");
    setEditingId(null);
    setForm(EMPTY);
  }

  async function saveDeposit(customer: Customer) {
    if (!depositAmount || Number(depositAmount) <= 0) return alert("Masukkan nominal deposit.");
    setDepositSaving(true);
    const newBalance = (customer.credit_balance ?? 0) + Number(depositAmount);
    const { error } = await supabase
      .from("customers")
      .update({ credit_balance: newBalance })
      .eq("id", customer.id);
    setDepositSaving(false);
    if (error) return alert("Gagal menyimpan: " + error.message);
    setDepositCustomerId(null);
    load();
    alert(`Deposit ${formatIDR(Number(depositAmount))} berhasil dicatat untuk ${customer.whatsapp_name}.\nSaldo sekarang: ${formatIDR(newBalance)} ✅`);
  }

  async function resetDeposit(customer: Customer) {
    if (!confirm(`Reset saldo deposit ${customer.whatsapp_name} ke Rp 0? Lakukan ini hanya jika saldo sudah dipakai / salah catat.`)) return;
    await supabase.from("customers").update({ credit_balance: 0 }).eq("id", customer.id);
    load();
  }

  const totalDeposit = customers.reduce((s, c) => s + (c.credit_balance ?? 0), 0);

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-xl shadow-sm">👩‍👧</div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Master Customer</h1>
          <p className="text-sm text-gray-400">Data WhatsApp, alamat, penerima paket, dan grup asal customer.</p>
        </div>
      </div>
      <div className="h-1 w-16 rounded-full bg-gradient-to-r from-pink-400 to-rose-500 mb-6" />

      {/* Banner total deposit */}
      {totalDeposit > 0 && (
        <div className="bg-purple-50 border border-purple-100 rounded-2xl px-5 py-3 mb-4 flex items-center gap-3">
          <span className="text-lg">💜</span>
          <div>
            <span className="text-xs text-purple-500 font-medium">Total Saldo Deposit Seluruh Customer</span>
            <div className="font-bold text-purple-700">{formatIDR(totalDeposit)}</div>
          </div>
          <span className="ml-auto text-xs text-purple-400">{customers.filter(c => (c.credit_balance ?? 0) > 0).length} customer punya saldo</span>
        </div>
      )}

      {/* Form tambah/edit */}
      <div className="bg-pink-50 border border-pink-100 rounded-2xl p-5 mb-6">
        <h2 className="text-sm font-semibold text-pink-700 mb-3">
          {editingId ? "✏️ Edit Customer" : "➕ Tambah Customer Baru"}
        </h2>
        <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Field label="Nama WhatsApp" value={form.whatsapp_name} onChange={(v) => setForm({ ...form, whatsapp_name: v })} required />
          <Field label="No WhatsApp" value={form.whatsapp_number} onChange={(v) => setForm({ ...form, whatsapp_number: v })} required />
          <Field label="Grup WA" value={form.whatsapp_group ?? ""} onChange={(v) => setForm({ ...form, whatsapp_group: v })} placeholder="misal: Grup Buku A" />
          <Field label="Alamat Lengkap" value={form.address ?? ""} onChange={(v) => setForm({ ...form, address: v })} className="lg:col-span-3" />
          <Field label="Nama Penerima Paket" value={form.receiver_name ?? ""} onChange={(v) => setForm({ ...form, receiver_name: v })} />
          <Field label="No Telp Penerima" value={form.receiver_phone ?? ""} onChange={(v) => setForm({ ...form, receiver_phone: v })} />
          <div className="flex items-end gap-2">
            <button type="submit"
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md"
              style={{ background: "linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)" }}>
              {editingId ? "💾 Simpan" : "➕ Tambah"}
            </button>
            {editingId && (
              <button type="button"
                onClick={() => { setEditingId(null); setForm(EMPTY); }}
                className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-600 hover:bg-gray-100 transition-colors">
                Batal
              </button>
            )}
          </div>
        </form>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-4 flex items-center gap-2">
          <span>⚠️</span> {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-gray-100 rounded-2xl overflow-x-auto shadow-sm">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-600">Daftar Customer</span>
          <span className="text-xs bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full">{customers.length} customer</span>
        </div>
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-gray-400 uppercase tracking-wide">
            <tr>
              <th className="px-5 py-3">Nama WA</th>
              <th className="px-5 py-3">No WA</th>
              <th className="px-5 py-3">Grup</th>
              <th className="px-5 py-3">Alamat</th>
              <th className="px-5 py-3">Penerima</th>
              <th className="px-5 py-3">Saldo Deposit</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-5 py-8 text-gray-300 text-center" colSpan={7}>⏳ Memuat data...</td></tr>
            ) : customers.length === 0 ? (
              <tr><td className="px-5 py-8 text-gray-400 text-center" colSpan={7}>👥 Belum ada customer. Tambah customer pertama di atas!</td></tr>
            ) : customers.map((c) => (
              <>
                <tr key={c.id} className={`border-t border-gray-50 transition-colors ${depositCustomerId === c.id ? "bg-purple-50/60" : "hover:bg-pink-50/40"}`}>
                  <td className="px-5 py-3 font-medium text-gray-800">{c.whatsapp_name}</td>
                  <td className="px-5 py-3 text-gray-500">{c.whatsapp_number}</td>
                  <td className="px-5 py-3">
                    {c.whatsapp_group && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{c.whatsapp_group}</span>
                    )}
                  </td>
                  <td className="px-5 py-3 max-w-xs truncate text-gray-500">{c.address}</td>
                  <td className="px-5 py-3 text-gray-500">{c.receiver_name}</td>
                  <td className="px-5 py-3">
                    {(c.credit_balance ?? 0) > 0 ? (
                      <span className="text-xs font-semibold text-purple-700 bg-purple-100 px-2 py-1 rounded-full">
                        {formatIDR(c.credit_balance ?? 0)}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300">-</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => openDeposit(c.id)}
                      className={`text-xs px-3 py-1 rounded-lg mr-1.5 transition-colors font-medium ${depositCustomerId === c.id ? "bg-purple-200 text-purple-800" : "bg-purple-50 text-purple-600 hover:bg-purple-100"}`}>
                      💰 Deposit
                    </button>
                    <button onClick={() => edit(c)} className="text-xs px-3 py-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 mr-1.5 transition-colors">Edit</button>
                    <button onClick={() => remove(c.id)} className="text-xs px-3 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors">Hapus</button>
                  </td>
                </tr>

                {/* Panel deposit inline */}
                {depositCustomerId === c.id && (
                  <tr key={`${c.id}-deposit`} className="border-t border-purple-100">
                    <td colSpan={7} className="px-5 py-4 bg-purple-50/80">
                      <div className="max-w-xl">
                        <p className="text-xs font-semibold text-purple-700 mb-3 flex items-center gap-1.5">
                          💰 Catat Deposit Masuk -
                          <span className="font-bold">{c.whatsapp_name}</span>
                          {(c.credit_balance ?? 0) > 0 && (
                            <span className="ml-1 text-purple-500 font-normal">
                              (saldo saat ini: {formatIDR(c.credit_balance ?? 0)})
                            </span>
                          )}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
                          <div className="flex flex-col gap-1">
                            <span className="text-xs text-gray-500 font-medium">Nominal Deposit (Rp)</span>
                            <input
                              type="number"
                              className="border border-purple-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
                              placeholder="contoh: 200000"
                              value={depositAmount}
                              onChange={(e) => setDepositAmount(e.target.value)}
                              autoFocus
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-xs text-gray-500 font-medium">Tanggal Masuk</span>
                            <input
                              type="date"
                              className="border border-purple-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
                              value={depositDate}
                              onChange={(e) => setDepositDate(e.target.value)}
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-xs text-gray-500 font-medium">Catatan (opsional)</span>
                            <input
                              type="text"
                              className="border border-purple-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
                              placeholder="misal: transfer nabung"
                              value={depositNote}
                              onChange={(e) => setDepositNote(e.target.value)}
                            />
                          </div>
                        </div>
                        {depositAmount && Number(depositAmount) > 0 && (
                          <p className="text-xs text-purple-600 mb-3">
                            Saldo setelah deposit: <strong>{formatIDR((c.credit_balance ?? 0) + Number(depositAmount))}</strong>
                          </p>
                        )}
                        <div className="flex gap-2 flex-wrap">
                          <button
                            onClick={() => saveDeposit(c)}
                            disabled={depositSaving}
                            className="px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md disabled:opacity-60"
                            style={{ background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)" }}>
                            {depositSaving ? "Menyimpan..." : "💾 Simpan Deposit"}
                          </button>
                          {(c.credit_balance ?? 0) > 0 && (
                            <button
                              onClick={() => resetDeposit(c)}
                              className="px-4 py-2 rounded-xl text-sm text-red-500 border border-red-200 bg-red-50 hover:bg-red-100 transition-colors">
                              Reset Saldo ke 0
                            </button>
                          )}
                          <button
                            onClick={() => setDepositCustomerId(null)}
                            className="px-4 py-2 rounded-xl text-sm text-gray-500 border border-gray-200 hover:bg-gray-100 transition-colors">
                            Batal
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, required, className, placeholder }: {
  label: string; value: string; onChange: (v: string) => void;
  required?: boolean; className?: string; placeholder?: string;
}) {
  return (
    <label className={`text-sm flex flex-col gap-1 ${className ?? ""}`}>
      <span className="text-gray-600 font-medium text-xs">{label}{required && <span className="text-pink-500"> *</span>}</span>
      <input
        className="border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100 transition-all text-sm"
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
