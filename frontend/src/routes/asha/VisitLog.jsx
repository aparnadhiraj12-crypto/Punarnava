import { useAshaLanguage } from "../../lib/ashaLanguage";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { recordVisit, isNetworkError } from "../../lib/api";
import { queueRequest } from "../../lib/offlineStore";
import AppShell from "../../components/AppShell";
import PageTitle from "../../components/PageTitle";
import Button from "../../components/Button";
import Icon from "../../components/Icon";
import CouldNotGoReasons from "../../components/CouldNotGoReasons";

export default function VisitLog() {
  const { id } = useParams();
  const hi = useAshaLanguage() === "hi";
  const t = (english, hindi) => hi ? hindi : english;

  const [outcome, setOutcome] = useState("");
  const [saved, setSaved] = useState(false);
  const [savedOffline, setSavedOffline] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save(reason) {
    setBusy(true);
    setError("");

    try {
      await recordVisit(id, outcome, reason);
      setSaved(true);
    } catch (error) {
      if (!isNetworkError(error)) {
        setError("Could not save this visit. Please try again.");
        setBusy(false);
        return;
      }

      queueRequest({
        method: "POST",
        path: "/outreach/respond",
        body: {
          woman_id: id,
          outcome,
          ...(reason ? { reason } : {}),
        },
        type: "asha_visit",
      });

      setSavedOffline(true);
      setSaved(true);
    } finally {
      setBusy(false);
    }
  }

  if (saved) {
    return (
      <AppShell role="asha">
        <div className="success-state">
          <Icon name="check" />
          <div className="display display-lg">
            {savedOffline ? t("Visit saved offline.", "मुलाकात ऑफ़लाइन सहेजी गई।") : t("Visit recorded.", "मुलाकात दर्ज हो गई।")}
          </div>
          <p>
            {savedOffline
              ? t("The visit is stored on this device and will sync when the connection returns.", "मुलाकात इस डिवाइस पर सहेजी गई है। इंटरनेट मिलने पर जानकारी भेज दी जाएगी।")
              : t("The mother’s continuity record has been updated.", "माँ का रिकॉर्ड अपडेट हो गया है।")}
          </p>

          <div className="button-row">
            <Link to={`/a/mother/${id}`}>
              <Button>{t("Back to mother", "माँ के विवरण पर लौटें")}</Button>
            </Link>

            <Link to="/a">
              <Button tone="secondary">{t("Back to queue", "कार्य सूची पर लौटें")}</Button>
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell role="asha">
      <PageTitle
        eyebrow={t("ASHA · Visit log", "आशा · मुलाकात का विवरण")}
        title={t("Record a visit", "मुलाकात दर्ज करें")}
        copy={t("Choose what happened. Keep the record simple and factual.", "मुलाकात में क्या हुआ, वह चुनें।")}
      />

      <section className="form-card">
        {!outcome && (
          <>
            <div className="eyebrow">{t("Visit outcome", "मुलाकात का परिणाम")}</div>

            <div className="button-stack">
              <Button onClick={() => setOutcome("done")}>
                {t("Visit completed", "मुलाकात पूरी हुई")}
                <Icon name="check" />
              </Button>

              <Button
                tone="secondary"
                onClick={() => setOutcome("could_not_go")}
              >
                {t("Could not go", "जा नहीं सकीं")}
              </Button>
            </div>
          </>
        )}

        {outcome === "done" && (
          <>
            <div className="eyebrow">{t("Confirm", "पुष्टि करें")}</div>
            <h2>{t("Mark this visit as completed?", "क्या इस मुलाकात को पूरा दर्ज करें?")}</h2>

            {error && (
              <p role="alert" className="form-error">
                {t(error, "मुलाकात सहेजी नहीं जा सकी। फिर कोशिश करें।")}
              </p>
            )}

            <div className="button-row">
              <Button
                onClick={() => save()}
                disabled={busy}
              >
                {busy ? t("Saving…", "सहेजा जा रहा है…") : t("Yes, record visit", "हाँ, मुलाकात दर्ज करें")}
                <Icon name="check" />
              </Button>

              <Button
                tone="quiet"
                onClick={() => setOutcome("")}
                disabled={busy}
              >
                {t("Back", "पीछे जाएँ")}
              </Button>
            </div>
          </>
        )}

        {outcome === "could_not_go" && (
          <>
            <div className="eyebrow">{t("Reason", "कारण")}</div>
            <h2>{t("Why could the visit not happen?", "मुलाकात क्यों नहीं हो सकी?")}</h2>

            <CouldNotGoReasons hindi={hi}
              onSelect={(reason) => save(reason)}
            />

            {error && (
              <p role="alert" className="form-error">
                {t(error, "मुलाकात सहेजी नहीं जा सकी। फिर कोशिश करें।")}
              </p>
            )}

            <Button
              tone="quiet"
              onClick={() => setOutcome("")}
              disabled={busy}
            >
              {t("Back", "पीछे जाएँ")}
            </Button>
          </>
        )}
      </section>

      <Link to={`/a/mother/${id}`}>
        <Button tone="secondary">{t("Cancel", "रद्द करें")}</Button>
      </Link>
    </AppShell>
  );
}
