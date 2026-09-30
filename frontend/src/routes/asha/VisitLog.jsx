import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { recordVisit } from "../../lib/api";
import AppShell from "../../components/AppShell";
import PageTitle from "../../components/PageTitle";
import Button from "../../components/Button";
import Icon from "../../components/Icon";
import CouldNotGoReasons from "../../components/CouldNotGoReasons";

export default function VisitLog() {
  const { id } = useParams();

  const [outcome, setOutcome] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save(reason) {
    setBusy(true);
    setError("");

    try {
      await recordVisit(id, outcome, reason);
      setSaved(true);
    } catch {
      setError("Could not save this visit. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (saved) {
    return (
      <AppShell role="asha">
        <div className="success-state">
          <Icon name="check" />
          <div className="display display-lg">Visit recorded.</div>
          <p>The mother’s continuity record has been updated.</p>

          <div className="button-row">
            <Link to={`/a/mother/${id}`}>
              <Button>Back to mother</Button>
            </Link>

            <Link to="/a">
              <Button tone="secondary">Back to queue</Button>
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell role="asha">
      <PageTitle
        eyebrow="ASHA · Visit log"
        title="Record a visit"
        copy="Choose what happened. Keep the record simple and factual."
      />

      <section className="form-card">
        {!outcome && (
          <>
            <div className="eyebrow">Visit outcome</div>

            <div className="button-stack">
              <Button onClick={() => setOutcome("done")}>
                Visit completed
                <Icon name="check" />
              </Button>

              <Button
                tone="secondary"
                onClick={() => setOutcome("could_not_go")}
              >
                Could not go
              </Button>
            </div>
          </>
        )}

        {outcome === "done" && (
          <>
            <div className="eyebrow">Confirm</div>
            <h2>Mark this visit as completed?</h2>

            {error && (
              <p role="alert" className="form-error">
                {error}
              </p>
            )}

            <div className="button-row">
              <Button
                onClick={() => save()}
                disabled={busy}
              >
                {busy ? "Saving…" : "Yes, record visit"}
                <Icon name="check" />
              </Button>

              <Button
                tone="quiet"
                onClick={() => setOutcome("")}
                disabled={busy}
              >
                Back
              </Button>
            </div>
          </>
        )}

        {outcome === "could_not_go" && (
          <>
            <div className="eyebrow">Reason</div>
            <h2>Why could the visit not happen?</h2>

            <CouldNotGoReasons
              onSelect={(reason) => save(reason)}
            />

            {error && (
              <p role="alert" className="form-error">
                {error}
              </p>
            )}

            <Button
              tone="quiet"
              onClick={() => setOutcome("")}
              disabled={busy}
            >
              Back
            </Button>
          </>
        )}
      </section>

      <Link to={`/a/mother/${id}`}>
        <Button tone="secondary">Cancel</Button>
      </Link>
    </AppShell>
  );
}
