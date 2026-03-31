import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function AdminPayments() {
  const navigate = useNavigate();
  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080/api";
  const token = localStorage.getItem("token");

  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!token) {
      navigate("/auth");
      return;
    }
    loadPayments();
  }, [token]);

  async function loadPayments() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/admin-api/payments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Payments fetch failed (${res.status})`);
      const data = await res.json();
      setPayments(Array.isArray(data) ? data : data.payments ?? []);
    } catch (err) {
      setError(err.message || "Failed to load payments");
    } finally {
      setLoading(false);
    }
  }

  const filteredPayments = payments.filter((p) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      String(p.paymentId || "").toLowerCase().includes(q) ||
      String(p.orderId || "").toLowerCase().includes(q) ||
      String(p.user?.name || "").toLowerCase().includes(q) ||
      String(p.user?.email || "").toLowerCase().includes(q) ||
      String(p.busId || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50 to-white text-gray-800">
      <header className="bg-red-700 text-white py-4 shadow sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Admin • Payments</h1>
          <button
            onClick={() => navigate("/admin")}
            className="bg-white text-red-700 px-3 py-1 rounded font-semibold"
          >
            ⬅ Back
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        <div className="flex justify-between items-center mb-4">
          <input
            type="text"
            placeholder="Search by Payment ID, Order ID or User"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="border px-3 py-2 rounded w-72"
          />
          <button
            onClick={loadPayments}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            🔄 Refresh
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading payments...</div>
        ) : error ? (
          <div className="text-center text-red-600">{error}</div>
        ) : filteredPayments.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No payments found.</div>
        ) : (
          <div className="overflow-x-auto bg-white rounded-lg shadow border border-gray-100">
            <table className="min-w-full text-sm text-left border-collapse">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className="px-4 py-3 border-b">#</th>
                  <th className="px-4 py-3 border-b">Payment ID</th>
                  <th className="px-4 py-3 border-b">Order ID</th>
                  <th className="px-4 py-3 border-b">User</th>
                  <th className="px-4 py-3 border-b">Bus</th>
                  <th className="px-4 py-3 border-b">Amount (₹)</th>
                  <th className="px-4 py-3 border-b">Status</th>
                  <th className="px-4 py-3 border-b">Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((p, i) => (
                  <tr key={p.id || i} className="hover:bg-gray-50 border-b">
                    <td className="px-4 py-3">{i + 1}</td>
                    <td className="px-4 py-3 font-mono text-xs">{p.paymentId || "-"}</td>
                    <td className="px-4 py-3 font-mono text-xs">{p.orderId || "-"}</td>
                    <td className="px-4 py-3">
                      {p.user?.name || p.user?.email || p.email || "-"}
                    </td>
                    <td className="px-4 py-3">{p.busId || "-"}</td>
                    <td className="px-4 py-3 font-semibold text-green-700">{p.amount}</td>
                    <td className="px-4 py-3">
                      {p.status?.toLowerCase() === "success" || p.status?.toLowerCase() === "paid" ? (
                        <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-700">
                          Paid
                        </span>
                      ) : p.status?.toLowerCase() === "failed" ? (
                        <span className="px-2 py-1 text-xs rounded bg-red-100 text-red-700">
                          Failed
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-700">
                          {p.status || "Pending"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {p.createdAt ? new Date(p.createdAt).toLocaleString() : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
