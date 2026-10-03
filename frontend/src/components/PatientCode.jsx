import { useState } from "react";
import Button from "./Button";
import Icon from "./Icon";

export default function PatientCode({ code, compact = false }) {
  const [status, setStatus] = useState("");

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setStatus("Copied");
    } catch {
      setStatus("Copy unavailable. Please note the code.");
    }
  }

  if (!code) return null;

  return (
    <section className={`patient-code-card${compact ? " compact" : ""}`} aria-label="Unique patient code">
      <div className="patient-code-copy">
        <div className="eyebrow">Unique patient code</div>
        <strong>{code}</strong>
        {!compact && <p>Share this code with her clinician to find her care history.</p>}
        {status && <span className="patient-code-status" role="status">{status}</span>}
      </div>
      <Button type="button" tone="secondary" onClick={copyCode}>
        <Icon name="copy" size={17} /> Copy code
      </Button>
    </section>
  );
}