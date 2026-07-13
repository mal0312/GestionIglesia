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

export type PublicationStatus = "draft" | "pending_review" | "published" | "rejected";

export type NewsStatus = PublicationStatus;

export type EventStatus = PublicationStatus;

export type EventPublication = {
  id: string;
  title: string;
  description: string;
  startsAt: string;
  location: string;
  organizer: string;
  flyerReference?: string;
  status: EventStatus;
};

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
  events: EventPublication[];
  futureSections: FutureSection[];
  news: NewsPublication[];
  costNote: string;
};
