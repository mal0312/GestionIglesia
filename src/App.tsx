import { useState } from "react";
import type { SiteContent } from "./domain/siteContent";
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
        onGoogleSignIn={handleGoogleSignIn}
      />

      <footer className="footer">{content.costNote}</footer>
    </main>
  );
}

type PrivatePanelProps = {
  authMessage: string | null;
  authStatus: AuthStatus;
  currentUser: AuthenticatedUser | null;
  onGoogleSignIn: () => void;
};

function PrivatePanel({
  authMessage,
  authStatus,
  currentUser,
  onGoogleSignIn
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
          <p className="session-badge">
            Sesion activa: {currentUser.email} | Rol: {roleLabels[currentUser.role]}
          </p>
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

      {currentUser ? <RoleStartSurface user={currentUser} /> : <AuthGuardrails />}
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

function RoleStartSurface({ user }: { user: AuthenticatedUser }) {
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
            <button type="button">Crear borrador</button>
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
    </div>
  );
}
