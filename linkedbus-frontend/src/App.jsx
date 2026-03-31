import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Header from "./components/Header";
import AdminHeaders from "./pages/admin/AdminHeaders";

// User pages
import HomePage from "./pages/HomePage";
import SeatSelection from "./pages/SeatSelection";
import UserProfile from "./pages/UserProfile";
import RegisterLogin from "./pages/Auth/RegisterLogin";
import PaymentPage from "./pages/PaymentPage";
import ForgotPassword from "./pages/Auth/ForgotPassword";
import VerifyOtp from "./pages/Auth/VerifyOtp";
import ResetPassword from "./pages/Auth/ResetPassword";
import Bookings from "./pages/Bookings";
// replaced static Help with reporter-enabled Help page
import HelpWithReporter from "./pages/HelpWithReporter";

// Admin pages
import AdminHome from "./pages/admin/AdminHome";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminPayments from "./pages/admin/AdminPayments";
import UserManager from "./pages/admin/UserManager";
import BusManager from "./pages/admin/BusManager";
import RouteManager from "./pages/admin/RouteManager";
import BookingManager from "./pages/admin/BookingManager";
import AdminBookingDetail from "./pages/admin/AdminBookingDetail";
import AdminUserDetail from "./pages/admin/AdminUserDetail"; // <- new file

function Placeholder({ title, desc }) {
  return (
    <div className="p-6 bg-white rounded shadow">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="text-gray-600 mt-2">{desc}</p>
    </div>
  );
}

function ProtectedRoute({ isLoggedIn, adminOnly = false, children }) {
  if (!isLoggedIn) return <Navigate to="/auth" replace />;

  if (adminOnly) {
    try {
      const stored = JSON.parse(localStorage.getItem("user")) || {};
      const isAdmin = stored.role === "admin" || stored.isAdmin === true;
      if (!isAdmin) return <Navigate to="/" replace />;
    } catch (e) {
      return <Navigate to="/" replace />;
    }
  }

  return children;
}

function App() {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // initialize login & admin state from localStorage
  useEffect(() => {
    try {
      const storedUser = JSON.parse(localStorage.getItem("user") || "null");
      if (storedUser?.id) {
        setIsLoggedIn(true);
        setCurrentUserId(storedUser.id);
        setIsAdmin(storedUser.role === "admin" || storedUser.isAdmin === true);
      } else {
        setIsLoggedIn(false);
        setCurrentUserId(null);
        setIsAdmin(false);
      }
    } catch (error) {
      console.error("Error parsing stored user:", error);
      setIsLoggedIn(false);
      setCurrentUserId(null);
      setIsAdmin(false);
    }
  }, []);

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      setIsLoggedIn(false);
      setCurrentUserId(null);
      setIsAdmin(false);
      navigate("/auth");
    }
  };

  const handleLoginSuccess = () => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "null");
      if (user?.id) {
        setCurrentUserId(user.id);
        setIsLoggedIn(true);

        const adminFlag = user.role === "admin" || user.isAdmin === true;
        setIsAdmin(adminFlag);

        // Redirect admins to AdminHome, normal users to homepage
        if (adminFlag) navigate("/admin/home");
        else navigate("/");
      } else {
        // fallback - if no user in storage just go home
        setIsLoggedIn(true);
        setIsAdmin(false);
        navigate("/");
      }
    } catch (error) {
      console.error("Login success handling failed:", error);
      setIsLoggedIn(true);
      setIsAdmin(false);
      navigate("/");
    }
  };

  return (
    <>
      {isAdmin ? (
        <AdminHeaders onLogout={handleLogout} />
      ) : (
        <Header isLoggedIn={isLoggedIn} onLogout={handleLogout} />
      )}

      <main className="container mx-auto p-4 pt-20 min-h-screen bg-gray-50">
        <Routes>
          {/* Public / user routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/bus/:busId/seats" element={<SeatSelection currentUserId={currentUserId} />} />
          <Route path="/payment" element={<PaymentPage currentUserId={currentUserId} />} />

          <Route
            path="/profile"
            element={
              <ProtectedRoute isLoggedIn={isLoggedIn}>
                <UserProfile currentUserId={currentUserId} />
              </ProtectedRoute>
            }
          />

          <Route
            path="/bookings"
            element={
              <ProtectedRoute isLoggedIn={isLoggedIn}>
                <Bookings />
              </ProtectedRoute>
            }
          />

          {/* Auth */}
          <Route path="/auth" element={<RegisterLogin onLogin={handleLoginSuccess} />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/verify-otp" element={<VerifyOtp />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Admin routes (protected + adminOnly) */}
          {/* redirect /admin -> /admin/home for predictability */}
          <Route path="/admin" element={<Navigate to="/admin/home" replace />} />

          {/* Admin home (landing page for admins after login) */}
          <Route
            path="/admin/home"
            element={
              <ProtectedRoute isLoggedIn={isLoggedIn} adminOnly>
                <AdminHome />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute isLoggedIn={isLoggedIn} adminOnly>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/payments"
            element={
              <ProtectedRoute isLoggedIn={isLoggedIn} adminOnly>
                <AdminPayments />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/buses"
            element={
              <ProtectedRoute isLoggedIn={isLoggedIn} adminOnly>
                {typeof BusManager === "function" ? <BusManager /> : <Placeholder title="Buses" desc="Manage buses (create/edit/delete)" />}
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/routes"
            element={
              <ProtectedRoute isLoggedIn={isLoggedIn} adminOnly>
                {typeof RouteManager === "function" ? <RouteManager /> : <Placeholder title="Routes" desc="Manage routes and cities" />}
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/bookings"
            element={
              <ProtectedRoute isLoggedIn={isLoggedIn} adminOnly>
                {typeof BookingManager === "function" ? <BookingManager /> : <Placeholder title="Bookings" desc="View and manage bookings" />}
              </ProtectedRoute>
            }
          />

          {/* Booking detail route */}
          <Route
            path="/admin/bookings/:id"
            element={
              <ProtectedRoute isLoggedIn={isLoggedIn} adminOnly>
                <AdminBookingDetail />
              </ProtectedRoute>
            }
          />

          {/* Users list */}
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute isLoggedIn={isLoggedIn} adminOnly>
                {typeof UserManager === "function" ? <UserManager /> : <Placeholder title="Users" desc="Manage users" />}
              </ProtectedRoute>
            }
          />

          {/* Admin user detail (fixed: prevents 404 when opening directly) */}
          <Route
            path="/admin/users/:id"
            element={
              <ProtectedRoute isLoggedIn={isLoggedIn} adminOnly>
                <AdminUserDetail />
              </ProtectedRoute>
            }
          />

          {/* Help route (reporter-enabled) */}
          <Route path="/help" element={<HelpWithReporter />} />

          {/* 404 Fallback */}
          <Route
            path="*"
            element={
              <div className="text-center text-gray-600 mt-10">
                <h2 className="text-2xl font-semibold mb-2">404 – Page Not Found</h2>
                <p>Looks like you took a wrong turn!</p>
              </div>
            }
          />
        </Routes>
      </main>
    </>
  );
}

export default App;
