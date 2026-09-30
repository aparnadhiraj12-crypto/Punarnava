// /m/journal - write-only from the system's side (guide 7.3 / section 8):
// no streaks, trends, averages, mood charts or "you seem low" messages.
// The talk-to-someone line shows after EVERY save, never conditional on the emoji.
import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import AppShell from "../../components/AppShell";
import PageTitle from "../../components/PageTitle";
import Button from "../../components/Button";
import PixelArt from "../../components/PixelArt";
import { Loading, Unreachable, EmptyState } from "../../components/Page";
import { addJournalEntry, getJournal } from "../../lib/api";
import { currentWomanId } from "../../lib/session";
import { formatTimestamp, todayLong } from "../../lib/dates";

const MOODS = [
  { e: "🙂", label: "Good" },
  { e: "😐", label: "Okay" },
  { e: "😢", label: "Sad" },
  { e: "😴", label: "Tired" },
  { e: "😤", label: "Frustrated" },
];

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
    <AppShell role="mother">
      <PageTitle eyebrow="Private journal" title="A little space for you." copy="Write as much or as little as you like." />

      <section className="journal-layout">
        <div className="journal-card">
          <div className="privacy-note">
            <span>🔒</span>
            <div>
              <strong>Your journal is private.</strong>
              <span>Only you can see what you write here.</span>
            </div>
          </div>

          <div className="journal-date">{todayLong()}</div>
          <div className="prompt">How are you feeling today?</div>
          <div className="mood-row" role="radiogroup" aria-label="How are you feeling">
            {MOODS.map((m) => (
              <div key={m.e} className="mood-cell">
                <button type="button" role="radio" aria-checked={mood === m.e} aria-label={m.label}
                        onClick={() => { setMood(m.e); setSaved(false); }}
                        className={mood === m.e ? "mood active" : "mood"}>
                  {m.e}
                </button>
                <span className="mood-label">{m.label}</span>
              </div>
            ))}
          </div>

          <label className="journal-input">
            <span>What would you like to remember? (optional)</span>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Take your time. This space is yours." />
          </label>

          <Button onClick={save} disabled={!mood || saving}>{saving ? "Saving…" : "Save private entry"}</Button>
          {saveError && <p role="alert" className="form-error">Could not save. Check the connection and try again.</p>}
          {saved && (
            <p role="status" className="after-save">
              If you would like to talk to someone, you can see the{" "}
              <Link to="/m/wellness#providers">directory of professionals</Link>.
            </p>
          )}
        </div>

        <aside className="journal-aside">
          <PixelArt kind="journal" />
          <p>Some days hold a lot.<br />You don't have to write it all.</p>
        </aside>
      </section>

      <h2 className="section-title">Past entries</h2>
      {failed && <Unreachable onRetry={load} />}
      {!failed && !entries && <Loading />}
      {entries && entries.length === 0 && <EmptyState title="No entries yet." note="Pick a face above to add your first." />}
      <ul className="entry-list">
        {entries?.map((en) => (
          <li key={en.id} className="entry">
            <span className="entry-mood" aria-hidden="true">{en.mood_emoji}</span>
            <div>
              <small>{formatTimestamp(en.timestamp)}</small>
              {en.note && <p>{en.note}</p>}
            </div>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
