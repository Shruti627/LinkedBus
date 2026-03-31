import React from "react";
import { NavLink, useNavigate } from "react-router-dom";

const Header = ({ isLoggedIn, onLogout }) => {
  const navigate = useNavigate();

  const stored = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  })();

  // determine admin
  const isAdmin = Boolean(stored && (stored.role === "admin" || stored.isAdmin === true));

  const displayName = stored?.name || stored?.email || null;

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      if (onLogout) onLogout();
      // keep clearing localStorage here so auth state resets
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      navigate("/");
    }
  };

  const linkClass =
    "px-1 py-0.5 transition-colors duration-200 text-white font-medium hover:text-yellow-300";

  const activeClass = "text-yellow-300 underline decoration-yellow-300/50";

  return (
    <header className="bg-red-600 shadow-md fixed w-full top-0 z-50">
      <div className="container mx-auto px-6 py-3 flex justify-between items-center">
        <NavLink to="/" className="text-2xl sm:text-3xl font-extrabold text-white tracking-wide hover:text-gray-100 transition">
          Linked<span className="text-yellow-300">Bus</span>
        </NavLink>

        <nav>
          <ul className="flex space-x-6 items-center">
            <li>
              <NavLink to="/" end className={({ isActive }) => `${linkClass} ${isActive ? activeClass : ""}`}>
                Home
              </NavLink>
            </li>

            <li>
              <NavLink to="/bus/1/seats" className={({ isActive }) => `${linkClass} ${isActive ? activeClass : ""}`}>
                Buses
              </NavLink>
            </li>

            <li>
              <NavLink to="/help" className={({ isActive }) => `${linkClass} ${isActive ? activeClass : ""}`}>
                Help
              </NavLink>
            </li>

            {/* <li>
              <NavLink to="/ai-assistant" className={({ isActive }) => `${linkClass} ${isActive ? activeClass : ""}`}>
                AI Assistance
              </NavLink>
            </li> */}

            {/* Show Bookings when user is logged in */}
            {isLoggedIn && (
              <li>
                <NavLink to="/bookings" className={({ isActive }) => `${linkClass} ${isActive ? activeClass : ""}`}>
                  My Bookings
                </NavLink>
              </li>
            )}

            {/* Admin Dashboard visible only for admins */}
            {isAdmin && (
              <li>
                <NavLink
                  to="/admin"
                  className={({ isActive }) =>
                    `px-3 py-1 rounded font-semibold ${isActive ? "bg-white/20 text-white" : "text-white hover:bg-white/10"}`
                  }
                >
                  Admin Dashboard
                </NavLink>
              </li>
            )}

            {/* Right-side auth / profile actions */}
            {isLoggedIn ? (
              <>
                <li>
                  <NavLink to="/profile" className={({ isActive }) => `${linkClass} ${isActive ? activeClass : ""}`}>
                    {displayName ? `Hi, ${displayName.split(" ")[0]}` : "My Profile"}
                  </NavLink>
                </li>
                <li>
                  <button
                    onClick={handleLogout}
                    className="border-2 border-white px-4 py-1 rounded-full hover:bg-white hover:text-red-600 font-semibold transition-all duration-200 text-white"
                  >
                    Logout
                  </button>
                </li>
              </>
            ) : (
              <li>
                <NavLink
                  to="/auth"
                  className={({ isActive }) =>
                    `border-2 border-white px-4 py-1 rounded-full hover:bg-white hover:text-red-600 font-semibold transition-all duration-200 ${isActive ? activeClass : "text-white"}`
                  }
                >
                  Login / Register
                </NavLink>
              </li>
            )}
          </ul>
        </nav>
      </div>
    </header>
  );
};

export default Header;
