import { useEffect, useState } from "react";
import { getWomen, recordVisit } from "../../lib/api";
import { getQueue, flushQueue } from "../../store/offlineStore";

const LABELS = {
  postnatal_visit: "Postnatal visit",
  six_week_review: "Six-week review",
  postpartum_glucose_test: "Glucose test",
  blood_pressure_review: "Blood pressure review",
  haemoglobin_recheck: "Haemoglobin recheck",
  cervical_screening_enrolment: "Cervical screening",
  contraception_counselling: "Contraception counselling",
  annual_wellness_check: "Annual wellness check",
};

export default function AshaQueue() {
  const [mothers, setMothers] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [online, setOnline] = useState(navigator.onLine);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const women = await getWomen();
      setMothers(women);
    } catch (e) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    setPendingCount(getQueue().filter((q) => !q.synced).length);

    const goOnline = () => {
      setOnline(true);
      flushQueue(async (item) => recordVisit(item.woman_id, item.outcome, item.reason)).then(
        (remaining) => setPendingCount(remaining)
      );
      load();
    };
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  const recordTwoTap = (mother, outcome) => {
    recordVisit(mother.id, outcome);
    setMothers((prev) => prev.filter((m) => m.id !== mother.id));
    setPendingCount((p) => p + (online ? 0 : 1));
  };

  const outstandingLabels = (woman) =>
    woman.milestones
      .filter((m) => m.state !== "done" && m.days_overdue >= 0)
      .map((m) => LABELS[m.type] || m.type)
      .join(", ") || "Nothing due yet";

  return (
    <div className="min-h-screen bg-clay-50" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
      <header className="px-5 pt-6 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-plum-700">Today's queue</h1>
          <p className="text-sm text-clay-700">Sorted by days overdue, most overdue first.</p>
        </div>
        <StatusBadge online={online} pendingCount={pendingCount} />
      </header>

      {loading && <p className="px-5 text-clay-700">Loading…</p>}
      {error && (
        <p className="px-5 text-overdue text-sm">
          Couldn't reach the backend. Run <code>uvicorn main:app --reload</code> in{" "}
          <code>backend/</code> first.
        </p>
      )}

      <ul className="px-5 space-y-3">
        {mothers.map((m) => (
          <li key={m.id} className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-overdue">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium text-plum-700">{m.name}</p>
                <p className="text-xs text-clay-700">Postpartum day {m.postpartum_day}</p>
                <p className="text-sm text-overdue font-medium mt-1">
                  {m.max_days_overdue > 0 ? `${m.max_days_overdue} days overdue` : "Due today"}
                </p>
                <p className="text-xs text-clay-500 mt-1">{outstandingLabels(m)}</p>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {!loading && !error && mothers.length === 0 && (
        <p className="px-5 text-clay-700 text-center py-10">No mothers in the queue right now.</p>
      )}
    </div>
  );
}