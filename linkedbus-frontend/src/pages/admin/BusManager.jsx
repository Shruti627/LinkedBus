// src/pages/admin/BusManager.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

/**
 * BusManager (final)
 * - shows bus ID column
 * - client-side search/filter: by id (exact), name, or route
 * - clean, compact UI
 * - create/update/delete/toggle (uses same admin-api endpoints)
 * - minimal code and focused fields
 */

const BUS_TYPES = [
  "AC Seater",
  "AC Sleeper",
  "Non-AC Seater",
  "Non-AC Sleeper",
  "Volvo AC",
  "Semi-Sleeper",
];

function normalize(b = {}) {
  return {
    id: b.id ?? null,
    busName: b.busName ?? b.bus_name ?? "",
    busType: b.busType ?? b.bus_type ?? "",
    source: b.source ?? "",
    destination: b.destination ?? "",
    departureTime: b.departureTime ?? b.departure_time ?? "",
    arrivalTime: b.arrivalTime ?? b.arrival_time ?? "",
    departureDate: b.departureDate ?? b.departure_date ?? "",
    seats: b.seats ?? b.total_seats ?? b.totalSeats ?? 0,
    price: b.price ?? null,
    status: b.status ?? "inactive",
    // route helper
    route: (b.source && b.destination) ? `${b.source} → ${b.destination}` : (b.route ?? ""),
  };
}

