import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const BusCard = ({ bus }) => {
  const navigate = useNavigate();

  if (!bus) {
    return (
      <div className="p-4 bg-red-100 rounded-xl text-red-800">
        Error: Bus data is missing.
      </div>
    );
  }

  // If API returned a seats array, use it to calc availability (preferred)
  const seatsAvailableFromList = (() => {
    try {
      if (Array.isArray(bus.seats) && bus.seats.length > 0) {
        // detect booked logic similar to SeatSelection normalization
        const availableCount = bus.seats.reduce((acc, s) => {
          const bookedFlag = s.booked ?? s.isBooked ?? s.reserved ?? s.locked ?? s.occupied;
          const status = (s.status ?? s.availability ?? "").toString().toLowerCase();
          const explicitlyAvailable = s.available ?? s.isAvailable;
          let avail;
          if (typeof explicitlyAvailable === "boolean") avail = explicitlyAvailable;
          else if (bookedFlag === true) avail = false;
          else if (status) {
            avail = !["booked","reserved","sold","occupied","unavailable","locked"].includes(status);
          } else avail = true;
          return acc + (avail ? 1 : 0);
        }, 0);
        return availableCount;
      }
    } catch (_) {}
    return null;
  })();

  // fallback to explicit fields
  const seatsAvailableFallback = (() => {
    if (typeof bus.availableSeats === "number") return Math.max(0, bus.availableSeats);
    if (typeof bus.seatsLeft === "number") return Math.max(0, bus.seatsLeft);

    if (typeof bus.totalSeats === "number") {
      const booked =
        typeof bus.bookedSeats === "number"
          ? bus.bookedSeats
          : typeof bus.reservedSeats === "number"
          ? bus.reservedSeats
          : 0;
      const val = bus.totalSeats - booked;
      return val >= 0 ? val : 0;
    }

    return null;
  })();

  const seatsAvailable = seatsAvailableFromList ?? seatsAvailableFallback;

  const seatsPercent =
    typeof seatsAvailable === "number" && typeof bus.totalSeats === "number" && bus.totalSeats > 0
      ? Math.round((seatsAvailable / bus.totalSeats) * 100)
      : null;

  const formatTime = (t) => {
    try {
      const dt = new Date(t);
      if (isNaN(dt)) return t || "—";
      return dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return t || "—";
    }
  };

  const formatDate = (t) => {
    try {
      const dt = new Date(t);
      if (isNaN(dt)) return t || "—";
      return dt.toLocaleDateString();
    } catch {
      return t || "—";
    }
  };

  const durationLabel = bus.duration || (bus.departureTime && bus.arrivalTime ? `${formatTime(bus.departureTime)} - ${formatTime(bus.arrivalTime)}` : "—");

  const handleViewSeats = () => {
    navigate(`/bus/${bus?.id}/seats`);
  };

  const isSoldOut = seatsAvailable === 0;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 transition duration-300"
      role="article"
      aria-label={`Bus ${bus.busName}`}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-lg bg-red-50 flex items-center justify-center text-red-600 font-bold text-lg">
            {bus.busName ? bus.busName.charAt(0) : "B"}
          </div>
          <div>
            <h4 className="text-xl font-bold text-gray-900 leading-tight">
              {bus.busName || "Bus Name Not Available"}
            </h4>
            <div className="text-sm text-gray-500 mt-1">
              <span className="mr-2">🚏 {bus.source || "—"}</span>
              <span>→</span>
              <span className="ml-2">{bus.destination || "—"}</span>
            </div>
            <div className="mt-1 text-xs text-gray-400">{bus.operator || ""}</div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-2xl font-extrabold text-red-600">₹{bus.price ?? "N/A"}</div>
          {typeof bus.rating === "number" && (
            <div className="text-sm text-gray-500 mt-1">⭐ {bus.rating.toFixed(1)}</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 text-sm text-gray-600 border-t pt-4">
        <div>
          <p className="font-semibold text-gray-500">Departure</p>
          <p className="text-base text-gray-800 font-medium">
            {formatTime(bus.departureTime)} <span className="text-xs text-gray-400 block">{formatDate(bus.departureTime)}</span>
          </p>
        </div>

        <div>
          <p className="font-semibold text-gray-500">Arrival</p>
          <p className="text-base text-gray-800 font-medium">
            {formatTime(bus.arrivalTime)} <span className="text-xs text-gray-400 block">{formatDate(bus.arrivalTime)}</span>
          </p>
        </div>

        <div className="text-right">
          <p className="font-semibold text-gray-500">Type</p>
          <p className="text-base text-red-700 font-medium">{bus.busType || "—"}</p>
          <p className="text-xs text-gray-400 mt-1">{durationLabel}</p>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Seats Available</p>
            <div className="text-lg font-semibold text-green-600">
              {seatsAvailable === null ? "—" : seatsAvailable}
            </div>
          </div>

          <div className="w-1/2">
            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
              <div
                className="h-2 bg-green-400 rounded-full transition-all duration-300"
                style={{ width: seatsPercent !== null ? `${seatsPercent}%` : "0%" }}
                aria-hidden
              />
            </div>
            {seatsPercent !== null && (
              <div className="text-xs text-gray-400 mt-1 text-right">{seatsPercent}% seats left</div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 flex justify-between items-center pt-3 border-t">
        <div className="text-sm text-gray-500">
          <span className="font-medium">Total seats:</span>{" "}
          <span className="text-gray-700">{bus.totalSeats ?? "—"}</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleViewSeats}
            disabled={isSoldOut}
            className={`px-4 py-2 text-sm font-semibold rounded-lg shadow-md transition duration-300 ${
              isSoldOut
                ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                : "bg-red-600 text-white hover:bg-red-700"
            }`}
            aria-disabled={isSoldOut}
            aria-label={isSoldOut ? "Sold out" : `View seats for ${bus.busName}`}
          >
            {isSoldOut ? "Sold Out" : "View Seats"}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default BusCard;
