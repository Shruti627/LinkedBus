import React, { useState } from "react";
import { motion } from "framer-motion";
import { sendOtp } from "../../services/authService";
import { useNavigate } from "react-router-dom";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const data = await sendOtp(email);
      setMessage(data.message || "OTP sent to your email.");
      setTimeout(() => navigate("/verify-otp", { state: { email } }), 1000);
    } catch {
      setMessage("Failed to send OTP. Try again!");
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
          Forgot Password
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded-xl p-3 focus:ring-2 focus:ring-red-400 outline-none"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 text-white py-3 rounded-xl hover:bg-red-700 transition font-semibold"
          >
            {loading ? "Sending..." : "Send OTP"}
          </button>
        </form>
        {message && <p className="text-center mt-4 text-sm">{message}</p>}
      </motion.div>
    </div>
  );
}
