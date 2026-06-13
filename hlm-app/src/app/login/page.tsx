"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase";

export default function LoginPage() {
  const supabase = supabaseBrowser();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError("Email atau password salah.");
      return;
    }
    router.replace("/");
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "linear-gradient(180deg, #6d28d9 0%, #7c3aed 40%, #8b5cf6 100%)" }}>
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">📖</div>
          <h1 className="text-xl font-bold text-gray-800">Happy Little Minds</h1>
          <p className="text-sm text-gray-400">Order Manager — Login Admin</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-3">
          <label className="text-sm flex flex-col gap-1">
            <span className="text-gray-600 font-medium text-xs">Email</span>
            <input type="email" required
              className="border border-gray-200 rounded-lg px-3 py-2 bg-white text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
              value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@hlm.com" />
          </label>
          <label className="text-sm flex flex-col gap-1">
            <span className="text-gray-600 font-medium text-xs">Password</span>
            <input type="password" required
              className="border border-gray-200 rounded-lg px-3 py-2 bg-white text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
              value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </label>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)" }}>
            {loading ? "Memproses..." : "Masuk"}
          </button>
        </form>
      </div>
    </div>
  );
}
