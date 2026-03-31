import React, { useState } from 'react';
import { motion } from 'framer-motion';
import BusSearch from '../components/BusSearch';
import BusList from '../components/BusList';

// Top-level HomePage designed as a polished RedBus-like UI with animations
// - Uses Tailwind for layout and styling
// - Uses framer-motion for hero and micro-interactions
// - Keeps your existing BusSearch and BusList components; they are passed helpful callbacks

export default function HomePage() {
  const [searchResults, setSearchResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSearchStart = () => {
    setLoading(true);
    setSearched(false);
    setSearchResults([]);
  };

  const handleSearchSuccess = (data) => {
    setLoading(false);

    let busArray = [];
    try {
      if (Array.isArray(data)) busArray = data;
      else if (data && Array.isArray(data.buses)) busArray = data.buses;
      else if (data && Array.isArray(data.list)) busArray = data.list;
      else if (data && Array.isArray(data.content)) busArray = data.content;
      else if (data && typeof data === 'object') {
        const keys = Object.keys(data);
        for (let key of keys) if (Array.isArray(data[key])) { busArray = data[key]; break; }
        if (busArray.length === 0 && Object.keys(data).length > 0) {
          if (data.id || data.busName) busArray = [data];
        }
      }
    } catch (err) {
      console.error('parse error', err);
      busArray = [];
    }

    setSearchResults(busArray);
    setSearched(true);
  };

  // framer-motion variants
  const busVariants = {
    drive: {
      x: ['-30%', '110%'],
      transition: { duration: 14, repeat: Infinity, ease: 'linear' },
    },
  };

  const cloudVariants = {
    float: (i = 0) => ({
      x: [`-${20 + i * 10}%`, `${100 + i * 20}%`],
      transition: { duration: 30 + i * 8, repeat: Infinity, ease: 'linear' },
    }),
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50 to-white text-gray-800">
      {/* Top navigation - simple, accessible */}
      <header className="fixed top-0 left-0 right-0 z-40 backdrop-blur-sm bg-white/60 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-red-600 flex items-center justify-center text-white font-bold text-lg">
                RB
              </div>
              <div className="hidden sm:block">
                <h2 className="text-lg font-extrabold text-red-600">Linked Bus</h2>
                <p className="text-xs text-gray-600">Fast. Reliable. Comfortable.</p>
              </div>
            </div>

            <nav className="flex items-center gap-4">
              <button className="text-sm px-3 py-1 rounded-md hover:bg-red-50">Routes</button>
              <button className="text-sm px-3 py-1 rounded-md hover:bg-red-50">Offers</button>
              <button className="text-sm px-3 py-1 rounded-md hover:bg-red-50">Help</button>
              <button className="ml-2 bg-red-600 text-white px-4 py-2 rounded-lg shadow-md hover:brightness-105">Login</button>
            </nav>
          </div>
        </div>
      </header>

      {/* Spacer for fixed header */}
      <div className="h-16" />

      {/* Hero section */}
      <section className="relative overflow-hidden">
        <div className="bg-gradient-to-r from-red-600 via-red-500 to-orange-400 pt-16 pb-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center gap-8">
            {/* Left: Text */}
            <div className="w-full md:w-1/2 text-white">
              <motion.h1
                initial={{ y: -10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.6 }}
                className="text-3xl md:text-5xl font-extrabold leading-tight"
              >
                Book Bus Tickets <span className="inline-block bg-white/20 px-3 py-1 rounded-md ml-2 text-sm">Fast & Secure</span>
              </motion.h1>

              <motion.p
                initial={{ y: 6, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="mt-4 text-lg max-w-xl"
              >
                Find buses, compare prices, and reserve seats in a few taps. Live tracking, flexible cancellation, and 24/7 support.
              </motion.p>

              <div className="mt-6 flex gap-3">
                <button className="bg-white text-red-600 px-5 py-3 rounded-lg font-semibold shadow hover:scale-[1.02] transition-transform">
                  Search buses
                </button>
                <button className="bg-white/20 text-white px-4 py-3 rounded-lg font-medium border border-white/30 hover:bg-white/30">
                  Offers
                </button>
              </div>

              <div className="mt-6 grid grid-cols-3 gap-3 text-sm opacity-90">
                <div className="bg-white/10 px-3 py-2 rounded">Free cancellation</div>
                <div className="bg-white/10 px-3 py-2 rounded">Live seat map</div>
                <div className="bg-white/10 px-3 py-2 rounded">Secure payments</div>
              </div>
            </div>

            {/* Right: Animated scene with bus and clouds */}
            <div className="w-full md:w-1/2 relative h-56 md:h-64">
              {/* Decorative clouds */}
              <motion.div custom={0} variants={cloudVariants} animate="float" className="absolute left-0 top-6 opacity-70">
                <svg width="160" height="48" viewBox="0 0 160 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="160" height="48" rx="24" fill="white" opacity="0.14" />
                </svg>
              </motion.div>

              <motion.div custom={1} variants={cloudVariants} animate="float" className="absolute left-16 top-16 opacity-60">
                <svg width="120" height="40" viewBox="0 0 120 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="120" height="40" rx="20" fill="white" opacity="0.12" />
                </svg>
              </motion.div>

              {/* Road */}
              <div className="absolute left-0 right-0 bottom-0 h-20 md:h-24 bg-gradient-to-t from-gray-900/20 to-transparent">
                <div className="max-w-6xl mx-auto h-full flex items-end justify-between px-8">
                  <div className="w-full">
                    <div className="h-0.5 bg-white/10 rounded-full" />
                    <div className="mt-2 flex gap-2 items-center">
                      <div className="h-1 w-6 bg-white/30 rounded" />
                      <div className="h-1 w-20 bg-white/30 rounded" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Animated Bus SVG - drives from left to right */}
              <motion.div
                variants={busVariants}
                animate="drive"
                className="absolute bottom-6 left-0 w-56 md:w-72"
                aria-hidden
              >
                {/* Simple illustrative bus — keep SVG compact and stylable */}
                <svg viewBox="0 0 700 220" xmlns="http://www.w3.org/2000/svg" className="w-full drop-shadow-2xl">
                  <defs>
                    <linearGradient id="g1" x1="0" x2="1">
                      <stop offset="0%" stopColor="#fff" stopOpacity="0.08" />
                      <stop offset="100%" stopColor="#000" stopOpacity="0.04" />
                    </linearGradient>
                  </defs>

                  <rect x="8" y="40" rx="28" width="620" height="120" fill="#ffffff" opacity="0.06" />
                  <rect x="16" y="28" rx="28" width="580" height="140" fill="#fff" />

                  <rect x="48" y="56" width="420" height="64" rx="8" fill="#ef4444" />
                  <rect x="48" y="56" width="420" height="64" rx="8" fill="url(#g1)" />

                  {/* windows */}
                  <g fill="#f7f7f7" opacity="0.95">
                    <rect x="72" y="64" width="60" height="40" rx="6" />
                    <rect x="150" y="64" width="60" height="40" rx="6" />
                    <rect x="228" y="64" width="60" height="40" rx="6" />
                    <rect x="306" y="64" width="60" height="40" rx="6" />
                  </g>

                  {/* wheels */}
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

        {/* Overlapping Search Card (floating) */}
        <div className="max-w-5xl mx-auto -mt-12 px-4 sm:px-6 lg:px-8 relative z-30">
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-2xl shadow-2xl p-6 md:p-8 border border-gray-100"
          >
            {/* BusSearch is expected to call onSearchStart/onSearchSuccess */}
            <BusSearch onSearchStart={handleSearchStart} onSearchSuccess={handleSearchSuccess} />
          </motion.div>
        </div>
      </section>

      {/* Main content: features + results */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 pb-12">
        <section className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
            <h3 className="text-xl font-bold text-red-600">Hassle-free Booking</h3>
            <p className="text-sm text-gray-600 mt-2">Instant confirmation, multiple payment options and easy cancellations.</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
            <h3 className="text-xl font-bold text-red-600">Live Bus Tracking</h3>
            <p className="text-sm text-gray-600 mt-2">Follow the bus on the map and get ETA updates.</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
            <h3 className="text-xl font-bold text-red-600">Best Price Promise</h3>
            <p className="text-sm text-gray-600 mt-2">Competitive fares with occasional exclusive offers.</p>
          </div>
        </section>

        {/* Results / Loading / Empty states */}
        <section className="mt-10">
          {loading && (
            <div className="bg-white rounded-xl p-6 shadow border border-gray-100">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-4" />
                <div className="space-y-3">
                  <div className="h-20 bg-gray-100 rounded" />
                  <div className="h-20 bg-gray-100 rounded" />
                  <div className="h-20 bg-gray-100 rounded" />
                </div>
              </div>
            </div>
          )}

          {!loading && searched && searchResults.length > 0 && (
            <div className="bg-white rounded-xl p-6 shadow border border-gray-100">
              <h3 className="text-lg font-semibold mb-4">Available buses</h3>
              <BusList buses={searchResults} />
            </div>
          )}

          {!loading && searched && searchResults.length === 0 && (
            <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-6 text-center text-yellow-800">
              No buses found. Try changing date or route.
            </div>
          )}

          {!searched && (
            <div className="bg-white rounded-xl p-6 mt-6 text-center border border-gray-100">
              <h4 className="font-semibold">Start by searching for a route</h4>
              <p className="text-sm text-gray-500 mt-1">We’ll show the best matching buses and deals.</p>
            </div>
          )}
        </section>
      </main>

      <footer className="bg-gray-900 text-white mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-semibold">Linked Bus</p>
            <p className="text-sm text-gray-400">© {new Date().getFullYear()} — Built with ❤️</p>
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-300">
            <a className="hover:text-white">Terms</a>
            <a className="hover:text-white">Privacy</a>
            <a className="hover:text-white">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
