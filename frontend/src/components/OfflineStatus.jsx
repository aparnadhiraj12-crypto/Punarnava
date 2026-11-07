import { useEffect, useRef, useState } from "react";
import { sendQueuedRequest } from "../lib/api";
import { getOfflineQueue, syncOfflineQueue } from "../lib/offlineStore";

import { useAshaLanguage } from "../lib/ashaLanguage";

function itemLabel(item, hi) {
  if (item.path === "/outreach/respond") return hi ? "मुलाकात का विवरण" : "Visit log";
  if (item.path === "/ingestion/manual") return hi ? "माँ का पंजीकरण" : "Mother enrolment";
  return hi ? "सहेजी गई जानकारी" : "Saved update";
}

function savedTime(value, hi) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return hi ? "समय उपलब्ध नहीं है" : "Time unavailable";
  return date.toLocaleString(hi ? "hi-IN" : "en-IN", {
    day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
  });
}

export default function OfflineStatus() {
  const dialog = useRef(null);
  const hi = useAshaLanguage() === "hi";
  const onlineLabel = hi ? "ऑनलाइन" : "Online";
  const offlineLabel = hi ? "ऑफ़लाइन" : "Offline";
  const [online, setOnline] = useState(() => navigator.onLine);
  const [items, setItems] = useState(getOfflineQueue);
  const [busy, setBusy] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  useEffect(() => {
    function refresh() {
      setOnline(navigator.onLine);
      setItems(getOfflineQueue());
    }
    window.addEventListener("online", refresh);
    window.addEventListener("offline", refresh);
    window.addEventListener("storage", refresh);
    const timer = window.setInterval(refresh, 1000);
    return () => {
      window.removeEventListener("online", refresh);
      window.removeEventListener("offline", refresh);
      window.removeEventListener("storage", refresh);
      window.clearInterval(timer);
    };
  }, []);

  async function syncNow() {
    if (busy || !navigator.onLine) return;
    setBusy(true);
    setSyncResult(null);
    try {
      const { synced, remaining } = await syncOfflineQueue(sendQueuedRequest);
      setSyncResult({ synced, remaining });
    } catch {
      setSyncResult({ failed: true });
    } finally {
      setItems(getOfflineQueue());
      setBusy(false);
    }
  }

  let message = "";
  if (syncResult?.failed) {
    message = hi ? "सिंक पूरा नहीं हुआ। इंटरनेट कनेक्शन जाँचें और फिर कोशिश करें।"
      : "Could not finish syncing. Check your connection and try again.";
  } else if (syncResult) {
    const { synced, remaining } = syncResult;
    if (remaining) {
      message = hi ? `${synced} अपडेट सिंक हुए। ${remaining} अभी लंबित हैं।`
        : `${synced} synced. ${remaining} still waiting.`;
    } else {
      message = hi ? "सभी अपडेट सिंक हो गए हैं।" : "Everything is synced.";
    }
  }

  return (
    <section lang={hi ? "hi" : "en"} aria-label={hi ? "ऑफ़लाइन सिंक" : "Offline sync"} style={{ marginBottom: "1rem" }}>
      <button type="button" aria-haspopup="dialog" className="btn"
        onClick={() => {
          setSyncResult(null);
          setItems(getOfflineQueue());
          dialog.current.showModal();
        }}>
        {online ? onlineLabel : offlineLabel} · {items.length} {hi ? "लंबित" : "pending"}
      </button>

      <dialog ref={dialog} aria-labelledby="asha-sync-title" style={{
        position: "fixed", inset: "0 0 0 auto", margin: 0,
        height: "100%", maxHeight: "100%", boxSizing: "border-box",
        width: "min(24rem, 100%)", maxWidth: "100%", padding: "1.25rem",
        border: 0, background: "var(--paper, #fffaf1)", color: "inherit",
      }}>
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 id="asha-sync-title">{hi ? "लंबित अपडेट" : "Pending updates"}</h2>
          <button type="button" onClick={() => dialog.current.close()}>{hi ? "बंद करें" : "Close"}</button>
        </header>

        <p>{online ? onlineLabel : (hi
          ? "ऑफ़लाइन · इंटरनेट मिलने पर अपडेट सिंक हो जाएँगे।"
          : "Offline · Updates will sync when you reconnect.")}</p>

        {items.length ? (
          <ul>
            {items.map((item) => (
              <li key={item.id} style={{ marginBottom: "0.75rem" }}>
                <strong>{itemLabel(item, hi)}</strong><br />
                <small>{hi ? "सहेजने का समय:" : "Saved"} {savedTime(item.created_at, hi)}</small>
              </li>
            ))}
          </ul>
        ) : <p>{hi ? "सिंक करने के लिए कोई अपडेट लंबित नहीं है।" : "No updates waiting to sync."}</p>}

        <button type="button" disabled={!online || !items.length || busy}
          onClick={syncNow}>
          {busy ? (hi ? "सिंक हो रहा है…" : "Syncing…") : (hi ? "अभी सिंक करें" : "Sync now")}
        </button>
        <p role="status">{message}</p>
      </dialog>
    </section>
  );
}
