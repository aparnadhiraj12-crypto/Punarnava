import { useEffect, useRef, useState } from "react";
import { sendQueuedRequest } from "../lib/api";
import { getOfflineQueue, syncOfflineQueue } from "../lib/offlineStore";

function itemLabel(item) {
  if (item.path === "/outreach/respond") return "Visit log";
  if (item.path === "/ingestion/manual") return "Mother enrolment";
  return "Saved update";
}

function savedTime(value) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return "Time unavailable";
  return date.toLocaleString(undefined, {
    day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
  });
}

export default function OfflineStatus() {
  const dialog = useRef(null);
  const [online, setOnline] = useState(() => navigator.onLine);
  const [items, setItems] = useState(getOfflineQueue);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

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
    setMessage("");
    try {
      const { synced, remaining } = await syncOfflineQueue(sendQueuedRequest);
      setMessage(remaining
        ? `${synced} synced. ${remaining} still waiting.`
        : "Everything is synced.");
    } catch {
      setMessage("Could not finish syncing. Check your connection and try again.");
    } finally {
      setItems(getOfflineQueue());
      setBusy(false);
    }
  }

  return (
    <section aria-label="Offline sync" style={{ marginBottom: "1rem" }}>
      <button type="button" aria-haspopup="dialog" className="btn"
        onClick={() => {
          setMessage("");
          setItems(getOfflineQueue());
          dialog.current.showModal();
        }}>
        {online ? "Online" : "Offline"} · {items.length} pending
      </button>

      <dialog ref={dialog} aria-labelledby="asha-sync-title" style={{
        position: "fixed", inset: "0 0 0 auto", margin: 0,
        height: "100%", maxHeight: "100%", boxSizing: "border-box",
        width: "min(24rem, 100%)", maxWidth: "100%", padding: "1.25rem",
        border: 0, background: "var(--paper, #fffaf1)", color: "inherit",
      }}>
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 id="asha-sync-title">Pending updates</h2>
          <button type="button" onClick={() => dialog.current.close()}>Close</button>
        </header>

        <p>{online ? "Online" : "Offline · Updates will sync when you reconnect."}</p>

        {items.length ? (
          <ul>
            {items.map((item) => (
              <li key={item.id} style={{ marginBottom: "0.75rem" }}>
                <strong>{itemLabel(item)}</strong><br />
                <small>Saved {savedTime(item.created_at)}</small>
              </li>
            ))}
          </ul>
        ) : <p>No updates waiting to sync.</p>}

        <button type="button" disabled={!online || !items.length || busy}
          onClick={syncNow}>
          {busy ? "Syncing…" : "Sync now"}
        </button>
        <p role="status">{message}</p>
      </dialog>
    </section>
  );
}
