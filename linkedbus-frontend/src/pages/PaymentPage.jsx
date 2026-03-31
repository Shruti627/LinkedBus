// src/pages/PaymentPage.jsx
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const RAZORPAY_KEY_ID = "rzp_test_RZkwDvdhsBTUfQ"; // test key (ok)

const DEFAULT_API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080";

async function loadRazorpayScript({ src = "https://checkout.razorpay.com/v1/checkout.js", timeout = 12000 } = {}) {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("Not running in a browser"));
    if (window.Razorpay) return resolve(window.Razorpay);

    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      // attach handlers (in case script is still loading)
      existing.addEventListener("load", () => (window.Razorpay ? resolve(window.Razorpay) : reject(new Error("Razorpay script loaded but window.Razorpay missing"))));
      existing.addEventListener("error", () => reject(new Error("Razorpay script failed to load (existing tag)")));
      return;
    }

    const s = document.createElement("script");
    s.src = src;
    s.async = true;

    const timer = setTimeout(() => {
      s.onerror = s.onload = null;
      reject(new Error("Razorpay script load timed out — possible network/blocked"));
    }, timeout);

    s.onload = () => {
      clearTimeout(timer);
      if (window.Razorpay) resolve(window.Razorpay);
      else reject(new Error("Razorpay script loaded but window.Razorpay is missing (response may be HTML/error page)"));
    };

    s.onerror = (e) => {
      clearTimeout(timer);
      reject(new Error(`Failed to load Razorpay script (${e?.message || "network or blocked"})`));
    };

    document.body.appendChild(s);
  });
}

export default function PaymentPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const API_BASE = import.meta.env.VITE_API_URL || DEFAULT_API_BASE;
  const token = localStorage.getItem("token");

  // booking info passed from SeatSelection
  const { busId, seatIds = [], seatNumbers = [], totalAmount } = location.state || {};
  const user = JSON.parse(localStorage.getItem("user") || "null");

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!busId || !seatIds.length || !totalAmount || !user) {
      alert("Please login or select seats again. Missing booking/payment details.");
      navigate("/");
    }
  }, [busId, seatIds, totalAmount, user, navigate]);

  // 🔹 1. Create Razorpay order on backend
  async function createOrderOnServer() {
    const seatsPayload =
      Array.isArray(seatNumbers) && seatNumbers.length > 0
        ? seatNumbers
        : seatIds.map(String);

    const payload = {
      // keep as rupees because your backend RazorpayService already converts to paise
      amount: totalAmount,
      email: user?.email,
      contact: user?.contact || user?.phone || user?.phoneNumber || "9890656246",
      userId: user?.id,
      busId,
      seatNumbers: seatsPayload,
    };

    console.log("🟢 createOrder payload:", payload);

    const res = await fetch(`${API_BASE}/api/payments/create-order`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Create order failed: ${res.status} ${text}`);
    }

    const data = await res.json();
    console.log("🟢 create-order response:", data);
    return data;
  }

  // 🔹 2. Verify payment on backend
  async function verifyPaymentOnServer(orderId, paymentId, signature) {
    if (!orderId || !paymentId || !signature) {
      console.error("verifyPaymentOnServer missing args", { orderId, paymentId, signature });
      throw new Error("Missing required Razorpay fields (orderId/paymentId/signature).");
    }

    const res = await fetch(`${API_BASE}/api/payments/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      },
      body: JSON.stringify({ orderId, paymentId, signature }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.success) {
      console.error("/api/payments/verify failed", res.status, json);
      throw new Error(json.error || `Payment verification failed on server: ${res.status}`);
    }
    return json;
  }

  // 🔹 3. Handle Razorpay flow — now waits for SDK to load
  const handlePayment = async () => {
    setLoading(true);
    try {
      // wait for script; will attach to existing script tag if present, or create new one
      await loadRazorpayScript();

      if (!window.Razorpay) {
        // extremely unlikely if loadRazorpayScript resolved, but keep check
        throw new Error("Razorpay SDK not available after script load");
      }

      const createResp = await createOrderOnServer();
      const orderId = createResp.orderId;
      const paymentRecordId = createResp.paymentRecordId;

      if (!orderId) throw new Error("Server did not return orderId");

      const options = {
        key: RAZORPAY_KEY_ID,
        amount: Math.round(totalAmount * 100), // UI display amount; Razorpay uses order_id as source of truth
        currency: "INR",
        name: "RedBus Clone",
        description: `Bus ${busId} | Seats: ${Array.isArray(seatNumbers) ? seatNumbers.join(",") : seatNumbers}`,
        order_id: orderId,
        handler: async function (response) {
          console.log("🟢 Razorpay response (raw):", response);

          const paymentId = response?.razorpay_payment_id;
          const razorOrderId = response?.razorpay_order_id;
          const signature = response?.razorpay_signature;

          if (!paymentId || !razorOrderId || !signature) {
            console.error("❌ Missing fields from Razorpay response:", { razorOrderId, paymentId, signature });
            alert("Payment succeeded but response missing fields. Check console/network and contact support.");
            return;
          }

          try {
            const verifyJson = await verifyPaymentOnServer(razorOrderId, paymentId, signature);
            console.log("🟢 verify response:", verifyJson);

            const bookingBody = {
              userId: user.id,
              busId,
              seatIds,
              totalFare: totalAmount,
              paymentRecordId: verifyJson.paymentRecordId || paymentRecordId,
              orderId: razorOrderId,
              paymentId: paymentId,
            };

            console.log("🟢 booking payload:", bookingBody);

            const bookingRes = await fetch(`${API_BASE}/api/bookings/book`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: token ? `Bearer ${token}` : "",
              },
              body: JSON.stringify(bookingBody),
            });

            if (!bookingRes.ok) {
              const text = await bookingRes.text().catch(() => "");
              console.error("❌ Booking error", bookingRes.status, text);
              alert("Booking failed after payment. Contact support with payment id: " + paymentId);
              return;
            }

            const booking = await bookingRes.json();
            alert(`✅ Payment & Booking successful! Booking ID: ${booking.id}`);
            navigate("/profile");
          } catch (err) {
            console.error("post-payment processing failed", err);
            alert("Payment succeeded but server processing failed. Contact support with payment id: " + paymentId);
          }
        },
        prefill: {
          name: user?.name || "Test User",
          email: user?.email || "test@example.com",
          contact: user?.contact || "9999999999",
        },
        theme: { color: "#d84e55" },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("dismiss", function () {
        console.log("Razorpay checkout dismissed");
      });
      rzp.open();
    } catch (err) {
      console.error("Payment init failed", err);
      alert(err.message || "Failed to start payment. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto bg-white shadow-xl rounded-xl p-8 mt-10">
      <h2 className="text-3xl font-bold text-center text-red-600 mb-6">💳 Payment</h2>

      <div className="space-y-4 text-lg">
        <p><strong>Bus ID:</strong> {busId}</p>
        <p><strong>Seats:</strong> {Array.isArray(seatNumbers) ? seatNumbers.join(", ") : seatNumbers} ({seatIds.length})</p>
        <p><strong>Total:</strong> ₹{totalAmount}</p>
      </div>

      <button
        onClick={handlePayment}
        className="w-full mt-6 py-3 bg-red-600 text-white text-xl font-bold rounded-lg hover:bg-red-700 transition"
        disabled={loading}
      >
        {loading ? "Starting payment..." : `Pay ₹${totalAmount}`}
      </button>
    </div>
  );
}
