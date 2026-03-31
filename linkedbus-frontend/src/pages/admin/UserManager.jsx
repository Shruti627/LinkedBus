import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";

/**
 * UserManager - Admin user management UI
 * Endpoints required:
 *  GET  /admin-api/users
 *  GET  /admin-api/users/:id/bookings
 *  POST /admin-api/users/:id/block?reason=...
 *  POST /admin-api/users/:id/unblock
 *  DELETE /admin-api/users/:id
 */
export default function UserManager() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080/api";

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [onlyActive, setOnlyActive] = useState(false);
  const [message, setMessage] = useState("");

  // Modal state for bookings
  const [modalOpen, setModalOpen] = useState(false);
  const [modalUser, setModalUser] = useState(null);
  const [modalBookings, setModalBookings] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");

  useEffect(() => {
    if (!token) {
      navigate("/auth");
      return;
    }
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // helper: stable id for user (support id or _id)
  const userIdOf = (u) => u?.id ?? u?._id ?? u?.userId ?? null;

  const fetchUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/admin-api/users`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (res.status === 401) {
        navigate("/auth");
        return;
      }
      if (!res.ok) throw new Error(`Failed to fetch users: ${res.status}`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.users || data;
      setUsers(list);
    } catch (err) {
      console.error("fetchUsers", err);
      setError(err.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      const uid = String(userIdOf(u) ?? "");
      if (onlyActive && u.blocked) return false;
      if (!q) return true;
      return (
        String(u.name || "").toLowerCase().includes(q) ||
        String(u.email || "").toLowerCase().includes(q) ||
        uid.toLowerCase().includes(q)
      );
    });
  }, [users, query, onlyActive]);

  // 📦 View bookings modal
  const handleViewBookings = async (user) => {
    const uid = userIdOf(user);
    if (!uid) {
      alert("Cannot view bookings: user id is missing.");
      return;
    }

    setModalOpen(true);
    setModalUser(user);
    setModalBookings([]);
    setModalError("");
    setModalLoading(true);

    try {
      const res = await fetch(
        `${API_BASE}/admin-api/users/${encodeURIComponent(uid)}/bookings`,
        {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        }
      );
      if (res.status === 401) {
        // token expired
        setModalError("Unauthorized — please re-login.");
        navigate("/auth");
        return;
      }
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Failed to fetch bookings: ${res.status}${txt ? ` - ${txt.slice(0,200)}` : ""}`);
      }
      const d = await res.json();
      // bookings can come as array or { bookings: [...] }
      const list = Array.isArray(d) ? d : d.bookings || [];
      setModalBookings(list);
    } catch (err) {
      console.error("fetchBookings", err);
      setModalError(err.message || "Failed to load bookings");
    } finally {
      setModalLoading(false);
    }
  };

  // 🚫 Block or Unblock user
  const doToggleBlock = async (user, block = true) => {
    const uid = userIdOf(user);
    if (!uid) {
      alert("Cannot perform action: user id missing.");
      return;
    }

    let reason = "";
    if (block) {
      reason = prompt(`Enter reason for blocking ${user.name || user.email}:`) || "";
      if (reason.trim() === "") {
        alert("You must provide a reason to block this user.");
        return;
      }
    }

    try {
      const url = `${API_BASE}/admin-api/users/${encodeURIComponent(uid)}/${block ? "block" : "unblock"}`;
      const finalUrl = block ? `${url}?reason=${encodeURIComponent(reason)}` : url;
      const res = await fetch(finalUrl, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Server returned ${res.status}${txt ? ` - ${txt.slice(0,200)}` : ""}`);
      }

      setMessage(`${block ? "Blocked" : "Unblocked"} ${user.name || user.email}`);
      // refresh the single user state: better than refetch all
      await fetchUsers();
    } catch (err) {
      console.error("toggleBlock", err);
      setMessage("Action failed — refreshing list");
      await fetchUsers();
    }
  };

  // ❌ Delete user
  const handleDeleteUser = async (user) => {
    const uid = userIdOf(user);
    if (!uid) {
      alert("Cannot delete: user id missing.");
      return;
    }
    if (!window.confirm(`Permanently delete user ${user.name || user.email}?`)) return;
    try {
      const res = await fetch(`${API_BASE}/admin-api/users/${encodeURIComponent(uid)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Delete failed: ${res.status}${txt ? ` - ${txt.slice(0,200)}` : ""}`);
      }
      setMessage(`Deleted ${user.name || user.email}`);
      setUsers((s) => s.filter((u) => userIdOf(u) !== uid));
    } catch (err) {
      console.error("deleteUser", err);
      setMessage(err.message || "Delete failed");
      await fetchUsers();
    }
  };

  // helpers for showing booking info (many possible shapes)
  const bookingTitle = (b) => b.tripName ?? b.trip?.name ?? `${b.from ?? b.bus?.source ?? "-"} → ${b.to ?? b.bus?.destination ?? "-"}`;
  const bookingSeats = (b) => {
    if (Array.isArray(b.seats)) {
      return b.seats.map(s => s.seatNumber ?? s.label ?? s.name ?? s).join(", ");
    }
    return b.seats ?? b.seatNumbers ?? b.seat ?? "-";
  };
  const bookingAmount = (b) => b.amount ?? b.fare ?? b.totalFare ?? "-";
  const bookingWhen = (b) => {
    const t = b.createdAt ?? b.bookedAt ?? b.bookingTime ?? b.date;
    if (!t) return "-";
    try {
      const d = new Date(t);
      if (isNaN(d.getTime())) return String(t);
      return d.toLocaleString();
    } catch {
      return String(t);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">User Management</h1>
            <p className="text-sm text-gray-600">View, search, block/unblock and delete users.</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/admin")} className="px-3 py-1 rounded bg-gray-100">Back</button>
            <button onClick={fetchUsers} className="px-3 py-1 rounded bg-blue-600 text-white">Refresh</button>
          </div>
        </div>

        {/* 🔍 Filter bar */}
        <div className="bg-white p-4 rounded shadow mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <input
                className="px-3 py-1 border rounded"
                placeholder="Search by name, email or id"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={onlyActive}
                  onChange={(e) => setOnlyActive(e.target.checked)}
                />
                Active only
              </label>
            </div>
            <div className="text-sm text-gray-500">
              {loading ? "Loading users..." : `${users.length} total`}
            </div>
          </div>
        </div>

        {/* 📋 Users table */}
        <div className="bg-white rounded shadow overflow-x-auto">
          {error && <div className="p-4 text-red-600">{error}</div>}

          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 text-xs uppercase text-gray-600">
              <tr>
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Phone</th>
                <th className="px-4 py-3 text-left">City</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Reason</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 && !loading ? (
                <tr>
                  <td colSpan="8" className="p-6 text-center text-gray-500">
                    No users match your criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const uid = userIdOf(u) ?? "(no-id)";
                  return (
                    <tr key={uid} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3">{uid}</td>
                      <td className="px-4 py-3 font-medium">{u.name || "-"}</td>
                      <td className="px-4 py-3">{u.email}</td>
                      <td className="px-4 py-3">{u.phone || u.phoneNumber || "-"}</td>
                      <td className="px-4 py-3">{u.city || "-"}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            u.blocked ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                          }`}
                        >
                          {u.blocked ? "Blocked" : "Active"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-sm">
                        {u.blocked ? u.reason || "-" : "-"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleViewBookings(u)}
                            className="px-2 py-1 rounded border text-sm"
                          >
                            View Bookings
                          </button>
                          {!u.blocked ? (
                            <button
                              onClick={() => doToggleBlock(u, true)}
                              className="px-2 py-1 rounded border text-sm text-yellow-600"
                            >
                              Block
                            </button>
                          ) : (
                            <button
                              onClick={() => doToggleBlock(u, false)}
                              className="px-2 py-1 rounded border text-sm text-green-600"
                            >
                              Unblock
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteUser(u)}
                            className="px-2 py-1 rounded border text-sm text-red-600"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Snackbar */}
        {message && (
          <div className="mt-4 text-sm text-gray-700">
            {message}{" "}
            <button
              className="ml-3 text-blue-600 underline"
              onClick={() => setMessage("")}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* 🪟 Bookings Modal */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center p-6">
            <div className="absolute inset-0 bg-black/40" onClick={() => setModalOpen(false)} />
            <div
              className="relative bg-white rounded-lg shadow-lg max-w-3xl w-full z-10 overflow-auto"
              style={{ maxHeight: "80vh" }}
            >
              <div className="p-4 border-b flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">
                    Bookings for {modalUser?.name || modalUser?.email}
                  </h3>
                  <p className="text-xs text-gray-500">{userIdOf(modalUser)}</p>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  className="px-3 py-1 rounded bg-gray-100"
                >
                  Close
                </button>
              </div>

              <div className="p-4">
                {modalLoading ? (
                  <div className="text-gray-600">Loading bookings...</div>
                ) : modalError ? (
                  <div className="text-red-600">{modalError}</div>
                ) : modalBookings.length === 0 ? (
                  <div className="text-gray-500">No bookings found for this user.</div>
                ) : (
                  <ul className="space-y-3">
                    {modalBookings.map((b) => (
                      <li key={b.id ?? b._id} className="border p-3 rounded">
                        <div className="flex justify-between">
                          <div>
                            <div className="font-medium">{bookingTitle(b)}</div>
                            <div className="text-xs text-gray-500">
                              {bookingWhen(b)}
                            </div>
                            <div className="text-sm mt-1">Seats: {bookingSeats(b)}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold">₹{bookingAmount(b)}</div>
                            <div className="text-xs text-gray-500 capitalize mt-1">{b.status ?? "-"}</div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
