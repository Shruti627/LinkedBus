import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

export default function AdminUserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080/api";
  const token = localStorage.getItem("token");

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      navigate("/auth");
      return;
    }
    fetchUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, token]);

  async function fetchUser() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/admin-api/users/${encodeURIComponent(id)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Failed to load user (${res.status})`);
      const d = await res.json();
      setUser(d);
    } catch (e) {
      console.error(e);
      setError(e.message || "Failed to load user");
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="p-6 text-gray-600">Loading user details...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!user) return <div className="p-6 text-gray-600">User not found</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto bg-white p-6 rounded-2xl shadow border border-gray-100">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate(-1)}
            className="px-3 py-1.5 rounded-md border border-gray-200 hover:bg-gray-100 text-sm"
          >
            ← Back
          </button>
          <span className="text-xs text-gray-400">ID: {user.id ?? user._id}</span>
        </div>

        {/* Name & contact */}
        <h1 className="text-2xl font-bold text-gray-900 mb-1">{user.name ?? "Unknown"}</h1>
        <p className="text-sm text-blue-600 mb-4">{user.email ?? "-"}</p>

        {/* Info grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
          <div>
            <div className="text-xs text-gray-500">Phone</div>
            <div className="font-medium text-gray-800">{user.phoneNumber ?? user.phone ?? "-"}</div>
          </div>

          <div>
            <div className="text-xs text-gray-500">Location</div>
            <div className="font-medium text-gray-800">
              {user.city ?? "-"}
              {user.city && user.state ? `, ${user.state}` : ""}
            </div>
          </div>

          <div>
            <div className="text-xs text-gray-500">Role</div>
            <div className="font-medium text-gray-800 capitalize">
              {user.role ?? (user.isAdmin ? "admin" : "user")}
            </div>
          </div>

          <div>
            <div className="text-xs text-gray-500">Status</div>
            <div
              className={`font-medium ${
                user.blocked ? "text-red-600" : "text-green-600"
              }`}
            >
              {user.blocked ? "Blocked" : "Active"}
            </div>
          </div>
        </div>

        {/* Divider */}
        <hr className="my-6 border-gray-200" />

        {/* Raw debug info — commented out for cleaner UI */}
        {/*
        <section>
          <h3 className="font-semibold mb-2 text-gray-700">Raw (debug)</h3>
          <pre className="text-xs bg-gray-50 p-3 rounded overflow-auto max-h-64 border border-gray-100">
            {JSON.stringify(user, null, 2)}
          </pre>
        </section>
        */}
      </div>
    </div>
  );
}
