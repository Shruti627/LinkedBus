// src/pages/Bookings.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";

/**
 * Bookings page with working View & Invoice buttons.
 * - View -> opens modal with booking details
 * - Invoice -> downloads PDF from backend
 *
 * Backend expectations:
 * - GET /api/bookings/user/:userId         -> list bookings
 * - GET /api/bookings/:bookingId/invoice   -> returns PDF (auth required)
 *   OR implement /api/bookings/:bookingId/invoice/download
 *
 * If your invoice endpoint differs, update INVOICE_ENDPOINT below.
 */

const API_BASE = "http://localhost:8080/api";
const Bookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [error, setError] = useState(null);

  // modal state
  const [openBooking, setOpenBooking] = useState(null);
  const [downloading, setDownloading] = useState(false);

  const loggedInUser = JSON.parse(localStorage.getItem("user") || "null");
  const token = localStorage.getItem("token");
  const currentUserId = loggedInUser?.id;

  useEffect(() => {
    if (currentUserId && token) fetchUserBookings();
  }, [currentUserId, token]);

  const axiosAuth = axios.create({
    baseURL: API_BASE,
    headers: { Authorization: token ? `Bearer ${token}` : "" },
    responseType: "json",
  });

  const fetchUserBookings = async () => {
    setLoadingBookings(true);
    setError(null);
    try {
      const res = await axiosAuth.get(`/bookings/user/${currentUserId}`);
      setBookings(res.data || []);
    } catch (err) {
      console.error("Error fetching bookings:", err);
      setError(err.response?.data?.message || err.message || "Failed to fetch bookings");
      setBookings([]);
    } finally {
      setLoadingBookings(false);
    }
  };

  // View -> set selected booking (open modal)
  const handleView = (booking) => {
    setOpenBooking(booking);
  };

  // Invoice -> download PDF from backend
  const handleInvoice = async (bookingId) => {
    if (!token) {
      alert("You must be logged in to download invoice.");
      return;
    }

    try {
      setDownloading(true);

      // Endpoint — update to match your backend API.
      // Example: GET /api/bookings/:bookingId/invoice returns application/pdf
      const res = await axios({
        method: "GET",
        url: `${API_BASE}/bookings/${bookingId}/invoice`,
        responseType: "blob",
        headers: { Authorization: `Bearer ${token}` },
      });

      // create blob and download
      const blob = new Blob([res.data], { type: res.headers["content-type"] || "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      const filename = `invoice_${bookingId}.pdf`;
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Invoice download failed:", err);
      const msg = err.response?.data?.message || err.message || "Failed to download invoice.";
      alert(msg);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto mb-8">
        <div className="bg-gradient-to-r from-red-600 to-orange-500 rounded-2xl shadow-lg text-white p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">My Bookings</h1>
            <p className="mt-2 text-red-100 max-w-xl">
              View your recent trips, check ticket details, and download invoices.
            </p>
          </div>

          <div className="bg-white/10 px-4 py-2 rounded-lg text-sm text-center">
            <div className="text-xs">Total Bookings</div>
            <div className="text-lg font-semibold">{bookings.length}</div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow p-6">
          {loadingBookings ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-14 bg-gray-100 rounded" />
              <div className="h-14 bg-gray-100 rounded" />
              <div className="h-14 bg-gray-100 rounded" />
            </div>
          ) : error ? (
            <div className="text-red-600 p-4 bg-red-50 rounded">{error}</div>
          ) : bookings.length === 0 ? (
            <div className="text-gray-500 text-center py-12">
              <p className="text-lg font-medium mb-2">No bookings found.</p>
              <p>Start your next journey by booking a bus!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {bookings.map((b) => (
                <motion.div key={b.id} whileHover={{ scale: 1.01 }} transition={{ type: "spring", stiffness: 300 }} className="p-4 bg-gray-50 rounded-xl border hover:shadow-md flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4 mb-3 sm:mb-0">
                    <div className="w-14 h-14 rounded-lg bg-red-600 text-white flex items-center justify-center font-bold text-xl">
                      {b.bus?.busName?.charAt(0) ?? "B"}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-800">{b.bus?.busName || "Unknown Bus"}</div>
                      <div className="text-sm text-gray-500">{b.bus?.source} → {b.bus?.destination}</div>
                      <div className="text-xs text-gray-400 mt-1">{b.bus?.departureDate ? new Date(b.bus.departureDate).toLocaleString() : "—"}</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${b.status === "CONFIRMED" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                      {b.status}
                    </div>
                    <div className="mt-2 font-bold text-lg text-gray-800">₹{b.totalFare}</div>
                    <div className="mt-3 flex justify-end gap-2">
                      <button
                        onClick={() => handleView(b)}
                        className="text-sm px-3 py-1 rounded bg-white border hover:bg-gray-100 transition"
                      >
                        View
                      </button>

                      <button
                        onClick={() => handleInvoice(b.id)}
                        className={`text-sm px-3 py-1 rounded ${downloading ? "bg-gray-300 text-gray-700" : "bg-red-600 text-white hover:bg-red-700"} transition`}
                        disabled={downloading}
                      >
                        {downloading ? "Downloading..." : "Invoice"}
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Booking details modal */}
      {openBooking && (
        <BookingDetailsModal booking={openBooking} onClose={() => setOpenBooking(null)} onDownload={() => handleInvoice(openBooking.id)} />
      )}
    </div>
  );
};

/* Simple modal to show booking details */
function BookingDetailsModal({ booking, onClose, onDownload }) {
  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl p-6 relative">
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-500 hover:text-gray-800">✕</button>

        <h3 className="text-xl font-semibold mb-2">{booking.bus?.busName || "Booking Details"}</h3>
        <div className="text-sm text-gray-600 mb-4">{booking.bus?.source} → {booking.bus?.destination}</div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <div className="text-xs text-gray-400">Booking ID</div>
            <div className="font-medium">{booking.id}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400">Status</div>
            <div className="font-medium">{booking.status}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400">Date</div>
            <div>{booking.bus?.departureDate ? new Date(booking.bus.departureDate).toLocaleString() : "—"}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400">Total Fare</div>
            <div className="font-medium">₹{booking.totalFare}</div>
          </div>
        </div>

        <div className="mb-4">
          <div className="text-xs text-gray-400">Passengers / Seats</div>
          <div className="mt-2 space-y-2">
            {(booking.seats || booking.seatNumbers || []).length === 0 ? (
              <div className="text-sm text-gray-500">No seat details available</div>
            ) : (
              ((booking.seats && booking.seats.length) ? booking.seats : (booking.seatNumbers || [])).map((s, i) => (
                <div key={i} className="inline-block mr-2 mb-2 px-3 py-1 bg-gray-100 rounded">{typeof s === "string" ? s : s.seatNumber ?? s}</div>
              ))
            )}
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded bg-gray-100">Close</button>
          <button onClick={onDownload} className="px-4 py-2 rounded bg-red-600 text-white">Download Invoice</button>
        </div>
      </div>
    </div>
  );
}

export default Bookings;
