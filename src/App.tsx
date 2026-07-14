import { useEffect, type FormEvent, useRef, useState } from "react";
import type {
  CampaignPublication,
  EventPublication,
  MediaAsset,
  NewsDraftVersion,
  NewsPublication,
  PublicationStatus,
  SermonPublication,
  SocialEmbedPlatform,
  SocialEmbedPublication,
  SocialEmbedVisibilityIntent,
  SiteContent
} from "./domain/siteContent";
import type {
  AuthConfig,
  AuthenticatedUser,
  GoogleAuthClient,
  RoleCapability
} from "./domain/auth";
import { authorizeGoogleAccount, can, roleLabels } from "./domain/auth";
import { siteContent } from "./content/siteContent";
import { browserGoogleAuthClient } from "./content/googleAuthClient";
import { privatePanelAuthConfig } from "./content/privatePanelConfig";
import {
  publicEmailService as browserPublicEmailService,
  type ContactEmailRequest,
  type GoodsDonationEmailRequest,
  type PublicEmailRequest,
  type PublicEmailService
} from "./content/publicEmailService";
import type { NewsPersistenceService } from "./persistence/NewsPersistenceService";
import "./styles.css";

type AppProps = {
  content?: SiteContent;
  authConfig?: AuthConfig;
  googleAuthClient?: GoogleAuthClient;
  imageOptimizer?: ImageOptimizer;
  newsPersistenceService?: NewsPersistenceService;
  publicEmailService?: PublicEmailService;
  currentTime?: () => number;
  now?: Date;
};

type AuthStatus = "idle" | "loading";

type PublicFormStatus =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

type PublicEmailSubmissionResult =
  | { ok: true }
  | { ok: false; message: string };

type ContactFormValues = {
  name: string;
  contact: string;
  subject: string;
  message: string;
  website: string;
};

type GoodsDonationFormValues = {
  name: string;
  contact: string;
  goodsDescription: string;
  message: string;
  website: string;
};

type NewsDraftInput = {
  title: string;
  summary: string;
  body: string;
  imageReference?: string;
  mediaAsset?: MediaAsset;
  mediaAltText?: string;
  uploadedImageFile?: File;
};

type NewsFormValues = {
  title: string;
  summary: string;
  body: string;
  externalImageUrl: string;
  mediaAltText: string;
  uploadedImageFile: File | null;
  imageReference: string;
};

type NewsTextFormField = Exclude<keyof NewsFormValues, "uploadedImageFile">;

type OptimizedImage = {
  url: string;
  originalFileName: string;
};

type ImageOptimizer = {
  optimizeImageFile(file: File): Promise<OptimizedImage>;
};

type CampaignDraftInput = {
  title: string;
  description: string;
  imageReference: string;
  videoUrl?: string;
  callToActionText: string;
};

type CampaignFormValues = {
  title: string;
  description: string;
  imageReference: string;
  videoUrl: string;
  callToActionText: string;
};

type EventDraftInput = {
  title: string;
  description: string;
  startsAt: string;
  location: string;
  organizer: string;
  flyerReference?: string;
};

type EventFormValues = {
  title: string;
  description: string;
  startsAt: string;
  location: string;
  organizer: string;
  flyerReference: string;
};

type SermonDraftInput = {
  title: string;
  youtubeUrl: string;
  preacher: string;
  sermonDate: string;
  series: string;
  description?: string;
};

type SermonFormValues = {
  title: string;
  youtubeUrl: string;
  preacher: string;
  sermonDate: string;
  series: string;
  description: string;
};

type SocialEmbedDraftInput = {
  title: string;
  platform: SocialEmbedPlatform;
  embedReference: string;
  visibilityIntent: SocialEmbedVisibilityIntent;
  displayOrder: number;
};

type SocialEmbedFormValues = {
  title: string;
  platform: SocialEmbedPlatform;
  embedReference: string;
  visibilityIntent: SocialEmbedVisibilityIntent;
  displayOrder: string;
};

const emptyNewsFormValues: NewsFormValues = {
  title: "",
  summary: "",
  body: "",
  externalImageUrl: "",
  mediaAltText: "",
  uploadedImageFile: null,
  imageReference: ""
};

const emptyContactFormValues: ContactFormValues = {
  name: "",
  contact: "",
  subject: "",
  message: "",
  website: ""
};

const emptyGoodsDonationFormValues: GoodsDonationFormValues = {
  name: "",
  contact: "",
  goodsDescription: "",
  message: "",
  website: ""
};

const contactSuccessMessage =
  "Tu mensaje fue enviado. La iglesia respondera por el contacto indicado.";
const goodsDonationSuccessMessage =
  "Tu ofrecimiento de mercaderia fue enviado. La iglesia respondera por el contacto indicado.";
const publicEmailFailureMessage =
  "No pudimos enviar la solicitud. Intenta de nuevo o usa otro canal de contacto.";
const publicEmailIncompleteMessage =
  "Completa los campos obligatorios antes de enviar.";
const publicEmailRateLimitMessage =
  "Recibimos demasiados envios seguidos. Espera unos minutos antes de intentar otra vez.";
const publicEmailRateLimitWindowMs = 60_000;
const publicEmailRateLimitMaxAttempts = 2;

const emptyCampaignFormValues: CampaignFormValues = {
  title: "",
  description: "",
  imageReference: "",
  videoUrl: "",
  callToActionText: ""
};

const emptyEventFormValues: EventFormValues = {
  title: "",
  description: "",
  startsAt: "",
  location: "",
  organizer: "",
  flyerReference: ""
};

const emptySermonFormValues: SermonFormValues = {
  title: "",
  youtubeUrl: "",
  preacher: "",
  sermonDate: "",
  series: "",
  description: ""
};

const emptySocialEmbedFormValues: SocialEmbedFormValues = {
  title: "",
  platform: "facebook",
  embedReference: "",
  visibilityIntent: "visible",
  displayOrder: "0"
};

const publicationStatusLabels: Record<PublicationStatus, string> = {
  draft: "Borrador",
  pending_review: "Pendiente de revision",
  published: "Publicado",
  rejected: "Rechazado"
};

const socialEmbedPlatformLabels: Record<SocialEmbedPlatform, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  youtube: "YouTube"
};

const socialEmbedVisibilityIntentLabels: Record<SocialEmbedVisibilityIntent, string> = {
  visible: "Visible al aprobar",
  hidden: "Oculto al aprobar"
};

const finalAuthorityActions: Array<{
  label: string;
  capability: RoleCapability;
}> = [
  { label: "Aprobar contenido", capability: "approve_content" },
  { label: "Rechazar contenido", capability: "reject_content" },
  { label: "Publicar contenido", capability: "publish_content" },
  { label: "Archivar contenido", capability: "archive_content" }
];

const browserImageOptimizer: ImageOptimizer = {
  async optimizeImageFile(file) {
    if (!file.type.startsWith("image/")) {
      throw new Error("MediaAsset uploads must be images.");
    }

    const dataUrl = await readFileAsDataUrl(file);
    const image = await loadBrowserImage(dataUrl);
    const maxDimension = 1600;
    const scale = Math.min(
      1,
      maxDimension / Math.max(image.naturalWidth, image.naturalHeight)
    );
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Image optimization is not available in this browser.");
    }

    context.drawImage(image, 0, 0, width, height);

    return {
      url: canvas.toDataURL("image/webp", 0.82),
      originalFileName: file.name
    };
  }
};

