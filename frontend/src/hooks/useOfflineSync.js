import { useEffect } from "react";
import { sendQueuedRequest } from "../lib/api";
import { syncOfflineQueue } from "../lib/offlineStore";

export default function useOfflineSync() {
  useEffect(() => {
    let active = true;

    async function sync() {
      if (!active || !navigator.onLine) return;

      await syncOfflineQueue(sendQueuedRequest);
    }

    sync();

    window.addEventListener("online", sync);

    return () => {
      active = false;
      window.removeEventListener("online", sync);
    };
  }, []);
}
