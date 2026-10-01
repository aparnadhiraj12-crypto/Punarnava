import { useEffect, useRef, useState } from "react";

export default function VoiceInput({ onResult, label = "Speak" }) {
  const recognitionRef = useRef(null);
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = "en-IN";
      recognition.interimResults = false;
      recognition.continuous = false;

      recognition.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript?.trim();

        if (transcript) {
          onResult(transcript);
        }
      };

      recognition.onend = () => {
        setListening(false);
      };

      recognition.onerror = () => {
        setListening(false);
      };

      recognitionRef.current = recognition;
      setSupported(true);
    }

    return () => {
      recognitionRef.current?.abort();
    };
  }, [onResult]);

  function toggleListening() {
    if (!recognitionRef.current) return;

    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
      return;
    }

    try {
      recognitionRef.current.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }

  if (!supported) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={toggleListening}
      aria-label={listening ? "Stop listening" : label}
      className="button button-secondary"
      style={{
        minWidth: 64,
        minHeight: 48,
        borderRadius: 999,
      }}
    >
      {listening ? "Listening…" : "🎙 Speak"}
    </button>
  );
}
