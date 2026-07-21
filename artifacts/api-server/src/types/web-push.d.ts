declare module "web-push" {
  interface PushSubscription {
    endpoint: string;
    keys: {
      auth: string;
      p256dh: string;
    };
  }

  interface VapidKeys {
    publicKey: string;
    privateKey: string;
  }

  interface RequestOptions {
    headers?: Record<string, string>;
    vapidDetails?: {
      subject: string;
      publicKey: string;
      privateKey: string;
    };
    TTL?: number;
    contentEncoding?: string;
    proxy?: string;
  }

  export function generateVAPIDKeys(): VapidKeys;
  export function setVapidDetails(
    subject: string,
    publicKey: string,
    privateKey: string,
  ): void;
  export function sendNotification(
    subscription: PushSubscription,
    payload?: string | Buffer,
    options?: RequestOptions,
  ): Promise<void>;

  const webPush: {
    generateVAPIDKeys: typeof generateVAPIDKeys;
    setVapidDetails: typeof setVapidDetails;
    sendNotification: typeof sendNotification;
  };

  export default webPush;
}
