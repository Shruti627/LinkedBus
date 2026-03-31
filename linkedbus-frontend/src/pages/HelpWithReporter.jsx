import React, { useEffect, useMemo, useState, useRef } from "react";

const SUPPORT_ENDPOINT = "http://localhost:8080/api/support/report";
const COMPANY_EMAIL = "inamdarsahil708@gmail.com";

const nowIso = () => new Date().toISOString();

/** safe stringify that avoids throwing on circular refs */
const safeJson = (v) => {
  try {
    return JSON.stringify(v);
  } catch {
    try {
      return String(v);
    } catch {
      return "[unserializable]";
    }
  }
};

function useDiagnosticsCollector(maxEntries = 200) {
  const fetchLogRef = useRef([]);
  useEffect(() => {
    const origFetch = window.fetch;
    window.fetch = async (...args) => {
      const started = Date.now();
      const meta = { ts: nowIso(), url: args[0] && String(args[0]) };
      try {
        const resp = await origFetch.apply(this, args);
        meta.status = resp.status;
        meta.duration = Date.now() - started;
        fetchLogRef.current.push(meta);
        if (fetchLogRef.current.length > maxEntries) fetchLogRef.current.splice(0, fetchLogRef.current.length - maxEntries);
        return resp;
      } catch (err) {
        meta.error = String(err);
        meta.duration = Date.now() - started;
        fetchLogRef.current.push(meta);
        throw err;
      }
    };

    return () => {
      window.fetch = origFetch;
    };
  }, [maxEntries]);

  const snapshot = () => ({
    // we purposely DO NOT expose console logs here
    fetches: fetchLogRef.current.slice(),
    meta: {
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: nowIso(),
    },
  });

  return { snapshot };
}

export default function HelpWithReporter() {
  const diag = useDiagnosticsCollector(300);
  const [reportOpen, setReportOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [sending, setSending] = useState(false);
  const [consent, setConsent] = useState(false); // unchecked by default
  const [sendResult, setSendResult] = useState(null);
  const [query, setQuery] = useState("");

  const handleOpenReport = () => {
    setReportOpen(true);
    setSendResult(null);
  };

  const handleSendReport = async (e) => {
    e.preventDefault();
    setSendResult(null);

    // allow send even without consent — but no diagnostics will be included
    setSending(true);

    // build a small safeSummary when consented
    const snap = diag.snapshot();
    const safeSummary = consent
      ? {
          url: snap.meta.url,
          userAgent: snap.meta.userAgent,
          timestamp: snap.meta.timestamp,
          fetchCount: Array.isArray(snap.fetches) ? snap.fetches.length : 0,
          lastFetch: (snap.fetches && snap.fetches.slice(-1)[0]) || null,
        }
      : undefined;

    const payload = {
      subject: subject || "Issue reported " + nowIso(),
      description,
      // only include small summary (no logs)
      metadata: safeSummary,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: nowIso(),
    };

    try {
      const resp = await fetch(SUPPORT_ENDPOINT, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (resp.ok) {
        setSendResult({ ok: true, message: "Report sent successfully!" });
        setSubject("");
        setDescription("");
        setConsent(false);
        setReportOpen(false);
      } else {
        let serverMsg = `Server returned ${resp.status}`;
        try {
          const data = await resp.json();
          if (data?.message) serverMsg += `: ${data.message}`;
        } catch {}
        setSendResult({ ok: false, message: serverMsg });
        // fallback: open mail client with minimal content
        const mailBody = `${payload.subject}\n\n${safeJson({ subject: payload.subject, description: payload.description, url: payload.url })}`;
        window.location.href = `mailto:${COMPANY_EMAIL}?subject=${encodeURIComponent(payload.subject)}&body=${encodeURIComponent(mailBody)}`;
      }
    } catch (err) {
      const mailBody = `${payload.subject}\n\n${safeJson({ subject: payload.subject, description: payload.description, url: payload.url })}\n\nFetchError: ${String(err)}`;
      window.location.href = `mailto:${COMPANY_EMAIL}?subject=${encodeURIComponent(payload.subject)}&body=${encodeURIComponent(mailBody)}`;
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button onClick={handleOpenReport} title="Report an issue" className="fixed right-4 bottom-6 w-14 h-14 rounded-full bg-red-600 text-white shadow-lg flex items-center justify-center">
        ?
      </button>

      <div className="min-h-screen p-6">
        <div className="max-w-3xl mx-auto">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Help & Support</h1>
              <p className="text-sm text-gray-500">Quick answers and report tools.</p>
            </div>
            <button onClick={handleOpenReport} className="px-3 py-2 rounded bg-red-600 text-white">Report an issue</button>
          </div>

          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search help..." className="w-full px-3 py-2 mb-4 border rounded" />

          {/* minimal help sections */}
          <div className="space-y-3">
            <div className="bg-white rounded p-3 shadow-sm">
              <div className="font-semibold">Booking & Tickets</div>
              <div className="text-sm text-gray-600">After payment you'll receive an e-ticket by email/SMS. See My bookings.</div>
            </div>
            <div className="bg-white rounded p-3 shadow-sm">
              <div className="font-semibold">Payments & Refunds</div>
              <div className="text-sm text-gray-600">If payment succeeded but booking failed, note orderId and paymentId and contact support.</div>
            </div>
            <div className="bg-white rounded p-3 shadow-sm">
              <div className="font-semibold">Contact & Support</div>
              <div className="text-sm text-gray-600">Email: <a href={`mailto:${COMPANY_EMAIL}`} className="underline text-blue-600">{COMPANY_EMAIL}</a></div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal form */}
      {reportOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-6">
          <div className="absolute inset-0 bg-black/40" onClick={() => setReportOpen(false)} />
          <div className="relative bg-white rounded-lg shadow max-w-xl w-full z-10 overflow-auto p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-lg font-semibold">Report an issue</div>
              <button onClick={() => setReportOpen(false)} className="px-2 py-1 bg-gray-100 rounded">Close</button>
            </div>

            <form onSubmit={handleSendReport}>
              <label className="block text-sm mb-1">Subject</label>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full px-3 py-2 mb-3 border rounded" placeholder="Short summary" />

              <label className="block text-sm mb-1">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="w-full px-3 py-2 mb-3 border rounded" placeholder="Describe what happened" />

              <div className="flex items-center mb-3">
                <input id="consent" type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mr-2" />
                <label htmlFor="consent" className="text-sm text-gray-600">I consent to include a minimal diagnostics summary (page URL, user agent, last network request).</label>
              </div>

              <div className="flex gap-2">
                <button type="submit" disabled={sending} className="px-4 py-2 bg-red-600 text-white rounded">{sending ? "Sending..." : "Send Report"}</button>
                <button type="button" onClick={() => {
                  const mailBody = `${subject}\n\n${description}\n\nURL: ${window.location.href}`;
                  window.location.href = `mailto:${COMPANY_EMAIL}?subject=${encodeURIComponent(subject || 'Support request')}&body=${encodeURIComponent(mailBody)}`;
                }} className="px-3 py-2 border rounded">Email instead</button>
              </div>

              {sendResult && <div className={`mt-3 text-sm ${sendResult.ok ? "text-green-600" : "text-red-600"}`}>{sendResult.message}</div>}
            </form>
          </div>
        </div>
      )}
    </>
  );
}
