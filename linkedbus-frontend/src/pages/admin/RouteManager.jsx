// src/pages/admin/RouteManager.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

/**
 * RouteManager - Admin page to manage routes
 * Expected endpoints:
 *  GET /admin-api/routes
 *  POST /admin-api/routes
 *  PUT /admin-api/routes/:id
 *  DELETE /admin-api/routes/:id
 */

export default function RouteManager() {
  const navigate = useNavigate();
  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080/api";
  const token = localStorage.getItem("token");

  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      navigate("/auth");
      return;
    }
    fetchRoutes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchRoutes = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/admin-api/routes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Failed to load routes: ${res.status}`);
      const d = await res.json();
      const list = Array.isArray(d) ? d : d.routes || d;
      setRoutes(list);
    } catch (err) {
      console.error("fetchRoutes", err);
      setError(err.message || "Failed to load routes");
    } finally {
      setLoading(false);
    }
  };

  const quickAddRoute = async () => {
    const created = { from: "CityX", to: "CityY", duration: "4h", distance: 200 };
    // optimistic
    setRoutes((s) => [created, ...s]);
    try {
      const res = await fetch(`${API_BASE}/admin-api/routes`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(created),
      });
      if (!res.ok) {
        setMessage("Create failed — reloading");
        fetchRoutes();
        return;
      }
      const real = await res.json();
      setRoutes((s) => s.map((r) => (r === created ? real : r)));
      setMessage("Route created");
    } catch (err) {
      console.error("quickAddRoute", err);
      setMessage("Create failed");
      fetchRoutes();
    }
  };

  const deleteRoute = async (r) => {
    if (!window.confirm(`Delete route ${r.from} → ${r.to}?`)) return;
    setRoutes((s) => s.filter((x) => x.id !== r.id));
    try {
      const res = await fetch(`${API_BASE}/admin-api/routes/${r.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
      setMessage("Deleted");
    } catch (err) {
      console.error("deleteRoute", err);
      setMessage("Delete failed — refreshing");
      fetchRoutes();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Route Management</h1>
            <p className="text-sm text-gray-600">Add and manage routes.</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/admin")} className="px-3 py-1 rounded bg-gray-100">Back</button>
            <button onClick={fetchRoutes} className="px-3 py-1 rounded bg-blue-600 text-white">Refresh</button>
            <button onClick={quickAddRoute} className="px-3 py-1 rounded bg-green-600 text-white">Quick Add</button>
          </div>
        </div>

        <div className="bg-white rounded shadow overflow-x-auto">
          {error && <div className="p-4 text-red-600">{error}</div>}

          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 text-xs uppercase text-gray-600">
              <tr>
                <th className="px-4 py-3 text-left">From</th>
                <th className="px-4 py-3 text-left">To</th>
                <th className="px-4 py-3 text-left">Distance</th>
                <th className="px-4 py-3 text-left">Duration</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {!loading && routes.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-6 text-center text-gray-500">No routes</td>
                </tr>
              ) : (
                routes.map((r) => (
                  <tr key={r.id || `${r.from}-${r.to}`} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3">{r.from}</td>
                    <td className="px-4 py-3">{r.to}</td>
                    <td className="px-4 py-3">{r.distance ?? "-"}</td>
                    <td className="px-4 py-3">{r.duration ?? "-"}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => navigate(`/admin/routes/${r.id || ""}/edit`)} className="px-2 py-1 rounded border text-sm">Edit</button>
                        <button onClick={() => deleteRoute(r)} className="px-2 py-1 rounded border text-sm text-red-600">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {message && <div className="mt-4 text-sm text-gray-700">{message} <button className="ml-3 text-blue-600 underline" onClick={() => setMessage("")}>Dismiss</button></div>}
      </div>
    </div>
  );
}
