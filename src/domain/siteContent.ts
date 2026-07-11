export type DonationInfo = {
  alias: string;
  qrImageUrl: string;
  qrAltText: string;
  instructions: string;
  noPaymentProcessingNotice: string;
  noReceiptStorageNotice: string;
};

export type FutureSection = {
  title: string;
  description: string;
};

export type NewsStatus = "draft" | "pending_review" | "published" | "rejected";

export type NewsDraftVersion = {
  title: string;
  summary: string;
  body: string;
  imageReference?: string;
};

export type NewsPublication = {
  id: string;
  title: string;
  summary: string;
  body: string;
  imageReference?: string;
  status: NewsStatus;
  pendingVersion?: NewsDraftVersion;
};

export type SiteContent = {
  churchName: string;
  welcomeTitle: string;
  welcomeText: string;
  donation: DonationInfo;
  futureSections: FutureSection[];
  news: NewsPublication[];
  costNote: string;
};
