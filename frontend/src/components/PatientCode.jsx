import { useState } from "react";
import Button from "./Button";
import Icon from "./Icon";

export default function PatientCode({ code, compact = false }) {
  const [status, setStatus] = useState("");

  async function copyCode() {
    let success = false;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
        success = true;
      }
    } catch {
      success = false;
    }

    if (!success) {
      try {
        const el = document.createElement("textarea");
        el.value = code;
        el.setAttribute("readonly", "");
        el.style.position = "absolute";
        el.style.left = "-9999px";
        document.body.appendChild(el);
        el.select();
        success = document.execCommand("copy");
        document.body.removeChild(el);
      } catch {
        success = false;
      }
    }

    if (success) {
      setStatus("Copied");
      setTimeout(() => setStatus(""), 2500);
    } else {
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
        {status && <span className="patient-code-status" role="status" aria-live="polite">{status}</span>}
      </div>
      <Button type="button" tone="secondary" onClick={copyCode}>
        <Icon name="copy" size={17} /> Copy code
      </Button>
    </section>
  );
}
