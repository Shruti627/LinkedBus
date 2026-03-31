const API_BASE = "http://localhost:8080/api/auth";

/**
 * Central response handler
 * - Throws error on HTTP 4xx / 5xx
 * - Returns parsed JSON on success
 */
async function handleResponse(res) {
  const text = await res.text();

  if (!res.ok) {
    try {
      const json = JSON.parse(text);
      throw new Error(json.error || json.message || "Request failed");
    } catch {
      throw new Error(text || "Request failed");
    }
  }

  return text ? JSON.parse(text) : {};
}


/**
 * Registration step 1: request OTP
 */
export async function registerUser(userData) {
  const res = await fetch(`${API_BASE}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(userData),
  });

  return handleResponse(res);
}

/**
 * Registration step 2: verify OTP
 */
export async function verifyRegister({ email, otp }) {
  const res = await fetch(`${API_BASE}/verify-register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, otp }),
  });

  return handleResponse(res);
}

/**
 * Login
 */
export async function loginUser(credentials) {
  const res = await fetch(`${API_BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });

  return handleResponse(res);
}

/**
 * Forgot password – send OTP
 */
export async function forgotPassword(email) {
  const res = await fetch(`${API_BASE}/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  return handleResponse(res);
}

/**
 * Verify OTP and reset password
 */
export async function verifyOtpReset({ email, otp, newPassword }) {
  const res = await fetch(`${API_BASE}/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, otp, newPassword }),
  });

  return handleResponse(res);
}

/* Backward-compatible aliases */
export const sendOtp = forgotPassword;
export const verifyOtp = ({ email, otp }) =>
  verifyOtpReset({ email, otp, newPassword: undefined });
export const resetPassword = (email, newPassword) =>
  verifyOtpReset({ email, otp: undefined, newPassword });
