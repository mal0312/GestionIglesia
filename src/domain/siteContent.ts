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

export type CampaignStatus = PublicationStatus;

export type SermonStatus = PublicationStatus;

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

export type CampaignPublication = {
  id: string;
  title: string;
  description: string;
  imageReference: string;
  videoUrl?: string;
  callToActionText: string;
  status: CampaignStatus;
};

export type SermonPublication = {
  id: string;
  title: string;
  youtubeUrl: string;
  preacher: string;
  sermonDate: string;
  series: string;
  description?: string;
  status: SermonStatus;
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
  campaigns: CampaignPublication[];
  events: EventPublication[];
  futureSections: FutureSection[];
  news: NewsPublication[];
  sermons: SermonPublication[];
  costNote: string;
};
