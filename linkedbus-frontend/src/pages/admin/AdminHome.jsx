// src/pages/admin/AdminHome.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import BusSearch from "../../components/BusSearch";
import BusList from "../../components/BusList";

/**
 * AdminHome.jsx — dense, animated RedBus-style admin console
 * - Floating search no longer overlaps KPI cards
 * - Hero spacing tightened
 * - KPI cards count up
 * - Auto-rotating feature carousel (hover pauses)
 * - Replace mock data with APIs where TODO marked
 */

function useCountUp(target, duration = 800) {
  // simple hook to animate numbers (returns display string)
  const [value, setValue] = useState(0);
  const rafRef = useRef(null);
  const startRef = useRef(null);

  useEffect(() => {
    const start = performance.now();
    const from = Number(value);
    const to = Number(target) || 0;
    const diff = to - from;
    cancelAnimationFrame(rafRef.current);

    function step(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // easeInOutQuad-like
      const current = from + diff * eased;
      setValue(current);
      if (t < 1) rafRef.current = requestAnimationFrame(step);
      else {
        setValue(to);
      }
    }
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return Math.round(value).toLocaleString();
}

export default function AdminHome() {
  const navigate = useNavigate();

  // --- Demo data (replace with API calls) ---
  const [buses, setBuses] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState({
    totalBuses: 0,
    todayTrips: 0,
    pendingRefunds: 0,
    todaysRevenue: 0,
  });

  const [loading, setLoading] = useState(true);

  // search
  const [searchResults, setSearchResults] = useState([]);
  const [searched, setSearched] = useState(false);

  // feature carousel
  const featurePages = useMemo(
    () => [
      { key: "bookings", title: "Bookings", subtitle: "Manage & refund bookings" },
      { key: "fleet", title: "Fleet", subtitle: "Add / edit buses & fleet status" },
      { key: "refunds", title: "Refunds", subtitle: "Pending refund requests" },
      { key: "analytics", title: "Analytics", subtitle: "Revenue & occupancy insights" },
    ],
    []
  );
  const [pageIdx, setPageIdx] = useState(0);
  const autoTimer = useRef(null);
  const [hoveringCarousel, setHoveringCarousel] = useState(false);

  // small initial load
  useEffect(() => {
    // TODO: replace mock data with fetch('/admin-api/...') calls
    const mockBuses = [
      { id: "b1", busName: "Express A1", route: "Mumbai → Pune", seats: 40, status: "active", operator: "BlueLine" },
      { id: "b2", busName: "Comfort XL", route: "Pune → Goa", seats: 32, status: "inactive", operator: "GoTravels" },
      { id: "b3", busName: "Night Rider", route: "Mumbai → Nashik", seats: 45, status: "active", operator: "NightCo" },
      { id: "b4", busName: "Holiday Go", route: "Pune → Lonavala", seats: 30, status: "active", operator: "HolidayBus" },
    ];
    const mockBookings = [
      { id: "bk1", passenger: "Rahul", trip: "Express A1 — 10:00", amount: 500, status: "confirmed", createdAt: Date.now() - 3600 * 1000 },
      { id: "bk2", passenger: "Sana", trip: "Night Rider — 22:00", amount: 800, status: "cancel_requested", createdAt: Date.now() - 7200 * 1000 },
      { id: "bk3", passenger: "Arjun", trip: "Comfort XL — 14:00", amount: 350, status: "confirmed", createdAt: Date.now() - 5 * 3600 * 1000 },
    ];

    setTimeout(() => {
      setBuses(mockBuses);
      setBookings(mockBookings);
      setStats({
        totalBuses: mockBuses.length,
        todayTrips: 9,
        pendingRefunds: mockBookings.filter((b) => b.status === "cancel_requested").length,
        todaysRevenue: 27900,
      });
      setLoading(false);
    }, 340);
  }, []);

  // carousel auto advance every 5s (pauses on hover)
  useEffect(() => {
    if (autoTimer.current) clearInterval(autoTimer.current);
    autoTimer.current = setInterval(() => {
      if (!hoveringCarousel) setPageIdx((p) => (p + 1) % featurePages.length);
    }, 5000);
    return () => clearInterval(autoTimer.current);
  }, [hoveringCarousel, featurePages.length]);

  // search handlers
  const handleSearchStart = () => {
    setSearched(false);
    setSearchResults([]);
  };

  const handleSearchSuccess = (data) => {
    // normalize responses
    let arr = [];
    if (!data) arr = [];
    else if (Array.isArray(data)) arr = data;
    else if (data.buses && Array.isArray(data.buses)) arr = data.buses;
    else if (data.list && Array.isArray(data.list)) arr = data.list;
    else if (data.content && Array.isArray(data.content)) arr = data.content;
    else if (typeof data === "object") {
      for (const k of Object.keys(data)) if (Array.isArray(data[k])) { arr = data[k]; break; }
      if (arr.length === 0 && (data.id || data.busName)) arr = [data];
    }
    setSearchResults(arr);
    setSearched(true);
  };

  // small actions (optimistic)
  const handleQuickAdd = () => {
    const newBus = { id: `b${Date.now()}`, busName: `Quick ${Date.now()%1000}`, route: "A → B", seats: 40, status: "active", operator: "QuickOps" };
    setBuses((s) => [newBus, ...s]);
    setStats((s) => ({ ...s, totalBuses: (s.totalBuses || 0) + 1 }));
  };

  const handleToggleStatus = (id) => {
    setBuses((prev) => prev.map((b) => (b.id === id ? { ...b, status: b.status === "active" ? "inactive" : "active" } : b)));
  };

  const handleProcessRefund = (bookingId) => {
    setBookings((prev) => prev.map((b) => (b.id === bookingId ? { ...b, status: "refunded" } : b)));
    setStats((s) => ({ ...s, pendingRefunds: Math.max(0, (s.pendingRefunds || 0) - 1) }));
  };

  const formatCurrency = (v) => `₹${Number(v).toLocaleString()}`;

  // KPI countups
  const totalUsersDisplay = useCountUp(stats.totalBuses, 800);
  const tripsDisplay = useCountUp(stats.todayTrips, 800);
  const refundsDisplay = useCountUp(stats.pendingRefunds, 800);
  const revenueDisplay = useCountUp(stats.todaysRevenue, 900);

  // motion variants
  const heroTitle = { hidden: { y: -8, opacity: 0 }, show: { y: 0, opacity: 1, transition: { duration: 0.5 } } };
  const heroSub = { hidden: { y: 6, opacity: 0 }, show: { y: 0, opacity: 1, transition: { duration: 0.5, delay: 0.08 } } };
  const cardVariant = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } };
  const featureVariant = {
    enter: (dir) => ({ x: dir > 0 ? 280 : -280, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir) => ({ x: dir > 0 ? -280 : 280, opacity: 0 }),
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50 to-white text-gray-800">
      {/* Top Nav — keep consistent with your header */}
      <header className="fixed top-0 left-0 right-0 z-40 backdrop-blur-sm bg-white/70 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-red-600 flex items-center justify-center text-white font-bold text-lg">RB</div>
              <div className="hidden sm:block">
                <h2 className="text-lg font-extrabold text-red-600">RedBus Admin</h2>
                <p className="text-xs text-gray-600">Operations & analytics</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button onClick={() => navigate("/")} className="text-sm px-3 py-1 rounded-md hover:bg-red-50">View site</button>
              <button onClick={() => navigate("/admin/settings")} className="text-sm px-3 py-1 rounded-md hover:bg-red-50">Settings</button>
              <button onClick={() => navigate("/admin/buses")} className="px-3 py-1 rounded-md bg-red-600 text-white">Bus Manager</button>
            </div>
          </div>
        </div>
      </header>

      {/* REMOVED the extra <div className="h-16" /> spacer that caused the pale band at the top */}

      {/* HERO: reduced bottom padding so KPI cards come sooner */}
      <section className="relative overflow-hidden">
        <div className="bg-gradient-to-r from-red-600 via-red-500 to-orange-400 pt-16 pb-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center gap-8">
            <div className="w-full md:w-1/2 text-white">
              <motion.h1 variants={heroTitle} initial="hidden" animate="show" className="text-3xl md:text-4xl font-extrabold leading-tight">
                Admin Console — Manage operations{" "}
                <span className="inline-block bg-white/20 px-3 py-1 rounded-md ml-2 text-sm">RedBus style</span>
              </motion.h1>

              <motion.p variants={heroSub} initial="hidden" animate="show" className="mt-4 text-lg max-w-xl">
                Quick actions, live KPIs and tools to run buses, bookings and refunds efficiently.
              </motion.p>

              <div className="mt-6 flex gap-3">
                <motion.button whileTap={{ scale: 0.97 }} onClick={handleQuickAdd} className="bg-white text-red-600 px-5 py-3 rounded-lg font-semibold shadow hover:scale-[1.02]">
                  Quick Add
                </motion.button>

                <motion.button whileTap={{ scale: 0.97 }} onClick={() => navigate("/admin/buses")} className="bg-white/20 text-white px-4 py-3 rounded-lg font-medium border border-white/30">
                  Bus Manager
                </motion.button>
              </div>

              <div className="mt-6 grid grid-cols-3 gap-3 text-sm opacity-90">
                <div className="bg-white/10 px-3 py-2 rounded">Live uptime</div>
                <div className="bg-white/10 px-3 py-2 rounded">Refund queue</div>
                <div className="bg-white/10 px-3 py-2 rounded">Payments</div>
              </div>
            </div>

            {/* Animated decorative scene (subtle) */}
            <div className="w-full md:w-1/2 relative h-56 md:h-64">
              <motion.div animate={{ x: ["-40%", "120%"] }} transition={{ duration: 16, repeat: Infinity, ease: "linear" }} className="absolute bottom-6 left-0 w-56 md:w-72" aria-hidden>
                <svg viewBox="0 0 700 220" xmlns="http://www.w3.org/2000/svg" className="w-full drop-shadow-2xl">
                  <rect x="16" y="28" rx="28" width="580" height="140" fill="#fff" />
                  <rect x="48" y="56" width="420" height="64" rx="8" fill="#ef4444" />
                  <g fill="#f7f7f7" opacity="0.95">
                    <rect x="72" y="64" width="60" height="40" rx="6" />
                    <rect x="150" y="64" width="60" height="40" rx="6" />
                    <rect x="228" y="64" width="60" height="40" rx="6" />
                    <rect x="306" y="64" width="60" height="40" rx="6" />
                  </g>
                  <g>
                    <circle cx="170" cy="152" r="26" fill="#111827" />
                    <circle cx="170" cy="152" r="12" fill="#9CA3AF" />
                    <circle cx="420" cy="152" r="26" fill="#111827" />
                    <circle cx="420" cy="152" r="12" fill="#9CA3AF" />
                  </g>
                </svg>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Floating search: centered and sits just below gradient, not overlapping KPIs */}
        <div className="max-w-4xl mx-auto -mt-10 px-4 sm:px-6 lg:px-8 relative z-30">
          <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} whileHover={{ y: -4 }} transition={{ duration: 0.45 }} className="bg-white rounded-2xl shadow-2xl p-4 md:p-6 border border-gray-100">
            <BusSearch onSearchStart={handleSearchStart} onSearchSuccess={handleSearchSuccess} adminQuickSearch />
          </motion.div>
        </div>
      </section>

      {/* MAIN: KPI cards (visible immediately under search) */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4 pb-12">
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <motion.div variants={cardVariant} initial="hidden" animate="show" className="bg-white rounded-2xl p-4 border border-gray-100">
            <div className="text-xs text-gray-500">Total buses</div>
            <div className="text-2xl font-bold text-red-600">{loading ? "—" : totalUsersDisplay}</div>
            <div className="text-xs text-gray-400 mt-2">Active: {buses.filter((b) => b.status === "active").length}</div>
          </motion.div>

          <motion.div variants={cardVariant} initial="hidden" animate="show" className="bg-white rounded-2xl p-4 border border-gray-100">
            <div className="text-xs text-gray-500">Today's trips</div>
            <div className="text-2xl font-bold text-red-600">{loading ? "—" : tripsDisplay}</div>
            <div className="text-xs text-gray-400 mt-2">Running: {Math.floor((stats.todayTrips || 0) * 0.6)}</div>
          </motion.div>

          <motion.div variants={cardVariant} initial="hidden" animate="show" className="bg-white rounded-2xl p-4 border border-gray-100">
            <div className="text-xs text-gray-500">Pending refunds</div>
            <div className="text-2xl font-bold text-red-600">{loading ? "—" : refundsDisplay}</div>
            <div className="text-xs text-gray-400 mt-2">Resolve quickly</div>
          </motion.div>

          <motion.div variants={cardVariant} initial="hidden" animate="show" className="bg-white rounded-2xl p-4 border border-gray-100">
            <div className="text-xs text-gray-500">Revenue today</div>
            <div className="text-2xl font-bold text-red-600">{loading ? "—" : `₹${revenueDisplay}`}</div>
            <div className="text-xs text-gray-400 mt-2">Compare: +4.3%</div>
          </motion.div>
        </section>

        {/* Feature carousel — auto rotates, hover to pause */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">Admin tools</h3>
            <div className="flex items-center gap-2">
              <button onClick={() => setPageIdx((p) => (p - 1 + featurePages.length) % featurePages.length)} className="px-2 py-1 rounded-md border">Prev</button>
              <button onClick={() => setPageIdx((p) => (p + 1) % featurePages.length)} className="px-2 py-1 rounded-md border">Next</button>
            </div>
          </div>

          <div className="relative" onMouseEnter={() => setHoveringCarousel(true)} onMouseLeave={() => setHoveringCarousel(false)}>
            <AnimatePresence initial={false} custom={pageIdx}>
              <motion.div
                key={featurePages[pageIdx].key}
                custom={pageIdx}
                variants={featureVariant}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.4 }}
                className="bg-white rounded-xl p-6 border border-gray-100"
              >
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  <div className="flex-1">
                    <h4 className="text-xl font-semibold">{featurePages[pageIdx].title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{featurePages[pageIdx].subtitle}</p>

                    <div className="mt-4 flex gap-3">
                      {featurePages[pageIdx].key === "bookings" && (
                        <>
                          <button onClick={() => navigate("/admin/bookings")} className="px-4 py-2 rounded-md border">Open Bookings</button>
                          <button onClick={() => navigate("/admin/refunds")} className="px-4 py-2 rounded-md bg-red-600 text-white">View Refunds</button>
                        </>
                      )}

                      {featurePages[pageIdx].key === "fleet" && (
                        <>
                          <button onClick={() => navigate("/admin/buses/new")} className="px-4 py-2 rounded-md border">Add Bus</button>
                          <button onClick={() => navigate("/admin/buses")} className="px-4 py-2 rounded-md bg-red-600 text-white">Open Bus Manager</button>
                        </>
                      )}

                      {featurePages[pageIdx].key === "refunds" && (
                        <>
                          <button onClick={() => navigate("/admin/refunds")} className="px-4 py-2 rounded-md border">Pending Refunds</button>
                          <button onClick={() => alert("Process All - demo")} className="px-4 py-2 rounded-md bg-red-600 text-white">Process All</button>
                        </>
                      )}

                      {featurePages[pageIdx].key === "analytics" && (
                        <>
                          <button onClick={() => navigate("/admin/analytics")} className="px-4 py-2 rounded-md border">Open Analytics</button>
                          <button onClick={() => alert("Export CSV - demo")} className="px-4 py-2 rounded-md bg-red-600 text-white">Export</button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="w-full md:w-64">
                    {/* page-specific mini panel */}
                    {featurePages[pageIdx].key === "bookings" && (
                      <div className="bg-gray-50 p-3 rounded">
                        <div className="text-xs text-gray-500">Recent bookings</div>
                        <ul className="mt-2 space-y-2 text-sm">
                          {bookings.slice(0, 3).map((bk) => (
                            <li key={bk.id} className="flex items-center justify-between">
                              <div>
                                <div className="font-medium">{bk.passenger}</div>
                                <div className="text-xs text-gray-500">{bk.trip}</div>
                              </div>
                              <div className="text-sm text-gray-700">₹{bk.amount}</div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {featurePages[pageIdx].key === "analytics" && (
                      <div className="bg-gray-50 p-3 rounded text-sm">
                        <div className="text-xs text-gray-500">Today</div>
                        <div className="mt-2 font-semibold">{formatCurrency(stats.todaysRevenue)}</div>
                        <div className="text-xs text-gray-500 mt-1">Occupancy: 72%</div>
                      </div>
                    )}

                    {featurePages[pageIdx].key === "fleet" && (
                      <div className="bg-gray-50 p-3 rounded text-sm">
                        <div className="text-xs text-gray-500">Fleet</div>
                        <div className="mt-2 font-semibold">{buses.length} buses</div>
                        <div className="text-xs text-gray-500 mt-1">Active: {buses.filter((b) => b.status === "active").length}</div>
                      </div>
                    )}

                    {featurePages[pageIdx].key === "refunds" && (
                      <div className="bg-gray-50 p-3 rounded text-sm">
                        <div className="text-xs text-gray-500">Pending</div>
                        <div className="mt-2 font-semibold">{stats.pendingRefunds}</div>
                        <div className="text-xs text-gray-500 mt-1">Last: {bookings.find((b) => b.status === "cancel_requested")?.passenger ?? "—"}</div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* dots */}
            <div className="flex items-center gap-2 mt-3 justify-center">
              {featurePages.map((p, i) => (
                <button key={p.key} onClick={() => setPageIdx(i)} className={`h-2 w-8 rounded-full ${i === pageIdx ? "bg-red-600" : "bg-gray-200"}`} />
              ))}
            </div>
          </div>
        </section>

        {/* Results / Search output */}
        <section className="mt-6">
          {searched && searchResults.length > 0 && (
            <div className="bg-white rounded-xl p-6 shadow border border-gray-100">
              <h3 className="text-lg font-semibold mb-4">Search results</h3>
              <BusList buses={searchResults} adminMode />
            </div>
          )}

          {searched && searchResults.length === 0 && (
            <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-6 text-center text-yellow-800">No results. Try a different route/date.</div>
          )}

          {!searched && (
            <div className="bg-white rounded-xl p-6 mt-6 text-center border border-gray-100">
              <h4 className="font-semibold">Use the quick search to find buses or bookings</h4>
              <p className="text-sm text-gray-500 mt-1">Admin quick actions and tools appear above.</p>
            </div>
          )}
        </section>

        {/* Quick lists */}
        <section className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <h4 className="font-semibold mb-3">Recent bookings</h4>
            <ul className="space-y-2 text-sm">
              {bookings.map((bk) => (
                <li key={bk.id} className="flex items-center justify-between p-2 rounded hover:bg-gray-50">
                  <div>
                    <div className="font-medium">{bk.passenger}</div>
                    <div className="text-xs text-gray-500">{bk.trip}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-sm">₹{bk.amount}</div>
                    {bk.status === "cancel_requested" ? (
                      <button onClick={() => handleProcessRefund(bk.id)} className="px-2 py-1 text-xs rounded-md bg-red-600 text-white">Process</button>
                    ) : (
                      <span className="text-xs text-green-600">OK</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <h4 className="font-semibold mb-3">Fleet overview</h4>
            <ul className="space-y-2 text-sm">
              {buses.map((bus) => (
                <li key={bus.id} className="flex items-center justify-between p-2 rounded hover:bg-gray-50">
                  <div>
                    <div className="font-medium">{bus.busName}</div>
                    <div className="text-xs text-gray-500">{bus.route}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-xs">{bus.seats} seats</div>
                    <button onClick={() => handleToggleStatus(bus.id)} className={`text-xs px-2 py-1 rounded ${bus.status === "active" ? "bg-green-50 text-green-600" : "bg-gray-50 text-gray-600"}`}>
                      {bus.status}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between">
          <div>
            <p className="font-semibold">LinkedBus Admin</p>
            <p className="text-sm text-gray-400">© {new Date().getFullYear()}</p>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-300">
            <button className="hover:text-white">Help</button>
            <button className="hover:text-white">Contact</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
