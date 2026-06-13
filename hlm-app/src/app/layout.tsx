import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Shell from "./Shell";

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
  description: "Manajemen penjualan buku import anak Happy Little Minds",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`} style={{ background: "var(--background)", color: "var(--foreground)" }}>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