export function App({
  content = siteContent,
  authConfig = privatePanelAuthConfig,
  googleAuthClient = browserGoogleAuthClient,
  imageOptimizer = browserImageOptimizer,
  newsPersistenceService,
  publicEmailService = browserPublicEmailService,
  currentTime = () => Date.now(),
  now = new Date()
}: AppProps) {
  const [currentUser, setCurrentUser] = useState<AuthenticatedUser | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>("idle");
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [news, setNews] = useState<NewsPublication[]>(() =>
    newsPersistenceService ? [] : content.news
  );
  const [campaigns, setCampaigns] = useState<CampaignPublication[]>(
    () => content.campaigns
  );
  const [events, setEvents] = useState<EventPublication[]>(() => content.events);
  const [sermons, setSermons] = useState<SermonPublication[]>(() => content.sermons);
  const [socialEmbeds, setSocialEmbeds] = useState<SocialEmbedPublication[]>(
    () => content.socialEmbeds
  );
  const publicEmailSubmissionTimes = useRef<number[]>([]);

  useEffect(() => {
    if (newsPersistenceService) {
      newsPersistenceService.getAll().then((loadedNews) => {
        setNews(loadedNews);
      });
    }
  }, []);

  async function save(currentNews: NewsPublication[]) {
    setNews(currentNews);
    if (newsPersistenceService) {
      await newsPersistenceService.replaceAll(currentNews);
    }
  }

  function prepareNewsDraftVersion(
    input: NewsDraftInput
  ): NewsDraftVersion | Promise<NewsDraftVersion> {
    const { mediaAltText, uploadedImageFile, ...draftVersion } = input;

    if (draftVersion.mediaAsset || !uploadedImageFile || !mediaAltText) {
      return draftVersion;
    }

    if (!uploadedImageFile.type.startsWith("image/")) {
      return draftVersion;
    }

    return imageOptimizer.optimizeImageFile(uploadedImageFile).then((optimizedImage) => ({
      ...draftVersion,
      mediaAsset: {
        kind: "uploaded_image",
        url: optimizedImage.url,
        altText: mediaAltText,
        optimized: true,
        originalFileName: optimizedImage.originalFileName
      }
    }));
  }

  async function savePreparedNewsDraft(
    input: NewsDraftInput,
    buildNextNews: (draftVersion: NewsDraftVersion) => NewsPublication[]
  ) {
    const draftVersion = prepareNewsDraftVersion(input);

    if (draftVersion instanceof Promise) {
      await save(buildNextNews(await draftVersion));
      return;
    }

    await save(buildNextNews(draftVersion));
  }

  function reservePublicEmailSubmissionAttempt() {
    const submittedAt = currentTime();
    const recentSubmissionTimes = publicEmailSubmissionTimes.current.filter(
      (previousSubmissionAt) =>
        submittedAt - previousSubmissionAt < publicEmailRateLimitWindowMs
    );

    if (recentSubmissionTimes.length >= publicEmailRateLimitMaxAttempts) {
      publicEmailSubmissionTimes.current = recentSubmissionTimes;
      return false;
    }

    publicEmailSubmissionTimes.current = [...recentSubmissionTimes, submittedAt];
    return true;
  }

  async function handlePublicEmailSubmission(
    request: PublicEmailRequest,
    honeypotValue: string
  ): Promise<PublicEmailSubmissionResult> {
    if (honeypotValue.trim().length > 0) {
      return { ok: false, message: publicEmailFailureMessage };
    }

    if (!reservePublicEmailSubmissionAttempt()) {
      return { ok: false, message: publicEmailRateLimitMessage };
    }

    try {
      await publicEmailService.send(request);
      return { ok: true };
    } catch {
      return { ok: false, message: publicEmailFailureMessage };
    }
  }

  async function handleGoogleSignIn() {
    setAuthStatus("loading");
    setAuthMessage(null);

    try {
      const googleAccount = await googleAuthClient.signIn();
      const authorizedUser = authorizeGoogleAccount(googleAccount, authConfig);

      if (!authorizedUser) {
        setCurrentUser(null);
        setAuthMessage(
          `La cuenta ${googleAccount.email} no esta autorizada para entrar al panel privado.`
        );
        return;
      }

      setCurrentUser(authorizedUser);
    } catch {
      setCurrentUser(null);
      setAuthMessage(
        "No se pudo iniciar sesion con Google. Revisa la configuracion del proveedor de autenticacion."
      );
    } finally {
      setAuthStatus("idle");
    }
  }

  function handleSignOut() {
    setCurrentUser(null);
    setAuthMessage(null);
  }

  async function handleCreateDraftNews(input: NewsDraftInput) {
    await savePreparedNewsDraft(input, (draftVersion) => [
      ...news,
      {
        ...draftVersion,
        id: createNewsId(news),
        status: "draft" as const
      }
    ]);
  }

  async function handleUpdateDraftNews(newsId: string, input: NewsDraftInput) {
    await savePreparedNewsDraft(input, (draftVersion) =>
      news.map((newsItem) =>
        newsItem.id === newsId && newsItem.status === "draft"
          ? { ...newsItem, ...draftVersion }
          : newsItem
      )
    );
  }

  async function handleSubmitNewsForReview(newsId: string) {
    const currentNews = news.map((newsItem) =>
      newsItem.id === newsId && newsItem.status === "draft"
        ? { ...newsItem, status: "pending_review" as const }
        : newsItem
    );
    await save(currentNews);
  }

  async function handleApproveNews(newsId: string) {
    const currentNews = news.map((newsItem) =>
      newsItem.id === newsId && newsItem.status === "pending_review"
        ? { ...newsItem, status: "published" as const }
        : newsItem
    );
    await save(currentNews);
  }

  async function handleRejectNews(newsId: string) {
    const currentNews = news.map((newsItem) =>
      newsItem.id === newsId && newsItem.status === "pending_review"
        ? { ...newsItem, status: "rejected" as const }
        : newsItem
    );
    await save(currentNews);
  }

  async function handleProposeRevision(newsId: string, input: NewsDraftVersion) {
    await savePreparedNewsDraft(input, (draftVersion) =>
      news.map((newsItem) =>
        newsItem.id === newsId && newsItem.status === "published"
          ? {
              ...newsItem,
              status: "pending_review" as const,
              pendingVersion: draftVersion
            }
          : newsItem
      )
    );
  }

  async function handleApproveRevision(newsId: string) {
    const currentNews = news.map((newsItem) =>
      newsItem.id === newsId &&
      newsItem.status === "pending_review" &&
      newsItem.pendingVersion
        ? {
            ...newsItem,
            title: newsItem.pendingVersion.title,
            summary: newsItem.pendingVersion.summary,
            body: newsItem.pendingVersion.body,
            imageReference: newsItem.pendingVersion.imageReference,
            mediaAsset: newsItem.pendingVersion.mediaAsset,
            status: "published" as const,
            pendingVersion: undefined
          }
        : newsItem
    );
    await save(currentNews);
  }

  async function handleRejectRevision(newsId: string) {
    const currentNews = news.map((newsItem) =>
      newsItem.id === newsId &&
      newsItem.status === "pending_review" &&
      newsItem.pendingVersion
        ? { ...newsItem, status: "published" as const, pendingVersion: undefined }
        : newsItem
    );
    await save(currentNews);
  }

  function handleCreateDraftCampaign(input: CampaignDraftInput) {
    setCampaigns((currentCampaigns) => [
      ...currentCampaigns,
      {
        ...input,
        id: createCampaignId(currentCampaigns),
        status: "draft"
      }
    ]);
  }

  function handleSubmitCampaignForReview(campaignId: string) {
    setCampaigns((currentCampaigns) =>
      currentCampaigns.map((campaign) =>
        campaign.id === campaignId && campaign.status === "draft"
          ? { ...campaign, status: "pending_review" }
          : campaign
      )
    );
  }

  function handleApproveCampaign(campaignId: string) {
    setCampaigns((currentCampaigns) =>
      currentCampaigns.map((campaign) =>
        campaign.id === campaignId && campaign.status === "pending_review"
          ? { ...campaign, status: "published" }
          : campaign
      )
    );
  }

  function handleRejectCampaign(campaignId: string) {
    setCampaigns((currentCampaigns) =>
      currentCampaigns.map((campaign) =>
        campaign.id === campaignId && campaign.status === "pending_review"
          ? { ...campaign, status: "rejected" }
          : campaign
      )
    );
  }

  function handleCreateDraftEvent(input: EventDraftInput) {
    setEvents((currentEvents) => [
      ...currentEvents,
      {
        ...input,
        id: createEventId(currentEvents),
        status: "draft"
      }
    ]);
  }

  function handleSubmitEventForReview(eventId: string) {
    setEvents((currentEvents) =>
      currentEvents.map((eventItem) =>
        eventItem.id === eventId && eventItem.status === "draft"
          ? { ...eventItem, status: "pending_review" }
          : eventItem
      )
    );
  }

  function handleApproveEvent(eventId: string) {
    setEvents((currentEvents) =>
      currentEvents.map((eventItem) =>
        eventItem.id === eventId && eventItem.status === "pending_review"
          ? { ...eventItem, status: "published" }
          : eventItem
      )
    );
  }

  function handleRejectEvent(eventId: string) {
    setEvents((currentEvents) =>
      currentEvents.map((eventItem) =>
        eventItem.id === eventId && eventItem.status === "pending_review"
          ? { ...eventItem, status: "rejected" }
          : eventItem
      )
    );
  }

  function handleCreateDraftSermon(input: SermonDraftInput) {
    setSermons((currentSermons) => [
      ...currentSermons,
      {
        ...input,
        id: createSermonId(currentSermons),
        status: "draft"
      }
    ]);
  }

  function handleSubmitSermonForReview(sermonId: string) {
    setSermons((currentSermons) =>
      currentSermons.map((sermon) =>
        sermon.id === sermonId && sermon.status === "draft"
          ? { ...sermon, status: "pending_review" }
          : sermon
      )
    );
  }

  function handleApproveSermon(sermonId: string) {
    setSermons((currentSermons) =>
      currentSermons.map((sermon) =>
        sermon.id === sermonId && sermon.status === "pending_review"
          ? { ...sermon, status: "published" }
          : sermon
      )
    );
  }

  function handleRejectSermon(sermonId: string) {
    setSermons((currentSermons) =>
      currentSermons.map((sermon) =>
        sermon.id === sermonId && sermon.status === "pending_review"
          ? { ...sermon, status: "rejected" }
          : sermon
      )
    );
  }

  function handleCreateDraftSocialEmbed(input: SocialEmbedDraftInput) {
    setSocialEmbeds((currentSocialEmbeds) => [
      ...currentSocialEmbeds,
      {
        ...input,
        id: createSocialEmbedId(currentSocialEmbeds),
        status: "draft"
      }
    ]);
  }

  function handleSubmitSocialEmbedForReview(socialEmbedId: string) {
    setSocialEmbeds((currentSocialEmbeds) =>
      currentSocialEmbeds.map((socialEmbed) =>
        socialEmbed.id === socialEmbedId && socialEmbed.status === "draft"
          ? { ...socialEmbed, status: "pending_review" }
          : socialEmbed
      )
    );
  }

  function handleApproveSocialEmbed(socialEmbedId: string) {
    setSocialEmbeds((currentSocialEmbeds) =>
      currentSocialEmbeds.map((socialEmbed) =>
        socialEmbed.id === socialEmbedId && socialEmbed.status === "pending_review"
          ? { ...socialEmbed, status: "published" }
          : socialEmbed
      )
    );
  }

  function handleRejectSocialEmbed(socialEmbedId: string) {
    setSocialEmbeds((currentSocialEmbeds) =>
      currentSocialEmbeds.map((socialEmbed) =>
        socialEmbed.id === socialEmbedId && socialEmbed.status === "pending_review"
          ? { ...socialEmbed, status: "rejected" }
          : socialEmbed
      )
    );
  }

  return (
    <main className="site-shell">
      <section className="hero" aria-labelledby="home-title">
        <p className="eyebrow">Sitio publico</p>
        <h1 id="home-title">{content.churchName}</h1>
        <p className="hero-title">{content.welcomeTitle}</p>
        <p className="hero-copy">{content.welcomeText}</p>
      </section>

      <section className="future-sections" aria-labelledby="sections-title">
        <div>
          <p className="eyebrow">Punto de partida</p>
          <h2 id="sections-title">Contenido que reunira la web</h2>
        </div>
        <div className="section-grid">
          {content.futureSections.map((section) => (
            <article className="section-card" key={section.title}>
              <h3>{section.title}</h3>
              <p>{section.description}</p>
            </article>
          ))}
        </div>
      </section>

      <PublicEventsSection events={events} now={now} />

      <PublicCampaignsSection campaigns={campaigns} />

      <PublicNewsSection news={news} />

      <PublicSermonsSection sermons={sermons} />

      <PublicSocialEmbedsSection socialEmbeds={socialEmbeds} />

      <section className="donation" aria-labelledby="donation-title">
        <div>
          <p className="eyebrow">Colaborar</p>
          <h2 id="donation-title">Donacion economica</h2>
          <p>{content.donation.instructions}</p>
          <dl className="alias-box">
            <dt>Alias</dt>
            <dd>{content.donation.alias}</dd>
          </dl>
          <ul className="guardrails" aria-label="Aclaraciones de Donacion economica">
            <li>{content.donation.noPaymentProcessingNotice}</li>
            <li>{content.donation.noReceiptStorageNotice}</li>
          </ul>
        </div>
        <img
          className="qr-code"
          src={content.donation.qrImageUrl}
          alt={content.donation.qrAltText}
        />
      </section>

      <PublicContactForms onSubmit={handlePublicEmailSubmission} />

      <PrivatePanel
        authMessage={authMessage}
        authStatus={authStatus}
        campaigns={campaigns}
        currentUser={currentUser}
        events={events}
        news={news}
        sermons={sermons}
        socialEmbeds={socialEmbeds}
        onApproveCampaign={handleApproveCampaign}
        onApproveEvent={handleApproveEvent}
        onApproveNews={handleApproveNews}
        onApproveRevision={handleApproveRevision}
        onApproveSermon={handleApproveSermon}
        onApproveSocialEmbed={handleApproveSocialEmbed}
        onCreateDraftCampaign={handleCreateDraftCampaign}
        onCreateDraftEvent={handleCreateDraftEvent}
        onCreateDraftNews={handleCreateDraftNews}
        onCreateDraftSermon={handleCreateDraftSermon}
        onCreateDraftSocialEmbed={handleCreateDraftSocialEmbed}
        onGoogleSignIn={handleGoogleSignIn}
        onProposeRevision={handleProposeRevision}
        onRejectCampaign={handleRejectCampaign}
        onRejectEvent={handleRejectEvent}
        onRejectNews={handleRejectNews}
        onRejectRevision={handleRejectRevision}
        onRejectSermon={handleRejectSermon}
        onRejectSocialEmbed={handleRejectSocialEmbed}
        onSignOut={handleSignOut}
        onSubmitCampaignForReview={handleSubmitCampaignForReview}
        onSubmitEventForReview={handleSubmitEventForReview}
        onSubmitNewsForReview={handleSubmitNewsForReview}
        onSubmitSermonForReview={handleSubmitSermonForReview}
        onSubmitSocialEmbedForReview={handleSubmitSocialEmbedForReview}
        onUpdateDraftNews={handleUpdateDraftNews}
      />

      <footer className="footer">{content.costNote}</footer>
    </main>
  );
}

