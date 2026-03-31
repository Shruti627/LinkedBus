import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  loginUser,
  registerUser,
  verifyRegister,
  forgotPassword,
  verifyOtpReset,
} from "../../services/authService";

export default function RegisterLogin({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phoneNumber: "",
    city: "",
    state: "",
    gender: "", // <-- added
  });
  const [message, setMessage] = useState("");

  // validation state
  const [errors, setErrors] = useState({});
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [canSubmitRegister, setCanSubmitRegister] = useState(false);

  // OTP / registration phase
  const [otpPhase, setOtpPhase] = useState(false);
  const [otpEmail, setOtpEmail] = useState("");
  const [otpValue, setOtpValue] = useState("");

  // forgot password
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotStep, setForgotStep] = useState(0); // 0=send,1=verify+reset
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [forgotNewPass, setForgotNewPass] = useState("");

  // admin login toggle (kept as simple flag only)
  const [adminMode, setAdminMode] = useState(false);

  const navigate = useNavigate();

  // validators
  const validateEmail = (email) => {
    if (!email) return "Email is required";
    const re = /^[\w-.]+@[\w-]+\.[a-zA-Z]{2,}$/;
    return re.test(email) ? "" : "Enter a valid email address";
  };

  const validatePhone = (phone) => {
    if (!phone) return "Phone number is required";
    const re = /^\d{10}$/;
    return re.test(phone) ? "" : "Enter a valid 10-digit phone number";
  };

  const validateName = (name) => {
    if (!name || name.trim().length < 2) return "Please enter your full name";
    return "";
  };

  const validateGender = (g) => {
    if (!g) return ""; // optional
    const ok = ["male", "female", "other", "prefer_not_to_say"].includes(String(g).toLowerCase());
    return ok ? "" : "Invalid gender selection";
  };

  const passwordRules = (pwd) => {
    const rules = {
      length: pwd.length >= 8,
      lower: /[a-z]/.test(pwd),
      upper: /[A-Z]/.test(pwd),
      digit: /[0-9]/.test(pwd),
      special: /[^A-Za-z0-9]/.test(pwd),
    };
    return rules;
  };

  const validatePassword = (pwd) => {
    if (!pwd) return "Password is required";
    const rules = passwordRules(pwd);
    const passed = Object.values(rules).every(Boolean);
    return passed ? "" : "Password must be ≥8 chars and include uppercase, lowercase, number and special character";
  };

  // evaluate password strength (0-4)
  const computePasswordStrength = (pwd) => {
    if (!pwd) return 0;
    const rules = passwordRules(pwd);
    let score = 0;
    if (rules.length) score++;
    if (rules.lower) score++;
    if (rules.upper) score++;
    if (rules.digit) score++;
    if (rules.special) score++;
    return Math.max(0, score - 1);
  };

  // handle changes and run validations
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((s) => ({ ...s, [name]: value }));

    if (!isLogin) {
      setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
    }

    if (name === "password") {
      setPasswordStrength(computePasswordStrength(value));
    }
  };

  const validateField = (name, value) => {
    switch (name) {
      case "email":
        return validateEmail(value);
      case "phoneNumber":
        return validatePhone(value);
      case "name":
        return validateName(value);
      case "password":
        return validatePassword(value);
      case "gender":
        return validateGender(value);
      default:
        return "";
    }
  };

  useEffect(() => {
    if (isLogin) return;
    const eName = validateName(formData.name);
    const eEmail = validateEmail(formData.email);
    const ePhone = validatePhone(formData.phoneNumber);
    const ePass = validatePassword(formData.password);
    const eGender = validateGender(formData.gender);
    setErrors({ name: eName, email: eEmail, phoneNumber: ePhone, password: ePass, gender: eGender });
    const ok = !eName && !eEmail && !ePhone && !ePass && !eGender;
    setCanSubmitRegister(ok);
  }, [formData, isLogin]);

  const persistAuth = (token, user) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
  };

  // -------------------------
  // IMPORTANT: updated login flow
  // - robustly handles response shape
  // - ensures user.role is present when adminMode checkbox is used (testing)
  // - persists auth, calls onLogin, then navigates based on saved user.role
  // -------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      if (isLogin && !forgotMode) {
        // LOGIN
        setLoading(true);
        const data = await loginUser({
          email: formData.email,
          password: formData.password,
        });

        console.log("loginUser response:", data);

        // Basic validation of response shape
        if (!data) {
          setMessage("❌ No response from server");
          return;
        }

        // If service returns token + user
        if (data.token && data.user) {
          // If admin toggle checked for testing, add admin role to the returned user object
          const userWithRole = { ...data.user };
          if (adminMode && !(userWithRole.role === "admin" || userWithRole.isAdmin)) {
            userWithRole.role = "admin";
            userWithRole.isAdmin = true;
          }

          // persist auth
          persistAuth(data.token, userWithRole);

          setMessage("✅ Login successful!");
          // notify parent App to update state
          onLogin?.();

          // Now decide where to navigate — read the saved user from localStorage to be deterministic
          try {
            const stored = JSON.parse(localStorage.getItem("user") || "{}");
            const isAdmin = stored.role === "admin" || stored.isAdmin === true;
            if (isAdmin) {
              // go to admin home (your router uses /admin -> AdminHome)
              navigate("/admin");
            } else {
              navigate("/");
            }
          } catch (navErr) {
            console.error("navigate error:", navErr);
            navigate("/profile");
          }
          return;
        }

        // If service returns only token and endpoint requires another user fetch
        if (data.token && !data.user) {
          // persist token and attempt to fetch user or fallback
          persistAuth(data.token, { email: formData.email }); // minimal
          onLogin?.();
          // best-effort navigate
          navigate("/profile");
          return;
        }

        // Otherwise show error returned by API
        setMessage(data.error || "❌ Invalid credentials");
      } else if (!isLogin) {
        // START REGISTER (send OTP)
        const eName = validateName(formData.name);
        const eEmail = validateEmail(formData.email);
        const ePhone = validatePhone(formData.phoneNumber);
        const ePass = validatePassword(formData.password);
        const eGender = validateGender(formData.gender);

        if (eName || eEmail || ePhone || ePass || eGender) {
          setErrors({ name: eName, email: eEmail, phoneNumber: ePhone, password: ePass, gender: eGender });
          setMessage("⚠️ Please fix validation errors before continuing.");
          return;
        }

        setLoading(true);
        const res = await registerUser(formData);
        setMessage(res.message || "✅ OTP sent to your email.");
        setOtpEmail(formData.email);
        setOtpPhase(true);
      } else if (isLogin && forgotMode && forgotStep === 0) {
        // forgot password send OTP
        setLoading(true);
        const res = await forgotPassword(forgotEmail);
        setMessage(res.message || "✅ OTP sent to your email (if account exists).");
        setForgotStep(1);
      }
    } catch (err) {
      console.error(err);
      setMessage("⚠️ " + (err.message || "Something went wrong"));
    } finally {
      setLoading(false);
    }
  };

  // verify registration OTP (step 2)
  const handleVerifyRegisterOtp = async (e) => {
    e?.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const res = await verifyRegister({ email: otpEmail, otp: otpValue });
      if (res.token) {
        persistAuth(res.token, res.user);
        setMessage(res.message || "✅ Registration complete — logged in.");
        onLogin?.();
        navigate("/profile");
      } else {
        setMessage(res.error || "❌ OTP verification failed");
      }
    } catch (err) {
      console.error(err);
      setMessage("⚠️ " + (err.message || "OTP verification failed"));
    } finally {
      setLoading(false);
    }
  };

  // verify forgot-password OTP + reset password
  const handleVerifyForgot = async (e) => {
    e?.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const res = await verifyOtpReset({
        email: forgotEmail,
        otp: forgotOtp,
        newPassword: forgotNewPass,
      });
      setMessage(res.message || "✅ Password reset successful. Please login.");
      setForgotMode(false);
      setForgotStep(0);
      setForgotEmail("");
      setForgotOtp("");
      setForgotNewPass("");
      setIsLogin(true);
    } catch (err) {
      console.error(err);
      setMessage("⚠️ " + (err.message || "Reset failed"));
    } finally {
      setLoading(false);
    }
  };

  // animations & UI helpers same as before...
  const busVariants = {
    drive: {
      x: ["-40%", "110%"],
      transition: { duration: 12, repeat: Infinity, ease: "linear" },
    },
  };
  const cloudVariants = {
    float: (i = 0) => ({
      x: [`-${30 + i * 10}%`, `${120 + i * 20}%`],
      transition: { duration: 28 + i * 6, repeat: Infinity, ease: "linear" },
    }),
  };

  const renderPasswordCriteria = () => {
    const pwd = formData.password || "";
    const rules = passwordRules(pwd);
    const criteria = [
      { key: "length", label: "At least 8 characters" },
      { key: "lower", label: "One lowercase letter" },
      { key: "upper", label: "One uppercase letter" },
      { key: "digit", label: "One number" },
      { key: "special", label: "One special character (e.g. !@#$%)" },
    ];

    return (
      <ul className="text-xs space-y-1 mt-1">
        {criteria.map((c) => (
          <li key={c.key} className={rules[c.key] ? "text-green-600" : "text-gray-400"}>
            {rules[c.key] ? "✓" : "○"} {c.label}
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#ffebe9] via-[#ffdede] to-white flex flex-col">
      <section className="relative overflow-hidden">
        <div className="bg-red-600 rounded-b-3xl pt-12 pb-20">
          <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center gap-8">
            <div className="md:w-1/2 text-white">
              <motion.h2 initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.45 }} className="text-3xl md:text-4xl font-extrabold">Welcome — book bus tickets in seconds</motion.h2>
              <motion.p initial={{ y: 4, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1, duration: 0.45 }} className="mt-3 text-sm md:text-base text-white/90 max-w-xl">
                Secure payments, live tracking, and instant confirmations. Log in or create an account to access your bookings and offers.
              </motion.p>

              <div className="mt-6 flex gap-3">
                <button onClick={() => { setIsLogin(true); setOtpPhase(false); setForgotMode(false); }} className="bg-white text-red-600 px-4 py-2 rounded-lg font-semibold shadow">Login</button>
                <button onClick={() => { setIsLogin(false); setOtpPhase(false); setForgotMode(false); }} className="bg-white/20 text-white px-4 py-2 rounded-lg font-medium border border-white/30">Register</button>
              </div>

              <div className="mt-6 flex gap-3 text-xs text-white/90">
                <div className="bg-white/10 px-3 py-1 rounded">24/7 Support</div>
                <div className="bg-white/10 px-3 py-1 rounded">Best Price Promise</div>
                <div className="bg-white/10 px-3 py-1 rounded">Easy Cancellation</div>
              </div>
            </div>

            <div className="md:w-1/2 relative h-44 md:h-56">
              <motion.div custom={0} variants={cloudVariants} animate="float" className="absolute left-0 top-6 opacity-60">
                <svg width="160" height="48" viewBox="0 0 160 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="160" height="48" rx="24" fill="white" opacity="0.18" />
                </svg>
              </motion.div>

              <motion.div custom={1} variants={cloudVariants} animate="float" className="absolute left-20 top-12 opacity-50">
                <svg width="120" height="40" viewBox="0 0 120 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="120" height="40" rx="20" fill="white" opacity="0.14" />
                </svg>
              </motion.div>

              <motion.div variants={busVariants} animate="drive" className="absolute bottom-2 left-0 w-64 md:w-96">
                <svg viewBox="0 0 700 220" xmlns="http://www.w3.org/2000/svg" className="w-full drop-shadow-2xl">
                  <defs>
                    <linearGradient id="g1" x1="0" x2="1">
                      <stop offset="0%" stopColor="#fff" stopOpacity="0.08" />
                      <stop offset="100%" stopColor="#000" stopOpacity="0.04" />
                    </linearGradient>
                  </defs>

                  <rect x="10" y="40" rx="28" width="620" height="120" fill="#ffffff" opacity="0.06" />
                  <rect x="18" y="28" rx="28" width="580" height="140" fill="#fff" />

                  <rect x="50" y="56" width="420" height="64" rx="8" fill="#ef4444" />
                  <rect x="50" y="56" width="420" height="64" rx="8" fill="url(#g1)" />

                  <g fill="#f7f7f7" opacity="0.95">
                    <rect x="74" y="64" width="60" height="40" rx="6" />
                    <rect x="152" y="64" width="60" height="40" rx="6" />
                    <rect x="230" y="64" width="60" height="40" rx="6" />
                    <rect x="308" y="64" width="60" height="40" rx="6" />
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

        <div className="max-w-3xl mx-auto -mt-12 px-6 relative z-30">
          <motion.div initial={{ y: 18, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.45 }} className="bg-white rounded-3xl shadow-2xl p-6 md:p-8 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-800">{isLogin ? 'Sign in to your account' : 'Create your account'}</h3>
                <p className="text-xs text-gray-500">Access bookings, offers and more</p>
              </div>
              <div className="hidden sm:flex gap-2 items-center text-sm">
                <div className="text-xs text-gray-400">Secure</div>
                <div className="px-2 py-1 bg-red-50 rounded text-red-600 font-semibold">RB</div>
              </div>
            </div>

            <div className="flex gap-2 mb-4 bg-gray-50 p-1 rounded-xl">
              <button onClick={() => { setIsLogin(true); setOtpPhase(false); setForgotMode(false); }} className={`flex-1 py-2 text-sm font-medium rounded-lg ${isLogin ? 'bg-white shadow-sm text-red-600' : 'text-gray-500'}`}>Login</button>
              <button onClick={() => { setIsLogin(false); setOtpPhase(false); setForgotMode(false); }} className={`flex-1 py-2 text-sm font-medium rounded-lg ${!isLogin ? 'bg-white shadow-sm text-red-600' : 'text-gray-500'}`}>Register</button>
            </div>

            {/* Admin toggle (kept as simple UI toggle only) */}
            {isLogin && (
              <div className="mb-3 flex items-center gap-2 text-sm">
                <input id="adminToggle" type="checkbox" checked={adminMode} onChange={() => setAdminMode(m => !m)} className="w-4 h-4" />
                <label htmlFor="adminToggle" className="text-gray-600">Login as admin (access admin dashboard)</label>
              </div>
            )}

            {/* Normal form (login/register start) */}
            {!otpPhase && !forgotMode && (
              <form onSubmit={handleSubmit} className="space-y-3">
                {!isLogin && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <input name="name" placeholder="Full name" value={formData.name} onChange={handleChange} className="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-red-200 outline-none" required />
                      {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                    </div>

                    <div>
                      <input name="phoneNumber" placeholder="Phone number" value={formData.phoneNumber} onChange={handleChange} className="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-red-200 outline-none" required />
                      {errors.phoneNumber && <p className="text-xs text-red-500 mt-1">{errors.phoneNumber}</p>}
                    </div>

                    <input name="city" placeholder="City" value={formData.city} onChange={handleChange} className="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-red-200 outline-none" />
                    <input name="state" placeholder="State" value={formData.state} onChange={handleChange} className="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-red-200 outline-none" />

                    {/* Gender select */}
                    <div>
                      <label className="text-xs text-gray-500">Gender (optional)</label>
                      <select
                        name="gender"
                        value={formData.gender}
                        onChange={handleChange}
                        className="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-red-200 outline-none"
                      >
                        <option value="">Prefer not to say</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                        <option value="prefer_not_to_say">Prefer not to say</option>
                      </select>
                      {errors.gender && <p className="text-xs text-red-500 mt-1">{errors.gender}</p>}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <input name="email" type="email" placeholder="Email address" value={formData.email} onChange={handleChange} className="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-red-200 outline-none" required />
                    {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
                  </div>

                  <div>
                    <input name="password" type="password" placeholder="Password" value={formData.password} onChange={handleChange} className="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-red-200 outline-none" required={!(!isLogin)} />
                    {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}

                    {/* password strength meter */}
                    {!isLogin && (
                      <div className="mt-2">
                        <div className="h-2 w-full bg-gray-100 rounded overflow-hidden">
                          <div style={{ width: `${(passwordStrength / 4) * 100}%` }} className={`h-full rounded ${passwordStrength <= 1 ? 'bg-red-400' : passwordStrength <= 2 ? 'bg-yellow-400' : 'bg-green-500'}`} />
                        </div>
                        {renderPasswordCriteria()}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  {isLogin ? (
                    <button type="button" onClick={() => { setForgotMode(true); setForgotStep(0); setMessage(""); }} className="text-sm text-red-500 hover:underline">Forgot password?</button>
                  ) : (
                    <div className="text-xs text-gray-400">We'll send a confirmation OTP to your email</div>
                  )}

                  <button type="submit" disabled={loading || (!isLogin && !canSubmitRegister)} className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 disabled:opacity-60">
                    {loading ? 'Please wait...' : isLogin ? 'Login Securely' : 'Register Now'}
                  </button>
                </div>
              </form>
            )}

            {/* Registration OTP verify */}
            {otpPhase && (
              <form onSubmit={handleVerifyRegisterOtp} className="space-y-3">
                <div className="text-sm text-gray-600">An OTP was sent to <span className="font-medium">{otpEmail}</span>. Enter it below to complete registration.</div>
                <div className="flex gap-2">
                  <input value={otpValue} onChange={(e) => setOtpValue(e.target.value)} placeholder="Enter OTP" className="flex-1 rounded-lg border px-3 py-2" />
                  <button type="submit" disabled={loading || !otpValue} className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold disabled:opacity-60">{loading ? "Verifying..." : "Verify OTP"}</button>
                </div>

                <div className="flex justify-between items-center text-sm text-gray-500">
                  <button type="button" onClick={async () => {
                    try {
                      setLoading(true);
                      const res = await registerUser(formData);
                      setMessage(res.message || "OTP resent");
                    } catch (err) {
                      setMessage("⚠️ " + (err.message || "Could not resend OTP"));
                    } finally {
                      setLoading(false);
                    }
                  }} className="underline">Resend OTP</button>

                  <button type="button" onClick={() => { setOtpPhase(false); setOtpValue(""); setMessage(""); }} className="text-red-500">Back</button>
                </div>
              </form>
            )}

            {/* Forgot password flows */}
            {forgotMode && forgotStep === 0 && (
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="text-sm text-gray-600">Enter your account email and we'll send a password reset OTP.</div>
                <input value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} placeholder="Email address" type="email" className="w-full rounded-lg border px-3 py-2" required />
                <div className="flex justify-between items-center">
                  <button type="button" onClick={() => { setForgotMode(false); setForgotStep(0); setMessage(""); }} className="text-sm text-gray-500">Cancel</button>
                  <button type="submit" disabled={loading} className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold disabled:opacity-60">{loading ? "Please wait..." : "Send OTP"}</button>
                </div>
              </form>
            )}

            {forgotMode && forgotStep === 1 && (
              <form onSubmit={handleVerifyForgot} className="space-y-3">
                <div className="text-sm text-gray-600">Enter the OTP sent to <span className="font-medium">{forgotEmail}</span> and choose a new password.</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input value={forgotOtp} onChange={(e) => setForgotOtp(e.target.value)} placeholder="OTP" className="w-full rounded-lg border px-3 py-2" required />
                  <input value={forgotNewPass} onChange={(e) => setForgotNewPass(e.target.value)} placeholder="New password" type="password" className="w-full rounded-lg border px-3 py-2" required />
                </div>
                <div className="flex justify-between items-center">
                  <button type="button" onClick={() => { setForgotMode(false); setForgotStep(0); setMessage(""); }} className="text-sm text-gray-500">Cancel</button>
                  <button type="submit" disabled={loading} className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold disabled:opacity-60">{loading ? "Please wait..." : "Reset Password"}</button>
                </div>
              </form>
            )}

            {message && <p className="text-center text-sm text-gray-600 mt-3">{message}</p>}
          </motion.div>
        </div>
      </section>

      <footer className="mt-10 mb-6 text-center text-sm text-gray-500">© {new Date().getFullYear()} Linked Bus —Ms. Shruti P. Sangvikar</footer>
    </div>
  );
}
