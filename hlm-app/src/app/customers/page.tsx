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
  useEffect(() => {
    load();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (editingId) {
      const { error } = await supabase
        .from("customers")
        .update(form)
        .eq("id", editingId);
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
      <h1 className="text-2xl font-semibold mb-1">Master Customer</h1>
      <p className="text-gray-500 mb-6">
        Data WhatsApp, alamat, penerima paket, dan grup asal customer.
      </p>

      <form onSubmit={submit} className="bg-white border border-gray-200 rounded-lg p-4 mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <Field label="Nama WhatsApp" value={form.whatsapp_name} onChange={(v) => setForm({ ...form, whatsapp_name: v })} required />
        <Field label="No WhatsApp" value={form.whatsapp_number} onChange={(v) => setForm({ ...form, whatsapp_number: v })} required />
        <Field label="Grup WA" value={form.whatsapp_group ?? ""} onChange={(v) => setForm({ ...form, whatsapp_group: v })} />
        <Field label="Alamat" value={form.address ?? ""} onChange={(v) => setForm({ ...form, address: v })} className="lg:col-span-3" />
        <Field label="Nama Penerima Paket" value={form.receiver_name ?? ""} onChange={(v) => setForm({ ...form, receiver_name: v })} />
        <Field label="No Telp Penerima" value={form.receiver_phone ?? ""} onChange={(v) => setForm({ ...form, receiver_phone: v })} />
        <div className="flex items-end gap-2">
          <button type="submit" className="px-4 py-2 bg-gray-900 text-white rounded-md text-sm">
            {editingId ? "Simpan Perubahan" : "Tambah Customer"}
          </button>
          {editingId && (
            <button type="button" onClick={() => { setEditingId(null); setForm(EMPTY); }} className="px-4 py-2 border border-gray-300 rounded-md text-sm">
              Batal
            </button>
          )}
        </div>
      </form>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-2">Nama WA</th>
              <th className="px-4 py-2">No WA</th>
              <th className="px-4 py-2">Grup</th>
              <th className="px-4 py-2">Alamat</th>
              <th className="px-4 py-2">Penerima</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-4 py-4 text-gray-400" colSpan={6}>Memuat...</td></tr>
            ) : customers.length === 0 ? (
              <tr><td className="px-4 py-4 text-gray-400" colSpan={6}>Belum ada customer.</td></tr>
            ) : customers.map((c) => (
              <tr key={c.id} className="border-t border-gray-100">
                <td className="px-4 py-2">{c.whatsapp_name}</td>
                <td className="px-4 py-2">{c.whatsapp_number}</td>
                <td className="px-4 py-2">{c.whatsapp_group}</td>
                <td className="px-4 py-2 max-w-xs truncate">{c.address}</td>
                <td className="px-4 py-2">{c.receiver_name}</td>
                <td className="px-4 py-2 text-right whitespace-nowrap">
                  <button onClick={() => edit(c)} className="text-blue-600 hover:underline mr-3">Edit</button>
                  <button onClick={() => remove(c.id)} className="text-red-600 hover:underline">Hapus</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, required, className }: { label: string; value: string; onChange: (v: string) => void; required?: boolean; className?: string }) {
  return (
    <label className={`text-sm flex flex-col gap-1 ${className ?? ""}`}>
      <span className="text-gray-600">{label}{required && " *"}</span>
      <input
        className="border border-gray-300 rounded-md px-3 py-2"
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
