import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";
import type { AuthConfig, GoogleAuthClient } from "./domain/auth";
import type { SiteContent } from "./domain/siteContent";

const content: SiteContent = {
  churchName: "Iglesia del Test",
  welcomeTitle: "Informacion confiable en un solo lugar",
  welcomeText: "Home publica para Visitantes sin iniciar sesion.",
  donation: {
    alias: "test.iglesia",
    qrImageUrl: "/test-qr.svg",
    qrAltText: "QR de prueba para Donacion economica",
    instructions: "Usa el alias de prueba desde tu banco.",
    noPaymentProcessingNotice:
      "El sitio no procesa pagos: la Donacion economica se realiza fuera del sistema.",
    noReceiptStorageNotice:
      "El sitio no registra ni guarda comprobantes de pago en el MVP."
  },
  futureSections: [
    { title: "Eventos", description: "Actividades proximas." },
    { title: "Campanas", description: "Iniciativas y necesidades." },
    { title: "Noticias", description: "Comunicaciones aprobadas." },
    { title: "Predicaciones", description: "Mensajes con YouTube." }
  ],
  costNote: "Hosting gratuito y sin dominio propio requerido."
};

const authConfig: AuthConfig = {
  authorizedAccounts: [
    { email: "editora@example.com", role: "editor", active: true },
    { email: "admin@example.com", role: "admin", active: true }
  ]
};

function googleAuthClientReturning(email: string): GoogleAuthClient {
  return {
    async signIn() {
      return { email };
    }
  };
}

describe("public home", () => {
  it("lets a Visitante open the home page and see configured Donacion economica details", () => {
    render(<App content={content} />);

    expect(
      screen.getByRole("heading", { level: 1, name: content.churchName })
    ).toBeInTheDocument();
    expect(screen.getByText(content.welcomeTitle)).toBeInTheDocument();
    expect(screen.getByText(content.welcomeText)).toBeInTheDocument();
    expect(screen.getByText("Eventos")).toBeInTheDocument();
    expect(screen.getByText("Campanas")).toBeInTheDocument();
    expect(screen.getByText("Noticias")).toBeInTheDocument();
    expect(screen.getByText("Predicaciones")).toBeInTheDocument();

    const donation = screen.getByRole("region", {
      name: "Donacion economica"
    });

    expect(within(donation).getByText(content.donation.alias)).toBeInTheDocument();
    expect(within(donation).getByText(content.donation.instructions)).toBeInTheDocument();
    expect(
      within(donation).getByText(content.donation.noPaymentProcessingNotice)
    ).toBeInTheDocument();
    expect(
      within(donation).getByText(content.donation.noReceiptStorageNotice)
    ).toBeInTheDocument();
    expect(
      within(donation).getByRole("img", { name: content.donation.qrAltText })
    ).toHaveAttribute("src", content.donation.qrImageUrl);
    expect(screen.getByText(content.costNote)).toBeInTheDocument();
  });
});

describe("private panel authentication and roles", () => {
  it("lets an authorized Editor enter with Google and hides final approval capabilities", async () => {
    render(
      <App
        authConfig={authConfig}
        content={content}
        googleAuthClient={googleAuthClientReturning("editora@example.com")}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Entrar con Google" }));

    const panel = screen.getByRole("region", { name: "Panel privado" });

    expect(
      await within(panel).findByText(/Sesion activa: editora@example.com/)
    ).toBeInTheDocument();
    expect(within(panel).getByText("Rol: Editor")).toBeInTheDocument();
    expect(
      within(panel).getByRole("heading", {
        level: 3,
        name: "Mesa de preparacion editorial"
      })
    ).toBeInTheDocument();
    expect(
      within(panel).getByRole("button", { name: "Crear borrador" })
    ).toBeInTheDocument();
    expect(
      within(panel).queryByRole("button", { name: "Aprobar contenido" })
    ).not.toBeInTheDocument();
    expect(
      within(panel).queryByRole("button", { name: "Rechazar contenido" })
    ).not.toBeInTheDocument();
    expect(
      within(panel).queryByRole("button", { name: "Publicar contenido" })
    ).not.toBeInTheDocument();
    expect(
      within(panel).queryByRole("button", { name: "Archivar contenido" })
    ).not.toBeInTheDocument();
    expect(
      within(panel).getByText(
        "Los Editores no pueden aprobar, rechazar, publicar ni archivar contenido."
      )
    ).toBeInTheDocument();
  });

  it("lets an authorized Administrador enter with Google and shows final approval capabilities", async () => {
    render(
      <App
        authConfig={authConfig}
        content={content}
        googleAuthClient={googleAuthClientReturning("admin@example.com")}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Entrar con Google" }));

    const panel = screen.getByRole("region", { name: "Panel privado" });

    expect(
      await within(panel).findByText(/Sesion activa: admin@example.com/)
    ).toBeInTheDocument();
    expect(within(panel).getByText("Rol: Administrador")).toBeInTheDocument();
    expect(
      within(panel).getByRole("heading", {
        level: 3,
        name: "Mesa de aprobacion editorial"
      })
    ).toBeInTheDocument();
    expect(
      within(panel).getByRole("button", { name: "Aprobar contenido" })
    ).toBeInTheDocument();
    expect(
      within(panel).getByRole("button", { name: "Rechazar contenido" })
    ).toBeInTheDocument();
    expect(
      within(panel).getByRole("button", { name: "Publicar contenido" })
    ).toBeInTheDocument();
    expect(
      within(panel).getByRole("button", { name: "Archivar contenido" })
    ).toBeInTheDocument();
  });

  it("blocks an unauthorized Google account from the private panel with clear feedback", async () => {
    render(
      <App
        authConfig={authConfig}
        content={content}
        googleAuthClient={googleAuthClientReturning("visitante@example.com")}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Entrar con Google" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "La cuenta visitante@example.com no esta autorizada para entrar al panel privado."
    );
    expect(screen.queryByText(/Sesion activa:/)).not.toBeInTheDocument();
  });
});
