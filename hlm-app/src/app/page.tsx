import Link from "next/link";

const CARDS = [
  {
    href: "/customers",
    title: "Master Customer",
    desc: "Data WA, alamat, penerima paket, dan grup asal customer",
    icon: "👩‍👧",
    color: "from-pink-400 to-rose-500",
    bg: "bg-pink-50",
    border: "border-pink-200",
  },
  {
    href: "/books",
    title: "Buku / PO",
    desc: "Daftar buku per batch - publisher, ISBN, harga, ETA, status stok",
    icon: "📚",
    color: "from-violet-400 to-purple-600",
    bg: "bg-violet-50",
    border: "border-violet-200",
  },
  {
    href: "/orders",
    title: "Compile Order",
    desc: "Rekap pesanan customer - pengganti rekap manual WA ke Excel",
    icon: "📋",
    color: "from-blue-400 to-indigo-500",
    bg: "bg-blue-50",
    border: "border-blue-200",
  },
  {
    href: "/invoices",
    title: "Invoice DP & Pelunasan",
    desc: "Generate invoice siap-kirim ke WhatsApp per customer",
    icon: "🧾",
    color: "from-amber-400 to-orange-500",
    bg: "bg-amber-50",
    border: "border-amber-200",
  },
  {
    href: "/shipments",
    title: "Antrian Pengiriman",
    desc: "Antrian first-pay-first-queue & slip kemas otomatis",
    icon: "📦",
    color: "from-teal-400 to-cyan-500",
    bg: "bg-teal-50",
    border: "border-teal-200",
  },
  {
    href: "/tracking",
    title: "Resi / Tracking",
    desc: "Input & rekap nomor resi per bulan per customer",
    icon: "🚚",
    color: "from-green-400 to-emerald-500",
    bg: "bg-green-50",
    border: "border-green-200",
  },
];

export default function Home() {
  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-4xl">🌟</span>
          <div>
            <h1 className="text-3xl font-bold text-purple-800">Selamat Datang!</h1>
            <p className="text-purple-500 text-sm font-medium">Happy Little Minds - Order Manager</p>
          </div>
        </div>
        <p className="text-gray-500 text-sm max-w-xl">
          Pengganti alur manual rekap WhatsApp -&gt; Excel -&gt; Invoice -&gt; Antrian Kirim.
          Semua proses penjualan buku import anak ada di sini. 🎉
        </p>
      </div>

      {/* Quick info banner */}
      <div className="rounded-2xl p-4 mb-8 flex items-center gap-3 border border-purple-200"
        style={{ background: "linear-gradient(135deg, #f5f3ff 0%, #fdf4ff 100%)" }}>
        <span className="text-2xl">💡</span>
        <p className="text-purple-700 text-sm">
          <strong>Alur kerja:</strong> Tambah Customer -&gt; Tambah Buku/PO -&gt; Compile Order -&gt; Buat Invoice DP -&gt; Konfirmasi Bayar -&gt; Invoice Pelunasan -&gt; Antrian Kirim -&gt; Input Resi
        </p>
      </div>

      {/* Module cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {CARDS.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className={`block rounded-2xl border ${c.border} ${c.bg} p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 group`}
          >
            {/* Icon with gradient circle */}
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${c.color} flex items-center justify-center text-2xl mb-3 shadow-sm group-hover:scale-110 transition-transform`}>
              {c.icon}
            </div>
            <div className="font-bold text-gray-800 mb-1 text-base">{c.title}</div>
            <div className="text-sm text-gray-500 leading-relaxed">{c.desc}</div>
          </Link>
        ))}
      </div>

      {/* Footer note */}
      <div className="mt-10 text-center text-xs text-gray-400">
        Made with ❤️ for Happy Little Minds team (Deasy & Vita)
      </div>
    </div>
  );
}
