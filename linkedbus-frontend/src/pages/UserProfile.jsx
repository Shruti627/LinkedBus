import React, { useEffect, useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";

/**
 * UserProfile.jsx
 * - Shows user info, inline edit form and change-password card
 * - Does NOT fetch or display bookings (moved to Bookings.jsx)
 */

const UserProfile = () => {
  const [user, setUser] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phoneNumber: "" });
  const [passwords, setPasswords] = useState({ oldPassword: "", newPassword: "", confirmPassword: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const loggedInUser = JSON.parse(localStorage.getItem("user") || "null");
  const token = localStorage.getItem("token");
  const currentUserId = loggedInUser?.id;

  useEffect(() => {
    if (currentUserId && token) fetchUserData();
  }, [currentUserId, token]);

  const fetchUserData = async () => {
    try {
      const res = await axios.get(`http://localhost:8080/api/users/${currentUserId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser(res.data);
      setForm({ name: res.data.name, email: res.data.email, phoneNumber: res.data.phoneNumber || "" });
    } catch (err) {
      console.error("Error fetching user:", err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        alert("Session expired. Please log in again.");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
      }
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await axios.put(`http://localhost:8080/api/users/${currentUserId}`, form, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser(res.data);
      setEditMode(false);
      alert("Profile updated successfully");
    } catch (err) {
      console.error("Update error:", err);
      alert("Could not update profile. Try again.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      return alert("New passwords do not match");
    }
    setChangingPassword(true);
    try {
      await axios.put(
        `http://localhost:8080/api/users/${currentUserId}/change-password`,
        { oldPassword: passwords.oldPassword, newPassword: passwords.newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("Password changed successfully");
      setPasswords({ oldPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      console.error("Password update failed:", err);
      alert(err.response?.data?.message || "Could not change password");
    } finally {
      setChangingPassword(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse h-6 w-48 bg-gray-200 rounded mb-4 mx-auto" />
          <p className="text-gray-500">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="relative bg-gradient-to-r from-red-600 to-orange-500 rounded-2xl overflow-hidden shadow-lg p-6 mb-8">
        <div className="relative z-10 flex items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold text-white">
              {user.name?.charAt(0) ?? "U"}
            </div>
            <div>
              <h2 className="text-white text-2xl font-extrabold">{user.name}</h2>
              <p className="text-white/90">{user.email}</p>
            </div>
          </div>

          <div className="ml-auto flex gap-4 items-center">
            <div className="bg-white/10 px-4 py-2 rounded-lg text-white text-sm">
              <div className="text-xs">Member Since</div>
              <div className="text-lg font-semibold">{new Date(user.createdAt || Date.now()).getFullYear()}</div>
            </div>

            <button onClick={() => setEditMode(true)} className="bg-white text-red-600 px-4 py-2 rounded-full font-semibold shadow">
              Edit Profile
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center text-red-600 font-bold text-xl">
              {user.name?.charAt(0)}
            </div>
            <div>
              <div className="text-lg font-semibold">{user.name}</div>
              <div className="text-sm text-gray-500">{user.email}</div>
            </div>
          </div>

          {!editMode ? (
            <div className="mt-6 space-y-3">
              <div>
                <div className="text-xs text-gray-400">Phone</div>
                <div className="font-medium">{user.phoneNumber || "—"}</div>
              </div>

              <div>
                <div className="text-xs text-gray-400">Joined</div>
                <div className="font-medium">{new Date(user.createdAt || Date.now()).toLocaleDateString()}</div>
              </div>

              <div className="mt-4 flex gap-2">
                <button onClick={() => setEditMode(true)} className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700">
                  Edit
                </button>
                <button
                  onClick={() => {
                    localStorage.removeItem("token");
                    localStorage.removeItem("user");
                    window.location.href = "/";
                  }}
                  className="flex-1 bg-gray-100 px-4 py-2 rounded-lg text-gray-700"
                >
                  Logout
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleUpdateProfile} className="mt-6 space-y-3">
              <div>
                <label className="text-sm text-gray-600">Full name</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border px-3 py-2 rounded mt-1" />
              </div>
              <div>
                <label className="text-sm text-gray-600">Email</label>
                <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full border px-3 py-2 rounded mt-1" />
              </div>
              <div>
                <label className="text-sm text-gray-600">Phone</label>
                <input value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} className="w-full border px-3 py-2 rounded mt-1" />
              </div>

              <div className="flex gap-2 mt-2">
                <button disabled={savingProfile} type="submit" className="flex-1 bg-green-500 text-white px-4 py-2 rounded-lg">
                  {savingProfile ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditMode(false);
                    setForm({ name: user.name, email: user.email, phoneNumber: user.phoneNumber });
                  }}
                  className="flex-1 bg-gray-100 px-4 py-2 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow p-6">
          <h3 className="text-lg font-semibold mb-3">Change Password</h3>
          <form onSubmit={handlePasswordChange} className="space-y-3">
            <input placeholder="Old password" type="password" value={passwords.oldPassword} onChange={(e) => setPasswords({ ...passwords, oldPassword: e.target.value })} className="w-full border px-3 py-2 rounded" required />
            <input placeholder="New password" type="password" value={passwords.newPassword} onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })} className="w-full border px-3 py-2 rounded" required />
            <input placeholder="Confirm password" type="password" value={passwords.confirmPassword} onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })} className="w-full border px-3 py-2 rounded" required />
            <div className="flex gap-2">
              <button disabled={changingPassword} type="submit" className="bg-red-600 text-white px-4 py-2 rounded">
                {changingPassword ? "Updating..." : "Update Password"}
              </button>
              <button type="button" onClick={() => setPasswords({ oldPassword: "", newPassword: "", confirmPassword: "" })} className="bg-gray-100 px-4 py-2 rounded">
                Reset
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default UserProfile;
