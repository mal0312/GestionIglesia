import { type FormEvent, useState } from "react";
import type {
  CampaignPublication,
  EventPublication,
  NewsDraftVersion,
  NewsPublication,
  PublicationStatus,
  SermonPublication,
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
import "./styles.css";

type AppProps = {
  content?: SiteContent;
  authConfig?: AuthConfig;
  googleAuthClient?: GoogleAuthClient;
  now?: Date;
};

type AuthStatus = "idle" | "loading";

type NewsDraftInput = {
  title: string;
  summary: string;
  body: string;
  imageReference?: string;
};

type NewsFormValues = {
  title: string;
  summary: string;
  body: string;
  imageReference: string;
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

const emptyNewsFormValues: NewsFormValues = {
  title: "",
  summary: "",
  body: "",
  imageReference: ""
};

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

const publicationStatusLabels: Record<PublicationStatus, string> = {
  draft: "Borrador",
  pending_review: "Pendiente de revision",
  published: "Publicado",
  rejected: "Rechazado"
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

export function App({
  content = siteContent,
  authConfig = privatePanelAuthConfig,
  googleAuthClient = browserGoogleAuthClient,
  now = new Date()
}: AppProps) {
  const [currentUser, setCurrentUser] = useState<AuthenticatedUser | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>("idle");
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [news, setNews] = useState<NewsPublication[]>(() => content.news);
  const [campaigns, setCampaigns] = useState<CampaignPublication[]>(
    () => content.campaigns
  );
  const [events, setEvents] = useState<EventPublication[]>(() => content.events);
  const [sermons, setSermons] = useState<SermonPublication[]>(() => content.sermons);

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

  function handleCreateDraftNews(input: NewsDraftInput) {
    setNews((currentNews) => [
      ...currentNews,
      {
        ...input,
        id: createNewsId(currentNews),
        status: "draft"
      }
    ]);
  }

  function handleUpdateDraftNews(newsId: string, input: NewsDraftInput) {
    setNews((currentNews) =>
      currentNews.map((newsItem) =>
        newsItem.id === newsId && newsItem.status === "draft"
          ? { ...newsItem, ...input }
          : newsItem
      )
    );
  }

  function handleSubmitNewsForReview(newsId: string) {
    setNews((currentNews) =>
      currentNews.map((newsItem) =>
        newsItem.id === newsId && newsItem.status === "draft"
          ? { ...newsItem, status: "pending_review" }
          : newsItem
      )
    );
  }

  function handleApproveNews(newsId: string) {
    setNews((currentNews) =>
      currentNews.map((newsItem) =>
        newsItem.id === newsId && newsItem.status === "pending_review"
          ? { ...newsItem, status: "published" }
          : newsItem
      )
    );
  }

  function handleRejectNews(newsId: string) {
    setNews((currentNews) =>
      currentNews.map((newsItem) =>
        newsItem.id === newsId && newsItem.status === "pending_review"
          ? { ...newsItem, status: "rejected" }
          : newsItem
      )
    );
  }

  function handleProposeRevision(newsId: string, input: NewsDraftVersion) {
    setNews((currentNews) =>
      currentNews.map((newsItem) =>
        newsItem.id === newsId && newsItem.status === "published"
          ? { ...newsItem, status: "pending_review", pendingVersion: input }
          : newsItem
      )
    );
  }

  function handleApproveRevision(newsId: string) {
    setNews((currentNews) =>
      currentNews.map((newsItem) =>
        newsItem.id === newsId &&
        newsItem.status === "pending_review" &&
        newsItem.pendingVersion
          ? {
              ...newsItem,
              title: newsItem.pendingVersion.title,
              summary: newsItem.pendingVersion.summary,
              body: newsItem.pendingVersion.body,
              imageReference: newsItem.pendingVersion.imageReference,
              status: "published",
              pendingVersion: undefined
            }
          : newsItem
      )
    );
  }

  function handleRejectRevision(newsId: string) {
    setNews((currentNews) =>
      currentNews.map((newsItem) =>
        newsItem.id === newsId &&
        newsItem.status === "pending_review" &&
        newsItem.pendingVersion
          ? { ...newsItem, status: "published", pendingVersion: undefined }
          : newsItem
      )
    );
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

      <PrivatePanel
        authMessage={authMessage}
        authStatus={authStatus}
        campaigns={campaigns}
        currentUser={currentUser}
        events={events}
        news={news}
        sermons={sermons}
        onApproveCampaign={handleApproveCampaign}
        onApproveEvent={handleApproveEvent}
        onApproveNews={handleApproveNews}
        onApproveRevision={handleApproveRevision}
        onApproveSermon={handleApproveSermon}
        onCreateDraftCampaign={handleCreateDraftCampaign}
        onCreateDraftEvent={handleCreateDraftEvent}
        onCreateDraftNews={handleCreateDraftNews}
        onCreateDraftSermon={handleCreateDraftSermon}
        onGoogleSignIn={handleGoogleSignIn}
        onProposeRevision={handleProposeRevision}
        onRejectCampaign={handleRejectCampaign}
        onRejectEvent={handleRejectEvent}
        onRejectNews={handleRejectNews}
        onRejectRevision={handleRejectRevision}
        onRejectSermon={handleRejectSermon}
        onSignOut={handleSignOut}
        onSubmitCampaignForReview={handleSubmitCampaignForReview}
        onSubmitEventForReview={handleSubmitEventForReview}
        onSubmitNewsForReview={handleSubmitNewsForReview}
        onSubmitSermonForReview={handleSubmitSermonForReview}
        onUpdateDraftNews={handleUpdateDraftNews}
      />

      <footer className="footer">{content.costNote}</footer>
    </main>
  );
}

type PrivatePanelProps = {
  authMessage: string | null;
  authStatus: AuthStatus;
  campaigns: CampaignPublication[];
  currentUser: AuthenticatedUser | null;
  events: EventPublication[];
  news: NewsPublication[];
  sermons: SermonPublication[];
  onApproveCampaign: (campaignId: string) => void;
  onApproveEvent: (eventId: string) => void;
  onApproveNews: (newsId: string) => void;
  onApproveRevision: (newsId: string) => void;
  onApproveSermon: (sermonId: string) => void;
  onCreateDraftCampaign: (input: CampaignDraftInput) => void;
  onCreateDraftEvent: (input: EventDraftInput) => void;
  onCreateDraftNews: (input: NewsDraftInput) => void;
  onCreateDraftSermon: (input: SermonDraftInput) => void;
  onGoogleSignIn: () => void;
  onProposeRevision: (newsId: string, input: NewsDraftVersion) => void;
  onRejectCampaign: (campaignId: string) => void;
  onRejectEvent: (eventId: string) => void;
  onRejectNews: (newsId: string) => void;
  onRejectRevision: (newsId: string) => void;
  onRejectSermon: (sermonId: string) => void;
  onSignOut: () => void;
  onSubmitCampaignForReview: (campaignId: string) => void;
  onSubmitEventForReview: (eventId: string) => void;
  onSubmitNewsForReview: (newsId: string) => void;
  onSubmitSermonForReview: (sermonId: string) => void;
  onUpdateDraftNews: (newsId: string, input: NewsDraftInput) => void;
};

function PrivatePanel({
  authMessage,
  authStatus,
  campaigns,
  currentUser,
  events,
  news,
  sermons,
  onApproveCampaign,
  onApproveEvent,
  onApproveNews,
  onApproveRevision,
  onApproveSermon,
  onCreateDraftCampaign,
  onCreateDraftEvent,
  onCreateDraftNews,
  onCreateDraftSermon,
  onGoogleSignIn,
  onProposeRevision,
  onRejectCampaign,
  onRejectEvent,
  onRejectNews,
  onRejectRevision,
  onRejectSermon,
  onSignOut,
  onSubmitCampaignForReview,
  onSubmitEventForReview,
  onSubmitNewsForReview,
  onSubmitSermonForReview,
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
          onApproveCampaign={onApproveCampaign}
          onApproveEvent={onApproveEvent}
          onApproveNews={onApproveNews}
          onApproveRevision={onApproveRevision}
          onApproveSermon={onApproveSermon}
          onCreateDraftCampaign={onCreateDraftCampaign}
          onCreateDraftEvent={onCreateDraftEvent}
          onCreateDraftNews={onCreateDraftNews}
          onCreateDraftSermon={onCreateDraftSermon}
          onProposeRevision={onProposeRevision}
          onRejectCampaign={onRejectCampaign}
          onRejectEvent={onRejectEvent}
          onRejectNews={onRejectNews}
          onRejectRevision={onRejectRevision}
          onRejectSermon={onRejectSermon}
          onSubmitCampaignForReview={onSubmitCampaignForReview}
          onSubmitEventForReview={onSubmitEventForReview}
          onSubmitNewsForReview={onSubmitNewsForReview}
          onSubmitSermonForReview={onSubmitSermonForReview}
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
  onApproveCampaign: (campaignId: string) => void;
  onApproveEvent: (eventId: string) => void;
  onApproveNews: (newsId: string) => void;
  onApproveRevision: (newsId: string) => void;
  onApproveSermon: (sermonId: string) => void;
  onCreateDraftCampaign: (input: CampaignDraftInput) => void;
  onCreateDraftEvent: (input: EventDraftInput) => void;
  onCreateDraftNews: (input: NewsDraftInput) => void;
  onCreateDraftSermon: (input: SermonDraftInput) => void;
  onProposeRevision: (newsId: string, input: NewsDraftVersion) => void;
  onRejectCampaign: (campaignId: string) => void;
  onRejectEvent: (eventId: string) => void;
  onRejectNews: (newsId: string) => void;
  onRejectRevision: (newsId: string) => void;
  onRejectSermon: (sermonId: string) => void;
  onSubmitCampaignForReview: (campaignId: string) => void;
  onSubmitEventForReview: (eventId: string) => void;
  onSubmitNewsForReview: (newsId: string) => void;
  onSubmitSermonForReview: (sermonId: string) => void;
  onUpdateDraftNews: (newsId: string, input: NewsDraftInput) => void;
  user: AuthenticatedUser;
};

function RoleStartSurface({
  campaigns,
  events,
  news,
  sermons,
  onApproveCampaign,
  onApproveEvent,
  onApproveNews,
  onApproveRevision,
  onApproveSermon,
  onCreateDraftCampaign,
  onCreateDraftEvent,
  onCreateDraftNews,
  onCreateDraftSermon,
  onProposeRevision,
  onRejectCampaign,
  onRejectEvent,
  onRejectNews,
  onRejectRevision,
  onRejectSermon,
  onSubmitCampaignForReview,
  onSubmitEventForReview,
  onSubmitNewsForReview,
  onSubmitSermonForReview,
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
              {newsItem.imageReference ? (
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

type NewsEditorialWorkspaceProps = {
  news: NewsPublication[];
  onApproveNews: (newsId: string) => void;
  onApproveRevision: (newsId: string) => void;
  onCreateDraftNews: (input: NewsDraftInput) => void;
  onProposeRevision: (newsId: string, input: NewsDraftVersion) => void;
  onRejectNews: (newsId: string) => void;
  onRejectRevision: (newsId: string) => void;
  onSubmitNewsForReview: (newsId: string) => void;
  onUpdateDraftNews: (newsId: string, input: NewsDraftInput) => void;
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

  function handleFormChange(field: keyof NewsFormValues, value: string) {
    setFormValues((currentValues) => ({ ...currentValues, [field]: value }));
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
      imageReference: newsItem.imageReference ?? ""
    });
  }

  function handleEditPublished(newsItem: NewsPublication) {
    setEditingPublishedNewsId(newsItem.id);
    setFormValues({
      title: newsItem.title,
      summary: newsItem.summary,
      body: newsItem.body,
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

      <section className="news-review-panel" aria-labelledby="news-workspace-title">
        <h4 id="news-workspace-title">
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
  onApproveNews: (newsId: string) => void;
  onApproveRevision: (newsId: string) => void;
  onEditDraft: (newsItem: NewsPublication) => void;
  onEditPublished: (newsItem: NewsPublication) => void;
  onRejectNews: (newsId: string) => void;
  onRejectRevision: (newsId: string) => void;
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
      {newsItem.imageReference ? (
        <p className="news-image-reference">Imagen: {newsItem.imageReference}</p>
      ) : null}

      {newsItem.pendingVersion ? (
        <div className="pending-version-preview">
          <h6>Revision pendiente</h6>
          <h6>{newsItem.pendingVersion.title}</h6>
          <p className="news-summary">{newsItem.pendingVersion.summary}</p>
          <p>{newsItem.pendingVersion.body}</p>
          {newsItem.pendingVersion.imageReference ? (
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

function createCampaignId(currentCampaigns: CampaignPublication[]) {
  return `campana-${currentCampaigns.length + 1}`;
}

function createEventId(currentEvents: EventPublication[]) {
  return `evento-${currentEvents.length + 1}`;
}

function createSermonId(currentSermons: SermonPublication[]) {
  return `predicacion-${currentSermons.length + 1}`;
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

      const pathVideoId = url.pathname.match(/^\/(embed|shorts)\/([^/]+)/)?.[2];

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

  return {
    title: values.title.trim(),
    summary: values.summary.trim(),
    body: values.body.trim(),
    imageReference: imageReference || undefined
  };
}

function isCompleteNewsDraft(input: NewsDraftInput) {
  return input.title.length > 0 && input.summary.length > 0 && input.body.length > 0;
}
