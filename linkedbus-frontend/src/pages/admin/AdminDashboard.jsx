import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080/api";
  const token = localStorage.getItem("token");

  const [users, setUsers] = useState([]);
  const [recentBookings, setRecentBookings] = useState([]);
  const [stats, setStats] = useState({});

  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);

  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [onlyActive, setOnlyActive] = useState(false);

  useEffect(() => {
    if (!token) {
      navigate("/auth");
      return;
    }

    loadUsers();
    loadRecentBookings();
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function loadUsers() {
    setLoadingUsers(true);
    setError("");
    try {
      const url = `${API_BASE}/admin-api/users`;
      const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error(`Users failed (${r.status})`);
      const d = await r.json();
      setUsers(Array.isArray(d) ? d : d.users ?? []);
    } catch (e) {
      setError(e.message || "Failed to load users");
    } finally {
      setLoadingUsers(false);
    }
  }

  async function loadRecentBookings() {
    setLoadingBookings(true);
    try {
      const url = `${API_BASE}/admin-api/recent-bookings?limit=8`;
      const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error(`Bookings failed (${r.status})`);
      const d = await r.json();
      setRecentBookings(Array.isArray(d) ? d : d.bookings ?? []);
    } catch (e) {
      setError(e.message || "Failed to load bookings");
    } finally {
      setLoadingBookings(false);
    }
  }

  async function loadStats() {
    setLoadingStats(true);
    try {
      const url = `${API_BASE}/admin-api/dashboard-stats`;
      const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error(`Stats failed (${r.status})`);
      const d = await r.json();
      setStats({
        totalUsers: d.totalUsers ?? d.users ?? 0,
        totalBlocked: d.totalBlocked ?? d.blockedUsers ?? 0,
        todaysBookings: d.todaysBookings ?? d.todayBookings ?? 0,
        revenueToday: d.revenueToday ?? d.todayRevenue ?? 0,
        activeBuses: d.activeBuses ?? d.active ?? 0,
      });
    } catch (e) {
      setError(e.message || "Failed to load stats");
    } finally {
      setLoadingStats(false);
    }
  }

  // helper to get stable id (support id or _id)
  const userIdOf = (u) => u?.id ?? u?._id ?? String(u?.id ?? u?._id ?? "");

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      const idStr = String(userIdOf(u)).toLowerCase();
      if (onlyActive && u.blocked) return false;
      if (!q) return true;
      return (
        String(u.name || "").toLowerCase().includes(q) ||
        String(u.email || "").toLowerCase().includes(q) ||
        idStr.includes(q)
      );
    });
  }, [users, query, onlyActive]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/auth");
  };

  // UI helpers styled to match RedBus look
  const StatCard = ({ title, value, subtitle }) => (
    <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-col gap-2 border border-gray-100">
      <div className="text-xs text-gray-500">{title}</div>
      <div className="text-2xl font-bold text-red-600">{value}</div>
      {subtitle && <div className="text-xs text-gray-400">{subtitle}</div>}
    </div>
  );

  const Skeleton = ({ className = "h-4 w-full rounded bg-gray-200" }) => (
    <div className={`animate-pulse ${className}`} />
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50 to-white text-gray-800">
      {/* Top navigation — mirrors the HomePage branding */}
      <header className="fixed top-0 left-0 right-0 z-40 backdrop-blur-sm bg-white/70 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-md bg-red-600 flex items-center justify-center text-white font-bold text-lg">RB</div>
              <div className="hidden sm:block">
                <h2 className="text-lg font-extrabold text-red-600">RedBus Admin</h2>
                <p className="text-xs text-gray-600">Operations & analytics</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/')} className="px-3 py-2 rounded-md text-sm bg-gray-100">View site</button>
              <button onClick={handleLogout} className="px-3 py-2 rounded-md bg-red-600 text-white text-sm">Logout</button>
            </div>
          </div>
        </div>
      </header>

      {/* spacer */}
      <div className="h-16" />

      <main className="max-w-7xl mx-auto p-6">
        {/* top summary cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {loadingStats ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100">
                <Skeleton className="h-6 w-32 mb-2" />
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-3 w-24 mt-3" />
              </div>
            ))
          ) : (
            <>
              <StatCard title="Total users" value={stats.totalUsers ?? 0} subtitle={`${stats.totalBlocked ?? 0} blocked`} />
              <StatCard title="Today's bookings" value={stats.todaysBookings ?? 0} subtitle={`Revenue: ₹${stats.revenueToday ?? 0}`} />
              <StatCard title="Active buses" value={stats.activeBuses ?? 0} subtitle="Live across routes" />
              <div className="bg-white rounded-2xl p-4 border border-gray-100 flex flex-col justify-between">
                <div className="text-xs text-gray-500">Quick actions</div>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => navigate('/admin/bookings')} className="flex-1 px-3 py-2 rounded-md border text-sm">Manage bookings</button>
                  <button onClick={() => navigate('/admin/users')} className="flex-1 px-3 py-2 rounded-md bg-red-600 text-white text-sm">Manage users</button>
                </div>
              </div>
            </>
          )}
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl shadow p-4 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Registered users</h2>
              <div className="flex items-center gap-3">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search name, email or id"
                  className="px-3 py-2 border rounded-md text-sm"
                />
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={onlyActive} onChange={(e) => setOnlyActive(e.target.checked)} />
                  Active only
                </label>
              </div>
            </div>

            {loadingUsers ? (
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 border rounded-md">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-48 mb-2" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-5 w-20" />
                  </div>
                ))}
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-gray-500">No users found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm divide-y">
                  <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                    <tr>
                      <th className="px-4 py-3 text-left">ID</th>
                      <th className="px-4 py-3 text-left">Name</th>
                      <th className="px-4 py-3 text-left">Email</th>
                      <th className="px-4 py-3 text-left">Phone</th>
                      <th className="px-4 py-3 text-left">City</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {filteredUsers.map((u) => {
                      const uid = userIdOf(u);
                      return (
                        <tr
                          key={uid}
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => navigate(`/admin/users/${uid}`)}
                        >
                          <td className="px-4 py-3 align-middle" onClick={(e) => e.stopPropagation()}>{uid}</td>
                          <td className="px-4 py-3 align-middle font-medium" onClick={(e) => e.stopPropagation()}>{u.name}</td>
                          <td className="px-4 py-3 align-middle" onClick={(e) => e.stopPropagation()}>{u.email}</td>
                          <td className="px-4 py-3 align-middle" onClick={(e) => e.stopPropagation()}>{u.phone || "-"}</td>
                          <td className="px-4 py-3 align-middle" onClick={(e) => e.stopPropagation()}>{u.city || "-"}</td>
                          <td className="px-4 py-3 align-middle" onClick={(e) => e.stopPropagation()}>
                            {u.blocked ? (
                              <span className="inline-block px-2 py-1 text-xs rounded-md bg-red-50 text-red-600">Blocked</span>
                            ) : (
                              <span className="inline-block px-2 py-1 text-xs rounded-md bg-green-50 text-green-600">Active</span>
                            )}
                          </td>
                          <td className="px-4 py-3 align-middle" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-2">
                              <button
                                className="px-2 py-1 text-xs border rounded-md"
                                onClick={() => navigate(`/admin/users/${uid}`)}
                              >
                                View
                              </button>
                              <button
                                className={`px-2 py-1 text-xs rounded-md ${u.blocked ? 'bg-green-600 text-white' : 'border'}`}
                                onClick={async () => {
                                  // prevent double-click / row navigation
                                  // optimistic UI update, but restore on error
                                  const orig = users;
                                  setUsers(users.map(x => (userIdOf(x) === uid ? { ...x, blocked: !x.blocked } : x)));
                                  try {
                                    // try POST or PUT depending on your API - adjust if needed
                                    const resp = await fetch(`${API_BASE}/admin-api/users/${uid}/toggle-block`, {
                                      method: 'POST',
                                      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
                                    });
                                    if (!resp.ok) throw new Error(`Failed (${resp.status})`);
                                  } catch (e) {
                                    setUsers(orig);
                                    setError('Failed to update user');
                                  }
                                }}
                              >
                                {u.blocked ? 'Unblock' : 'Block'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <aside className="bg-white rounded-xl shadow p-4 border border-gray-100">
            <h3 className="font-semibold mb-3">Recent bookings</h3>

            {loadingBookings ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="p-3 border rounded-md">
                    <Skeleton className="h-4 w-36 mb-2" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                ))}
              </div>
            ) : recentBookings.length === 0 ? (
              <div className="text-gray-500">No recent bookings.</div>
            ) : (
              <ul className="space-y-3">
                {recentBookings.map((b) => {
                  const from = b.from ?? b.bus?.source ?? b.origin ?? "-";
                  const to = b.to ?? b.bus?.destination ?? b.destination ?? "-";
                  return (
                    <li key={b.id ?? b._id} className="border rounded-md p-3">
                      <div className="text-sm font-medium">{b.userName || b.user?.name || 'Unknown'}</div>
                      <div className="text-xs text-gray-500">{from} → {to}</div>
                      <div className="text-sm mt-1">₹{b.amount ?? b.fare ?? '-'}</div>
                      <div className="text-xs text-gray-400 mt-1">{new Date(b.createdAt || Date.now()).toLocaleString()}</div>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="mt-4">
              <button onClick={() => navigate('/admin/bookings')} className="w-full px-3 py-2 rounded-md bg-red-600 text-white">Manage bookings</button>
            </div>
          </aside>
        </section>

        {error && (
          <div className="mt-4 text-sm text-red-600 flex items-center gap-3">
            <span>{error}</span>
            <button onClick={() => setError("")} className="text-blue-600 underline">Dismiss</button>
          </div>
        )}
      </main>

      <footer className="bg-gray-900 text-white mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between">
          <div>
            <p className="font-semibold">LinkedBus Admin</p>
            <p className="text-sm text-gray-400">© {new Date().getFullYear()}</p>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-300">
            <button className="hover:text-white">Settings</button>
            <button className="hover:text-white">Support</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