type PublicContactFormsProps = {
  onSubmit: (
    request: PublicEmailRequest,
    honeypotValue: string
  ) => Promise<PublicEmailSubmissionResult>;
};

function PublicContactForms({ onSubmit }: PublicContactFormsProps) {
  return (
    <section className="public-contact-forms" aria-labelledby="public-contact-title">
      <div>
        <p className="eyebrow">Canales publicos</p>
        <h2 id="public-contact-title">Contacto y Donacion de mercaderia</h2>
        <p>
          Envia una consulta general o avisa una donacion de mercaderia. La web no
          guarda estos formularios en la base de datos del MVP.
        </p>
      </div>

      <div className="public-form-grid">
        <ContactForm onSubmit={onSubmit} />
        <GoodsDonationForm onSubmit={onSubmit} />
      </div>
    </section>
  );
}

function ContactForm({ onSubmit }: PublicContactFormsProps) {
  const [formValues, setFormValues] = useState<ContactFormValues>(emptyContactFormValues);
  const [status, setStatus] = useState<PublicFormStatus>({ kind: "idle" });

  function handleFormChange(field: keyof ContactFormValues, value: string) {
    setFormValues((currentValues) => ({ ...currentValues, [field]: value }));
  }

  async function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const request = normalizeContactFormValues(formValues);

    if (!isCompleteContactEmailRequest(request)) {
      setStatus({ kind: "error", message: publicEmailIncompleteMessage });
      return;
    }

    setStatus({ kind: "sending" });
    const result = await onSubmit(request, formValues.website);

    if (result.ok) {
      setFormValues(emptyContactFormValues);
      setStatus({ kind: "success", message: contactSuccessMessage });
      return;
    }

    setStatus({ kind: "error", message: result.message });
  }

  return (
    <form
      aria-labelledby="contact-form-title"
      className="public-email-form"
      onSubmit={handleFormSubmit}
    >
      <h3 id="contact-form-title">Contacto</h3>
      <p>
        Canal de contacto general para consultas de Visitantes. No reemplaza una
        atencion urgente ni un seguimiento pastoral confidencial.
      </p>
      <label>
        Nombre y apellido
        <input
          onChange={(event) => handleFormChange("name", event.target.value)}
          required
          type="text"
          value={formValues.name}
        />
      </label>
      <label>
        Email o telefono
        <input
          onChange={(event) => handleFormChange("contact", event.target.value)}
          required
          type="text"
          value={formValues.contact}
        />
      </label>
      <label>
        Asunto
        <input
          onChange={(event) => handleFormChange("subject", event.target.value)}
          required
          type="text"
          value={formValues.subject}
        />
      </label>
      <label>
        Mensaje
        <textarea
          onChange={(event) => handleFormChange("message", event.target.value)}
          required
          value={formValues.message}
        />
      </label>
      <HoneypotField
        onChange={(value) => handleFormChange("website", value)}
        value={formValues.website}
      />
      <PublicFormFeedback status={status} />
      <div className="action-row">
        <button disabled={status.kind === "sending"} type="submit">
          {status.kind === "sending" ? "Enviando contacto..." : "Enviar contacto"}
        </button>
      </div>
    </form>
  );
}

function GoodsDonationForm({ onSubmit }: PublicContactFormsProps) {
  const [formValues, setFormValues] = useState<GoodsDonationFormValues>(
    emptyGoodsDonationFormValues
  );
  const [status, setStatus] = useState<PublicFormStatus>({ kind: "idle" });

  function handleFormChange(field: keyof GoodsDonationFormValues, value: string) {
    setFormValues((currentValues) => ({ ...currentValues, [field]: value }));
  }

  async function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const request = normalizeGoodsDonationFormValues(formValues);

    if (!isCompleteGoodsDonationEmailRequest(request)) {
      setStatus({ kind: "error", message: publicEmailIncompleteMessage });
      return;
    }

    setStatus({ kind: "sending" });
    const result = await onSubmit(request, formValues.website);

    if (result.ok) {
      setFormValues(emptyGoodsDonationFormValues);
      setStatus({ kind: "success", message: goodsDonationSuccessMessage });
      return;
    }

    setStatus({ kind: "error", message: result.message });
  }

  return (
    <form
      aria-labelledby="goods-donation-form-title"
      className="public-email-form"
      onSubmit={handleFormSubmit}
    >
      <h3 id="goods-donation-form-title">Donacion de mercaderia</h3>
      <p>
        Avisa que mercaderia queres donar para que la iglesia coordine la recepcion
        por fuera de esta web.
      </p>
      <label>
        Nombre y apellido
        <input
          onChange={(event) => handleFormChange("name", event.target.value)}
          required
          type="text"
          value={formValues.name}
        />
      </label>
      <label>
        Email o telefono
        <input
          onChange={(event) => handleFormChange("contact", event.target.value)}
          required
          type="text"
          value={formValues.contact}
        />
      </label>
      <label>
        Descripcion de mercaderia
        <textarea
          onChange={(event) => handleFormChange("goodsDescription", event.target.value)}
          required
          value={formValues.goodsDescription}
        />
      </label>
      <label>
        Mensaje opcional
        <textarea
          onChange={(event) => handleFormChange("message", event.target.value)}
          value={formValues.message}
        />
      </label>
      <HoneypotField
        onChange={(value) => handleFormChange("website", value)}
        value={formValues.website}
      />
      <PublicFormFeedback status={status} />
      <div className="action-row">
        <button disabled={status.kind === "sending"} type="submit">
          {status.kind === "sending"
            ? "Enviando donacion..."
            : "Enviar donacion de mercaderia"}
        </button>
      </div>
    </form>
  );
}

function HoneypotField({
  onChange,
  value
}: {
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="honeypot-field" aria-hidden="true">
      Sitio web
      <input
        autoComplete="off"
        name="website"
        onChange={(event) => onChange(event.target.value)}
        tabIndex={-1}
        type="text"
        value={value}
      />
    </label>
  );
}

function PublicFormFeedback({ status }: { status: PublicFormStatus }) {
  if (status.kind === "success") {
    return (
      <p className="form-feedback form-feedback-success" role="status">
        {status.message}
      </p>
    );
  }

  if (status.kind === "error") {
    return (
      <p className="form-feedback form-feedback-error" role="alert">
        {status.message}
      </p>
    );
  }

  return null;
}

type PrivatePanelProps = {
  authMessage: string | null;
  authStatus: AuthStatus;
  campaigns: CampaignPublication[];
  currentUser: AuthenticatedUser | null;
  events: EventPublication[];
  news: NewsPublication[];
  sermons: SermonPublication[];
  socialEmbeds: SocialEmbedPublication[];
  onApproveCampaign: (campaignId: string) => void;
  onApproveEvent: (eventId: string) => void;
  onApproveNews: (newsId: string) => Promise<void>;
  onApproveRevision: (newsId: string) => Promise<void>;
  onApproveSermon: (sermonId: string) => void;
  onApproveSocialEmbed: (socialEmbedId: string) => void;
  onCreateDraftCampaign: (input: CampaignDraftInput) => void;
  onCreateDraftEvent: (input: EventDraftInput) => void;
  onCreateDraftNews: (input: NewsDraftInput) => Promise<void>;
  onCreateDraftSermon: (input: SermonDraftInput) => void;
  onCreateDraftSocialEmbed: (input: SocialEmbedDraftInput) => void;
  onGoogleSignIn: () => Promise<void>;
  onProposeRevision: (newsId: string, input: NewsDraftVersion) => Promise<void>;
  onRejectCampaign: (campaignId: string) => void;
  onRejectEvent: (eventId: string) => void;
  onRejectNews: (newsId: string) => Promise<void>;
  onRejectRevision: (newsId: string) => Promise<void>;
  onRejectSermon: (sermonId: string) => void;
  onRejectSocialEmbed: (socialEmbedId: string) => void;
  onSignOut: () => void;
  onSubmitCampaignForReview: (campaignId: string) => void;
  onSubmitEventForReview: (eventId: string) => void;
  onSubmitNewsForReview: (newsId: string) => Promise<void>;
  onSubmitSermonForReview: (sermonId: string) => void;
  onSubmitSocialEmbedForReview: (socialEmbedId: string) => void;
  onUpdateDraftNews: (newsId: string, input: NewsDraftInput) => Promise<void>;
};

function PrivatePanel({
  authMessage,
  authStatus,
  campaigns,
  currentUser,
  events,
  news,
  sermons,
  socialEmbeds,
  onApproveCampaign,
  onApproveEvent,
  onApproveNews,
  onApproveRevision,
  onApproveSermon,
  onApproveSocialEmbed,
  onCreateDraftCampaign,
  onCreateDraftEvent,
  onCreateDraftNews,
  onCreateDraftSermon,
  onCreateDraftSocialEmbed,
  onGoogleSignIn,
  onProposeRevision,
  onRejectCampaign,
  onRejectEvent,
  onRejectNews,
  onRejectRevision,
  onRejectSermon,
  onRejectSocialEmbed,
  onSignOut,
  onSubmitCampaignForReview,
  onSubmitEventForReview,
  onSubmitNewsForReview,
  onSubmitSermonForReview,
  onSubmitSocialEmbedForReview,
  onUpdateDraftNews
}: PrivatePanelProps) {
  return (
    <section className="private-panel" aria-labelledby="private-panel-title">
      <div className="private-panel-intro">
        <p className="eyebrow">Panel privado</p>
        <h2 id="private-panel-title">Panel privado</h2>
        <p>
          El acceso se realiza con una cuenta Google autorizada. El rol asignado
          define que acciones editoriales puede realizar cada persona.
        </p>
        {currentUser ? (
          <div className="session-actions">
            <p className="session-badge">
              Sesion activa: {currentUser.email} | Rol: {roleLabels[currentUser.role]}
            </p>
            <button className="secondary-action" onClick={onSignOut} type="button">
              Cerrar sesion
            </button>
          </div>
        ) : (
          <button
            className="primary-action"
            disabled={authStatus === "loading"}
            onClick={onGoogleSignIn}
            type="button"
          >
            {authStatus === "loading" ? "Ingresando..." : "Entrar con Google"}
          </button>
        )}
        {authMessage ? (
          <p className="auth-feedback" role="alert">
            {authMessage}
          </p>
        ) : null}
      </div>

      {currentUser ? (
        <RoleStartSurface
          campaigns={campaigns}
          events={events}
          news={news}
          sermons={sermons}
          socialEmbeds={socialEmbeds}
          onApproveCampaign={onApproveCampaign}
          onApproveEvent={onApproveEvent}
          onApproveNews={onApproveNews}
          onApproveRevision={onApproveRevision}
          onApproveSermon={onApproveSermon}
          onApproveSocialEmbed={onApproveSocialEmbed}
          onCreateDraftCampaign={onCreateDraftCampaign}
          onCreateDraftEvent={onCreateDraftEvent}
          onCreateDraftNews={onCreateDraftNews}
          onCreateDraftSermon={onCreateDraftSermon}
          onCreateDraftSocialEmbed={onCreateDraftSocialEmbed}
          onProposeRevision={onProposeRevision}
          onRejectCampaign={onRejectCampaign}
          onRejectEvent={onRejectEvent}
          onRejectNews={onRejectNews}
          onRejectRevision={onRejectRevision}
          onRejectSermon={onRejectSermon}
          onRejectSocialEmbed={onRejectSocialEmbed}
          onSubmitCampaignForReview={onSubmitCampaignForReview}
          onSubmitEventForReview={onSubmitEventForReview}
          onSubmitNewsForReview={onSubmitNewsForReview}
          onSubmitSermonForReview={onSubmitSermonForReview}
          onSubmitSocialEmbedForReview={onSubmitSocialEmbedForReview}
          onUpdateDraftNews={onUpdateDraftNews}
          user={currentUser}
        />
      ) : (
        <AuthGuardrails />
      )}
    </section>
  );
}

