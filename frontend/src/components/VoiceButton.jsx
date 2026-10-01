/**
 * Accessible voice control.
 * Uses the browser's built-in speech synthesis for now.
 * The component can later be connected to Sarvam AI without changing callers.
 */
export default function VoiceButton({ onSpeak, text, label }) {
  function handleSpeak() {
    if (onSpeak) {
      onSpeak();
      return;
    }

    if (!text || typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  }

  return (
    <button
      type="button"
      onClick={handleSpeak}
      aria-label={label || "Play voice message"}
      className="button button-primary"
      style={{
        width: 64,
        height: 64,
        borderRadius: "50%",
        padding: 0,
      }}
    >
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <path
          d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"
          fill="currentColor"
          stroke="none"
        />
        <path
          d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}
