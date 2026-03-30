import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import "./index.css";
import { initSentry } from "./sentry";

initSentry();

if ("serviceWorker" in navigator) {
  if (import.meta.env.DEV) {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => r.unregister());
    });
  } else {
    const updateServiceWorker = registerSW({
      immediate: true,
      onNeedRefresh() {
        window.dispatchEvent(new CustomEvent("gebya:pwa-update-ready"));
      },
      onOfflineReady() {
        window.dispatchEvent(new CustomEvent("gebya:pwa-offline-ready"));
      },
    });

    (
      window as Window & {
        __gebyaUpdateServiceWorker?: (reloadPage?: boolean) => Promise<void> | void;
      }
    ).__gebyaUpdateServiceWorker = updateServiceWorker;
  }
}

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
