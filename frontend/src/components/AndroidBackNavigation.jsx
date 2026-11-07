import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { App as NativeApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { getSession, homeFor } from "../lib/session";

export default function AndroidBackNavigation() {
  const navigate = useNavigate();

  useEffect(() => {
    if (Capacitor.getPlatform() !== "android") return;

    let active = true;
    const listener = NativeApp.addListener("backButton", () => {
      if (!active) return;

      const dialogs = document.querySelectorAll("dialog[open]");
      const topDialog = dialogs[dialogs.length - 1];
      if (topDialog) {
        topDialog.close();
        return;
      }

      const path = window.location.pathname.replace(/\/+$/, "") || "/";
      const { role, linkedId } = getSession();
      const home = role ? homeFor(role, linkedId) : "/";
      const atHome = path === "/" || path === home ||
        (role === "mother" && path === "/m");

      if (atHome) {
        let prompt = "Exit Punarnava?";
        try {
          if (role === "asha" && localStorage.getItem("punarnava_asha_language") === "hi") {
            prompt = "पुनर्नवा ऐप बंद करें?";
          }
        } catch { /* Use the default prompt if storage is unavailable. */ }
        if (window.confirm(prompt)) void NativeApp.exitApp();
        return;
      }

      if (window.history.state?.idx > 0) {
        navigate(-1);
        return;
      }

      // Directly opened screens may have no previous in-app history.
      const visit = path.match(/^(\/a\/mother\/[^/]+)\/(?:visit|log)$/);
      if (visit) navigate(visit[1], { replace: true });
      else if (path.startsWith("/a/")) navigate("/a", { replace: true });
      else navigate(home, { replace: true });
    });

    return () => {
      active = false;
      void listener.then(handle => handle.remove());
    };
  }, [navigate]);

  return null;
}
