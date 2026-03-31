import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";

const MAX_SELECTABLE = 6;
const DEFAULT_FARE = 600;
const BACKEND_BASE_URL = "http://localhost:8080/api";

const SeatSelection = () => {
  const { busId } = useParams();
  const navigate = useNavigate();

  const [bus, setBus] = useState(null);
  const [seats, setSeats] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [bookingMessage, setBookingMessage] = useState(null);

  // normalize seat objects and robustly detect booked/available
  const normalize = (raw, index) => {
    const id = raw.id ?? raw.seatId ?? raw._id ?? (raw.seatNumber ? `sn-${raw.seatNumber}` : `idx-${index}`);
    const seatNumber = raw.seatNumber ?? raw.number ?? raw.label ?? String(id ?? "");
    // Detect booked/available from many possible fields
    const bookedFlagCandidates = [
      raw.booked,
      raw.isBooked,
      raw.reserved,
      raw.locked,
      raw.occupied,
    ];
    // status strings
    const status = (raw.status ?? raw.state ?? raw.availability ?? "").toString().toLowerCase();
    const explicitlyAvailable = raw.available ?? raw.isAvailable ?? undefined;

    let available;
    if (typeof explicitlyAvailable === "boolean") {
      available = explicitlyAvailable;
    } else if (bookedFlagCandidates.some((v) => v === true)) {
      available = false;
    } else if (status) {
      // treat common status values as booked/not
      if (["booked", "reserved", "sold", "occupied", "unavailable", "locked"].includes(status)) available = false;
      else if (["available", "free", "vacant"].includes(status)) available = true;
      else available = true; // default optimistic
    } else {
      // fallback to optimistic available: if raw.hasOwnProperty('price') or fare assume available unless booked flag
      available = !(raw.booked === true || raw.isBooked === true || raw.reserved === true);
    }

    const price =
      typeof raw.price === "number"
        ? raw.price
        : typeof raw.fare === "number"
        ? raw.fare
        : typeof raw.amount === "number"
        ? raw.amount
        : DEFAULT_FARE;

    const type = raw.type ?? raw.seatType ?? inferSeatType(seatNumber);

    return { id, seatNumber, available: Boolean(available), price, type, raw };
  };

  const inferSeatType = (seatNumber) => {
    const nMatch = String(seatNumber).match(/(\d+)/);
    const n = nMatch ? parseInt(nMatch[1], 10) : null;
    if (!n) return "Standard";
    if (n % 4 === 1 || n % 4 === 0) return "Window";
    if (n % 4 === 2 || n % 4 === 3) return "Aisle";
    return "Standard";
  };

  const fetchWithAuth = async (url, options = {}) => {
    const token = localStorage.getItem("token");
    const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(url, { ...options, headers });
    const text = await res.text();
    let data = null;
    try { data = JSON.parse(text); } catch {}
    return { res, data, text };
  };

  const loadBus = useCallback(async () => {
    try {
      const { res, data } = await fetchWithAuth(`${BACKEND_BASE_URL}/bus/${busId}`);
      if (res.ok) setBus(data);
      else setBus(null);
    } catch (err) {
      console.error("loadBus", err);
      setBus(null);
    }
  }, [busId]);

  const loadSeats = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { res, data } = await fetchWithAuth(`${BACKEND_BASE_URL}/seats/bus/${busId}`);
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const rawArr = Array.isArray(data) ? data : data.seats ?? [];
      const normalized = rawArr
        .map((r, i) => normalize(r, i))
        .filter((s) => s.id != null && s.seatNumber != null)
        .sort((a, b) => {
          // safe numeric extraction with fallbacks and no undefined variables
          const extractNum = (s) => {
            const m = String(s.seatNumber).match(/(\d+)/);
            return m ? parseInt(m[1], 10) : Number.POSITIVE_INFINITY;
          };
          const na = extractNum(a);
          const nb = extractNum(b);
          if (!isFinite(na) || !isFinite(nb)) return String(a.seatNumber).localeCompare(String(b.seatNumber));
          return na - nb;
        });

      setSeats(normalized);

      // if any selected seat is now unavailable (booked), remove it from selection
      setSelectedIds((prev) => prev.filter((selId) => {
        const s = normalized.find(x => String(x.id) === String(selId));
        return s && s.available;
      }));
    } catch (err) {
      console.error("loadSeats", err);
      setLoadError(err.message || "Failed to load seats");
      setSeats([]);
    } finally {
      setLoading(false);
    }
  }, [busId]);

  useEffect(() => {
    loadBus();
    loadSeats();
  }, [loadBus, loadSeats]);

  const toggleSelect = (seat) => {
    setBookingMessage(null);
    if (!seat.available) {
      setBookingMessage("❌ This seat is already booked and cannot be selected.");
      return;
    }

    if (selectedIds.includes(seat.id)) {
      setSelectedIds((s) => s.filter((id) => String(id) !== String(seat.id)));
      return;
    }
    if (selectedIds.length >= MAX_SELECTABLE) {
      setBookingMessage(`You can select up to ${MAX_SELECTABLE} seats only.`);
      return;
    }
    setSelectedIds((s) => [...s, seat.id]);
  };

  const proceedToPayment = () => {
    if (selectedIds.length === 0) {
      alert("Please select at least one seat.");
      return;
    }

    const selectedSeats = seats.filter((s) => selectedIds.includes(s.id));
    const seatNumbers = selectedSeats.map((s) => s.seatNumber);
    const totalAmount = selectedSeats.reduce((sum, s) => sum + (s.price ?? DEFAULT_FARE), 0);

    navigate("/payment", {
      state: { busId: parseInt(busId, 10), seatIds: selectedIds, seatNumbers, totalAmount },
    });
  };

  // build rows (same logic)
  const rows = [];
  if (seats.some(s => s.row !== undefined)) {
    const group = seats.reduce((acc, s) => { const r = s.row ?? 0; (acc[r] = acc[r]||[]).push(s); return acc; }, {});
    Object.keys(group).sort((a,b)=>parseInt(a)-parseInt(b)).forEach(k=>rows.push(group[k]));
  } else {
    for (let i = 0; i < seats.length; i += 4) rows.push(seats.slice(i, i + 4));
  }

  const selectedDetails = seats.filter((s) => selectedIds.includes(s.id));
  const subtotal = selectedDetails.reduce((acc, s) => acc + (s.price ?? DEFAULT_FARE), 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50 to-white">
      <div className="bg-red-600 text-white py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Select Your Seats</h1>
              <p className="mt-2 text-red-100 max-w-xl">Pick the best seats for your journey.</p>
            </div>
            <div className="hidden sm:block w-44 h-20 rounded-lg bg-white/6 border border-white/8" />
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 -mt-8">
        <section className="lg:col-span-2 bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-xs text-gray-400">Route</div>
              <div className="text-lg font-semibold">{bus ? `${bus.source} → ${bus.destination}` : `Bus ${busId}`}</div>
              <div className="text-sm text-gray-500">{bus?.boardingPoint ? `Boarding: ${bus.boardingPoint}` : `Departs: ${bus?.departureTime ?? "--:--"}`}</div>
            </div>

            <div className="text-right">
              <div className="text-xs text-gray-400">Fare per seat</div>
              <div className="text-xl font-bold text-red-600">₹{bus?.baseFare ?? DEFAULT_FARE}</div>
            </div>
          </div>

          <p className="mb-4 text-sm text-gray-600">Click seats to select. Use keyboard (Enter/Space) to toggle selection. Booked seats are disabled.</p>

          {loading && <div className="py-12 text-center text-gray-500">Loading seats…</div>}
          {loadError && <div className="mb-4 p-4 border border-red-200 bg-red-50 text-red-700 rounded"><strong>Error:</strong> {loadError}</div>}
          {!loading && !loadError && seats.length === 0 && <div className="py-12 text-center text-gray-500">No seats found for this bus</div>}

          <div className="flex flex-col items-center">
            <div className="w-full max-w-5xl mb-3 text-center text-sm text-gray-600">Driver</div>
            <div className="w-full max-w-5xl bg-gradient-to-b from-white to-gray-50 border rounded-xl p-6 shadow-inner">
              <div className="space-y-4">
                {rows.map((rowSeats, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex gap-4">
                      {rowSeats.slice(0, 2).map(seat => (
                        <SeatTile
                          key={seat.id}
                          seat={seat}
                          selected={selectedIds.includes(seat.id)}
                          onToggle={() => toggleSelect(seat)}
                        />
                      ))}
                    </div>
                    <div className="w-16 text-center text-xs text-gray-400">Aisle</div>
                    <div className="flex gap-4">
                      {rowSeats.slice(2, 4).map(seat => (
                        <SeatTile
                          key={seat.id}
                          seat={seat}
                          selected={selectedIds.includes(seat.id)}
                          onToggle={() => toggleSelect(seat)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="w-full max-w-5xl mt-3 text-center text-sm text-gray-600">Back</div>
          </div>

          <div className="mt-6 flex flex-wrap gap-4 items-center">
            <Legend color="bg-green-600" label="Selected" />
            <Legend color="bg-white border-gray-300" label="Available" invertText />
            <Legend color="bg-red-600" label="Booked" />
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="inline-block px-2 py-1 rounded bg-yellow-100 text-yellow-800 text-xs font-semibold">Premium</span>
              <span className="text-xs text-gray-500">Premium seats include extra legroom or window advantage</span>
            </div>
          </div>
        </section>

        <aside className="sticky top-20 self-start">
          <div className="bg-white rounded-xl shadow p-5 w-full">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-xs text-gray-400">Selected</div>
                <div className="text-lg font-semibold">{selectedIds.length} Seat{selectedIds.length !== 1 ? "s" : ""}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-400">Subtotal</div>
                <div className="text-xl font-bold">₹{subtotal}</div>
              </div>
            </div>

            <div className="mb-3">
              {selectedDetails.length === 0 ? (
                <div className="text-sm text-gray-500">No seats chosen</div>
              ) : (
                <div className="space-y-2">
                  {selectedDetails.map((s) => (
                    <div key={s.id} className="flex items-center justify-between bg-gray-50 rounded px-3 py-2">
                      <div>
                        <div className="text-sm font-medium">{s.seatNumber}</div>
                        <div className="text-xs text-gray-400">{s.type}</div>
                      </div>
                      <div className="text-sm text-gray-700">₹{s.price}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {bookingMessage && (
              <div className={`mb-3 p-2 rounded text-sm ${bookingMessage.startsWith("✅") ? "bg-green-100 text-green-700" : bookingMessage.startsWith("❌") ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
                {bookingMessage}
              </div>
            )}

            <button onClick={proceedToPayment} disabled={selectedIds.length === 0} className={`w-full py-3 rounded-md font-semibold ${selectedIds.length === 0 ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-red-600 text-white hover:bg-red-700'}`}>
              Proceed to Payment • ₹{subtotal}
            </button>

            <div className="mt-4 text-xs text-gray-500">Max {MAX_SELECTABLE} seats per booking. Prices shown per-seat and final price shown at checkout.</div>
          </div>
        </aside>
      </main>
    </div>
  );
};

/* --- SeatTile --- */
const SeatTile = ({ seat, selected, onToggle }) => {
  const base = "w-18 h-18 md:w-16 md:h-16 rounded-xl flex flex-col items-center justify-center gap-0 font-semibold text-sm border select-none";
  const handleKey = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(); } };

  const premium = (seat.type || "").toLowerCase().includes("premium");
  const typeBadge = seat.type ? seat.type : "";

  if (!seat.available) {
    return (
      <div
        className={`${base} bg-red-600 text-white opacity-95 cursor-not-allowed transform transition-shadow duration-150`}
        title={`${seat.seatNumber} — Booked`}
        role="button"
        aria-disabled="true"
      >
        <div className="text-sm">{seat.seatNumber}</div>
        <div className="text-xs">₹{seat.price}</div>
      </div>
    );
  }

  return (
    <motion.button
      onClick={onToggle}
      onKeyDown={handleKey}
      whileTap={{ scale: 0.96 }}
      whileHover={{ scale: 1.03 }}
      aria-pressed={selected}
      className={`${base} ${selected ? "bg-gradient-to-br from-green-600 to-green-500 text-white shadow-lg" : "bg-white text-gray-800"} border-gray-200`}
      title={`${seat.seatNumber} — ₹${seat.price} ${typeBadge ? `• ${typeBadge}` : ""}`}
    >
      <div className="text-sm md:text-base">{seat.seatNumber}</div>
      <div className={`text-xs ${selected ? "text-white/90" : "text-gray-500"}`}>₹{seat.price}</div>
      {premium && (
        <span className={`mt-1 inline-block px-2 py-0.5 rounded-full text-xs text-yellow-800 bg-yellow-100`}>
          Premium
        </span>
      )}
    </motion.button>
  );
};

const Legend = ({ color = "bg-gray-200", label = "", invertText = false }) => (
  <div className="flex items-center gap-2 text-sm">
    <div className={`${color} w-6 h-6 rounded border`} />
    <div className={`text-sm ${invertText ? "text-gray-700" : "text-gray-600"}`}>{label}</div>
  </div>
);

export default SeatSelection;