function AuthGuardrails() {
  return (
    <ul className="panel-list" aria-label="Reglas de acceso al panel privado">
      <li>Solo pueden entrar emails presentes en la allowlist configurada.</li>
      <li>Editor prepara contenido sin autoridad de publicacion final.</li>
      <li>Administrador aprueba, rechaza, publica y archiva contenido.</li>
    </ul>
  );
}

type RoleStartSurfaceProps = {
  campaigns: CampaignPublication[];
  events: EventPublication[];
  news: NewsPublication[];
  sermons: SermonPublication[];
  socialEmbeds: SocialEmbedPublication[];
  onApproveCampaign: (campaignId: string) => void;
  onApproveEvent: (eventId: string) => void;
  onApproveNews: (newsId: string) => Promise<void>;
  onApproveRevision: (newsId: string) => Promise<void>;
  onApproveSermon: (sermonId: string) => void;
  onApproveSocialEmbed: (socialEmbedId: string) => void;
  onCreateDraftCampaign: (input: CampaignDraftInput) => void;
  onCreateDraftEvent: (input: EventDraftInput) => void;
  onCreateDraftNews: (input: NewsDraftInput) => Promise<void>;
  onCreateDraftSermon: (input: SermonDraftInput) => void;
  onCreateDraftSocialEmbed: (input: SocialEmbedDraftInput) => void;
  onProposeRevision: (newsId: string, input: NewsDraftVersion) => Promise<void>;
  onRejectCampaign: (campaignId: string) => void;
  onRejectEvent: (eventId: string) => void;
  onRejectNews: (newsId: string) => Promise<void>;
  onRejectRevision: (newsId: string) => Promise<void>;
  onRejectSermon: (sermonId: string) => void;
  onRejectSocialEmbed: (socialEmbedId: string) => void;
  onSubmitCampaignForReview: (campaignId: string) => void;
  onSubmitEventForReview: (eventId: string) => void;
  onSubmitNewsForReview: (newsId: string) => Promise<void>;
  onSubmitSermonForReview: (sermonId: string) => void;
  onSubmitSocialEmbedForReview: (socialEmbedId: string) => void;
  onUpdateDraftNews: (newsId: string, input: NewsDraftInput) => Promise<void>;
  user: AuthenticatedUser;
};

