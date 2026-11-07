// /a - ASHA queue. The ONLY order is the backend's (most days overdue first).
// No sort dropdown, no severity labels; clinical events are plain tags.
// Two-tap rule (FR-E3): tap 1 picks the outcome, tap 2 confirms or picks a reason.
import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { listWomen, recordVisit } from "../../lib/api";
import { eventLabel } from "../../lib/labels";
import { useAshaLanguage } from "../../lib/ashaLanguage";
import { todayLong } from "../../lib/dates";
import AppShell from "../../components/AppShell";
import PageTitle from "../../components/PageTitle";
import Avatar from "../../components/Avatar";
import Badge from "../../components/Badge";
import Button from "../../components/Button";
import Icon from "../../components/Icon";
import CouldNotGoReasons from "../../components/CouldNotGoReasons";
import PatientCode from "../../components/PatientCode";
import { Loading, Unreachable, EmptyState } from "../../components/Page";

function StatusBadge({ online, hi }) {
  return <Badge tone={online ? "sage" : "ink"}><span className="online-dot" /> {online ? (hi ? "ऑनलाइन" : "Online") : (hi ? "ऑफ़लाइन" : "Offline")}</Badge>;
}

export default function Queue() {
  const hi = useAshaLanguage() === "hi";
  const t = (english, hindi) => hi ? hindi : english;
  const [women, setWomen] = useState(null);
  const [failed, setFailed] = useState(false);
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  const [pending, setPending] = useState(null); // { id, outcome }
  const [saveError, setSaveError] = useState(false);

  const load = useCallback(() => {
    setFailed(false);
    listWomen().then((r) => setWomen(Array.isArray(r) ? r : r.women ?? [])).catch(() => setFailed(true));
  }, []);
  useEffect(load, [load]);

  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  const recordTwoTap = (m, outcome) => setPending({ id: m.id, outcome });

  async function confirm(m, outcome, reason) {
    setSaveError(false);
    try {
      await recordVisit(m.id, outcome, reason); // no rule_id: most overdue milestone
      setPending(null);
      load();
    } catch {
      setSaveError(true);
    }
  }

  return (
    <AppShell role="asha">
      <PageTitle eyebrow={t("ASHA workspace", "आशा कार्यक्षेत्र")} title={t("Today's visits", "आज की मुलाकातें")} copy={t("Sorted by days overdue — no risk scoring.", "जिन मुलाकातों में सबसे अधिक देरी हुई है, वे पहले दिखाई जाती हैं।")} action={<StatusBadge hi={hi} online={online} />} />

      <div className="queue-toolbar">
        <div>
          <strong>{women ? (hi ? `${women.length} माताओं से संपर्क करना है` : `${women.length} mother${women.length === 1 ? "" : "s"} to follow up`) : t("Loading…", "लोड हो रहा है…")}</strong>
          <span>{hi ? new Date().toLocaleDateString("hi-IN", { weekday: "long", day: "numeric", month: "long" }) : todayLong()}</span>
        </div>
        <Link to="/a/enrol"><Button><Icon name="plus" />{t("Enrol a mother", "नई माँ का पंजीकरण")}</Button></Link>
      </div>

      {failed && <Unreachable onRetry={load} />}
      {!failed && !women && <Loading />}
      {saveError && <p role="alert" className="form-error">{t("Could not save. Try again.", "जानकारी सहेजी नहीं जा सकी। फिर कोशिश करें।")}</p>}
      {women?.length === 0 && <EmptyState title={t("No mothers yet.", "सूची अभी खाली है।")} note={t("Enrol one to get started.", "शुरू करने के लिए एक माँ का पंजीकरण करें।")} />}

      <section className="queue-list">
        {women?.map((m, index) => {
          const isPending = pending?.id === m.id;
          const overdue = m.max_days_overdue > 0;
          return (
            <article className={`queue-card ${overdue ? "overdue" : ""}`} key={m.id}>
              <div className="queue-number">{String(index + 1).padStart(2, "0")}</div>
              <Avatar name={m.name} />
              <div className="queue-person">
                <div className="eyebrow">{m.postpartum_day == null ? (hi ? `गर्भावस्था${m.trimester ? ` · तिमाही ${m.trimester}` : ""}` : `Pregnant${m.trimester ? ` · trimester ${m.trimester}` : ""}`) : (hi ? `प्रसव के बाद दिन ${m.postpartum_day}` : `Day ${m.postpartum_day} after delivery`)}</div>
                <div className="card-title">{m.name}</div>
                {m.clinical_events?.length > 0 && (
                  <ul className="tag-row">
                    {m.clinical_events.map((e, i) => (
                      <li key={`${e.type}-${i}`}><Badge>{eventLabel(e.type, hi ? "hi" : "en")}</Badge></li>
                    ))}
                  </ul>
                )}
                <PatientCode code={m.mother_code} compact hindi={hi} />
              </div>
              <Badge tone={overdue ? "mustard" : "sage"}>{overdue ? (hi ? `${m.max_days_overdue} दिन की देरी` : `${m.max_days_overdue} days overdue`) : t("Up to date", "अद्यतन")}</Badge>

              {!isPending && (
                <div className="queue-actions">
                  <div className="row">
                    <Button onClick={() => recordTwoTap(m, "done")}>{t("Done", "मुलाकात पूरी हुई")}</Button>
                    <Button tone="secondary" onClick={() => recordTwoTap(m, "could_not_go")}>{t("Could not go", "जा नहीं सकीं")}</Button>
                    <Link to={`/m/${m.id}`}><Button tone="quiet">{t("View timeline", "देखभाल का क्रम देखें")}</Button></Link>
                  </div>
                </div>
              )}

              {isPending && pending.outcome === "done" && (
                <div className="queue-actions">
                  <p className="prompt-line">{t("Mark the most overdue visit as done?", "सबसे अधिक लंबित मुलाकात को पूरा दर्ज करें?")}</p>
                  <div className="row">
                    <Button onClick={() => confirm(m, "done")}>{t("Yes, done", "हाँ, पूरी हुई")}<Icon name="check" /></Button>
                    <Button tone="quiet" onClick={() => setPending(null)}>{t("Cancel", "रद्द करें")}</Button>
                  </div>
                </div>
              )}

              {isPending && pending.outcome === "could_not_go" && (
                <div className="queue-actions">
                  <p className="prompt-line">{t("Why could she not go?", "वह क्यों नहीं जा सकीं?")}</p>
                  <CouldNotGoReasons hindi={hi} onSelect={(reason) => confirm(m, "could_not_go", reason)} />
                  <Button tone="quiet" onClick={() => setPending(null)}>{t("Cancel", "रद्द करें")}</Button>
                </div>
              )}
            </article>
          );
        })}
      </section>

      <div className="queue-rule">
        <Icon name="clock" />
        <span>{t("This queue is ordered only by the number of days a visit is overdue.", "यह सूची मुलाकात में हुई देरी के दिनों के अनुसार है।")}</span>
      </div>
    </AppShell>
  );
}
