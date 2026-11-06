import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getMilestonePreparation, saveMilestonePreparation } from "../../lib/api";
import { getSession } from "../../lib/session";
import { milestoneLabel, stateText, stateTone } from "../../lib/labels";
import { formatDate } from "../../lib/dates";
import AppShell from "../../components/AppShell";
import Badge from "../../components/Badge";
import Button from "../../components/Button";
import Field from "../../components/Field";

export default function MilestonePreparation() {
  const { id } = useParams();
  const { linkedId } = getSession();
  // Remount the form on route/account changes; no prior visit's text can flash or be saved here.
  return <AppShell role="mother"><PreparationForm key={`${linkedId}:${id}`} womanId={linkedId} id={id} /></AppShell>;
}

function PreparationForm({ womanId, id }) {
  const [sheet, setSheet] = useState(null);
  const [preparation, setPreparation] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [item, setItem] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    setLoadError(null);
    getMilestonePreparation(womanId, id).then(data => {
      if (active) { setSheet(data); setPreparation(data.preparation); }
    }).catch(error => { if (active) setLoadError(error); });
    return () => { active = false; };
  }, [womanId, id, retry]);

  function update(next) { setPreparation(next); setSaved(false); setSaveError(""); }
  async function save(event) {
    event.preventDefault();
    setSaving(true); setSaved(false); setSaveError("");
    try {
      await saveMilestonePreparation(womanId, id, { ...preparation, expected_due_date: sheet.milestone.due_date });
      setSaved(true);
    } catch (error) {
      setSaveError(error.status === 409
        ? "Your Journey has changed. These changes were not saved and are still here. Copy anything you want to keep, then go Back to Journey and reopen this milestone to check its current date."
        : "Could not save preparation. Your changes are still here. Try again.");
    }
    finally { setSaving(false); }
  }

  const back = <Link to={womanId ? `/m/${encodeURIComponent(womanId)}` : "/m"}>Back to Journey</Link>;
  if (loadError) return <>{back}<h1>{loadError.status === 404 ? "Milestone not found" : "Could not load preparation"}</h1>
    <p role="alert">{loadError.status === 404 ? "This milestone is not in your current journey." : "Check your connection and sign-in, then try again."}</p>
    {loadError.status !== 404 && <Button onClick={() => setRetry(n => n + 1)}>Try again</Button>}</>;
  if (!sheet) return <>{back}<p>Loading preparation…</p></>;
  const { milestone, guidance } = sheet;
  return <>
    {back}
    <header className="page-title"><div><div className="eyebrow">Visit preparation</div>
      <h1 className="display display-md">{milestoneLabel(milestone.type)}</h1>
      <p>Due {formatDate(milestone.due_date)}</p>
      <Badge tone={stateTone(milestone.state)}>{stateText(milestone)}</Badge>
    </div></header>
    <section className="paper-card">
      <h2>What to expect</h2>
      {guidance ? <>
        <p>{guidance.applicability}</p>
        <ul>{guidance.excerpts.map(text => <li key={text}>{text}</li>)}</ul>
        <a href={guidance.source_url} target="_blank" rel="noopener noreferrer">{guidance.source_title} — {guidance.section}</a>
        <p>Source checked {guidance.verified_on}. {guidance.limit_notes}</p>
      </> : <p>Verified guidance specific to this milestone is not available here. Your appointment details and personal checklist are shown below; ask your care team what this visit will include.</p>}
      <p>This is the date in your Journey, not a confirmed clinic booking. Journey scheduling rules are still draft and need clinical sign-off. Confirm the appointment with your care team.</p>
    </section>
    <form onSubmit={save} className="paper-card" style={{ marginTop: "1rem" }}>
      <h2>What to bring</h2>
      <p>A personal packing list, not medical instructions. Edit it to suit your visit and save below.</p>
      <fieldset disabled={saving} style={{ border: 0, padding: 0, display: "grid", gap: "1rem", minWidth: 0 }}>
        {preparation.checklist.map((entry, index) => <div key={index} className="button-row">
          <label className="check-row" style={{ flex: 1, minWidth: 0 }}><input type="checkbox" checked={entry.checked} onChange={event => update({ ...preparation,
            checklist: preparation.checklist.map((value, i) => i === index ? { ...value, checked: event.target.checked } : value),
          })} /> {entry.label}</label>
          <Button type="button" tone="quiet" aria-label={`Remove ${entry.label}`} onClick={() => update({ ...preparation,
            checklist: preparation.checklist.filter((_, i) => i !== index),
          })}>Remove</Button>
        </div>)}
        <Field label="Add my own item" value={item} maxLength={200} onChange={event => setItem(event.target.value)} />
        <Button type="button" tone="secondary" disabled={!item.trim() || preparation.checklist.length >= 30} onClick={() => {
          update({ ...preparation, checklist: [...preparation.checklist, { label: item.trim(), checked: false }] }); setItem("");
        }}>Add item</Button>
        <div className="journal-input">
          <label htmlFor="visit-questions">My questions for this visit</label>
          <textarea id="visit-questions" rows={5} maxLength={5000} value={preparation.questions}
            onChange={event => update({ ...preparation, questions: event.target.value })} />
        </div>
        <p>Private to your account. Saved only for this milestone and its due date. Saving does not mark the visit completed.</p>
        <Button type="submit">{saving ? "Saving…" : "Save preparation"}</Button>
      </fieldset>
      {saved && <p role="status">Preparation saved.</p>}
      {saveError && <p role="alert" className="form-error">{saveError}</p>}
    </form>
  </>;
}
