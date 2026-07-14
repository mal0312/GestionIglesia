export type ContactEmailRequest = {
  kind: "contact";
  name: string;
  contact: string;
  subject: string;
  message: string;
};

export type GoodsDonationEmailRequest = {
  kind: "goods_donation";
  name: string;
  contact: string;
  goodsDescription: string;
  message?: string;
};

export type PublicEmailRequest = ContactEmailRequest | GoodsDonationEmailRequest;

export type PublicEmailService = {
  send(request: PublicEmailRequest): Promise<void>;
};

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export function createGoogleAppsScriptPublicEmailService({
  endpointUrl,
  fetcher = fetch
}: {
  endpointUrl: string;
  fetcher?: Fetcher;
}): PublicEmailService {
  return {
    async send(request) {
      const trimmedEndpointUrl = endpointUrl.trim();

      if (!trimmedEndpointUrl) {
        throw new Error("Google Apps Script email endpoint is not configured.");
      }

      const response = await fetcher(trimmedEndpointUrl, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8"
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error("Google Apps Script email endpoint rejected the request.");
      }
    }
  };
}

export const publicEmailService = createGoogleAppsScriptPublicEmailService({
  endpointUrl: import.meta.env.VITE_GOOGLE_APPS_SCRIPT_EMAIL_ENDPOINT ?? ""
});
