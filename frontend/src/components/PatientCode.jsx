import { useState } from "react";
import Button from "./Button";
import Icon from "./Icon";

export default function PatientCode({ code, compact = false, hindi = false }) {
  const [status, setStatus] = useState("");

  const title = hindi ? "मरीज़ का विशिष्ट कोड" : "Unique patient code";
  const feedback = {
    Copied: hindi ? "कोड कॉपी हो गया।" : "Copied",
    "Copy unavailable. Please note the code.": hindi
      ? "कोड कॉपी नहीं हो सका। कृपया इसे लिख लें।"
      : "Copy unavailable. Please note the code.",
  };

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
    <section className={`patient-code-card${compact ? " compact" : ""}`} aria-label={title}>
      <div className="patient-code-copy">
        <div className="eyebrow">{title}</div>
        <strong>{code}</strong>
        {!compact && <p>{hindi ? "देखभाल का रिकॉर्ड खोलने के लिए यह कोड डॉक्टर को दें।"
          : "Share this code with her clinician to find her care history."}</p>}
        {status && <span className="patient-code-status" role="status" aria-live="polite">{feedback[status]}</span>}
      </div>
      <Button type="button" tone="secondary" onClick={copyCode}>
        <Icon name="copy" size={17} /> {hindi ? "कोड कॉपी करें" : "Copy code"}
      </Button>
    </section>
  );
}
