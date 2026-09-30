import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getWoman } from "../../lib/api";
import AppShell from "../../components/AppShell";
import PageTitle from "../../components/PageTitle";
import Button from "../../components/Button";
import Icon from "../../components/Icon";

export default function Dashboard() {
  const navigate = useNavigate();
  const [motherId, setMotherId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function search(e) {
    e.preventDefault();

    const id = motherId.trim();

    if (!id) {
      setError("Enter a Mother ID.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      await getWoman(id);
      navigate(`/d/mother/${encodeURIComponent(id)}`);
    } catch (err) {
      setError(
        err?.status === 404
          ? "No mother record was found with that ID."
          : "Could not look up the mother. Check that the backend is running."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell role="doctor">
      <PageTitle
        eyebrow="Doctor workspace"
        title="Find a mother"
        copy="Enter the unique Mother ID to open the continuity record."
      />

      <section className="form-card doctor-search-card">
        <div className="eyebrow">Mother ID</div>

        <form onSubmit={search}>
          <label className="field">
            <span className="field-label">Unique Mother ID</span>
            <input
              value={motherId}
              onChange={(e) => setMotherId(e.target.value)}
              placeholder="Paste or enter Mother ID"
              autoComplete="off"
              spellCheck="false"
            />
          </label>

          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}

          <Button type="submit" disabled={busy}>
            {busy ? "Looking up…" : "Open mother record"}
            <Icon name="arrow" />
          </Button>
        </form>
      </section>

      <section className="info-card">
        <div className="eyebrow">Doctor view</div>
        <h2>Continuity, not a snapshot.</h2>
        <p>
          The record brings together the mother's available history,
          clinical events, medications and care interactions.
        </p>
      </section>
    </AppShell>
  );
}
