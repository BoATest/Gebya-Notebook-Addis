declare module "web-push" {
  interface PushSubscription {
    endpoint: string;
    keys?: {
      p256dh: string;
      auth: string;
    };
  }

  interface SendNotificationOptions {
    title?: string;
    body?: string;
    icon?: string;
    badge?: string;
    tag?: string;
    renotify?: boolean;
    data?: any;
    TTL?: number;
    urgency?: "very-low" | "low" | "normal" | "high";
    topic?: string;
  }

  interface WebPushError extends Error {
    statusCode?: number;
    headers?: Record<string, string>;
    body?: string;
    endpoint?: string;
  }

  function setVapidDetails(
    subject: string,
    publicKey: string,
    privateKey: string
  ): void;

  function sendNotification(
    subscription: PushSubscription,
    payload?: string | Buffer,
    options?: SendNotificationOptions
  ): Promise<void>;

  function generateVAPIDKeys(): {
    publicKey: string;
    privateKey: string;
  };

  function setGCMAPIKey(key: string): void;

  function setAutoDetectContentProxy(autoDetect: boolean): void;

  function setProxyUri(uri: string): void;
}