export default function BusManager() {
  const navigate = useNavigate();
  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080/api";
  const token = localStorage.getItem("token");

  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  // modal
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  // form (focused fields)
  const empty = {
    busName: "",
    busType: BUS_TYPES[0],
    source: "",
    destination: "",
    depHour: "06",
    depMinute: "00",
    depMer: "AM",
    arrHour: "10",
    arrMinute: "30",
    arrMer: "AM",
    departure_date: "",
    seats: "",
    price: "",
    status: "active",
  };
  const [form, setForm] = useState(empty);

  // filters
  const [qId, setQId] = useState(""); // exact id search
  const [qText, setQText] = useState(""); // name or route contains

  useEffect(() => {
    if (!token) {
      navigate("/auth");
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const r = await fetch(`${API_BASE}/admin-api/buses`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error(`Failed (${r.status})`);
      const d = await r.json();
      const arr = Array.isArray(d) ? d : d.buses ?? d;
      setBuses(arr.map(normalize));
    } catch (e) {
      setErr(e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  // filtering logic (memoized)
  const filtered = useMemo(() => {
    let list = buses;
    if (qId.trim()) {
      // exact numeric id filter
      const n = Number(qId);
      if (!Number.isNaN(n)) list = list.filter((b) => b.id === n);
      else list = [];
    } else if (qText.trim()) {
      const s = qText.trim().toLowerCase();
      list = list.filter((b) => (
        (b.busName || "").toLowerCase().includes(s) ||
        (b.route || "").toLowerCase().includes(s)
      ));
    }
    return list;
  }, [buses, qId, qText]);

  const pad = (s) => String(s).padStart(2, "0");
  const timeString = (h, m, mer) => `${pad(h)}:${pad(m)} ${mer}`;

  function openCreate() {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  }

  function openEdit(b) {
    const parse = (t, defH, defM) => {
      if (!t) return { hh: defH, mm: defM, mer: "AM" };
      const m = String(t).trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
      if (m) return { hh: pad(m[1]), mm: m[2], mer: (m[3] || "AM").toUpperCase() };
      return { hh: defH, mm: defM, mer: "AM" };
    };
    const dep = parse(b.departureTime, "06", "00");
    const arr = parse(b.arrivalTime, "10", "30");
    setEditing(b);
    setForm({
      busName: b.busName,
      busType: b.busType || BUS_TYPES[0],
      source: b.source,
      destination: b.destination,
      depHour: dep.hh,
      depMinute: dep.mm,
      depMer: dep.mer,
      arrHour: arr.hh,
      arrMinute: arr.mm,
      arrMer: arr.mer,
      departure_date: b.departureDate || "",
      seats: String(b.seats || ""),
      price: b.price != null ? String(b.price) : "",
      status: b.status || "inactive",
    });
    setOpen(true);
  }

  function onChange(e) {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  }

  function validate() {
    if (!form.busName || form.busName.trim().length < 2) return "Bus name required";
    if (!form.source || !form.destination) return "Source & destination required";
    if (!form.departure_date) return "Departure date required";
    const seatsNum = Number(form.seats);
    if (!form.seats || !Number.isInteger(seatsNum) || seatsNum <= 0) return "Seats must be integer > 0";
    if (form.price !== "" && isNaN(Number(form.price))) return "Price must be a number";
    return null;
  }

  function buildPayload() {
    const dep = timeString(form.depHour, form.depMinute, form.depMer);
    const arr = timeString(form.arrHour, form.arrMinute, form.arrMer);
    const seatsNum = Number(form.seats);
    const priceVal = form.price === "" ? null : Number(form.price);
    const camel = {
      busName: form.busName,
      busType: form.busType,
      source: form.source,
      destination: form.destination,
      departureTime: dep,
      arrivalTime: arr,
      departureDate: form.departure_date,
      seats: seatsNum,
      totalSeats: seatsNum,
      price: priceVal,
      status: form.status,
    };
    return {
      ...camel,
      bus_name: camel.busName,
      bus_type: camel.busType,
      departure_time: camel.departureTime,
      arrival_time: camel.arrivalTime,
      departure_date: camel.departureDate,
      total_seats: camel.totalSeats,
    };
  }

  async function create() {
    const v = validate();
    if (v) return setMsg(v);
    setSaving(true);
    setMsg("");
    const payload = buildPayload();
    const optimistic = { ...normalize(payload), id: `tmp-${Date.now()}` };
    setBuses((s) => [optimistic, ...s]);
    try {
      const r = await fetch(`${API_BASE}/admin-api/buses`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error(`Create failed ${r.status}`);
      const created = await r.json();
      setBuses((s) => s.map((x) => (x.id === optimistic.id ? normalize(created) : x)));
      setMsg("Created");
      setOpen(false);
    } catch (e) {
      console.error(e);
      setMsg(e.message || "Create failed");
      load();
    } finally {
      setSaving(false);
    }
  }

  async function update() {
    if (!editing) return;
    const v = validate();
    if (v) return setMsg(v);
    setSaving(true);
    setMsg("");
    const payload = buildPayload();
    try {
      const r = await fetch(`${API_BASE}/admin-api/buses/${editing.id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error(`Update failed ${r.status}`);
      const upd = await r.json();
      setBuses((s) => s.map((b) => (b.id === editing.id ? normalize(upd) : b)));
      setMsg("Updated");
      setOpen(false);
    } catch (e) {
      console.error(e);
      setMsg(e.message || "Update failed");
      load();
    } finally {
      setSaving(false);
    }
  }

  async function toggle(b) {
    const newStatus = b.status === "active" ? "inactive" : "active";
    setBuses((s) => s.map((x) => (x.id === b.id ? { ...x, status: newStatus } : x)));
    try {
      const r = await fetch(`${API_BASE}/admin-api/buses/${b.id}/toggle-active`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.ok) return setMsg("Status updated");
      // fallback to PUT
      const payload = { status: newStatus, seats: b.seats, total_seats: b.seats };
      const r2 = await fetch(`${API_BASE}/admin-api/buses/${b.id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r2.ok) throw new Error("Toggle failed");
      const updated = await r2.json();
      setBuses((s) => s.map((x) => (x.id === b.id ? normalize(updated) : x)));
      setMsg("Status updated");
    } catch (e) {
      console.error(e);
      setMsg("Toggle failed");
      load();
    }
  }

  async function remove(b) {
    if (!window.confirm(`Delete ${b.busName}?`)) return;
    const old = buses;
    setBuses((s) => s.filter((x) => x.id !== b.id));
    try {
      const r = await fetch(`${API_BASE}/admin-api/buses/${b.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error("Delete failed");
      setMsg("Deleted");
    } catch (e) {
      console.error(e);
      setMsg("Delete failed");
      setBuses(old);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Bus Manager</h1>
            <p className="text-sm text-gray-600">Show ID, quick filters (ID / Name / Route), create & edit.</p>
          </div>

          <div className="flex items-center gap-3">
            <input className="border rounded p-2 text-sm" placeholder="Search by name or route..." value={qText} onChange={(e) => { setQText(e.target.value); setQId(""); }} />
            <input className="w-36 border rounded p-2 text-sm" placeholder="Filter by ID" value={qId} onChange={(e) => { setQId(e.target.value); setQText(""); }} />
            <button onClick={() => { setQId(""); setQText(""); }} className="px-3 py-1 rounded bg-gray-100">Clear</button>
            <button onClick={load} className="px-3 py-1 rounded bg-blue-600 text-white">Refresh</button>
            <button onClick={openCreate} className="px-3 py-1 rounded bg-green-600 text-white">Add Bus</button>
          </div>
        </div>

        <div className="bg-white rounded shadow overflow-x-auto">
          {err && <div className="p-3 text-red-600">{err}</div>}
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 text-xs uppercase text-gray-600">
              <tr>
                <th className="px-4 py-2 text-left">ID</th>
                <th className="px-4 py-2 text-left">Name</th>
                <th className="px-4 py-2 text-left">Type</th>
                <th className="px-4 py-2 text-left">Route</th>
                <th className="px-4 py-2 text-left">Dep</th>
                <th className="px-4 py-2 text-left">Arr</th>
                <th className="px-4 py-2 text-left">Date</th>
                <th className="px-4 py-2 text-left">Seats</th>
                <th className="px-4 py-2 text-left">Price</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="11" className="p-6 text-center text-gray-500">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="11" className="p-6 text-center text-gray-500">No buses</td></tr>
              ) : (
                filtered.map((b) => (
                  <tr key={b.id || b.busName} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium">{b.id}</td>
                    <td className="px-4 py-2">{b.busName}</td>
                    <td className="px-4 py-2">{b.busType}</td>
                    <td className="px-4 py-2">{b.route}</td>
                    <td className="px-4 py-2">{b.departureTime}</td>
                    <td className="px-4 py-2">{b.arrivalTime}</td>
                    <td className="px-4 py-2">{b.departureDate || '-'}</td>
                    <td className="px-4 py-2">{b.seats}</td>
                    <td className="px-4 py-2">{b.price != null ? `₹${b.price}` : '-'}</td>
                    <td className="px-4 py-2 capitalize">{b.status}</td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => toggle(b)} className="px-2 py-1 rounded border text-sm">{b.status === "active" ? "Deactivate" : "Activate"}</button>
                        <button onClick={() => openEdit(b)} className="px-2 py-1 rounded border text-sm">Edit</button>
                        <button onClick={() => remove(b)} className="px-2 py-1 rounded border text-sm text-red-600">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {msg && <div className="mt-4 text-sm text-gray-700">{msg} <button className="ml-3 text-blue-600 underline" onClick={() => setMsg("")}>Dismiss</button></div>}

        {open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black opacity-40" onClick={() => { if (!saving) setOpen(false); }} />
            <div className="relative bg-white rounded-lg shadow-lg w-full max-w-xl p-6 z-10">
              <h2 className="text-lg font-semibold mb-4">{editing ? "Edit Bus" : "Add Bus"}</h2>

              <div className="grid grid-cols-2 gap-3">
                <input name="busName" value={form.busName} onChange={onChange} placeholder="Bus Name" className="border p-2 rounded" />
                <select name="busType" value={form.busType} onChange={onChange} className="border p-2 rounded">{BUS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select>
                <input name="source" value={form.source} onChange={onChange} placeholder="Source" className="border p-2 rounded" />
                <input name="destination" value={form.destination} onChange={onChange} placeholder="Destination" className="border p-2 rounded" />

                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-600 mr-2">Dep</label>
                  <select name="depHour" value={form.depHour} onChange={onChange} className="border p-2 rounded">{Array.from({ length: 12 }, (_, i) => String(i+1).padStart(2, '0')).map(h => <option key={h} value={h}>{h}</option>)}</select>
                  <select name="depMinute" value={form.depMinute} onChange={onChange} className="border p-2 rounded">{["00","05","10","15","20","25","30","35","40","45","50","55"].map(m => <option key={m} value={m}>{m}</option>)}</select>
                  <select name="depMer" value={form.depMer} onChange={onChange} className="border p-2 rounded"><option>AM</option><option>PM</option></select>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-600 mr-2">Arr</label>
                  <select name="arrHour" value={form.arrHour} onChange={onChange} className="border p-2 rounded">{Array.from({ length: 12 }, (_, i) => String(i+1).padStart(2, '0')).map(h => <option key={h} value={h}>{h}</option>)}</select>
                  <select name="arrMinute" value={form.arrMinute} onChange={onChange} className="border p-2 rounded">{["00","05","10","15","20","25","30","35","40","45","50","55"].map(m => <option key={m} value={m}>{m}</option>)}</select>
                  <select name="arrMer" value={form.arrMer} onChange={onChange} className="border p-2 rounded"><option>AM</option><option>PM</option></select>
                </div>

                <input type="date" name="departure_date" value={form.departure_date} onChange={onChange} className="border p-2 rounded" />
                <input type="number" name="seats" value={form.seats} onChange={onChange} min="1" placeholder="Seats (required)" className="border p-2 rounded" />

                <input name="price" value={form.price} onChange={onChange} placeholder="Price" className="border p-2 rounded" />
                <select name="status" value={form.status} onChange={onChange} className="border p-2 rounded"><option value="active">Active</option><option value="inactive">Inactive</option></select>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button onClick={() => { if (!saving) setOpen(false); }} className="px-4 py-2 rounded bg-gray-100">Cancel</button>
                {editing ? (
                  <button onClick={update} disabled={saving} className="px-4 py-2 rounded bg-blue-600 text-white">{saving ? "Saving…" : "Save"}</button>
                ) : (
                  <button onClick={create} disabled={saving} className="px-4 py-2 rounded bg-green-600 text-white">{saving ? "Creating…" : "Create"}</button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
