// routes/clinic/Handoff.jsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getWoman } from "../../lib/api";
import PixelIcon from "../../components/PixelIcon";
import StatusStamp from "../../components/StatusStamp";

function Nav() {
  return (
    <nav className="bg-forest text-cream flex items-center justify-between px-6 py-3 print:hidden">
      <div className="flex items-center gap-2 font-display font-semibold">
        <PixelIcon name="home" size={20} />
        PUNARNAVA
      </div>
      <div className="flex items-center gap-6 text-sm">
        <a href="/m">Mother</a>
        <a href="/a">ASHA Queue</a>
        <a href="/c/handoff" className="underline underline-offset-4">Clinic / Handoff</a>
      </div>
    </nav>
  );
}

// tiny pixel "QR" — a deterministic-looking grid, decorative only
function PixelQR() {
  const cells = Array.from({ length: 64 }, (_, i) => (i * 7) % 5 === 0);
  return (
    <div className="grid grid-cols-8 gap-[1px] w-10 h-10 bg-cream border-2 border-ink p-1">
      {cells.map((on, i) => (
        <div key={i} className={on ? "bg-ink" : "bg-cream"} />
      ))}
    </div>
  );
}

export default function Handoff() {
  const { id } = useParams();
  const [woman, setWoman] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    getWoman(id)
      .then(setWoman)
      .catch(() => setError(true));
  }, [id]);

  if (error) {
    return (
      <main className="bg-paper min-h-screen">
        <Nav />
        <p className="pixel-badge-overdue m-6 w-fit">
          <PixelIcon name="overdue" size={14} /> Couldn't reach the backend
        </p>
      </main>
    );
  }
  if (!woman) return null;

  const completed = woman.milestones?.filter((m) => m.status === "completed") ?? [];
  const upcoming = woman.milestones?.filter((m) => m.status === "upcoming") ?? [];
  const overdue = woman.milestones?.filter((m) => m.status === "overdue") ?? [];

  return (
    <main className="bg-paper min-h-screen">
      <Nav />
      <section className="max-w-3xl mx-auto px-6 py-10">
        <div className="pixel-card mb-6">
          <h1 className="text-2xl mb-1">Postpartum Care Handoff</h1>
          <p className="text-sm text-earth mb-4">For clinic use</p>
          <div className="flex justify-between text-sm">
            <div>
              <p className="text-earth">Mother</p>
              <p className="font-display text-lg">{woman.name}</p>
            </div>
            <div>
              <p className="text-earth">Prepared by</p>
              <p className="font-medium">{woman.asha_name ?? "—"} (ASHA)</p>
            </div>
            <div>
              <p className="text-earth">Date prepared</p>
              <p className="font-medium">{woman.prepared_date ?? "—"}</p>
            </div>
          </div>
        </div>

        <div className="pixel-card mb-6">
          <h2 className="text-lg mb-3">Delivery details</h2>
          <div className="grid grid-cols-3 gap-4 text-sm mb-4">
            <div>
              <p className="text-earth">Delivery date</p>
              <p className="font-medium">{woman.delivery_date}</p>
            </div>
            <div>
              <p className="text-earth">Mode</p>
              <p className="font-medium">{woman.mode_of_delivery}</p>
            </div>
            <div>
              <p className="text-earth">Days postpartum</p>
              <p className="font-medium">{woman.days_postpartum}</p>
            </div>
          </div>
          {woman.risk_flags?.length > 0 && (
            <>
              <p className="text-sm font-medium mb-2">Risk flags</p>
              <div className="flex flex-wrap gap-2">
                {woman.risk_flags.map((flag) => (
                  <StatusStamp key={flag} status="risk">{flag}</StatusStamp>
                ))}
              </div>
            </>
          )}
        </div>

        <h2 className="text-lg mb-3">Care timeline</h2>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="pixel-card-completed">
            <p className="font-medium mb-2">Completed ({completed.length})</p>
            {completed.map((m) => (
              <p key={m.name} className="text-sm mb-1">{m.name} — {m.date}</p>
            ))}
          </div>
          <div className="pixel-card-due">
            <p className="font-medium mb-2">Upcoming ({upcoming.length})</p>
            {upcoming.map((m) => (
              <p key={m.name} className="text-sm mb-1">{m.name} — {m.date}</p>
            ))}
          </div>
          <div className="pixel-card-overdue">
            <p className="font-medium mb-2">Overdue ({overdue.length})</p>
            {overdue.map((m) => (
              <p key={m.name} className="text-sm mb-1">{m.name} — {m.date}</p>
            ))}
          </div>
        </div>

        {woman.clinic_notes?.length > 0 && (
          <div className="pixel-card-overdue mb-6">
            <p className="font-medium mb-2 flex items-center gap-1.5">
              <PixelIcon name="overdue" size={14} /> Attention for clinic
            </p>
            <ul className="text-sm list-disc list-inside space-y-1">
              {woman.clinic_notes.map((note) => <li key={note}>{note}</li>)}
            </ul>
          </div>
        )}

        <div className="pixel-card flex items-center justify-between text-sm">
          <div>
            <p className="text-earth">ASHA Worker</p>
            <p className="font-medium">{woman.asha_name ?? "—"}</p>
          </div>
          <div>
            <p className="text-earth">Clinic / Handoff</p>
            <p className="font-medium">{woman.clinic_name ?? "—"}</p>
          </div>
          <div className="flex items-center gap-2">
            <PixelQR />
            <p className="text-earth text-xs">Scan for<br />digital record</p>
          </div>
        </div>
      </section>
    </main>
  );
}