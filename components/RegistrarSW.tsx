"use client";

import { useEffect } from "react";

/** Registra o service worker que recebe mensagens compartilhadas pelo WhatsApp (Android). */
export default function RegistrarSW() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
