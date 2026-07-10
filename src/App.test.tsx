import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";
import type { SiteContent } from "./domain/siteContent";

describe("public home", () => {
  it("lets a Visitante open the home page and see configured Donacion economica details", () => {
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
