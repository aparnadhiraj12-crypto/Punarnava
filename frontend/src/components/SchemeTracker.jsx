import { useState, useEffect } from "react";
import { getSchemeProgress, saveSchemeProgress } from "../lib/api";
import { useAshaLanguage } from "../lib/ashaLanguage";

const schemes = [
  {
    id: "pmmvy",
    name: "Pradhan Mantri Matru Vandana Yojana",
    hi: "प्रधानमंत्री मातृ वंदना योजना",
    url: "https://spniwcd.wcd.gov.in/pradhan-mantri-matru-vandana-yojna/faqs",
  },
  {
    id: "jsy",
    name: "Janani Suraksha Yojana",
    hi: "जननी सुरक्षा योजना",
    url: "https://nhm.gov.in/index1.php?lang=1&level=3&lid=309&sublinkid=84",
  },
];

const choices = [
  ["to_check", "To check", "जाँच बाकी है"],
  ["applied", "Applied", "आवेदन किया"],
  ["received", "Benefit received", "लाभ मिला"],
];

export default function SchemeTracker({ womanId, asha = false }) {
  const language = useAshaLanguage();
  const hi = asha && language === "hi";
  const [progress, setProgress] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [saving, setSaving] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    setNotice("");
    getSchemeProgress(womanId)
      .then(data => { if (active) setProgress(data.schemes); })
      .catch(() => { if (active) setNotice("loadError"); });
    return () => { active = false; };
  }, [womanId, attempt]);

  async function update(id, status) {
    setSaving(id);
    setNotice("");
    try {
      const saved = await saveSchemeProgress(womanId, id, status);
      setProgress(current => ({ ...current, [id]: saved.status }));
      setNotice("saved");
    } catch {
      setNotice("saveError");
    } finally {
      setSaving("");
    }
  }

  return (
    <section className="paper-card" lang={hi ? "hi" : "en"}>
      <h2 className="card-title">{hi ? "सरकारी योजनाएँ" : "Government schemes"}</h2>
      <p>{hi ? "आवेदन की स्थिति माँ या उनकी आशा कार्यकर्ता दर्ज करती हैं।"
        : "Application progress is recorded by the mother or her assigned ASHA."}</p>

      {schemes.map(scheme => (
        <div key={scheme.id} className="section-block">
          <h3>{hi ? scheme.hi : scheme.name} ({scheme.id.toUpperCase()})</h3>
          <a href={scheme.url} target="_blank" rel="noopener noreferrer">
            {hi ? "आधिकारिक जानकारी देखें" : "View official scheme guidance"}
          </a>
          {progress && (
            <label className="field">
              <span>{hi ? "दर्ज स्थिति" : "Recorded status"}</span>
              <select aria-label={`${scheme.id.toUpperCase()} ${hi ? "स्थिति" : "status"}`}
                value={progress[scheme.id]} disabled={Boolean(saving)}
                onChange={e => update(scheme.id, e.target.value)}>
                {choices.map(([value, english, hindi]) =>
                  <option key={value} value={value}>{hi ? hindi : english}</option>
                )}
              </select>
            </label>
          )}
        </div>
      ))}

      {!progress && notice !== "loadError" && <p>{hi ? "लोड हो रहा है…" : "Loading progress…"}</p>}
      {notice === "loadError" && <p role="alert">
        {hi ? "स्थिति लोड नहीं हो सकी। " : "Could not load progress. "}
        <button type="button" onClick={() => setAttempt(n => n + 1)}>
          {hi ? "फिर कोशिश करें" : "Try again"}
        </button>
      </p>}
      {notice === "saveError" && <p role="alert">{hi
        ? "स्थिति सहेजी नहीं जा सकी। फिर कोशिश करें।"
        : "Could not save the change. Please try again."}</p>}
      <div role="status">
        {saving && (hi ? "सहेजा जा रहा है…" : "Saving…")}
        {notice === "saved" && (hi ? "स्थिति सहेजी गई।" : "Progress saved.")}
      </div>
    </section>
  );
}
