import React from "react";
import ReactDOM from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import { App } from "@/app/App";
import "@/styles/index.css";

if (import.meta.env.PROD && typeof window !== "undefined") {
  const registerServiceWorker = () => {
    registerSW({ immediate: false });
  };

  const idleWindow = window as Window & {
    requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
  };

  if (idleWindow.requestIdleCallback) {
    idleWindow.requestIdleCallback(registerServiceWorker, { timeout: 1500 });
  } else {
    window.addEventListener("load", registerServiceWorker, { once: true });
  }
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