function RoleStartSurface({
  campaigns,
  events,
  news,
  sermons,
  socialEmbeds,
  onApproveCampaign,
  onApproveEvent,
  onApproveNews,
  onApproveRevision,
  onApproveSermon,
  onApproveSocialEmbed,
  onCreateDraftCampaign,
  onCreateDraftEvent,
  onCreateDraftNews,
  onCreateDraftSermon,
  onCreateDraftSocialEmbed,
  onProposeRevision,
  onRejectCampaign,
  onRejectEvent,
  onRejectNews,
  onRejectRevision,
  onRejectSermon,
  onRejectSocialEmbed,
  onSubmitCampaignForReview,
  onSubmitEventForReview,
  onSubmitNewsForReview,
  onSubmitSermonForReview,
  onSubmitSocialEmbedForReview,
  onUpdateDraftNews,
  user
}: RoleStartSurfaceProps) {
  const allowedFinalActions = finalAuthorityActions.filter((action) =>
    can(user.role, action.capability)
  );

  return (
    <div className="role-surface">
      <div>
        <p className="role-label">Rol: {roleLabels[user.role]}</p>
        <h3>
          {user.role === "admin"
            ? "Mesa de aprobacion editorial"
            : "Mesa de preparacion editorial"}
        </h3>
        <p>
          {user.role === "admin"
            ? "Revisa contenido pendiente y decide que queda visible para el publico."
            : "Crea borradores, edita pendientes y propone cambios para revision."}
        </p>
      </div>

      <div className="action-groups">
        <div>
          <h4>Preparacion permitida</h4>
          <div className="action-row">
            <button type="button">Usar formulario de Noticia</button>
            <button type="button">Usar formulario de Evento</button>
            <button type="button">Usar formulario de Campana</button>
            <button type="button">Usar formulario de Predicacion</button>
            <button type="button">Editar pendientes</button>
            <button type="button">Gestionar embeds sociales</button>
          </div>
        </div>

        {allowedFinalActions.length > 0 ? (
          <div>
            <h4>Autoridad final</h4>
            <div className="action-row">
              {allowedFinalActions.map((action) => (
                <button key={action.capability} type="button">
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p className="permission-note">
            Los Editores no pueden aprobar, rechazar, publicar ni archivar contenido.
          </p>
        )}
      </div>

      <EventEditorialWorkspace
        events={events}
        onApproveEvent={onApproveEvent}
        onCreateDraftEvent={onCreateDraftEvent}
        onRejectEvent={onRejectEvent}
        onSubmitEventForReview={onSubmitEventForReview}
        user={user}
      />

      <CampaignEditorialWorkspace
        campaigns={campaigns}
        onApproveCampaign={onApproveCampaign}
        onCreateDraftCampaign={onCreateDraftCampaign}
        onRejectCampaign={onRejectCampaign}
        onSubmitCampaignForReview={onSubmitCampaignForReview}
        user={user}
      />

      <SermonEditorialWorkspace
        onApproveSermon={onApproveSermon}
        onCreateDraftSermon={onCreateDraftSermon}
        onRejectSermon={onRejectSermon}
        onSubmitSermonForReview={onSubmitSermonForReview}
        sermons={sermons}
        user={user}
      />

      <SocialEmbedEditorialWorkspace
        onApproveSocialEmbed={onApproveSocialEmbed}
        onCreateDraftSocialEmbed={onCreateDraftSocialEmbed}
        onRejectSocialEmbed={onRejectSocialEmbed}
        onSubmitSocialEmbedForReview={onSubmitSocialEmbedForReview}
        socialEmbeds={socialEmbeds}
        user={user}
      />

      <NewsEditorialWorkspace
        news={news}
        onApproveNews={onApproveNews}
        onApproveRevision={onApproveRevision}
        onCreateDraftNews={onCreateDraftNews}
        onProposeRevision={onProposeRevision}
        onRejectNews={onRejectNews}
        onRejectRevision={onRejectRevision}
        onSubmitNewsForReview={onSubmitNewsForReview}
        onUpdateDraftNews={onUpdateDraftNews}
        user={user}
      />
    </div>
  );
}

function PublicEventsSection({ events, now }: { events: EventPublication[]; now: Date }) {
  const publishedEvents = events.filter((eventItem) => eventItem.status === "published");
  const upcomingEvents = publishedEvents
    .filter((eventItem) => !hasEventEnded(eventItem, now))
    .sort(compareEventsAscending);
  const archivedEvents = publishedEvents
    .filter((eventItem) => hasEventEnded(eventItem, now))
    .sort(compareEventsDescending);

  return (
    <section className="public-events" aria-labelledby="public-events-title">
      <div>
        <p className="eyebrow">Actividades</p>
        <h2 id="public-events-title">Eventos publicados</h2>
      </div>

      <section aria-labelledby="upcoming-events-title">
        <h3 id="upcoming-events-title">Eventos proximos</h3>
        {upcomingEvents.length > 0 ? (
          <div className="news-grid">
            {upcomingEvents.map((eventItem) => (
              <PublicEventCard eventItem={eventItem} key={eventItem.id} />
            ))}
          </div>
        ) : (
          <p className="empty-news-note">Todavia no hay eventos proximos publicados.</p>
        )}
      </section>

      <section aria-labelledby="archived-events-title">
        <h3 id="archived-events-title">Archivo de Eventos</h3>
        {archivedEvents.length > 0 ? (
          <div className="news-grid">
            {archivedEvents.map((eventItem) => (
              <PublicEventCard eventItem={eventItem} key={eventItem.id} />
            ))}
          </div>
        ) : (
          <p className="empty-news-note">Todavia no hay eventos anteriores publicados.</p>
        )}
      </section>
    </section>
  );
}

function PublicEventCard({ eventItem }: { eventItem: EventPublication }) {
  return (
    <article className="public-news-card" aria-labelledby={`${eventItem.id}-public-title`}>
      <h3 id={`${eventItem.id}-public-title`}>{eventItem.title}</h3>
      <p className="news-summary">{eventItem.description}</p>
      <p>Fecha y hora: {formatEventStartsAt(eventItem.startsAt)}</p>
      <p>Lugar: {eventItem.location}</p>
      <p>Organiza: {eventItem.organizer}</p>
      {eventItem.flyerReference ? (
        <p className="news-image-reference">Flyer: {eventItem.flyerReference}</p>
      ) : null}
    </article>
  );
}

function PublicCampaignsSection({ campaigns }: { campaigns: CampaignPublication[] }) {
  const publishedCampaigns = campaigns.filter(
    (campaign) => campaign.status === "published"
  );

  return (
    <section className="public-campaigns" aria-labelledby="public-campaigns-title">
      <div>
        <p className="eyebrow">Iniciativas</p>
        <h2 id="public-campaigns-title">Campanas publicadas</h2>
      </div>

      {publishedCampaigns.length > 0 ? (
        <div className="news-grid">
          {publishedCampaigns.map((campaign) => (
            <article
              className="public-news-card"
              aria-labelledby={`${campaign.id}-public-title`}
              key={campaign.id}
            >
              <h3 id={`${campaign.id}-public-title`}>{campaign.title}</h3>
              <p className="news-summary">{campaign.description}</p>
              <p className="news-image-reference">Imagen: {campaign.imageReference}</p>
              {campaign.videoUrl ? (
                <p className="news-image-reference">Video: {campaign.videoUrl}</p>
              ) : null}
              <p className="campaign-call-to-action">{campaign.callToActionText}</p>
              <p className="campaign-guardrail">
                La web informa formas de colaborar; no procesa pagos, registra
                comprobantes ni vincula aportes automaticamente con Donacion economica.
              </p>
            </article>
          ))}
        </div>
      ) : (
        <p className="empty-news-note">Todavia no hay campanas publicadas.</p>
      )}
    </section>
  );
}

function PublicNewsSection({ news }: { news: NewsPublication[] }) {
  const publishedNews = news.filter(
    (newsItem) =>
      newsItem.status === "published" ||
      (newsItem.status === "pending_review" && newsItem.pendingVersion)
  );

  return (
    <section className="public-news" aria-labelledby="public-news-title">
      <div>
        <p className="eyebrow">Comunicaciones</p>
        <h2 id="public-news-title">Noticias publicadas</h2>
      </div>

      {publishedNews.length > 0 ? (
        <div className="news-grid">
          {publishedNews.map((newsItem) => (
            <article className="public-news-card" key={newsItem.id}>
              <h3>{newsItem.title}</h3>
              <p className="news-summary">{newsItem.summary}</p>
              <p>{newsItem.body}</p>
              {newsItem.mediaAsset ? (
                <MediaAssetImage mediaAsset={newsItem.mediaAsset} />
              ) : newsItem.imageReference ? (
                <p className="news-image-reference">Imagen: {newsItem.imageReference}</p>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <p className="empty-news-note">Todavia no hay noticias publicadas.</p>
      )}
    </section>
  );
}

function PublicSermonsSection({ sermons }: { sermons: SermonPublication[] }) {
  const publishedSermons = sermons.filter((sermon) => sermon.status === "published");

  return (
    <section className="public-sermons" aria-labelledby="public-sermons-title">
      <div>
        <p className="eyebrow">Predicaciones</p>
        <h2 id="public-sermons-title">Predicaciones publicadas</h2>
      </div>

      {publishedSermons.length > 0 ? (
        <div className="news-grid">
          {publishedSermons.map((sermon) => {
            const embedUrl = createYouTubeEmbedUrl(sermon.youtubeUrl);

            return (
              <article
                className="public-news-card"
                aria-labelledby={`${sermon.id}-public-title`}
                key={sermon.id}
              >
                <h3 id={`${sermon.id}-public-title`}>{sermon.title}</h3>
                {embedUrl ? (
                  <div className="sermon-video">
                    <iframe
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      src={embedUrl}
                      title={`Video de predicacion: ${sermon.title}`}
                    />
                  </div>
                ) : (
                  <p className="news-image-reference">
                    URL de YouTube no valida para generar el embed.
                  </p>
                )}
                <p>Predicador: {sermon.preacher}</p>
                <p>Fecha: {formatSermonDate(sermon.sermonDate)}</p>
                <p>Serie: {sermon.series}</p>
                {sermon.description ? (
                  <p className="news-summary">{sermon.description}</p>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : (
        <p className="empty-news-note">Todavia no hay predicaciones publicadas.</p>
      )}
    </section>
  );
}

function PublicSocialEmbedsSection({
  socialEmbeds
}: {
  socialEmbeds: SocialEmbedPublication[];
}) {
  const publishedSocialEmbeds = socialEmbeds
    .filter(
      (socialEmbed) =>
        socialEmbed.status === "published" &&
        socialEmbed.visibilityIntent === "visible"
    )
    .sort(compareSocialEmbedDisplayOrder);

  return (
    <section className="public-social-embeds" aria-labelledby="public-social-title">
      <div>
        <p className="eyebrow">Redes sociales</p>
        <h2 id="public-social-title">Embeds sociales publicados</h2>
      </div>

      {publishedSocialEmbeds.length > 0 ? (
        <div className="news-grid">
          {publishedSocialEmbeds.map((socialEmbed) => (
            <PublicSocialEmbedCard key={socialEmbed.id} socialEmbed={socialEmbed} />
          ))}
        </div>
      ) : (
        <p className="empty-news-note">Todavia no hay embeds sociales publicados.</p>
      )}
    </section>
  );
}

function PublicSocialEmbedCard({
  socialEmbed
}: {
  socialEmbed: SocialEmbedPublication;
}) {
  const titleId = `${socialEmbed.id}-public-title`;
  const youtubeEmbedUrl =
    socialEmbed.platform === "youtube"
      ? createYouTubeEmbedUrl(socialEmbed.embedReference)
      : null;
  const referenceUrl = createExternalUrl(socialEmbed.embedReference);

  return (
    <article className="public-news-card" aria-labelledby={titleId}>
      <h3 id={titleId}>{socialEmbed.title}</h3>
      <p>Plataforma: {socialEmbedPlatformLabels[socialEmbed.platform]}</p>
      {youtubeEmbedUrl ? (
        <div className="sermon-video">
          <iframe
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            src={youtubeEmbedUrl}
            title={`Embed social: ${socialEmbed.title}`}
          />
        </div>
      ) : referenceUrl ? (
        <a className="social-embed-reference" href={referenceUrl} rel="noreferrer" target="_blank">
          Abrir contenido manual
        </a>
      ) : (
        <p className="news-image-reference">
          Referencia manual: {socialEmbed.embedReference}
        </p>
      )}
      <p className="campaign-guardrail">
        Contenido agregado manualmente; sin publicacion automatica ni Meta APIs.
      </p>
    </article>
  );
}

type NewsEditorialWorkspaceProps = {
  news: NewsPublication[];
  onApproveNews: (newsId: string) => Promise<void>;
  onApproveRevision: (newsId: string) => Promise<void>;
  onCreateDraftNews: (input: NewsDraftInput) => Promise<void>;
  onProposeRevision: (newsId: string, input: NewsDraftVersion) => Promise<void>;
  onRejectNews: (newsId: string) => Promise<void>;
  onRejectRevision: (newsId: string) => Promise<void>;
  onSubmitNewsForReview: (newsId: string) => Promise<void>;
  onUpdateDraftNews: (newsId: string, input: NewsDraftInput) => Promise<void>;
  user: AuthenticatedUser;
};

type EventEditorialWorkspaceProps = {
  events: EventPublication[];
  onApproveEvent: (eventId: string) => void;
  onCreateDraftEvent: (input: EventDraftInput) => void;
  onRejectEvent: (eventId: string) => void;
  onSubmitEventForReview: (eventId: string) => void;
  user: AuthenticatedUser;
};

type CampaignEditorialWorkspaceProps = {
  campaigns: CampaignPublication[];
  onApproveCampaign: (campaignId: string) => void;
  onCreateDraftCampaign: (input: CampaignDraftInput) => void;
  onRejectCampaign: (campaignId: string) => void;
  onSubmitCampaignForReview: (campaignId: string) => void;
  user: AuthenticatedUser;
};

type SermonEditorialWorkspaceProps = {
  sermons: SermonPublication[];
  onApproveSermon: (sermonId: string) => void;
  onCreateDraftSermon: (input: SermonDraftInput) => void;
  onRejectSermon: (sermonId: string) => void;
  onSubmitSermonForReview: (sermonId: string) => void;
  user: AuthenticatedUser;
};

type SocialEmbedEditorialWorkspaceProps = {
  socialEmbeds: SocialEmbedPublication[];
  onApproveSocialEmbed: (socialEmbedId: string) => void;
  onCreateDraftSocialEmbed: (input: SocialEmbedDraftInput) => void;
  onRejectSocialEmbed: (socialEmbedId: string) => void;
  onSubmitSocialEmbedForReview: (socialEmbedId: string) => void;
  user: AuthenticatedUser;
};

function EventEditorialWorkspace({
  events,
  onApproveEvent,
  onCreateDraftEvent,
  onRejectEvent,
  onSubmitEventForReview,
  user
}: EventEditorialWorkspaceProps) {
  const [formValues, setFormValues] = useState<EventFormValues>(emptyEventFormValues);

  function handleFormChange(field: keyof EventFormValues, value: string) {
    setFormValues((currentValues) => ({ ...currentValues, [field]: value }));
  }

  function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const input = normalizeEventFormValues(formValues);

    if (!isCompleteEventDraft(input)) {
      return;
    }

    onCreateDraftEvent(input);
    setFormValues(emptyEventFormValues);
  }

  return (
    <div className="news-workspace">
      {user.role === "editor" ? (
        <form className="news-form" onSubmit={handleFormSubmit}>
          <h4>Nuevo Borrador Evento</h4>
          <label>
            Titulo del evento
            <input
              onChange={(event) => handleFormChange("title", event.target.value)}
              required
              type="text"
              value={formValues.title}
            />
          </label>
          <label>
            Descripcion del evento
            <textarea
              onChange={(event) => handleFormChange("description", event.target.value)}
              required
              value={formValues.description}
            />
          </label>
          <label>
            Fecha y hora de inicio
            <input
              onChange={(event) => handleFormChange("startsAt", event.target.value)}
              required
              type="datetime-local"
              value={formValues.startsAt}
            />
          </label>
          <label>
            Lugar
            <input
              onChange={(event) => handleFormChange("location", event.target.value)}
              required
              type="text"
              value={formValues.location}
            />
          </label>
          <label>
            Organizador
            <input
              onChange={(event) => handleFormChange("organizer", event.target.value)}
              required
              type="text"
              value={formValues.organizer}
            />
          </label>
          <label>
            Referencia de flyer (opcional)
            <input
              onChange={(event) => handleFormChange("flyerReference", event.target.value)}
              type="text"
              value={formValues.flyerReference}
            />
          </label>
          <div className="action-row">
            <button type="submit">Crear borrador de evento</button>
          </div>
        </form>
      ) : null}

      <section className="news-review-panel" aria-labelledby="event-review-title">
        <h4 id="event-review-title">
          {user.role === "admin" ? "Revision de Eventos" : "Eventos en preparacion"}
        </h4>
        {events.length > 0 ? (
          <div className="news-list">
            {events.map((eventItem) => (
              <EventPanelCard
                eventItem={eventItem}
                key={eventItem.id}
                onApproveEvent={onApproveEvent}
                onRejectEvent={onRejectEvent}
                onSubmitForReview={onSubmitEventForReview}
                user={user}
              />
            ))}
          </div>
        ) : (
          <p className="empty-news-note">Aun no hay Eventos en el panel.</p>
        )}
      </section>
    </div>
  );
}

type EventPanelCardProps = {
  eventItem: EventPublication;
  onApproveEvent: (eventId: string) => void;
  onRejectEvent: (eventId: string) => void;
  onSubmitForReview: (eventId: string) => void;
  user: AuthenticatedUser;
};

function EventPanelCard({
  eventItem,
  onApproveEvent,
  onRejectEvent,
  onSubmitForReview,
  user
}: EventPanelCardProps) {
  const titleId = `${eventItem.id}-panel-title`;

  return (
    <article className="news-panel-card" aria-labelledby={titleId}>
      <div className="news-card-header">
        <span className={`status-badge status-${eventItem.status}`}>
          {publicationStatusLabels[eventItem.status]}
        </span>
        <h5 id={titleId}>{eventItem.title}</h5>
      </div>
      <p className="news-summary">{eventItem.description}</p>
      <p>Fecha y hora: {formatEventStartsAt(eventItem.startsAt)}</p>
      <p>Lugar: {eventItem.location}</p>
      <p>Organiza: {eventItem.organizer}</p>
      {eventItem.flyerReference ? (
        <p className="news-image-reference">Flyer: {eventItem.flyerReference}</p>
      ) : null}

      {user.role === "editor" && eventItem.status === "draft" ? (
        <div className="action-row">
          <button onClick={() => onSubmitForReview(eventItem.id)} type="button">
            Enviar evento a revision
          </button>
        </div>
      ) : null}

      {user.role === "admin" && eventItem.status === "pending_review" ? (
        <div className="action-row">
          <button onClick={() => onApproveEvent(eventItem.id)} type="button">
            Aprobar evento
          </button>
          <button onClick={() => onRejectEvent(eventItem.id)} type="button">
            Rechazar evento
          </button>
        </div>
      ) : null}
    </article>
  );
}

function CampaignEditorialWorkspace({
  campaigns,
  onApproveCampaign,
  onCreateDraftCampaign,
  onRejectCampaign,
  onSubmitCampaignForReview,
  user
}: CampaignEditorialWorkspaceProps) {
  const [formValues, setFormValues] = useState<CampaignFormValues>(
    emptyCampaignFormValues
  );

  function handleFormChange(field: keyof CampaignFormValues, value: string) {
    setFormValues((currentValues) => ({ ...currentValues, [field]: value }));
  }

  function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const input = normalizeCampaignFormValues(formValues);

    if (!isCompleteCampaignDraft(input)) {
      return;
    }

    onCreateDraftCampaign(input);
    setFormValues(emptyCampaignFormValues);
  }

  return (
    <div className="news-workspace">
      {user.role === "editor" ? (
        <form className="news-form" onSubmit={handleFormSubmit}>
          <h4>Nuevo Borrador Campana</h4>
          <label>
            Titulo de la campana
            <input
              onChange={(event) => handleFormChange("title", event.target.value)}
              required
              type="text"
              value={formValues.title}
            />
          </label>
          <label>
            Descripcion de la campana
            <textarea
              onChange={(event) => handleFormChange("description", event.target.value)}
              required
              value={formValues.description}
            />
          </label>
          <label>
            Referencia de flyer o imagen
            <input
              onChange={(event) => handleFormChange("imageReference", event.target.value)}
              required
              type="text"
              value={formValues.imageReference}
            />
          </label>
          <label>
            URL de video (opcional)
            <input
              onChange={(event) => handleFormChange("videoUrl", event.target.value)}
              type="url"
              value={formValues.videoUrl}
            />
          </label>
          <label>
            Texto de llamada a la accion
            <textarea
              onChange={(event) =>
                handleFormChange("callToActionText", event.target.value)
              }
              required
              value={formValues.callToActionText}
            />
          </label>
          <div className="action-row">
            <button type="submit">Crear borrador de campana</button>
          </div>
        </form>
      ) : null}

      <section className="news-review-panel" aria-labelledby="campaign-review-title">
        <h4 id="campaign-review-title">
          {user.role === "admin" ? "Revision de Campanas" : "Campanas en preparacion"}
        </h4>
        {campaigns.length > 0 ? (
          <div className="news-list">
            {campaigns.map((campaign) => (
              <CampaignPanelCard
                campaign={campaign}
                key={campaign.id}
                onApproveCampaign={onApproveCampaign}
                onRejectCampaign={onRejectCampaign}
                onSubmitForReview={onSubmitCampaignForReview}
                user={user}
              />
            ))}
          </div>
        ) : (
          <p className="empty-news-note">Aun no hay Campanas en el panel.</p>
        )}
      </section>
    </div>
  );
}

type CampaignPanelCardProps = {
  campaign: CampaignPublication;
  onApproveCampaign: (campaignId: string) => void;
  onRejectCampaign: (campaignId: string) => void;
  onSubmitForReview: (campaignId: string) => void;
  user: AuthenticatedUser;
};

function CampaignPanelCard({
  campaign,
  onApproveCampaign,
  onRejectCampaign,
  onSubmitForReview,
  user
}: CampaignPanelCardProps) {
  const titleId = `${campaign.id}-panel-title`;

  return (
    <article className="news-panel-card" aria-labelledby={titleId}>
      <div className="news-card-header">
        <span className={`status-badge status-${campaign.status}`}>
          {publicationStatusLabels[campaign.status]}
        </span>
        <h5 id={titleId}>{campaign.title}</h5>
      </div>
      <p className="news-summary">{campaign.description}</p>
      <p className="news-image-reference">Imagen: {campaign.imageReference}</p>
      {campaign.videoUrl ? (
        <p className="news-image-reference">Video: {campaign.videoUrl}</p>
      ) : null}
      <p className="campaign-call-to-action">{campaign.callToActionText}</p>

      {user.role === "editor" && campaign.status === "draft" ? (
        <div className="action-row">
          <button onClick={() => onSubmitForReview(campaign.id)} type="button">
            Enviar campana a revision
          </button>
        </div>
      ) : null}

      {user.role === "admin" && campaign.status === "pending_review" ? (
        <div className="action-row">
          <button onClick={() => onApproveCampaign(campaign.id)} type="button">
            Aprobar campana
          </button>
          <button onClick={() => onRejectCampaign(campaign.id)} type="button">
            Rechazar campana
          </button>
        </div>
      ) : null}
    </article>
  );
}

function SermonEditorialWorkspace({
  sermons,
  onApproveSermon,
  onCreateDraftSermon,
  onRejectSermon,
  onSubmitSermonForReview,
  user
}: SermonEditorialWorkspaceProps) {
  const [formValues, setFormValues] = useState<SermonFormValues>(
    emptySermonFormValues
  );

  function handleFormChange(field: keyof SermonFormValues, value: string) {
    setFormValues((currentValues) => ({ ...currentValues, [field]: value }));
  }

  function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const input = normalizeSermonFormValues(formValues);

    if (!isCompleteSermonDraft(input)) {
      return;
    }

    onCreateDraftSermon(input);
    setFormValues(emptySermonFormValues);
  }

  return (
    <div className="news-workspace">
      {user.role === "editor" ? (
        <form className="news-form" onSubmit={handleFormSubmit}>
          <h4>Nuevo Borrador Predicacion</h4>
          <label>
            Titulo de la predicacion
            <input
              onChange={(event) => handleFormChange("title", event.target.value)}
              required
              type="text"
              value={formValues.title}
            />
          </label>
          <label>
            URL de YouTube
            <input
              onChange={(event) => handleFormChange("youtubeUrl", event.target.value)}
              required
              type="url"
              value={formValues.youtubeUrl}
            />
          </label>
          <label>
            Predicador
            <input
              onChange={(event) => handleFormChange("preacher", event.target.value)}
              required
              type="text"
              value={formValues.preacher}
            />
          </label>
          <label>
            Fecha de la predicacion
            <input
              onChange={(event) => handleFormChange("sermonDate", event.target.value)}
              required
              type="date"
              value={formValues.sermonDate}
            />
          </label>
          <label>
            Serie
            <input
              onChange={(event) => handleFormChange("series", event.target.value)}
              required
              type="text"
              value={formValues.series}
            />
          </label>
          <label>
            Descripcion (opcional)
            <textarea
              onChange={(event) => handleFormChange("description", event.target.value)}
              value={formValues.description}
            />
          </label>
          <div className="action-row">
            <button type="submit">Crear borrador de predicacion</button>
          </div>
        </form>
      ) : null}

      <section className="news-review-panel" aria-labelledby="sermon-review-title">
        <h4 id="sermon-review-title">
          {user.role === "admin"
            ? "Revision de Predicaciones"
            : "Predicaciones en preparacion"}
        </h4>
        {sermons.length > 0 ? (
          <div className="news-list">
            {sermons.map((sermon) => (
              <SermonPanelCard
                key={sermon.id}
                onApproveSermon={onApproveSermon}
                onRejectSermon={onRejectSermon}
                onSubmitForReview={onSubmitSermonForReview}
                sermon={sermon}
                user={user}
              />
            ))}
          </div>
        ) : (
          <p className="empty-news-note">Aun no hay Predicaciones en el panel.</p>
        )}
      </section>
    </div>
  );
}

type SermonPanelCardProps = {
  sermon: SermonPublication;
  onApproveSermon: (sermonId: string) => void;
  onRejectSermon: (sermonId: string) => void;
  onSubmitForReview: (sermonId: string) => void;
  user: AuthenticatedUser;
};

function SermonPanelCard({
  sermon,
  onApproveSermon,
  onRejectSermon,
  onSubmitForReview,
  user
}: SermonPanelCardProps) {
  const titleId = `${sermon.id}-panel-title`;

  return (
    <article className="news-panel-card" aria-labelledby={titleId}>
      <div className="news-card-header">
        <span className={`status-badge status-${sermon.status}`}>
          {publicationStatusLabels[sermon.status]}
        </span>
        <h5 id={titleId}>{sermon.title}</h5>
      </div>
      <p className="news-image-reference">YouTube: {sermon.youtubeUrl}</p>
      <p>Predicador: {sermon.preacher}</p>
      <p>Fecha: {formatSermonDate(sermon.sermonDate)}</p>
      <p>Serie: {sermon.series}</p>
      {sermon.description ? <p className="news-summary">{sermon.description}</p> : null}

      {user.role === "editor" && sermon.status === "draft" ? (
        <div className="action-row">
          <button onClick={() => onSubmitForReview(sermon.id)} type="button">
            Enviar al administrador para aprobar
          </button>
        </div>
      ) : null}

      {user.role === "admin" && sermon.status === "pending_review" ? (
        <div className="action-row">
          <button onClick={() => onApproveSermon(sermon.id)} type="button">
            Aprobar predicacion
          </button>
          <button onClick={() => onRejectSermon(sermon.id)} type="button">
            Rechazar predicacion
          </button>
        </div>
      ) : null}
    </article>
  );
}

function SocialEmbedEditorialWorkspace({
  socialEmbeds,
  onApproveSocialEmbed,
  onCreateDraftSocialEmbed,
  onRejectSocialEmbed,
  onSubmitSocialEmbedForReview,
  user
}: SocialEmbedEditorialWorkspaceProps) {
  const [formValues, setFormValues] = useState<SocialEmbedFormValues>(
    emptySocialEmbedFormValues
  );

  function handleFormChange<T extends keyof SocialEmbedFormValues>(
    field: T,
    value: SocialEmbedFormValues[T]
  ) {
    setFormValues((currentValues) => ({ ...currentValues, [field]: value }));
  }

  function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const input = normalizeSocialEmbedFormValues(formValues);

    if (!isCompleteSocialEmbedDraft(input)) {
      return;
    }

    onCreateDraftSocialEmbed(input);
    setFormValues(emptySocialEmbedFormValues);
  }

  return (
    <div className="news-workspace">
      {user.role === "editor" ? (
        <form className="news-form" onSubmit={handleFormSubmit}>
          <h4>Nuevo Borrador Embed social</h4>
          <label>
            Titulo del embed social
            <input
              onChange={(event) => handleFormChange("title", event.target.value)}
              required
              type="text"
              value={formValues.title}
            />
          </label>
          <label>
            Plataforma
            <select
              onChange={(event) =>
                handleFormChange("platform", event.target.value as SocialEmbedPlatform)
              }
              required
              value={formValues.platform}
            >
              {Object.entries(socialEmbedPlatformLabels).map(([platform, label]) => (
                <option key={platform} value={platform}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            URL o referencia de embed
            <input
              onChange={(event) =>
                handleFormChange("embedReference", event.target.value)
              }
              required
              type="text"
              value={formValues.embedReference}
            />
          </label>
          <label>
            Intencion de visibilidad
            <select
              onChange={(event) =>
                handleFormChange(
                  "visibilityIntent",
                  event.target.value as SocialEmbedVisibilityIntent
                )
              }
              required
              value={formValues.visibilityIntent}
            >
              {Object.entries(socialEmbedVisibilityIntentLabels).map(
                ([visibilityIntent, label]) => (
                  <option key={visibilityIntent} value={visibilityIntent}>
                    {label}
                  </option>
                )
              )}
            </select>
          </label>
          <label>
            Orden de aparicion
            <input
              onChange={(event) => handleFormChange("displayOrder", event.target.value)}
              type="number"
              value={formValues.displayOrder}
            />
          </label>
          <div className="action-row">
            <button type="submit">Crear borrador de embed social</button>
          </div>
        </form>
      ) : null}

      <section className="news-review-panel" aria-labelledby="social-embed-review-title">
        <h4 id="social-embed-review-title">
          {user.role === "admin"
            ? "Revision de Embeds sociales"
            : "Embeds sociales en preparacion"}
        </h4>
        {socialEmbeds.length > 0 ? (
          <div className="news-list">
            {socialEmbeds.map((socialEmbed) => (
              <SocialEmbedPanelCard
                key={socialEmbed.id}
                onApproveSocialEmbed={onApproveSocialEmbed}
                onRejectSocialEmbed={onRejectSocialEmbed}
                onSubmitForReview={onSubmitSocialEmbedForReview}
                socialEmbed={socialEmbed}
                user={user}
              />
            ))}
          </div>
        ) : (
          <p className="empty-news-note">Aun no hay Embeds sociales en el panel.</p>
        )}
      </section>
    </div>
  );
}

type SocialEmbedPanelCardProps = {
  socialEmbed: SocialEmbedPublication;
  onApproveSocialEmbed: (socialEmbedId: string) => void;
  onRejectSocialEmbed: (socialEmbedId: string) => void;
  onSubmitForReview: (socialEmbedId: string) => void;
  user: AuthenticatedUser;
};

function SocialEmbedPanelCard({
  socialEmbed,
  onApproveSocialEmbed,
  onRejectSocialEmbed,
  onSubmitForReview,
  user
}: SocialEmbedPanelCardProps) {
  const titleId = `${socialEmbed.id}-panel-title`;

  return (
    <article className="news-panel-card" aria-labelledby={titleId}>
      <div className="news-card-header">
        <span className={`status-badge status-${socialEmbed.status}`}>
          {publicationStatusLabels[socialEmbed.status]}
        </span>
        <h5 id={titleId}>{socialEmbed.title}</h5>
      </div>
      <p>Plataforma: {socialEmbedPlatformLabels[socialEmbed.platform]}</p>
      <p className="news-image-reference">Referencia: {socialEmbed.embedReference}</p>
      <p>
        Visibilidad: {socialEmbedVisibilityIntentLabels[socialEmbed.visibilityIntent]}
      </p>
      <p>Orden: {socialEmbed.displayOrder}</p>
      <p className="campaign-guardrail">
        Manual solamente: no publica automaticamente ni sincroniza con Meta APIs.
      </p>

      {user.role === "editor" && socialEmbed.status === "draft" ? (
        <div className="action-row">
          <button onClick={() => onSubmitForReview(socialEmbed.id)} type="button">
            Enviar embed social a revision
          </button>
        </div>
      ) : null}

      {user.role === "admin" && socialEmbed.status === "pending_review" ? (
        <div className="action-row">
          <button onClick={() => onApproveSocialEmbed(socialEmbed.id)} type="button">
            Aprobar embed social
          </button>
          <button onClick={() => onRejectSocialEmbed(socialEmbed.id)} type="button">
            Rechazar embed social
          </button>
        </div>
      ) : null}
    </article>
  );
}

function NewsEditorialWorkspace({
  news,
  onApproveNews,
  onApproveRevision,
  onCreateDraftNews,
  onProposeRevision,
  onRejectNews,
  onRejectRevision,
  onSubmitNewsForReview,
  onUpdateDraftNews,
  user
}: NewsEditorialWorkspaceProps) {
  const [formValues, setFormValues] = useState<NewsFormValues>(emptyNewsFormValues);
  const [editingNewsId, setEditingNewsId] = useState<string | null>(null);
  const [editingPublishedNewsId, setEditingPublishedNewsId] = useState<string | null>(null);

  function handleFormChange(field: NewsTextFormField, value: string) {
    setFormValues((currentValues) => ({ ...currentValues, [field]: value }));
  }

  function handleUploadedImageChange(files: FileList | null) {
    const file = files?.[0] ?? null;

    setFormValues((currentValues) => ({
      ...currentValues,
      uploadedImageFile: file && file.type.startsWith("image/") ? file : null
    }));
  }

  function resetForm() {
    setEditingNewsId(null);
    setEditingPublishedNewsId(null);
    setFormValues(emptyNewsFormValues);
  }

  function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const input = normalizeNewsFormValues(formValues);

    if (!isCompleteNewsDraft(input)) {
      return;
    }

    if (editingPublishedNewsId) {
      onProposeRevision(editingPublishedNewsId, input);
    } else if (editingNewsId) {
      onUpdateDraftNews(editingNewsId, input);
    } else {
      onCreateDraftNews(input);
    }

    resetForm();
  }

  function handleEditDraft(newsItem: NewsPublication) {
    setEditingNewsId(newsItem.id);
    setFormValues({
      title: newsItem.title,
      summary: newsItem.summary,
      body: newsItem.body,
      externalImageUrl: newsItem.mediaAsset?.url ?? "",
      mediaAltText: newsItem.mediaAsset?.altText ?? "",
      uploadedImageFile: null,
      imageReference: newsItem.imageReference ?? ""
    });
  }

  function handleEditPublished(newsItem: NewsPublication) {
    setEditingPublishedNewsId(newsItem.id);
    setFormValues({
      title: newsItem.title,
      summary: newsItem.summary,
      body: newsItem.body,
      externalImageUrl: newsItem.mediaAsset?.url ?? "",
      mediaAltText: newsItem.mediaAsset?.altText ?? "",
      uploadedImageFile: null,
      imageReference: newsItem.imageReference ?? ""
    });
  }

  function handleSubmitForReview(newsId: string) {
    onSubmitNewsForReview(newsId);

    if (editingNewsId === newsId) {
      resetForm();
    }
  }

  return (
    <div className="news-workspace">
      {user.role === "editor" ? (
        <form className="news-form" onSubmit={handleFormSubmit}>
          <h4>
            {editingPublishedNewsId
              ? "Proponer cambios a Noticia publicada"
              : editingNewsId
                ? "Editar borrador Noticia"
                : "Nuevo Borrador Noticia"}
          </h4>
          <label>
            Titulo de la noticia
            <input
              onChange={(event) => handleFormChange("title", event.target.value)}
              required
              type="text"
              value={formValues.title}
            />
          </label>
          <label>
            Resumen
            <input
              onChange={(event) => handleFormChange("summary", event.target.value)}
              required
              type="text"
              value={formValues.summary}
            />
          </label>
          <label>
            Cuerpo
            <textarea
              onChange={(event) => handleFormChange("body", event.target.value)}
              required
              value={formValues.body}
            />
          </label>
          <label>
            URL externa de imagen
            <input
              onChange={(event) =>
                handleFormChange("externalImageUrl", event.target.value)
              }
              type="url"
              value={formValues.externalImageUrl}
            />
          </label>
          <label>
            Imagen para optimizar
            <input
              accept="image/*"
              onChange={(event) => handleUploadedImageChange(event.target.files)}
              type="file"
            />
          </label>
          <label>
            Texto alternativo de imagen
            <input
              onChange={(event) => handleFormChange("mediaAltText", event.target.value)}
              type="text"
              value={formValues.mediaAltText}
            />
          </label>
          <label>
            Referencia de imagen (opcional)
            <input
              onChange={(event) =>
                handleFormChange("imageReference", event.target.value)
              }
              type="text"
              value={formValues.imageReference}
            />
          </label>
          <div className="action-row">
            <button type="submit">
              {editingPublishedNewsId
                ? "Proponer cambios"
                : editingNewsId
                  ? "Guardar borrador"
                  : "Crear borrador"}
            </button>
            {(editingNewsId || editingPublishedNewsId) ? (
              <button onClick={resetForm} type="button">
                Cancelar edicion
              </button>
            ) : null}
          </div>
        </form>
      ) : null}

      <section className="news-review-panel" aria-labelledby="news-review-title">
        <h4 id="news-review-title">
          {user.role === "admin" ? "Revision de Noticias" : "Noticias en preparacion"}
        </h4>
        {news.length > 0 ? (
          <div className="news-list">
            {news.map((newsItem) => (
              <NewsPanelCard
                key={newsItem.id}
                newsItem={newsItem}
                onApproveNews={onApproveNews}
                onApproveRevision={onApproveRevision}
                onEditDraft={handleEditDraft}
                onEditPublished={handleEditPublished}
                onRejectNews={onRejectNews}
                onRejectRevision={onRejectRevision}
                onSubmitForReview={handleSubmitForReview}
                user={user}
              />
            ))}
          </div>
        ) : (
          <p className="empty-news-note">Aun no hay Noticias en el panel.</p>
        )}
      </section>
    </div>
  );
}

type NewsPanelCardProps = {
  newsItem: NewsPublication;
  onApproveNews: (newsId: string) => Promise<void>;
  onApproveRevision: (newsId: string) => Promise<void>;
  onEditDraft: (newsItem: NewsPublication) => void;
  onEditPublished: (newsItem: NewsPublication) => void;
  onRejectNews: (newsId: string) => Promise<void>;
  onRejectRevision: (newsId: string) => Promise<void>;
  onSubmitForReview: (newsId: string) => void;
  user: AuthenticatedUser;
};

function NewsPanelCard({
  newsItem,
  onApproveNews,
  onApproveRevision,
  onEditDraft,
  onEditPublished,
  onRejectNews,
  onRejectRevision,
  onSubmitForReview,
  user
}: NewsPanelCardProps) {
  const titleId = `${newsItem.id}-panel-title`;

  return (
    <article className="news-panel-card" aria-labelledby={titleId}>
      <div className="news-card-header">
        <span className={`status-badge status-${newsItem.status}`}>
          {publicationStatusLabels[newsItem.status]}
        </span>
        <h5 id={titleId}>{newsItem.title}</h5>
      </div>
      <p className="news-summary">{newsItem.summary}</p>
      <p>{newsItem.body}</p>
      {newsItem.mediaAsset ? (
        <MediaAssetSummary mediaAsset={newsItem.mediaAsset} />
      ) : newsItem.imageReference ? (
        <p className="news-image-reference">Imagen: {newsItem.imageReference}</p>
      ) : null}

      {newsItem.pendingVersion ? (
        <div className="pending-version-preview">
          <h6>Revision pendiente</h6>
          <h6>{newsItem.pendingVersion.title}</h6>
          <p className="news-summary">{newsItem.pendingVersion.summary}</p>
          <p>{newsItem.pendingVersion.body}</p>
          {newsItem.pendingVersion.mediaAsset ? (
            <MediaAssetSummary mediaAsset={newsItem.pendingVersion.mediaAsset} />
          ) : newsItem.pendingVersion.imageReference ? (
            <p className="news-image-reference">
              Imagen: {newsItem.pendingVersion.imageReference}
            </p>
          ) : null}
        </div>
      ) : null}

      {user.role === "editor" && newsItem.status === "draft" ? (
        <div className="action-row">
          <button onClick={() => onEditDraft(newsItem)} type="button">
            Editar borrador
          </button>
          <button onClick={() => onSubmitForReview(newsItem.id)} type="button">
            Enviar a revision
          </button>
        </div>
      ) : null}

      {user.role === "editor" &&
      newsItem.status === "published" &&
      !newsItem.pendingVersion ? (
        <div className="action-row">
          <button onClick={() => onEditPublished(newsItem)} type="button">
            Editar publicado
          </button>
        </div>
      ) : null}

      {user.role === "admin" && newsItem.status === "pending_review" && !newsItem.pendingVersion ? (
        <div className="action-row">
          <button onClick={() => onApproveNews(newsItem.id)} type="button">
            Aprobar noticia
          </button>
          <button onClick={() => onRejectNews(newsItem.id)} type="button">
            Rechazar noticia
          </button>
        </div>
      ) : null}

      {user.role === "admin" && newsItem.status === "pending_review" && newsItem.pendingVersion ? (
        <div className="action-row">
          <button onClick={() => onApproveRevision(newsItem.id)} type="button">
            Aprobar revision
          </button>
          <button onClick={() => onRejectRevision(newsItem.id)} type="button">
            Rechazar revision
          </button>
        </div>
      ) : null}
    </article>
  );
}

function createNewsId(currentNews: NewsPublication[]) {
  return `noticia-${currentNews.length + 1}`;
}

function MediaAssetImage({ mediaAsset }: { mediaAsset: MediaAsset }) {
  return (
    <img
      alt={mediaAsset.altText}
      className="publication-media-image"
      src={mediaAsset.url}
    />
  );
}

function MediaAssetSummary({ mediaAsset }: { mediaAsset: MediaAsset }) {
  return (
    <div className="media-asset-summary">
      <p className="news-image-reference">MediaAsset: {mediaAsset.url}</p>
      <p className="news-image-reference">Alt: {mediaAsset.altText}</p>
    </div>
  );
}

function createCampaignId(currentCampaigns: CampaignPublication[]) {
  return `campana-${currentCampaigns.length + 1}`;
}

function createEventId(currentEvents: EventPublication[]) {
  return `evento-${currentEvents.length + 1}`;
}

function createSermonId(currentSermons: SermonPublication[]) {
  return `predicacion-${currentSermons.length + 1}`;
}

function createSocialEmbedId(currentSocialEmbeds: SocialEmbedPublication[]) {
  return `social-embed-${currentSocialEmbeds.length + 1}`;
}

function normalizeCampaignFormValues(values: CampaignFormValues): CampaignDraftInput {
  const videoUrl = values.videoUrl.trim();

  return {
    title: values.title.trim(),
    description: values.description.trim(),
    imageReference: values.imageReference.trim(),
    videoUrl: videoUrl || undefined,
    callToActionText: values.callToActionText.trim()
  };
}

function isCompleteCampaignDraft(input: CampaignDraftInput) {
  return (
    input.title.length > 0 &&
    input.description.length > 0 &&
    input.imageReference.length > 0 &&
    input.callToActionText.length > 0
  );
}

function normalizeContactFormValues(values: ContactFormValues): ContactEmailRequest {
  return {
    kind: "contact",
    name: values.name.trim(),
    contact: values.contact.trim(),
    subject: values.subject.trim(),
    message: values.message.trim()
  };
}

function isCompleteContactEmailRequest(request: ContactEmailRequest) {
  return (
    request.name.length > 0 &&
    request.contact.length > 0 &&
    request.subject.length > 0 &&
    request.message.length > 0
  );
}

function normalizeGoodsDonationFormValues(
  values: GoodsDonationFormValues
): GoodsDonationEmailRequest {
  const message = values.message.trim();

  return {
    kind: "goods_donation",
    name: values.name.trim(),
    contact: values.contact.trim(),
    goodsDescription: values.goodsDescription.trim(),
    message: message || undefined
  };
}

function isCompleteGoodsDonationEmailRequest(request: GoodsDonationEmailRequest) {
  return (
    request.name.length > 0 &&
    request.contact.length > 0 &&
    request.goodsDescription.length > 0
  );
}

function normalizeEventFormValues(values: EventFormValues): EventDraftInput {
  const flyerReference = values.flyerReference.trim();

  return {
    title: values.title.trim(),
    description: values.description.trim(),
    startsAt: values.startsAt.trim(),
    location: values.location.trim(),
    organizer: values.organizer.trim(),
    flyerReference: flyerReference || undefined
  };
}

function isCompleteEventDraft(input: EventDraftInput) {
  return (
    input.title.length > 0 &&
    input.description.length > 0 &&
    input.startsAt.length > 0 &&
    input.location.length > 0 &&
    input.organizer.length > 0
  );
}

function normalizeSermonFormValues(values: SermonFormValues): SermonDraftInput {
  const description = values.description.trim();

  return {
    title: values.title.trim(),
    youtubeUrl: values.youtubeUrl.trim(),
    preacher: values.preacher.trim(),
    sermonDate: values.sermonDate.trim(),
    series: values.series.trim(),
    description: description || undefined
  };
}

function isCompleteSermonDraft(input: SermonDraftInput) {
  return (
    input.title.length > 0 &&
    createYouTubeEmbedUrl(input.youtubeUrl) !== null &&
    input.preacher.length > 0 &&
    input.sermonDate.length > 0 &&
    input.series.length > 0
  );
}

function normalizeSocialEmbedFormValues(
  values: SocialEmbedFormValues
): SocialEmbedDraftInput {
  const displayOrder = Number(values.displayOrder);

  return {
    title: values.title.trim(),
    platform: values.platform,
    embedReference: values.embedReference.trim(),
    visibilityIntent: values.visibilityIntent,
    displayOrder: Number.isFinite(displayOrder) ? displayOrder : 0
  };
}

function isCompleteSocialEmbedDraft(input: SocialEmbedDraftInput) {
  return input.title.length > 0 && input.embedReference.length > 0;
}

function compareSocialEmbedDisplayOrder(
  first: SocialEmbedPublication,
  second: SocialEmbedPublication
) {
  return first.displayOrder - second.displayOrder;
}

function hasEventEnded(eventItem: EventPublication, now: Date) {
  const startsAtTime = new Date(eventItem.startsAt).getTime();

  return !Number.isNaN(startsAtTime) && startsAtTime < now.getTime();
}

function compareEventsAscending(first: EventPublication, second: EventPublication) {
  return new Date(first.startsAt).getTime() - new Date(second.startsAt).getTime();
}

function compareEventsDescending(first: EventPublication, second: EventPublication) {
  return compareEventsAscending(second, first);
}

function formatEventStartsAt(startsAt: string) {
  return startsAt.replace("T", " ");
}

function formatSermonDate(sermonDate: string) {
  return sermonDate;
}

function createYouTubeEmbedUrl(youtubeUrl: string) {
  const videoId = getYouTubeVideoId(youtubeUrl);

  return videoId ? `https://www.youtube-nocookie.com/embed/${videoId}` : null;
}

function createExternalUrl(reference: string) {
  try {
    const url = new URL(reference);

    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function getYouTubeVideoId(youtubeUrl: string) {
  try {
    const url = new URL(youtubeUrl);
    const hostname = url.hostname.replace(/^www\./, "");

    if (hostname === "youtu.be") {
      return sanitizeYouTubeVideoId(url.pathname.split("/")[1]);
    }

    if (
      hostname === "youtube.com" ||
      hostname === "m.youtube.com" ||
      hostname === "youtube-nocookie.com"
    ) {
      if (url.pathname === "/watch") {
        return sanitizeYouTubeVideoId(url.searchParams.get("v"));
      }

      const pathVideoId = url.pathname.match(/^\/(embed|shorts|live)\/([^/]+)/)?.[2];

      return sanitizeYouTubeVideoId(pathVideoId);
    }
  } catch {
    return null;
  }

  return null;
}

function sanitizeYouTubeVideoId(videoId: string | null | undefined) {
  return videoId && /^[A-Za-z0-9_-]{11}$/.test(videoId) ? videoId : null;
}

function normalizeNewsFormValues(values: NewsFormValues): NewsDraftInput {
  const imageReference = values.imageReference.trim();
  const externalImageUrl = values.externalImageUrl.trim();
  const mediaAltText = values.mediaAltText.trim();
  const uploadedImageFile = values.uploadedImageFile?.type.startsWith("image/")
    ? values.uploadedImageFile
    : undefined;

  return {
    title: values.title.trim(),
    summary: values.summary.trim(),
    body: values.body.trim(),
    imageReference: imageReference || undefined,
    mediaAltText: mediaAltText || undefined,
    mediaAsset:
      externalImageUrl && mediaAltText
        ? {
            kind: "external_image",
            url: externalImageUrl,
            altText: mediaAltText
          }
        : undefined,
    uploadedImageFile: externalImageUrl ? undefined : uploadedImageFile
  };
}

function isCompleteNewsDraft(input: NewsDraftInput) {
  return (
    input.title.length > 0 &&
    input.summary.length > 0 &&
    input.body.length > 0 &&
    (!input.mediaAsset || input.mediaAsset.altText.length > 0) &&
    (!input.uploadedImageFile || Boolean(input.mediaAltText))
  );
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result)));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsDataURL(file);
  });
}

function loadBrowserImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", () => reject(new Error("Image could not load.")));
    image.src = src;
  });
}
