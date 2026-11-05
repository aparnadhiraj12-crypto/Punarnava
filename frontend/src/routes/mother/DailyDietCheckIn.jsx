
import { useEffect, useState } from "react";
import { getDailyCheckIns, postDailyCheckIn } from "../../lib/api";

const QUESTIONS = [
  {
    name: "nausea",
    label: "Nausea today",
    options: [["none", "None"], ["mild", "Mild"], ["severe", "Severe"]],
  },
  {
    name: "appetite",
    label: "Appetite today",
    options: [["low", "Low"], ["normal", "Usual"], ["high", "Higher"]],
  },
  {
    name: "food_tolerance",
    label: "How well are you tolerating food?",
    options: [["good", "Well"], ["poor", "Not well"]],
  },
];

export default function DailyDietCheckIn({ womanId, disabled = false }) {
  const [answers, setAnswers] = useState({
    nausea: "none",
    appetite: "normal",
    food_tolerance: "good",
  });
  const [latest, setLatest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    getDailyCheckIns(womanId)
      .then((data) => {
        if (!active) return;
        const rows = [...(data.checkins || [])];
        rows.sort((a, b) => (a.id || 0) - (b.id || 0));
        setLatest(rows.at(-1) || null);
      })
      .catch((err) => {
        if (active) setError(err.message || "Could not load check-ins.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [womanId, retry]);

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    const payload = {
      woman_id: womanId,
      date: new Date().toISOString(),
      ...answers,
    };

    try {
      await postDailyCheckIn(womanId, payload);
      setLatest(payload);
      setNotice("Your check-in has been saved.");
    } catch (err) {
      setError(err.message || "Could not save your check-in.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="paper-card" style={{ marginTop: 16, marginBottom: 16 }}>
      <h2>How are you feeling today?</h2>
      <p>
        Record how eating feels today. These answers are saved in your
        account; they do not yet change the meal suggestions.
      </p>

      {loading && <p role="status">Loading your last check-in...</p>}

      {latest && (
        <div style={{ marginBottom: 16 }}>
          <strong>Last saved check-in</strong>
          <p>
            {new Date(latest.date).toLocaleString()}
            {" | Nausea: "}{latest.nausea}
            {" | Appetite: "}{latest.appetite}
            {" | Food tolerance: "}{latest.food_tolerance}
          </p>
        </div>
      )}

      {error && (
        <div role="alert">
          <p>{error}</p>
          <button
            type="button"
            className="button button-secondary"
            disabled={loading || saving || disabled}
            onClick={() => setRetry((value) => value + 1)}
          >
            Reload check-in history
          </button>
        </div>
      )}

      {notice && <p role="status">{notice}</p>}

      <form onSubmit={save}>
        <fieldset
          disabled={disabled || loading || saving}
          style={{ border: 0, padding: 0, margin: 0 }}
        >
          {QUESTIONS.map((question) => (
            <fieldset
              key={question.name}
              style={{ border: 0, padding: 0, marginBottom: 16 }}
            >
              <legend>{question.label}</legend>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                {question.options.map(([value, label]) => (
                  <label
                    key={value}
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <input
                      type="radio"
                      name={`checkin-${question.name}`}
                      value={value}
                      checked={answers[question.name] === value}
                      onChange={() => {
                        setAnswers((previous) => ({
                          ...previous,
                          [question.name]: value,
                        }));
                        setNotice("");
                      }}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}

          <button type="submit" className="button button-primary">
            {saving ? "Saving..." : "Save today's check-in"}
          </button>
        </fieldset>
      </form>
    </section>
  );
}
