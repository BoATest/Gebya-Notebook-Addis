import * as Sentry from "@sentry/react";

const dsn = import.meta.env.VITE_SENTRY_DSN;
const environment = import.meta.env.VITE_SENTRY_ENVIRONMENT;
const release = import.meta.env.VITE_SENTRY_RELEASE;

let sentryEnabled = false;

// User consent gate for error reporting. Gebya's privacy promise is
// "nothing leaves your phone without opt-in": error reports (Sentry) are
// exception-only (no analytics, no PII — sendDefaultPii is false), but the
// user can still switch them off from Settings → Data → Error reporting.
// Default is ON only when a DSN is configured; without a DSN nothing is sent.
const ERROR_REPORTING_KEY = 'gebya_error_reporting';

export function isErrorReportingEnabled(): boolean {
  try {
    return typeof localStorage !== 'undefined' &&
      localStorage.getItem(ERROR_REPORTING_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function setErrorReportingPreference(enabled: boolean) {
  try {
    localStorage.setItem(ERROR_REPORTING_KEY, enabled ? 'on' : 'off');
  } catch {
    // ignore storage errors (private mode)
  }
  if (!enabled) {
    sentryEnabled = false;
    try {
      void Sentry.close();
    } catch {
      // ignore close errors
    }
  }
}

export function initSentry() {
  if (!dsn || sentryEnabled) return;
  if (!isErrorReportingEnabled()) return;

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
