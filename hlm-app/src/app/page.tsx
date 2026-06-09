import Link from "next/link";

const CARDS = [
  { href: "/customers", title: "Master Customer", desc: "Data WA, alamat, penerima paket, grup" },
  { href: "/books", title: "Buku / PO", desc: "Daftar buku per batch, harga, stok, status OOS" },
  { href: "/orders", title: "Compile Order", desc: "Rekap pesanan customer (pengganti rekap WA → Excel)" },
  { href: "/invoices", title: "Invoice DP & Pelunasan", desc: "Generate invoice siap kirim ke WA per customer" },
  { href: "/shipments", title: "Antrian Pengiriman", desc: "Antrian first-pay-first-queue & format kemas" },
  { href: "/tracking", title: "Tracking Number", desc: "Input & rekap resi per bulan" },
];

export default function Home() {
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">Dashboard</h1>
      <p className="text-gray-500 mb-6">
        Pengganti alur manual rekap WhatsApp → Excel → Invoice → Antrian Kirim.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {CARDS.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="block bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="font-medium mb-1">{c.title}</div>
            <div className="text-sm text-gray-500">{c.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
