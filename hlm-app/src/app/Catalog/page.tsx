"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase";
import { Book, formatIDR } from "@/lib/types";

// Ganti dengan nomor WhatsApp tim HLM (format 62xxx tanpa + atau spasi)
const HLM_WA_NUMBER = "6282128060003";

const FORMAT_LABELS: Record<Book["format"], string> = {
  PB: "Paperback",
  HC: "Hardcover",
  BB: "Boardbook",
  FB: "Flexibound",
  TOYS: "Educational Toys",
  MONTESSORI: "Montessori",
};

const FORMAT_BADGE: Record<Book["format"], string> = {
  PB: "bg-blue-100 text-blue-700",
  HC: "bg-amber-100 text-amber-700",
  BB: "bg-teal-100 text-teal-700",
  FB: "bg-indigo-100 text-indigo-700",
  TOYS: "bg-pink-100 text-pink-700",
  MONTESSORI: "bg-green-100 text-green-700",
};

type FilterStatus = "all" | "ready_stock" | "available";

export default function CatalogPage() {
  const supabase = supabaseBrowser();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    supabase
      .from("books")
      .select("*")
      .neq("status", "oos")
      .order("status", { ascending: false })
      .order("title", { ascending: true })
      .then(({ data }) => {
        setBooks((data as Book[]) ?? []);
        setLoading(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = books.filter((b) => {
    const matchStatus = filter === "all" || b.status === filter;
    const matchSearch =
      search === "" ||
      b.title.toLowerCase().includes(search.toLowerCase()) ||
      b.publisher.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  function orderViaWA(book: Book) {
    const msg = encodeURIComponent(
      `Halo kak, saya mau order buku berikut:\n\n` +
      `Judul: ${book.title}\n` +
      `Publisher: ${book.publisher}\n` +
      `Format: ${FORMAT_LABELS[book.format]}\n` +
      `Harga: ${formatIDR(book.price_idr)}\n\n` +
      `Mohon konfirmasinya ya kak, terima kasih! 🙏`
    );
    window.open(`https://wa.me/${HLM_WA_NUMBER}?text=${msg}`, "_blank");
  }

  const readyCount = books.filter((b) => b.status === "ready_stock").length;
  const poCount = books.filter((b) => b.status === "available").length;

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(160deg, #f5f3ff 0%, #fdf4ff 60%, #f0fdf4 100%)" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(180deg, #6d28d9 0%, #7c3aed 50%, #8b5cf6 100%)" }} className="px-4 py-8 text-center">
        <div className="text-4xl mb-2">📖</div>
        <h1 className="text-2xl font-bold text-white">Happy Little Minds</h1>
        <p className="text-purple-200 text-sm mt-1">Katalog Buku Anak Import</p>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="flex gap-3 mb-5 justify-center flex-wrap">
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2 text-center">
            <div className="text-lg font-bold text-blue-700">{readyCount}</div>
            <div className="text-xs text-blue-500">Ready Stock</div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2 text-center">
            <div className="text-lg font-bold text-green-700">{poCount}</div>
            <div className="text-xs text-green-500">Pre-Order (PO)</div>
          </div>
        </div>

        {/* Search + Filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <input
            type="text"
            placeholder="Cari judul atau publisher..."
            className="flex-1 border border-purple-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-200"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="flex gap-2">
            {(["all", "ready_stock", "available"] as FilterStatus[]).map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all border ${
                  filter === s
                    ? "bg-purple-600 text-white border-purple-600 shadow"
                    : "bg-white text-gray-500 border-gray-200 hover:border-purple-300"
                }`}
              >
                {s === "all" ? "Semua" : s === "ready_stock" ? "📦 Ready Stock" : "🛒 Pre-Order"}
              </button>
            ))}
          </div>
        </div>

        {/* Book list */}
        {loading ? (
          <div className="text-center text-purple-300 py-16 text-sm">⏳ Memuat katalog...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-gray-400 py-16 text-sm">📭 Tidak ada buku yang sesuai filter.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((book) => (
              <div key={book.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col">
                {/* Status badge */}
                <div className={`rounded-t-2xl px-4 py-2 text-xs font-semibold ${
                  book.status === "ready_stock"
                    ? "bg-blue-500 text-white"
                    : "bg-green-500 text-white"
                }`}>
                  {book.status === "ready_stock" ? "📦 Ready Stock" : "🛒 Pre-Order (PO)"}
                </div>

                <div className="p-4 flex flex-col flex-1">
                  {/* Publisher */}
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full w-fit mb-2">{book.publisher}</span>

                  {/* Title */}
                  <h3 className="font-bold text-gray-800 text-sm leading-snug mb-2 flex-1">{book.title}</h3>

                  {/* Format */}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium w-fit mb-3 ${FORMAT_BADGE[book.format] ?? "bg-gray-100 text-gray-700"}`}>
                    {FORMAT_LABELS[book.format]}
                  </span>

                  {/* Price */}
                  <div className="text-base font-bold text-purple-700 mb-4">{formatIDR(book.price_idr)}</div>

                  {/* Order button */}
                  <button
                    onClick={() => orderViaWA(book)}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all hover:shadow-md"
                    style={{ background: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)" }}
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    Order via WhatsApp
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-gray-400 mt-10 pb-4">
          Happy Little Minds - Buku Anak Import Berkualitas
        </div>
      </div>
    </div>
  );
}
