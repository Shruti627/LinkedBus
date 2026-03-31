// src/pages/admin/AdminHeaders.jsx
import React from "react";
import { NavLink, useNavigate } from "react-router-dom";

const AdminHeaders = ({ onLogout }) => {
  const navigate = useNavigate();

  const storedUser = (() => {
    try {
      return JSON.parse(localStorage.getItem("user")) || null;
    } catch {
      return null;
    }
  })();

  const isAdmin = storedUser && (storedUser.role === "admin" || storedUser.isAdmin === true);
  const displayName = storedUser?.name || storedUser?.email || "Admin";

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      if (onLogout) onLogout();
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      navigate("/");
    }
  };

  if (!isAdmin) return null;

  const linkBase = "px-3 py-1 rounded font-medium text-white transition duration-150 hover:text-yellow-300";
  const activeLink = "text-yellow-300 underline decoration-yellow-300/50";

  return (
    <header className="bg-red-700 shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-6 py-3 flex justify-between items-center">
        <NavLink to="/admin" className="text-xl font-extrabold text-white">
          Admin <span className="text-yellow-300">Panel</span>
        </NavLink>

        <nav className="hidden md:flex items-center space-x-4">
          <NavLink to="/admin/dashboard" className={({ isActive }) => `${linkBase} ${isActive ? activeLink : ""}`}>Dashboard</NavLink>

          {/* admin pages - make sure these routes exist in App.jsx */}
          <NavLink to="/admin/buses" className={({ isActive }) => `${linkBase} ${isActive ? activeLink : ""}`}>Buses</NavLink>
          <NavLink to="/admin/bookings" className={({ isActive }) => `${linkBase} ${isActive ? activeLink : ""}`}>Bookings</NavLink>
          <NavLink to="/admin/payments" className={({ isActive }) => `${linkBase} ${isActive ? activeLink : ""}`}>Payments</NavLink>

          {/* NEW: User Management */}
          <NavLink to="/admin/users" className={({ isActive }) => `${linkBase} ${isActive ? activeLink : ""}`}>Users</NavLink>
        </nav>

        <div className="flex items-center space-x-3">
          <NavLink to="/" className="hidden sm:inline text-white text-sm hover:text-yellow-300">View Site</NavLink>
          <span className="hidden sm:inline text-white">Hi, {String(displayName).split(" ")[0]}</span>
          <button onClick={handleLogout} className="border-2 border-white px-3 py-1 rounded-full hover:bg-white hover:text-red-700 font-semibold text-white transition">Logout</button>

          {/* Mobile dropdown */}
          <div className="md:hidden relative">
            <details className="text-white">
              <summary className="cursor-pointer px-2 py-1">Menu ▾</summary>
              <div className="absolute right-0 mt-2 bg-red-600/95 rounded shadow-lg p-3 flex flex-col space-y-2 w-56">
                <NavLink to="/admin/dashboard" className={({ isActive }) => `${linkBase} ${isActive ? activeLink : ""}`}>Dashboard</NavLink>
                <NavLink to="/admin/buses" className={({ isActive }) => `${linkBase} ${isActive ? activeLink : ""}`}>Buses</NavLink>
                <NavLink to="/admin/bookings" className={({ isActive }) => `${linkBase} ${isActive ? activeLink : ""}`}>Bookings</NavLink>
                <NavLink to="/admin/payments" className={({ isActive }) => `${linkBase} ${isActive ? activeLink : ""}`}>Payments</NavLink>
                <NavLink to="/admin/users" className={({ isActive }) => `${linkBase} ${isActive ? activeLink : ""}`}>Users</NavLink>

                <NavLink to="/" className="text-white hover:text-yellow-300">View Site</NavLink>

                <button onClick={handleLogout} className="px-3 py-1 rounded bg-white text-red-700 font-semibold hover:bg-yellow-200">
                  Logout
                </button>
              </div>
            </details>
          </div>
        </div>
      </div>

      {/* Optional bottom bar */}
      <div className="bg-red-800/80 border-t border-red-900">
        <div className="container mx-auto px-6 py-2 text-sm text-white/90 flex justify-between items-center">
          <span>Admin Dashboard • Manage Buses, Routes, Bookings & Payments</span>
          <div className="hidden sm:flex gap-3">
            <span className="px-2 py-0.5 rounded bg-white/10">Quick Add Trip</span>
            <span className="px-2 py-0.5 rounded bg-white/10">Pending Refunds: 3</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AdminHeaders;
