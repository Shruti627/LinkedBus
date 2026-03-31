import React, { useState } from "react";
import { motion } from "framer-motion";
import { verifyOtp } from "../../services/authService";
import { useLocation, useNavigate } from "react-router-dom";

export default function VerifyOtp() {
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { state } = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await verifyOtp(state.email, otp);
      setMessage(data.message || "OTP verified!");
      setTimeout(() => navigate("/reset-password", { state: { email: state.email } }), 800);
    } catch {
      setMessage("Invalid or expired OTP!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col justify-center items-center min-h-screen bg-gradient-to-b from-[#d32f2f] to-[#b71c1c]">
      <motion.div
        className="bg-white p-8 rounded-3xl shadow-lg w-[90%] max-w-md"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="text-2xl font-bold text-center text-red-600 mb-6">
          Verify OTP
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Enter OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            className="w-full border rounded-xl p-3 focus:ring-2 focus:ring-red-400 outline-none"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 text-white py-3 rounded-xl hover:bg-red-700 transition font-semibold"
          >
            {loading ? "Verifying..." : "Verify OTP"}
          </button>
        </form>
        {message && <p className="text-center mt-4 text-sm">{message}</p>}
      </motion.div>
    </div>
  );
}
