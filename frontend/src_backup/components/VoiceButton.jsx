/**
 * Large, icon-first, no-text-required control (NFR-10/NFR-12).
 * Real version wires to Sarvam AI TTS/ASR (TRD C3). For now it calls onSpeak.
 */
export default function VoiceButton({ onSpeak, label }) {
  return (
    <button
      onClick={onSpeak}
      aria-label={label || "Play voice message"}
      className="pixel-btn-primary !w-16 !h-16 !p-0"
    >
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" fill="currentColor" stroke="none" />
        <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" strokeLinecap="round" />
      </svg>
    </button>
  );
}
