// /m/journal - write-only from the system's side (guide 7.3 / section 8):
// no streaks, trends, averages, mood charts or "you seem low" messages.
// The talk-to-someone line is shown after EVERY save, never conditional on the emoji.
import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import Page, { Loading, Unreachable } from "../../components/Page";
import { addJournalEntry, getJournal } from "../../lib/api";
import { currentWomanId } from "../../lib/session";

const MOODS = [
  { e: "🙂", label: "Good" },
  { e: "😐", label: "Okay" },
  { e: "😢", label: "Sad" },
  { e: "😴", label: "Tired" },
  { e: "😤", label: "Frustrated" },
];

// Backend timestamps are UTC; add Z if the string carries no zone.
function showTime(ts) {
  const hasZone = /[zZ]|[+-]\d\d:?\d\d$/.test(ts);
  const d = new Date(hasZone ? ts : `${ts}Z`);
  return isNaN(d) ? ts : d.toLocaleString();
}

export default function Journal() {
  const womanId = currentWomanId();
  const [entries, setEntries] = useState(null);
  const [failed, setFailed] = useState(false);
  const [mood, setMood] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const load = useCallback(() => {
    setFailed(false);
    getJournal(womanId).then((r) => setEntries(r.entries ?? [])).catch(() => setFailed(true));
  }, [womanId]);
  useEffect(load, [load]);

  async function save() {
    if (!mood) return;
    setSaving(true);
    setSaveError(false);
    try {
      await addJournalEntry(womanId, mood, note.trim());
      setNote("");
      setMood("");
      setSaved(true);
      load();
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Page title="My journal" back="/m" backLabel="Back to my timeline">
      <Link to="/m/help" className="pixel-btn-secondary mb-4">Not feeling well?</Link>

      <section className="pixel-card space-y-4">
        <div role="radiogroup" aria-label="How are you feeling" className="flex justify-between gap-1">
          {MOODS.map((m) => (
            <button key={m.e} type="button" role="radio" aria-checked={mood === m.e} aria-label={m.label}
                    onClick={() => { setMood(m.e); setSaved(false); }}
                    className={`pixel-frame text-3xl p-2 border-2 flex-1 ${mood === m.e ? "border-forest bg-sage" : "border-ink/30 bg-paper"}`}>
              {m.e}
            </button>
          ))}
        </div>
        <label className="block">
          <span className="text-sm text-earth">A note (optional)</span>
          <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)}
                    className="mt-1 w-full border-2 border-ink/60 bg-paper px-3 py-2" />
        </label>
        <button className="pixel-btn-primary w-full" onClick={save} disabled={!mood || saving}>
          {saving ? "Saving..." : "Save entry"}
        </button>
        {saveError && <p role="alert" className="text-clay">Could not save. Check the connection and try again.</p>}
        {saved && (
          <p role="status" className="text-ink">
            If you would like to talk to someone, you can see the{" "}
            <Link to="/m/wellness#providers" className="underline">directory of professionals</Link>.
          </p>
        )}
      </section>

      <h2 className="text-lg text-forest mt-6 mb-2">Past entries</h2>
      {failed && <Unreachable onRetry={load} />}
      {!failed && !entries && <Loading />}
      {entries && entries.length === 0 && <p className="text-earth">No entries yet. Pick a face above to add your first.</p>}
      <ul className="space-y-2">
        {entries?.map((en) => (
          <li key={en.id} className="pixel-card flex gap-3 items-start">
            <span className="text-2xl" aria-hidden="true">{en.mood_emoji}</span>
            <div>
              <p className="text-xs text-earth">{showTime(en.timestamp)}</p>
              {en.note && <p className="text-ink">{en.note}</p>}
            </div>
          </li>
        ))}
      </ul>
    </Page>
  );
}
