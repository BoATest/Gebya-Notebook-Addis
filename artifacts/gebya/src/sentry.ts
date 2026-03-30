import * as Sentry from "@sentry/react";

const dsn = import.meta.env.VITE_SENTRY_DSN;
const environment = import.meta.env.VITE_SENTRY_ENVIRONMENT;
const release = import.meta.env.VITE_SENTRY_RELEASE;

let sentryEnabled = false;

export function initSentry() {
  if (!dsn || sentryEnabled) return;

  Sentry.init({
    dsn,
    environment,
    release,
    sendDefaultPii: false,
  });

  sentryEnabled = true;

  if (typeof window !== "undefined") {
    window.__gebyaTestSentry = () => {
      Sentry.captureException(new Error("Gebya Sentry test error"));
    };
  }
}

declare global {
  interface Window {
    __gebyaTestSentry?: () => void;
  }

  interface ImportMetaEnv {
    readonly VITE_SENTRY_DSN?: string;
    readonly VITE_SENTRY_ENVIRONMENT?: string;
    readonly VITE_SENTRY_RELEASE?: string;
  }
}
