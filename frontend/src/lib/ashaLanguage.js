import { useSyncExternalStore } from "react";

const key = "punarnava_asha_language";
const eventName = "punarnava-asha-language-change";
let fallback = "en";

function readLanguage() {
  try {
    return (localStorage.getItem(key) || fallback) === "hi" ? "hi" : "en";
  } catch {
    return fallback;
  }
}

function subscribe(listener) {
  window.addEventListener(eventName, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(eventName, listener);
    window.removeEventListener("storage", listener);
  };
}

export function setAshaLanguage(value) {
  fallback = value === "hi" ? "hi" : "en";
  try { localStorage.setItem(key, fallback); } catch { /* Use this session's choice. */ }
  window.dispatchEvent(new Event(eventName));
}

export function useAshaLanguage() {
  return useSyncExternalStore(subscribe, readLanguage, () => "en");
}
