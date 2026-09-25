// routes/mother/Timeline.jsx
// Reference pattern for the pixel-art system — nav, hero-with-illustration
// slot, risk flags, and the vine-style vertical timeline.

import PixelIcon from "../../components/PixelIcon";
import PixelScene from "../../components/PixelScene";
import StatusStamp from "../../components/StatusStamp";

const LABELS = {
  delivery_recorded: "Delivery recorded",
  first_check: "First postpartum check",
  mother_baby_check: "Mother & baby check",
  follow_up: "Follow-up visit",
  nutrition: "Nutrition counselling",
};

const MILESTONES = [
  { key: "delivery_recorded", status: "completed", date: "15 Aug 2026" },
  { key: "first_check",       status: "completed", date: "17 Aug 2026" },
  { key: "mother_baby_check", status: "due",        date: "20 Aug 2026" },
  { key: "follow_up",         status: "overdue",    date: "2 days overdue" },
  { key: "nutrition",         status: "upcoming",   date: "28 Aug 2026" },
];

const RISK_FLAGS = ["Gestational diabetes", "Hypertension in pregnancy", "Significant blood loss"];

function Nav() {
  return (
    <nav className="bg-forest text-cream flex items-center justify-between px-6 py-3">
      <div className="flex items-center gap-2 font-display font-semibold">
        <PixelIcon name="home" size={20} />
        PUNARNAVA
      </div>
      <div className="flex items-center gap-6 text-sm">
        <a href="/m" className="underline underline-offset-4">Mother</a>
        <a href="/a">ASHA Queue</a>
        <a href="/c/handoff">Clinic / Handoff</a>
      </div>
    </nav>
  );
}

export default function Timeline() {
  return (
    <main className="bg-paper min-h-screen">
      <Nav />

      {/* Hero — PixelScene is a code-drawn placeholder illustration.
          Swap for a hand-painted village/home scene later; see setup guide. */}
      <div className="relative h-64 flex items-end p-6">
        <PixelScene className="absolute inset-0" />
        <div className="relative pixel-card max-w-sm bg-cream/95">
          <p className="text-sm text-earth mb-1">Postpartum care journey</p>
          <h1 className="text-2xl mb-3">Lakshmi</h1>
          <div className="grid grid-cols-3 gap-3 text-sm mb-3">
            <div>
              <PixelIcon name="calendar" size={16} className="mb-1 text-clay" />
              <p className="text-earth">Delivery date</p>
              <p className="font-medium">15 Aug 2026</p>
            </div>
            <div>
              <p className="text-earth mb-1">Mode</p>
              <p className="font-medium">Normal vaginal</p>
            </div>
            <div>
              <p className="text-earth mb-1">Days postpartum</p>
              <p className="font-medium">32</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {RISK_FLAGS.map((flag) => (
              <StatusStamp key={flag} status="risk">{flag}</StatusStamp>
            ))}
          </div>
        </div>
      </div>

      <section className="max-w-lg mx-auto px-6 py-10">
        <h2 className="text-xl mb-6">Timeline</h2>
        <ol className="relative">
          {MILESTONES.map((m, i) => (
            <li key={m.key} className="flex gap-4 pb-6 last:pb-0">
              <div className="flex flex-col items-center">
                <span className="w-3 h-3 rounded-full bg-forest border-2 border-cream shadow-pixel" />
                {i < MILESTONES.length - 1 && <div className="pixel-vine flex-1 mt-1" />}
              </div>
              <div className="pb-1">
                <p className="font-medium">{LABELS[m.key]}</p>
                <StatusStamp status={m.status}>{`${m.status[0].toUpperCase()}${m.status.slice(1)} · ${m.date}`}</StatusStamp>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}