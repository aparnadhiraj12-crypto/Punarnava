// "From your doctor": prescriptions and blood-pressure readings that a doctor
// typed in on the clinician website. Shown exactly as written -- no labels like
// "high" or "normal" (docs/compliance.md). Used on the mother's timeline and on
// the ASHA's mother page.
//
// Freshness: reloads every 60 s, when the app comes back to the foreground and
// when the connection returns. The last good copy is cached so it still shows
// offline.
import { useCallback, useEffect, useState } from "react";
import { getMedications, getBpReadings } from "../lib/api";
import { formatDate } from "../lib/dates";
import Badge from "./Badge";

const REFRESH_MS = 60_000;
const NEW_FOR_DAYS = 7;
const cacheKey = (id) => `punarnava_doctor_updates_${id}`;

function readCache(id) {
  try { return JSON.parse(localStorage.getItem(cacheKey(id))); } catch { return null; }
}
function writeCache(id, data) {
  try { localStorage.setItem(cacheKey(id), JSON.stringify(data)); } catch { /* ignore */ }
}
function isNew(ts) {
  const t = new Date(ts).getTime();
  return !Number.isNaN(t) && Date.now() - t < NEW_FOR_DAYS * 86_400_000;
}

export default function DoctorUpdates({ womanId, audience = "mother" }) {
  const [data, setData] = useState(() => readCache(womanId));
  const [offline, setOffline] = useState(false);

  const load = useCallback(async () => {
    const [meds, bp] = await Promise.allSettled([getMedications(womanId), getBpReadings(womanId)]);
    if (meds.status === "rejected" && bp.status === "rejected") {
      setOffline(true);
      return;
    }
    const prev = readCache(womanId) ?? {};
    const next = {
      medications: meds.status === "fulfilled" ? meds.value.entries ?? [] : prev.medications ?? [],
      bp: bp.status === "fulfilled" ? bp.value.entries ?? [] : prev.bp ?? [],
    };
    writeCache(womanId, next);
    setData(next);
    setOffline(false);
  }, [womanId]);

  useEffect(() => {
    setData(readCache(womanId));
    load();
    const timer = setInterval(load, REFRESH_MS);
    const onVisible = () => { if (document.visibilityState === "visible") load(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", load);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", load);
    };
  }, [womanId, load]);

  const meds = data?.medications ?? [];
  const bp = data?.bp ?? [];
  if (!data || (meds.length === 0 && bp.length === 0)) {
    // Nothing from a doctor yet: stay quiet rather than show an empty card.
    return null;
  }

  return (
    <section className="doctor-updates paper-card" aria-label="From the doctor">
      <div className="eyebrow">{audience === "asha" ? "Entered by her doctor" : "From your doctor"}</div>
      {offline && <p className="section-note">Showing the last saved copy. It will refresh when you are back online.</p>}

      {meds.length > 0 && (
        <>
          <h3 className="du-heading">Prescribed medicines</h3>
          <ul className="du-list">
            {meds.map((m) => (
              <li key={m.id}>
                <div>
                  <strong>{m.medication_name}</strong>
                  <span>{[m.dosage, m.instructions].filter(Boolean).join(" · ") || "No dosage details added"}</span>
                  <small>Prescribed by {m.prescribed_by} · {formatDate(m.timestamp)}</small>
                </div>
                {isNew(m.timestamp) && <Badge tone="mustard">New</Badge>}
              </li>
            ))}
          </ul>
        </>
      )}

      {bp.length > 0 && (
        <>
          <h3 className="du-heading">Blood pressure readings</h3>
          <ul className="du-list">
            {bp.map((r) => (
              <li key={r.id}>
                <div>
                  <strong>{r.systolic}/{r.diastolic} mmHg{r.pulse ? ` · pulse ${r.pulse}` : ""}</strong>
                  {r.note && <span>{r.note}</span>}
                  <small>Measured {formatDate(r.measured_on)} · recorded by {r.recorded_by}</small>
                </div>
                {isNew(r.timestamp) && <Badge tone="mustard">New</Badge>}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}