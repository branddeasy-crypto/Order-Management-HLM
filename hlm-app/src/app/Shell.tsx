"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Dashboard", icon: "🏠" },
  { href: "/customers", label: "Customer", icon: "👩‍👧" },
  { href: "/books", label: "Buku / PO", icon: "📚" },
  { href: "/orders", label: "Compile Order", icon: "📋" },
  { href: "/invoices", label: "Invoice", icon: "🧾" },
  { href: "/shipments", label: "Antrian Kirim", icon: "📦" },
  { href: "/tracking", label: "Resi", icon: "🚚" },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublic = pathname?.startsWith("/status");

  if (isPublic) {
    return <main className="min-h-screen" style={{ background: "var(--background)" }}>{children}</main>;
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <nav className="md:w-60 md:min-h-screen md:flex-shrink-0 flex flex-col"
        style={{ background: "linear-gradient(180deg, #6d28d9 0%, #7c3aed 40%, #8b5cf6 100%)" }}>
        <div className="px-5 py-5 border-b border-purple-500/40">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📖</span>
            <div>
              <div className="font-bold text-white text-base leading-tight">Happy Little Minds</div>
              <div className="text-purple-200 text-xs">Order Manager</div>
            </div>
          </div>
        </div>
        <ul className="flex md:flex-col overflow-x-auto md:overflow-visible py-2 flex-1">
          {NAV.map((item) => (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                className="flex items-center gap-3 px-5 py-2.5 text-sm text-purple-100 hover:bg-white/20 hover:text-white transition-colors whitespace-nowrap rounded-lg mx-2 my-0.5"
              >
                <span className="text-base">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="px-5 py-4 hidden md:block">
          <div className="text-purple-300 text-xs text-center opacity-70">✨ HLM v1.0</div>
        </div>
      </nav>

      <main className="flex-1 p-4 md:p-8 min-h-screen" style={{ background: "var(--background)" }}>
        {children}
      </main>
    </div>
  );
}
