import { useEffect, useState } from "react";
import { getOfflineQueueCount } from "../lib/offlineStore";

export default function OfflineStatus() {
  const [online, setOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine
  );
  const [pending, setPending] = useState(getOfflineQueueCount());

  useEffect(() => {
    function refresh() {
      setOnline(navigator.onLine);
      setPending(getOfflineQueueCount());
    }

    refresh();

    window.addEventListener("online", refresh);
    window.addEventListener("offline", refresh);

    const timer = window.setInterval(refresh, 1000);

    return () => {
      window.removeEventListener("online", refresh);
      window.removeEventListener("offline", refresh);
      window.clearInterval(timer);
    };
  }, []);

  if (online && pending === 0) {
    return null;
  }

  return (
    <div
      role="status"
      style={{
        margin: "0 0 16px",
        padding: "10px 14px",
        borderRadius: 12,
        border: "1px solid currentColor",
        fontSize: 14,
      }}
    >
      {!online
        ? `Offline${pending ? ` · ${pending} item${pending === 1 ? "" : "s"} saved on this device` : ""}`
        : `${pending} item${pending === 1 ? "" : "s"} waiting to sync…`}
    </div>
  );
}
