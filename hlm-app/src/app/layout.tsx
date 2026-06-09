import type { Metadata } from "next";
import localFont from "next/font/local";
import Link from "next/link";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "HLM Order Manager",
  description: "Manajemen penjualan buku import HLM",
};

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/customers", label: "Customer" },
  { href: "/books", label: "Buku / PO" },
  { href: "/orders", label: "Compile Order" },
  { href: "/invoices", label: "Invoice" },
  { href: "/shipments", label: "Antrian Kirim" },
  { href: "/tracking", label: "Resi" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50 text-gray-900`}
      >
        <div className="min-h-screen flex flex-col md:flex-row">
          <nav className="md:w-56 bg-white border-b md:border-b-0 md:border-r border-gray-200 md:min-h-screen">
            <div className="px-4 py-4 font-semibold text-lg border-b border-gray-100">
              HLM Order Manager
            </div>
            <ul className="flex md:flex-col overflow-x-auto md:overflow-visible">
              {NAV.map((item) => (
                <li key={item.href} className="shrink-0">
                  <Link
                    href={item.href}
                    className="block px-4 py-3 text-sm hover:bg-gray-100 whitespace-nowrap"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <main className="flex-1 p-4 md:p-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
