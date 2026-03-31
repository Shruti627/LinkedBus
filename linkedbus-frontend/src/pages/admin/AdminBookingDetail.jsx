// src/pages/admin/AdminBookingDetail.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

export default function AdminBookingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080/api";
  const token = localStorage.getItem("token");

  const [booking, setBooking] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      navigate("/auth");
      return;
    }
    fetchBooking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, token]);

  const renderValue = (v) => {
    if (v === null || v === undefined || v === "") return "-";
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return v;
    if (Array.isArray(v)) return v.join(", ");
    try {
      return JSON.stringify(v);
    } catch {
      return String(v);
    }
  };

  async function fetchBooking() {
    setLoading(true);
    setError("");
    try {
      const url = `${API_BASE}/admin-api/bookings/${encodeURIComponent(id)}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(
          `Failed to load booking (${res.status}) ${txt ? "- " + txt.slice(0, 300) : ""}`
        );
      }
      const d = await res.json();
      setBooking(d);

      const userId = d.userId ?? d.user?.id ?? null;
      if (userId && (!d.user || Object.keys(d.user).length === 0)) {
        await fetchUser(userId);
      } else {
        setUser(d.user ?? null);
      }
    } catch (e) {
      console.error("fetchBooking", e);
      setError(e.message || "Failed to load booking");
    } finally {
      setLoading(false);
    }
  }

  async function fetchUser(userId) {
    try {
      const res = await fetch(`${API_BASE}/admin-api/users/${encodeURIComponent(userId)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        console.warn(`fetchUser: server returned ${res.status} ${txt}`);
        return;
      }
      const u = await res.json();
      setUser(u);
    } catch (e) {
      console.warn("fetchUser failed", e);
    }
  }

  if (loading) return <div className="p-6">Loading…</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!booking) return <div className="p-6">Booking not found</div>;

  // map values
  const bookingId = booking.id ?? booking.bookingId ?? booking._id;
  const status = booking.status ?? booking.state ?? booking.bookingStatus;
  const amountVal = booking.totalFare ?? booking.amount ?? booking.fare ?? booking.price ?? booking.payment?.amount;
  const tripFrom = booking.bus?.source ?? booking.from ?? booking.origin;
  const tripTo = booking.bus?.destination ?? booking.to ?? booking.destination;
  const tripName = booking.bus?.busName ?? booking.tripName ?? booking.routeName;
  const bookingType = booking.bus?.busType ?? booking.type ?? booking.bookingType;
  const seats =
    Array.isArray(booking.seats) && booking.seats.length
      ? booking.seats
          .map((s) => s.seatNumber ?? s.label ?? s.name ?? (s.id ? `#${s.id}` : null))
          .filter(Boolean)
          .join(", ")
      : booking.seatNumbers ?? booking.seat ?? null;

  const bookedAtRaw = booking.bookingTime ?? booking.createdAt ?? booking.bookedAt ?? booking.date;
  const bookedAt = bookedAtRaw && (typeof bookedAtRaw === "string" || typeof bookedAtRaw === "number")
    ? tryFormatDateTime(bookedAtRaw)
    : renderValue(bookedAtRaw);

  const paymentObj = booking.payment ?? booking.paymentInfo ?? booking.payment_details ?? null;
  const paymentMethod =
    paymentObj?.paymentMethod ?? paymentObj?.method ?? booking.paymentMethod ?? booking.payment_mode ?? null;
  const paymentStatus = paymentObj?.status ?? paymentObj?.paymentStatus ?? booking.paymentStatus ?? null;
  const paymentId = paymentObj?.paymentId ?? paymentObj?.payment_id ?? paymentObj?.txnId ?? null;
  const orderId = paymentObj?.orderId ?? paymentObj?.order_id ?? null;
  const paymentAmount = paymentObj?.amount ?? paymentObj?.paidAmount ?? null;
  const paymentEmail = paymentObj?.email ?? paymentObj?.payerEmail ?? null;

  const userObj = user ?? booking.user ?? null;
  const userDisplay =
    userObj?.name ?? booking.user?.name ?? booking.userName ?? booking.customerName ?? booking.customer ?? booking.userEmail ?? null;
  const userEmail = userObj?.email ?? booking.user?.email ?? paymentEmail ?? null;
  const userPhone = userObj?.phoneNumber ?? booking.user?.phone ?? booking.phone ?? null;
  const userCity = userObj?.city ?? booking.user?.city ?? null;
  const userState = userObj?.state ?? booking.user?.state ?? null;

  const departureDate = booking.bus?.departureDate ?? booking.departureDate ?? null;
  const departureTime = booking.bus?.departureTime ?? booking.departureTime ?? null;
  const arrivalTime = booking.bus?.arrivalTime ?? booking.arrivalTime ?? null;
  const formattedDeparture =
    departureDate && departureTime ? tryFormatDateTime(`${departureDate}T${departureTime}`) : renderValue(departureDate);

  function tryFormatDateTime(value) {
    try {
      const d = new Date(value);
      if (isNaN(d.getTime())) return value;
      return d.toLocaleString();
    } catch {
      return value;
    }
  }

  function copyToClipboard(text) {
    try {
      navigator.clipboard?.writeText(String(text));
      alert("Copied to clipboard");
    } catch (e) {
      // ignore
    }
  }

  // small helper to detect Razorpay for badge
  const isRazor = String(paymentMethod ?? "").toLowerCase().includes("razor");

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto bg-white rounded shadow p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(-1)} className="px-3 py-1 border rounded">Back</button>
            <button onClick={() => copyToClipboard(bookingId)} className="px-3 py-1 border rounded">Copy ID</button>
            <div className="ml-3 text-sm text-gray-500">Booked At: {bookedAt}</div>
          </div>

          <div className="text-right">
            <div className="text-lg font-medium">Status: <span className="font-semibold">{renderValue(status)}</span></div>
            <div className="text-2xl font-bold mt-1">Booking #{renderValue(bookingId)}</div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-7">
            <div className="bg-white p-4 rounded border">
              <h3 className="font-semibold mb-3">Passenger</h3>
              <div className="grid grid-cols-2 gap-2 text-sm text-gray-700">
                <div className="font-medium col-span-2">{userDisplay ?? <em>Not available</em>}</div>
                <div className="text-xs text-gray-500">Email</div>
                <div>{userEmail ?? '-'}</div>
                <div className="text-xs text-gray-500">Phone</div>
                <div>{userPhone ?? '-'}</div>
                <div className="text-xs text-gray-500">Location</div>
                <div>{(userCity ? userCity : '-')}{userCity && userState ? ', ' : ''}{userState ? userState : ''}</div>
              </div>
            </div>

            <div className="bg-white p-4 rounded border mt-4">
              <h3 className="font-semibold mb-3">Trip</h3>
              <div className="text-sm text-gray-700">
                <div className="font-medium text-base mb-1">{tripFrom ? `${tripFrom} → ${tripTo ?? "-"}` : tripName}</div>
                <div className="text-xs text-gray-500">Departure</div>
                <div className="mb-2">{formattedDeparture}</div>
                <div className="text-xs text-gray-500">Arrival</div>
                <div className="mb-2">{arrivalTime ?? '-'}</div>
                <div className="text-xs text-gray-500">Bus</div>
                <div className="mb-1">{booking.bus?.busName ?? '-'}</div>
                <div className="text-xs text-gray-500">Seats</div>
                <div className="mb-1">{seats ?? '-'}</div>
                <div className="text-xs text-gray-500">Booking Type</div>
                <div>{bookingType ?? '-'}</div>
              </div>
            </div>

            <div className="bg-white p-4 rounded border mt-4">
              <h3 className="font-semibold mb-3">Payment Details</h3>
              <div className="flex items-center gap-3">
                <div>
                  <div className="text-xs text-gray-500">Method</div>
                  <div className="font-medium">{renderValue(paymentMethod ?? '-')}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Status</div>
                  <div className="font-medium">{renderValue(paymentStatus ?? '-')}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Amount</div>
                  <div className="font-medium">₹{renderValue(paymentAmount ?? amountVal ?? '-')}</div>
                </div>
              </div>

              <div className="mt-3 text-sm text-gray-600">
                {paymentId && <div>Payment ID: <span className="font-mono text-xs">{paymentId}</span></div>}
                {orderId && <div>Order ID: <span className="font-mono text-xs">{orderId}</span></div>}
                {paymentEmail && <div>Payer email: {paymentEmail}</div>}
              </div>

              {isRazor && (
                <div className="mt-3 inline-flex items-center gap-2 px-2 py-1 border rounded bg-white">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                    <path d="M3 12h18" stroke="#DD0031" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div className="text-xs">Razorpay</div>
                </div>
              )}
            </div>

            {/*
              Raw debug JSON is intentionally commented out in the UI to keep the page clean.
              If you need to see the raw booking object for debugging, uncomment the <pre> below.

            <section className="mt-6">
              <h3 className="font-semibold mb-2">Raw (debug)</h3>
              <pre className="text-xs bg-gray-50 p-3 rounded overflow-auto max-h-80">{JSON.stringify(booking, null, 2)}</pre>
            </section>

            */}

          </div>

          <aside className="col-span-5">
            <div className="sticky top-6 bg-white p-4 rounded border">
              <div className="text-xs text-gray-500">Summary</div>
              <div className="mt-2">
                <div className="flex justify-between py-1"><div className="text-sm">Amount</div><div className="font-semibold">₹{renderValue(amountVal)}</div></div>
                <div className="flex justify-between py-1"><div className="text-sm">Seats</div><div className="font-semibold">{renderValue(seats)}</div></div>
                <div className="flex justify-between py-1"><div className="text-sm">Payment</div><div className="font-semibold">{renderValue(paymentMethod)}</div></div>
                <div className="flex justify-between py-1"><div className="text-sm">Payment status</div><div className="font-semibold">{renderValue(paymentStatus)}</div></div>
              </div>

              <div className="mt-4">
                <button className="w-full px-3 py-2 border rounded">Open Refund / Actions</button>
              </div>
            </div>

            <div className="mt-4 text-xs text-gray-500">
              Showing a cleaned, user-friendly view. Raw debug has been commented out to reduce visual clutter —
              enable it only when needed.
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
