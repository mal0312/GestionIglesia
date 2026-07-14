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

export type SocialEmbedStatus = PublicationStatus;

export type SocialEmbedPlatform = "facebook" | "instagram" | "youtube";

export type SocialEmbedVisibilityIntent = "visible" | "hidden";

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

export type SocialEmbedPublication = {
  id: string;
  title: string;
  platform: SocialEmbedPlatform;
  embedReference: string;
  visibilityIntent: SocialEmbedVisibilityIntent;
  displayOrder: number;
  status: SocialEmbedStatus;
};

export type MediaAsset =
  | {
      kind: "external_image";
      url: string;
      altText: string;
    }
  | {
      kind: "uploaded_image";
      url: string;
      altText: string;
      optimized: true;
      originalFileName: string;
    };

export type NewsDraftVersion = {
  title: string;
  summary: string;
  body: string;
  imageReference?: string;
  mediaAsset?: MediaAsset;
};

export type NewsPublication = {
  id: string;
  title: string;
  summary: string;
  body: string;
  imageReference?: string;
  mediaAsset?: MediaAsset;
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
  socialEmbeds: SocialEmbedPublication[];
  costNote: string;
};
