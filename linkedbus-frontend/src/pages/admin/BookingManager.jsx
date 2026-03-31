// src/pages/admin/BookingManager.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function BookingManager() {
  const navigate = useNavigate();
  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080/api";
  const token = localStorage.getItem("token");

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      navigate("/auth");
      return;
    }
    fetchBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Helper that safely renders values (prevents "Objects are not valid as a React child")
  function renderValue(v) {
    if (v === null || v === undefined) return "-";
    if (typeof v === "string" || typeof v === "number") return v;
    if (Array.isArray(v)) {
      return v
        .map((item) => {
          if (item === null || item === undefined) return "-";
          if (typeof item === "string" || typeof item === "number") return String(item);
          if (typeof item === "object") {
            if (item.seatNumber !== undefined) return String(item.seatNumber);
            if (item.name !== undefined) return String(item.name);
            if (item.id !== undefined) return String(item.id);
            // fallback to short JSON
            try {
              return JSON.stringify(item);
            } catch {
              return String(item);
            }
          }
          return String(item);
        })
        .join(", ");
    }
    if (typeof v === "object") {
      // common object shapes: user {name}, amount {value} or {amount}
      if (v.name) return v.name;
      if (v.userName) return v.userName;
      if (v.seatNumber !== undefined) return String(v.seatNumber);
      if (v.amount !== undefined && (typeof v.amount === "string" || typeof v.amount === "number"))
        return String(v.amount);
      if (v.value !== undefined) return String(v.value);
      if (v.price !== undefined) return String(v.price);
      // fallback: short JSON
      try {
        return JSON.stringify(v);
      } catch {
        return String(v);
      }
    }
    return String(v);
  }

  const fetchBookings = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/admin-api/bookings?limit=50`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Failed to load bookings: ${res.status}`);
      const d = await res.json();
      const list = Array.isArray(d) ? d : d.bookings || d;
      setBookings(list);
    } catch (err) {
      console.error("fetchBookings", err);
      setError(err.message || "Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  const changeStatus = async (bk, status) => {
    if (!window.confirm(`Change status to "${status}" for booking ${bk.id}?`)) return;

    // optimistic with rollback
    const prev = bookings.slice();
    setBookings((s) => s.map((b) => (b.id === bk.id ? { ...b, status } : b)));
    try {
      const res = await fetch(`${API_BASE}/admin-api/bookings/${encodeURIComponent(bk.id)}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ...bk, status }),
      });
      if (!res.ok) {
        // attempt to read response text for debug
        let txt = "";
        try {
          txt = await res.text();
        } catch {}
        throw new Error(`Status update failed: ${res.status} ${txt ? "- " + txt.slice(0, 200) : ""}`);
      }
      setMessage("Status updated");
    } catch (err) {
      console.error("changeStatus", err);
      setMessage("Update failed — reverting");
      setBookings(prev);
      // refresh to recover consistent state
      fetchBookings();
    }
  };

  const processRefund = async (bk) => {
    if (!window.confirm(`Process refund for booking ${bk.id}?`)) return;

    // optimistic with rollback
    const prev = bookings.slice();
    setBookings((s) => s.map((b) => (b.id === bk.id ? { ...b, status: "refunded" } : b)));

    try {
      const refundUrl = `${API_BASE}/admin-api/bookings/${encodeURIComponent(bk.id)}/refund`;
      const resRefund = await fetch(refundUrl, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (resRefund.ok) {
        setMessage("Refund processed");
        return;
      }

      // fallback: PUT status
      const res = await fetch(`${API_BASE}/admin-api/bookings/${encodeURIComponent(bk.id)}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ...bk, status: "refunded" }),
      });
      if (!res.ok) {
        let txt = "";
        try {
          txt = await res.text();
        } catch {}
        throw new Error(`Refund failed: ${res.status} ${txt ? "- " + txt.slice(0, 200) : ""}`);
      }
      setMessage("Refund processed");
    } catch (err) {
      console.error("processRefund", err);
      setMessage("Refund failed — reverting");
      setBookings(prev);
      fetchBookings();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Booking Management</h1>
            <p className="text-sm text-gray-600">View, edit and refund bookings.</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/admin")} className="px-3 py-1 rounded bg-gray-100">Back</button>
            <button onClick={fetchBookings} className="px-3 py-1 rounded bg-blue-600 text-white">Refresh</button>
          </div>
        </div>

        <div className="bg-white rounded shadow overflow-x-auto">
          {error && <div className="p-4 text-red-600">{error}</div>}

          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 text-xs uppercase text-gray-600">
              <tr>
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">User</th>
                <th className="px-4 py-3 text-left">Trip</th>
                <th className="px-4 py-3 text-left">Seats</th>
                <th className="px-4 py-3 text-left">Amount</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {!loading && bookings.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-6 text-center text-gray-500">No bookings</td>
                </tr>
              ) : (
                bookings.map((b) => (
                  <tr key={b.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3">{renderValue(b.id)}</td>
                    <td className="px-4 py-3 font-medium">{renderValue(b.userName || b.user?.name || b.userEmail || b.user)}</td>
                    <td className="px-4 py-3">{renderValue(b.from ? `${b.from} → ${b.to}` : b.tripName)}</td>
                    <td className="px-4 py-3">{renderValue(b.seats ?? b.seatNumbers ?? b.seat)}</td>
                    <td className="px-4 py-3">₹{renderValue(b.amount ?? b.fare ?? b.totalFare ?? b.price)}</td>
                    <td className="px-4 py-3">{renderValue(b.status)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => changeStatus(b, "confirmed")}
                          className="px-2 py-1 rounded border text-sm"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => changeStatus(b, "cancelled")}
                          className="px-2 py-1 rounded border text-sm"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => processRefund(b)}
                          className="px-2 py-1 rounded border text-sm text-yellow-600"
                        >
                          Refund
                        </button>
                        <button
                          onClick={() => navigate(`/admin/bookings/${encodeURIComponent(b.id)}`)}
                          className="px-2 py-1 rounded border text-sm"
                        >
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}

              {loading && (
                <tr>
                  <td colSpan="7" className="p-6 text-center text-gray-500">Loading bookings…</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {message && (
          <div className="mt-4 text-sm text-gray-700">
            {message} <button className="ml-3 text-blue-600 underline" onClick={() => setMessage("")}>Dismiss</button>
          </div>
        )}
      </div>
    </div>
  );
}
