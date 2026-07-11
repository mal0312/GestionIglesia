import { type FormEvent, useState } from "react";
import type { NewsPublication, SiteContent } from "./domain/siteContent";
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

const emptyNewsFormValues: NewsFormValues = {
  title: "",
  summary: "",
  body: "",
  imageReference: ""
};

const newsStatusLabels: Record<NewsPublication["status"], string> = {
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
  googleAuthClient = browserGoogleAuthClient
}: AppProps) {
  const [currentUser, setCurrentUser] = useState<AuthenticatedUser | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>("idle");
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [news, setNews] = useState<NewsPublication[]>(() => content.news);

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

      <PublicNewsSection news={news} />

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
        currentUser={currentUser}
        news={news}
        onApproveNews={handleApproveNews}
        onCreateDraftNews={handleCreateDraftNews}
        onGoogleSignIn={handleGoogleSignIn}
        onRejectNews={handleRejectNews}
        onSignOut={handleSignOut}
        onSubmitNewsForReview={handleSubmitNewsForReview}
        onUpdateDraftNews={handleUpdateDraftNews}
      />

      <footer className="footer">{content.costNote}</footer>
    </main>
  );
}

type PrivatePanelProps = {
  authMessage: string | null;
  authStatus: AuthStatus;
  currentUser: AuthenticatedUser | null;
  news: NewsPublication[];
  onApproveNews: (newsId: string) => void;
  onCreateDraftNews: (input: NewsDraftInput) => void;
  onGoogleSignIn: () => void;
  onRejectNews: (newsId: string) => void;
  onSignOut: () => void;
  onSubmitNewsForReview: (newsId: string) => void;
  onUpdateDraftNews: (newsId: string, input: NewsDraftInput) => void;
};

function PrivatePanel({
  authMessage,
  authStatus,
  currentUser,
  news,
  onApproveNews,
  onCreateDraftNews,
  onGoogleSignIn,
  onRejectNews,
  onSignOut,
  onSubmitNewsForReview,
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
          news={news}
          onApproveNews={onApproveNews}
          onCreateDraftNews={onCreateDraftNews}
          onRejectNews={onRejectNews}
          onSubmitNewsForReview={onSubmitNewsForReview}
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
  news: NewsPublication[];
  onApproveNews: (newsId: string) => void;
  onCreateDraftNews: (input: NewsDraftInput) => void;
  onRejectNews: (newsId: string) => void;
  onSubmitNewsForReview: (newsId: string) => void;
  onUpdateDraftNews: (newsId: string, input: NewsDraftInput) => void;
  user: AuthenticatedUser;
};

function RoleStartSurface({
  news,
  onApproveNews,
  onCreateDraftNews,
  onRejectNews,
  onSubmitNewsForReview,
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

      <NewsEditorialWorkspace
        news={news}
        onApproveNews={onApproveNews}
        onCreateDraftNews={onCreateDraftNews}
        onRejectNews={onRejectNews}
        onSubmitNewsForReview={onSubmitNewsForReview}
        onUpdateDraftNews={onUpdateDraftNews}
        user={user}
      />
    </div>
  );
}

function PublicNewsSection({ news }: { news: NewsPublication[] }) {
  const publishedNews = news.filter((newsItem) => newsItem.status === "published");

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

type NewsEditorialWorkspaceProps = {
  news: NewsPublication[];
  onApproveNews: (newsId: string) => void;
  onCreateDraftNews: (input: NewsDraftInput) => void;
  onRejectNews: (newsId: string) => void;
  onSubmitNewsForReview: (newsId: string) => void;
  onUpdateDraftNews: (newsId: string, input: NewsDraftInput) => void;
  user: AuthenticatedUser;
};

function NewsEditorialWorkspace({
  news,
  onApproveNews,
  onCreateDraftNews,
  onRejectNews,
  onSubmitNewsForReview,
  onUpdateDraftNews,
  user
}: NewsEditorialWorkspaceProps) {
  const [formValues, setFormValues] = useState<NewsFormValues>(emptyNewsFormValues);
  const [editingNewsId, setEditingNewsId] = useState<string | null>(null);

  function handleFormChange(field: keyof NewsFormValues, value: string) {
    setFormValues((currentValues) => ({ ...currentValues, [field]: value }));
  }

  function resetForm() {
    setEditingNewsId(null);
    setFormValues(emptyNewsFormValues);
  }

  function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const input = normalizeNewsFormValues(formValues);

    if (!isCompleteNewsDraft(input)) {
      return;
    }

    if (editingNewsId) {
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
          <h4>{editingNewsId ? "Editar borrador Noticia" : "Nuevo Borrador Noticia"}</h4>
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
              {editingNewsId ? "Guardar borrador" : "Crear borrador"}
            </button>
            {editingNewsId ? (
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
                onEditDraft={handleEditDraft}
                onRejectNews={onRejectNews}
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
  onEditDraft: (newsItem: NewsPublication) => void;
  onRejectNews: (newsId: string) => void;
  onSubmitForReview: (newsId: string) => void;
  user: AuthenticatedUser;
};

function NewsPanelCard({
  newsItem,
  onApproveNews,
  onEditDraft,
  onRejectNews,
  onSubmitForReview,
  user
}: NewsPanelCardProps) {
  const titleId = `${newsItem.id}-panel-title`;

  return (
    <article className="news-panel-card" aria-labelledby={titleId}>
      <div className="news-card-header">
        <span className={`status-badge status-${newsItem.status}`}>
          {newsStatusLabels[newsItem.status]}
        </span>
        <h5 id={titleId}>{newsItem.title}</h5>
      </div>
      <p className="news-summary">{newsItem.summary}</p>
      <p>{newsItem.body}</p>
      {newsItem.imageReference ? (
        <p className="news-image-reference">Imagen: {newsItem.imageReference}</p>
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

      {user.role === "admin" && newsItem.status === "pending_review" ? (
        <div className="action-row">
          <button onClick={() => onApproveNews(newsItem.id)} type="button">
            Aprobar noticia
          </button>
          <button onClick={() => onRejectNews(newsItem.id)} type="button">
            Rechazar noticia
          </button>
        </div>
      ) : null}
    </article>
  );
}

function createNewsId(currentNews: NewsPublication[]) {
  return `noticia-${currentNews.length + 1}`;
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
