"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase";
import { Customer } from "@/lib/types";

const EMPTY: Omit<Customer, "id"> = {
  whatsapp_name: "",
  whatsapp_number: "",
  address: "",
  receiver_name: "",
  receiver_phone: "",
  whatsapp_group: "",
};

export default function CustomersPage() {
  const supabase = supabaseBrowser();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    setForm({
      whatsapp_name: c.whatsapp_name,
      whatsapp_number: c.whatsapp_number,
      address: c.address ?? "",
      receiver_name: c.receiver_name ?? "",
      receiver_phone: c.receiver_phone ?? "",
      whatsapp_group: c.whatsapp_group ?? "",
    });
  }

  async function remove(id: string) {
    if (!confirm("Hapus customer ini?")) return;
    await supabase.from("customers").delete().eq("id", id);
    load();
  }

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

      {/* Form */}
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
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-5 py-8 text-gray-300 text-center" colSpan={6}>⏳ Memuat data...</td></tr>
            ) : customers.length === 0 ? (
              <tr><td className="px-5 py-8 text-gray-400 text-center" colSpan={6}>👥 Belum ada customer. Tambah customer pertama di atas!</td></tr>
            ) : customers.map((c) => (
              <tr key={c.id} className="border-t border-gray-50 hover:bg-pink-50/40 transition-colors">
                <td className="px-5 py-3 font-medium text-gray-800">{c.whatsapp_name}</td>
                <td className="px-5 py-3 text-gray-500">{c.whatsapp_number}</td>
                <td className="px-5 py-3">
                  {c.whatsapp_group && (
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{c.whatsapp_group}</span>
                  )}
                </td>
                <td className="px-5 py-3 max-w-xs truncate text-gray-500">{c.address}</td>
                <td className="px-5 py-3 text-gray-500">{c.receiver_name}</td>
                <td className="px-5 py-3 text-right whitespace-nowrap">
                  <button onClick={() => edit(c)} className="text-xs px-3 py-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 mr-2 transition-colors">Edit</button>
                  <button onClick={() => remove(c.id)} className="text-xs px-3 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors">Hapus</button>
                </td>
              </tr>
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
