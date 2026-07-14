import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { App } from "./App";
import type { AuthConfig, GoogleAuthClient } from "./domain/auth";
import type {
  CampaignPublication,
  EventPublication,
  NewsPublication,
  SermonPublication,
  SocialEmbedPublication,
  SiteContent
} from "./domain/siteContent";

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
  campaigns: [],
  events: [],
  futureSections: [
    { title: "Eventos", description: "Actividades proximas." },
    { title: "Campanas", description: "Iniciativas y necesidades." },
    { title: "Noticias", description: "Comunicaciones aprobadas." },
    { title: "Predicaciones", description: "Mensajes con YouTube." }
  ],
  news: [],
  sermons: [],
  socialEmbeds: [],
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

function googleAuthClientReturningSequence(emails: string[]): GoogleAuthClient {
  let nextEmail = 0;

  return {
    async signIn() {
      const email = emails[Math.min(nextEmail, emails.length - 1)];
      nextEmail += 1;

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
    expect(
      screen.getByRole("heading", { level: 3, name: "Predicaciones" })
    ).toBeInTheDocument();

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

describe("public Contacto and Donacion de mercaderia forms", () => {
  it("lets a Visitante submit a Contacto request and receive success feedback", async () => {
    const publicEmailService = {
      send: vi.fn(async (_request: unknown) => {})
    };

    render(<App content={content} publicEmailService={publicEmailService} />);

    const contactForm = screen.getByRole("form", { name: "Contacto" });

    fireEvent.change(within(contactForm).getByLabelText("Nombre y apellido"), {
      target: { value: "Ana Visitante" }
    });
    fireEvent.change(within(contactForm).getByLabelText("Email o telefono"), {
      target: { value: "ana@example.com" }
    });
    fireEvent.change(within(contactForm).getByLabelText("Asunto"), {
      target: { value: "Consulta general" }
    });
    fireEvent.change(within(contactForm).getByLabelText("Mensaje"), {
      target: { value: "Quisiera conocer los horarios de reunion." }
    });
    fireEvent.click(within(contactForm).getByRole("button", { name: "Enviar contacto" }));

    expect(await within(contactForm).findByRole("status")).toHaveTextContent(
      "Tu mensaje fue enviado. La iglesia respondera por el contacto indicado."
    );
    expect(publicEmailService.send).toHaveBeenCalledWith({
      kind: "contact",
      name: "Ana Visitante",
      contact: "ana@example.com",
      subject: "Consulta general",
      message: "Quisiera conocer los horarios de reunion."
    });
  });

  it("lets a Visitante submit a Donacion de mercaderia request through the same public email service", async () => {
    const publicEmailService = {
      send: vi.fn(async (_request: unknown) => {})
    };

    render(<App content={content} publicEmailService={publicEmailService} />);

    const donationForm = screen.getByRole("form", {
      name: "Donacion de mercaderia"
    });

    fireEvent.change(within(donationForm).getByLabelText("Nombre y apellido"), {
      target: { value: "Carlos Donante" }
    });
    fireEvent.change(within(donationForm).getByLabelText("Email o telefono"), {
      target: { value: "555-0101" }
    });
    fireEvent.change(within(donationForm).getByLabelText("Descripcion de mercaderia"), {
      target: { value: "10 paquetes de arroz y 5 litros de aceite" }
    });
    fireEvent.change(within(donationForm).getByLabelText("Mensaje opcional"), {
      target: { value: "Puedo acercarlo el sabado por la tarde." }
    });
    fireEvent.click(
      within(donationForm).getByRole("button", {
        name: "Enviar donacion de mercaderia"
      })
    );

    expect(await within(donationForm).findByRole("status")).toHaveTextContent(
      "Tu ofrecimiento de mercaderia fue enviado. La iglesia respondera por el contacto indicado."
    );
    expect(publicEmailService.send).toHaveBeenCalledWith({
      kind: "goods_donation",
      name: "Carlos Donante",
      contact: "555-0101",
      goodsDescription: "10 paquetes de arroz y 5 litros de aceite",
      message: "Puedo acercarlo el sabado por la tarde."
    });
  });

  it("shows clear error feedback when the public email endpoint fails", async () => {
    const publicEmailService = {
      send: vi.fn(async (_request: unknown) => {
        throw new Error("Endpoint unavailable");
      })
    };

    render(<App content={content} publicEmailService={publicEmailService} />);

    const contactForm = screen.getByRole("form", { name: "Contacto" });

    fireEvent.change(within(contactForm).getByLabelText("Nombre y apellido"), {
      target: { value: "Ana Visitante" }
    });
    fireEvent.change(within(contactForm).getByLabelText("Email o telefono"), {
      target: { value: "ana@example.com" }
    });
    fireEvent.change(within(contactForm).getByLabelText("Asunto"), {
      target: { value: "Consulta general" }
    });
    fireEvent.change(within(contactForm).getByLabelText("Mensaje"), {
      target: { value: "Quisiera conocer los horarios de reunion." }
    });
    fireEvent.click(within(contactForm).getByRole("button", { name: "Enviar contacto" }));

    expect(await within(contactForm).findByRole("alert")).toHaveTextContent(
      "No pudimos enviar la solicitud. Intenta de nuevo o usa otro canal de contacto."
    );
    expect(
      within(contactForm).queryByText(
        "Tu mensaje fue enviado. La iglesia respondera por el contacto indicado."
      )
    ).not.toBeInTheDocument();
  });

  it("rejects likely bot submissions when the honeypot field is filled", async () => {
    const publicEmailService = {
      send: vi.fn(async (_request: unknown) => {})
    };

    render(<App content={content} publicEmailService={publicEmailService} />);

    const contactForm = screen.getByRole("form", { name: "Contacto" });
    const honeypot = contactForm.querySelector<HTMLInputElement>('input[name="website"]');

    fireEvent.change(within(contactForm).getByLabelText("Nombre y apellido"), {
      target: { value: "Bot Sospechoso" }
    });
    fireEvent.change(within(contactForm).getByLabelText("Email o telefono"), {
      target: { value: "bot@example.com" }
    });
    fireEvent.change(within(contactForm).getByLabelText("Asunto"), {
      target: { value: "Spam" }
    });
    fireEvent.change(within(contactForm).getByLabelText("Mensaje"), {
      target: { value: "Mensaje automatizado." }
    });
    fireEvent.change(honeypot!, {
      target: { value: "https://spam.example" }
    });
    fireEvent.click(within(contactForm).getByRole("button", { name: "Enviar contacto" }));

    expect(await within(contactForm).findByRole("alert")).toHaveTextContent(
      "No pudimos enviar la solicitud. Intenta de nuevo o usa otro canal de contacto."
    );
    expect(publicEmailService.send).not.toHaveBeenCalled();
  });

  it("does not expose or send recipient override fields from public forms", async () => {
    const publicEmailService = {
      send: vi.fn(async (_request: unknown) => {})
    };

    render(<App content={content} publicEmailService={publicEmailService} />);

    const publicForms = screen.getByRole("region", {
      name: "Contacto y Donacion de mercaderia"
    });
    expect(
      within(publicForms).queryByLabelText(/destinatario|receptor/i)
    ).not.toBeInTheDocument();

    const contactForm = screen.getByRole("form", { name: "Contacto" });

    fireEvent.change(within(contactForm).getByLabelText("Nombre y apellido"), {
      target: { value: "Ana Visitante" }
    });
    fireEvent.change(within(contactForm).getByLabelText("Email o telefono"), {
      target: { value: "ana@example.com" }
    });
    fireEvent.change(within(contactForm).getByLabelText("Asunto"), {
      target: { value: "to=externo@example.com" }
    });
    fireEvent.change(within(contactForm).getByLabelText("Mensaje"), {
      target: { value: "cc: externo@example.com\nPor favor responder." }
    });
    fireEvent.click(within(contactForm).getByRole("button", { name: "Enviar contacto" }));

    await within(contactForm).findByRole("status");
    const sentRequest = publicEmailService.send.mock.calls[0]![0] as Record<
      string,
      unknown
    >;

    expect(Object.keys(sentRequest).sort()).toEqual([
      "contact",
      "kind",
      "message",
      "name",
      "subject"
    ]);
    expect(sentRequest).not.toEqual(
      expect.objectContaining({ to: expect.anything() })
    );
    expect(sentRequest).not.toEqual(
      expect.objectContaining({ recipients: expect.anything() })
    );
    expect(sentRequest).not.toEqual(
      expect.objectContaining({ cc: expect.anything() })
    );
    expect(sentRequest).not.toEqual(
      expect.objectContaining({ bcc: expect.anything() })
    );
  });

  it("rate limits repeated public submissions deterministically", async () => {
    const publicEmailService = {
      send: vi.fn(async (_request: unknown) => {})
    };

    render(
      <App
        content={content}
        currentTime={() => 1_000}
        publicEmailService={publicEmailService}
      />
    );

    const contactForm = screen.getByRole("form", { name: "Contacto" });

    for (const suffix of ["uno", "dos"]) {
      fireEvent.change(within(contactForm).getByLabelText("Nombre y apellido"), {
        target: { value: `Visitante ${suffix}` }
      });
      fireEvent.change(within(contactForm).getByLabelText("Email o telefono"), {
        target: { value: `${suffix}@example.com` }
      });
      fireEvent.change(within(contactForm).getByLabelText("Asunto"), {
        target: { value: `Consulta ${suffix}` }
      });
      fireEvent.change(within(contactForm).getByLabelText("Mensaje"), {
        target: { value: `Mensaje ${suffix}.` }
      });
      fireEvent.click(within(contactForm).getByRole("button", { name: "Enviar contacto" }));

      await waitFor(() => {
        expect(publicEmailService.send).toHaveBeenCalledTimes(
          suffix === "uno" ? 1 : 2
        );
      });
    }

    fireEvent.change(within(contactForm).getByLabelText("Nombre y apellido"), {
      target: { value: "Visitante tres" }
    });
    fireEvent.change(within(contactForm).getByLabelText("Email o telefono"), {
      target: { value: "tres@example.com" }
    });
    fireEvent.change(within(contactForm).getByLabelText("Asunto"), {
      target: { value: "Consulta tres" }
    });
    fireEvent.change(within(contactForm).getByLabelText("Mensaje"), {
      target: { value: "Mensaje tres." }
    });
    fireEvent.click(within(contactForm).getByRole("button", { name: "Enviar contacto" }));

    expect(await within(contactForm).findByRole("alert")).toHaveTextContent(
      "Recibimos demasiados envios seguidos. Espera unos minutos antes de intentar otra vez."
    );
    expect(publicEmailService.send).toHaveBeenCalledTimes(2);
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

  it("uses the development Google prompt when no auth client is injected", async () => {
    vi.stubEnv("VITE_GOOGLE_CLIENT_ID", "");
    vi.stubEnv("VITE_DEV_GOOGLE_SIGN_IN_EMAIL", "");
    vi.spyOn(window, "prompt").mockReturnValue("editora@example.com");

    render(<App authConfig={authConfig} content={content} />);

    fireEvent.click(screen.getByRole("button", { name: "Entrar con Google" }));

    const panel = screen.getByRole("region", { name: "Panel privado" });

    expect(
      await within(panel).findByText(/Sesion activa: editora@example.com/)
    ).toBeInTheDocument();
    expect(within(panel).getByText("Rol: Editor")).toBeInTheDocument();
  });
});

describe("Evento editorial flow", () => {
  const now = new Date("2026-07-12T12:00:00");
  const events: EventPublication[] = [
    {
      id: "evento-1",
      title: "Conferencia de familias",
      description: "Una actividad abierta para fortalecer los hogares.",
      startsAt: "2026-07-20T18:00",
      location: "Salon principal",
      organizer: "Ministerio de Familias",
      flyerReference: "familias.png",
      status: "published"
    },
    {
      id: "evento-2",
      title: "Retiro pasado",
      description: "Un encuentro que ya finalizo.",
      startsAt: "2026-06-01T09:00",
      location: "Quinta Betania",
      organizer: "Equipo pastoral",
      status: "published"
    },
    {
      id: "evento-3",
      title: "Borrador oculto",
      description: "Todavia no fue enviado.",
      startsAt: "2026-07-22T19:00",
      location: "Aula 1",
      organizer: "Editor",
      status: "draft"
    },
    {
      id: "evento-4",
      title: "Pendiente oculto",
      description: "Espera aprobacion.",
      startsAt: "2026-07-23T19:00",
      location: "Aula 2",
      organizer: "Editor",
      status: "pending_review"
    },
    {
      id: "evento-5",
      title: "Rechazado oculto",
      description: "No debe publicarse.",
      startsAt: "2026-07-24T19:00",
      location: "Aula 3",
      organizer: "Editor",
      status: "rejected"
    }
  ];

  it("shows only published upcoming Eventos publicly and moves ended Eventos to the archive", () => {
    render(<App content={{ ...content, events }} now={now} />);

    const upcomingEvents = screen.getByRole("region", { name: "Eventos proximos" });
    const archivedEvents = screen.getByRole("region", { name: "Archivo de Eventos" });

    const upcomingCard = within(upcomingEvents).getByRole("article", {
      name: "Conferencia de familias"
    });
    expect(
      within(upcomingCard).getByText("Una actividad abierta para fortalecer los hogares.")
    ).toBeInTheDocument();
    expect(within(upcomingCard).getByText("Fecha y hora: 2026-07-20 18:00"))
      .toBeInTheDocument();
    expect(within(upcomingCard).getByText("Lugar: Salon principal")).toBeInTheDocument();
    expect(
      within(upcomingCard).getByText("Organiza: Ministerio de Familias")
    ).toBeInTheDocument();
    expect(within(upcomingCard).getByText("Flyer: familias.png")).toBeInTheDocument();

    expect(within(upcomingEvents).queryByText("Retiro pasado")).not.toBeInTheDocument();
    expect(within(upcomingEvents).queryByText("Borrador oculto")).not.toBeInTheDocument();
    expect(within(upcomingEvents).queryByText("Pendiente oculto")).not.toBeInTheDocument();
    expect(within(upcomingEvents).queryByText("Rechazado oculto")).not.toBeInTheDocument();

    expect(
      within(archivedEvents).getByRole("article", { name: "Retiro pasado" })
    ).toBeInTheDocument();
    expect(within(archivedEvents).queryByText("Conferencia de familias"))
      .not.toBeInTheDocument();
    expect(screen.queryByText(/inscripcion|cupo|asistencia/i)).not.toBeInTheDocument();
  });

  it("lets an Editor create and submit an Evento draft for review", async () => {
    render(
      <App
        authConfig={authConfig}
        content={content}
        googleAuthClient={googleAuthClientReturning("editora@example.com")}
        now={now}
      />
    );

    const publicEvents = screen.getByRole("region", { name: "Eventos proximos" });

    fireEvent.click(screen.getByRole("button", { name: "Entrar con Google" }));

    const panel = screen.getByRole("region", { name: "Panel privado" });

    expect(
      await within(panel).findByText(/Sesion activa: editora@example.com/)
    ).toBeInTheDocument();

    fireEvent.change(within(panel).getByLabelText("Titulo del evento"), {
      target: { value: "Noche de adoracion" }
    });
    fireEvent.change(within(panel).getByLabelText("Descripcion del evento"), {
      target: { value: "Una reunion abierta de alabanza y oracion." }
    });
    fireEvent.change(within(panel).getByLabelText("Fecha y hora de inicio"), {
      target: { value: "2026-07-21T20:00" }
    });
    fireEvent.change(within(panel).getByLabelText("Lugar"), {
      target: { value: "Templo principal" }
    });
    fireEvent.change(within(panel).getByLabelText("Organizador"), {
      target: { value: "Equipo de alabanza" }
    });
    fireEvent.change(within(panel).getByLabelText("Referencia de flyer (opcional)"), {
      target: { value: "adoracion.jpg" }
    });
    fireEvent.click(within(panel).getByRole("button", { name: "Crear borrador de evento" }));

    const eventCard = within(panel).getByRole("article", { name: "Noche de adoracion" });
    expect(within(eventCard).getByText("Borrador")).toBeInTheDocument();
    expect(within(eventCard).getByText("Fecha y hora: 2026-07-21 20:00"))
      .toBeInTheDocument();
    expect(within(eventCard).getByText("Lugar: Templo principal")).toBeInTheDocument();
    expect(within(eventCard).getByText("Organiza: Equipo de alabanza"))
      .toBeInTheDocument();
    expect(within(eventCard).getByText("Flyer: adoracion.jpg")).toBeInTheDocument();
    expect(within(publicEvents).queryByText("Noche de adoracion")).not.toBeInTheDocument();

    fireEvent.click(within(eventCard).getByRole("button", { name: "Enviar evento a revision" }));

    expect(within(eventCard).getByText("Pendiente de revision")).toBeInTheDocument();
    expect(within(panel).queryByRole("button", { name: "Aprobar evento" }))
      .not.toBeInTheDocument();
    expect(within(panel).queryByRole("button", { name: "Rechazar evento" }))
      .not.toBeInTheDocument();
    expect(within(publicEvents).queryByText("Noche de adoracion")).not.toBeInTheDocument();
  });

  it("lets an Administrador approve or reject pending Eventos and controls public visibility", async () => {
    render(
      <App
        authConfig={authConfig}
        content={content}
        googleAuthClient={googleAuthClientReturningSequence([
          "editora@example.com",
          "admin@example.com"
        ])}
        now={now}
      />
    );

    const publicEvents = screen.getByRole("region", { name: "Eventos proximos" });

    fireEvent.click(screen.getByRole("button", { name: "Entrar con Google" }));

    const panel = screen.getByRole("region", { name: "Panel privado" });

    expect(
      await within(panel).findByText(/Sesion activa: editora@example.com/)
    ).toBeInTheDocument();

    fireEvent.change(within(panel).getByLabelText("Titulo del evento"), {
      target: { value: "Conferencia evangelistica" }
    });
    fireEvent.change(within(panel).getByLabelText("Descripcion del evento"), {
      target: { value: "Encuentro abierto para la comunidad." }
    });
    fireEvent.change(within(panel).getByLabelText("Fecha y hora de inicio"), {
      target: { value: "2026-07-25T19:00" }
    });
    fireEvent.change(within(panel).getByLabelText("Lugar"), {
      target: { value: "Plaza central" }
    });
    fireEvent.change(within(panel).getByLabelText("Organizador"), {
      target: { value: "Evangelismo" }
    });
    fireEvent.click(within(panel).getByRole("button", { name: "Crear borrador de evento" }));
    fireEvent.click(within(panel).getByRole("button", { name: "Enviar evento a revision" }));

    fireEvent.change(within(panel).getByLabelText("Titulo del evento"), {
      target: { value: "Evento interno" }
    });
    fireEvent.change(within(panel).getByLabelText("Descripcion del evento"), {
      target: { value: "No debe quedar publico." }
    });
    fireEvent.change(within(panel).getByLabelText("Fecha y hora de inicio"), {
      target: { value: "2026-07-26T19:00" }
    });
    fireEvent.change(within(panel).getByLabelText("Lugar"), {
      target: { value: "Oficina" }
    });
    fireEvent.change(within(panel).getByLabelText("Organizador"), {
      target: { value: "Administracion" }
    });
    fireEvent.click(within(panel).getByRole("button", { name: "Crear borrador de evento" }));
    fireEvent.click(within(panel).getByRole("button", { name: "Enviar evento a revision" }));

    expect(within(publicEvents).queryByText("Conferencia evangelistica"))
      .not.toBeInTheDocument();
    expect(within(publicEvents).queryByText("Evento interno")).not.toBeInTheDocument();

    fireEvent.click(within(panel).getByRole("button", { name: "Cerrar sesion" }));
    fireEvent.click(screen.getByRole("button", { name: "Entrar con Google" }));

    expect(
      await within(panel).findByText(/Sesion activa: admin@example.com/)
    ).toBeInTheDocument();

    const approvedCard = within(panel).getByRole("article", {
      name: "Conferencia evangelistica"
    });
    fireEvent.click(within(approvedCard).getByRole("button", { name: "Aprobar evento" }));

    const rejectedCard = within(panel).getByRole("article", { name: "Evento interno" });
    fireEvent.click(within(rejectedCard).getByRole("button", { name: "Rechazar evento" }));

    expect(within(approvedCard).getByText("Publicado")).toBeInTheDocument();
    expect(within(rejectedCard).getByText("Rechazado")).toBeInTheDocument();
    expect(within(publicEvents).getByText("Conferencia evangelistica")).toBeInTheDocument();
    expect(within(publicEvents).queryByText("Evento interno")).not.toBeInTheDocument();
  });
});

describe("Campana editorial flow", () => {
  const campaigns: CampaignPublication[] = [
    {
      id: "campana-1",
      title: "Canasta solidaria",
      description: "Reunimos alimentos para familias del barrio.",
      imageReference: "canasta.jpg",
      videoUrl: "https://youtube.com/watch?v=campana",
      callToActionText: "Acercate a colaborar con alimentos no perecederos.",
      status: "published"
    },
    {
      id: "campana-2",
      title: "Borrador de campana",
      description: "Todavia no fue enviada.",
      imageReference: "borrador.jpg",
      callToActionText: "No visible.",
      status: "draft"
    },
    {
      id: "campana-3",
      title: "Campana pendiente",
      description: "Espera aprobacion.",
      imageReference: "pendiente.jpg",
      callToActionText: "No visible.",
      status: "pending_review"
    },
    {
      id: "campana-4",
      title: "Campana rechazada",
      description: "No debe publicarse.",
      imageReference: "rechazada.jpg",
      callToActionText: "No visible.",
      status: "rejected"
    }
  ];

  it("shows only published Campanas publicly with visual reference and call to action", () => {
    render(<App content={{ ...content, campaigns }} />);

    const publicCampaigns = screen.getByRole("region", {
      name: "Campanas publicadas"
    });
    const campaignCard = within(publicCampaigns).getByRole("article", {
      name: "Canasta solidaria"
    });

    expect(
      within(campaignCard).getByText("Reunimos alimentos para familias del barrio.")
    ).toBeInTheDocument();
    expect(within(campaignCard).getByText("Imagen: canasta.jpg")).toBeInTheDocument();
    expect(
      within(campaignCard).getByText("Video: https://youtube.com/watch?v=campana")
    ).toBeInTheDocument();
    expect(
      within(campaignCard).getByText("Acercate a colaborar con alimentos no perecederos.")
    ).toBeInTheDocument();
    expect(
      within(campaignCard).getByText(
        /no procesa pagos, registra comprobantes ni vincula aportes automaticamente/i
      )
    ).toBeInTheDocument();
    expect(
      within(campaignCard).queryByRole("button", { name: /pagar|comprobante/i })
    ).not.toBeInTheDocument();
    expect(within(publicCampaigns).queryByText("Borrador de campana"))
      .not.toBeInTheDocument();
    expect(within(publicCampaigns).queryByText("Campana pendiente"))
      .not.toBeInTheDocument();
    expect(within(publicCampaigns).queryByText("Campana rechazada"))
      .not.toBeInTheDocument();
  });

  it("lets an Editor create and submit a Campana draft for review", async () => {
    render(
      <App
        authConfig={authConfig}
        content={content}
        googleAuthClient={googleAuthClientReturning("editora@example.com")}
      />
    );

    const publicCampaigns = screen.getByRole("region", {
      name: "Campanas publicadas"
    });

    fireEvent.click(screen.getByRole("button", { name: "Entrar con Google" }));

    const panel = screen.getByRole("region", { name: "Panel privado" });

    expect(
      await within(panel).findByText(/Sesion activa: editora@example.com/)
    ).toBeInTheDocument();

    fireEvent.change(within(panel).getByLabelText("Titulo de la campana"), {
      target: { value: "Abrigo de invierno" }
    });
    fireEvent.change(within(panel).getByLabelText("Descripcion de la campana"), {
      target: { value: "Recolectamos abrigos para entregar antes del frio." }
    });
    fireEvent.change(within(panel).getByLabelText("Referencia de flyer o imagen"), {
      target: { value: "abrigo.jpg" }
    });
    fireEvent.change(within(panel).getByLabelText("URL de video (opcional)"), {
      target: { value: "https://youtube.com/watch?v=abrigo" }
    });
    fireEvent.change(within(panel).getByLabelText("Texto de llamada a la accion"), {
      target: { value: "Trae un abrigo limpio al templo esta semana." }
    });
    fireEvent.click(
      within(panel).getByRole("button", { name: "Crear borrador de campana" })
    );

    const campaignCard = within(panel).getByRole("article", {
      name: "Abrigo de invierno"
    });
    expect(within(campaignCard).getByText("Borrador")).toBeInTheDocument();
    expect(within(campaignCard).getByText("Imagen: abrigo.jpg")).toBeInTheDocument();
    expect(
      within(campaignCard).getByText("Video: https://youtube.com/watch?v=abrigo")
    ).toBeInTheDocument();
    expect(
      within(campaignCard).getByText("Trae un abrigo limpio al templo esta semana.")
    ).toBeInTheDocument();
    expect(within(publicCampaigns).queryByText("Abrigo de invierno"))
      .not.toBeInTheDocument();

    fireEvent.click(
      within(campaignCard).getByRole("button", { name: "Enviar campana a revision" })
    );

    expect(within(campaignCard).getByText("Pendiente de revision")).toBeInTheDocument();
    expect(within(panel).queryByRole("button", { name: "Aprobar campana" }))
      .not.toBeInTheDocument();
    expect(within(panel).queryByRole("button", { name: "Rechazar campana" }))
      .not.toBeInTheDocument();
    expect(within(publicCampaigns).queryByText("Abrigo de invierno"))
      .not.toBeInTheDocument();
  });

  it("lets an Administrador approve or reject pending Campanas and controls public visibility", async () => {
    render(
      <App
        authConfig={authConfig}
        content={content}
        googleAuthClient={googleAuthClientReturningSequence([
          "editora@example.com",
          "admin@example.com"
        ])}
      />
    );

    const publicCampaigns = screen.getByRole("region", {
      name: "Campanas publicadas"
    });

    fireEvent.click(screen.getByRole("button", { name: "Entrar con Google" }));

    const panel = screen.getByRole("region", { name: "Panel privado" });

    expect(
      await within(panel).findByText(/Sesion activa: editora@example.com/)
    ).toBeInTheDocument();

    fireEvent.change(within(panel).getByLabelText("Titulo de la campana"), {
      target: { value: "Biblias para jovenes" }
    });
    fireEvent.change(within(panel).getByLabelText("Descripcion de la campana"), {
      target: { value: "Queremos entregar Biblias de estudio al grupo de jovenes." }
    });
    fireEvent.change(within(panel).getByLabelText("Referencia de flyer o imagen"), {
      target: { value: "biblias.jpg" }
    });
    fireEvent.change(within(panel).getByLabelText("Texto de llamada a la accion"), {
      target: { value: "Habla con el equipo pastoral para colaborar." }
    });
    fireEvent.click(
      within(panel).getByRole("button", { name: "Crear borrador de campana" })
    );
    const approvedDraft = within(panel).getByRole("article", {
      name: "Biblias para jovenes"
    });
    fireEvent.click(
      within(approvedDraft).getByRole("button", { name: "Enviar campana a revision" })
    );

    fireEvent.change(within(panel).getByLabelText("Titulo de la campana"), {
      target: { value: "Campana interna" }
    });
    fireEvent.change(within(panel).getByLabelText("Descripcion de la campana"), {
      target: { value: "No debe quedar publica." }
    });
    fireEvent.change(within(panel).getByLabelText("Referencia de flyer o imagen"), {
      target: { value: "interna.jpg" }
    });
    fireEvent.change(within(panel).getByLabelText("Texto de llamada a la accion"), {
      target: { value: "No publicar." }
    });
    fireEvent.click(
      within(panel).getByRole("button", { name: "Crear borrador de campana" })
    );
    const rejectedDraft = within(panel).getByRole("article", {
      name: "Campana interna"
    });
    fireEvent.click(
      within(rejectedDraft).getByRole("button", { name: "Enviar campana a revision" })
    );

    expect(within(publicCampaigns).queryByText("Biblias para jovenes"))
      .not.toBeInTheDocument();
    expect(within(publicCampaigns).queryByText("Campana interna"))
      .not.toBeInTheDocument();

    fireEvent.click(within(panel).getByRole("button", { name: "Cerrar sesion" }));
    fireEvent.click(screen.getByRole("button", { name: "Entrar con Google" }));

    expect(
      await within(panel).findByText(/Sesion activa: admin@example.com/)
    ).toBeInTheDocument();

    const approvedCard = within(panel).getByRole("article", {
      name: "Biblias para jovenes"
    });
    fireEvent.click(within(approvedCard).getByRole("button", { name: "Aprobar campana" }));

    const rejectedCard = within(panel).getByRole("article", { name: "Campana interna" });
    fireEvent.click(within(rejectedCard).getByRole("button", { name: "Rechazar campana" }));

    expect(within(approvedCard).getByText("Publicado")).toBeInTheDocument();
    expect(within(rejectedCard).getByText("Rechazado")).toBeInTheDocument();
    expect(within(publicCampaigns).getByText("Biblias para jovenes")).toBeInTheDocument();
    expect(within(publicCampaigns).queryByText("Campana interna"))
      .not.toBeInTheDocument();
  });
});

describe("Predicacion editorial flow", () => {
  const sermons: SermonPublication[] = [
    {
      id: "predicacion-1",
      title: "La fe que sirve",
      youtubeUrl: "https://www.youtube.com/watch?v=abc123XYZ09",
      preacher: "Pastora Ana",
      sermonDate: "2026-07-05",
      series: "Fe practica",
      description: "Una predicacion sobre servir a otros.",
      status: "published"
    },
    {
      id: "predicacion-2",
      title: "Borrador de predicacion",
      youtubeUrl: "https://www.youtube.com/watch?v=bbb123XYZ09",
      preacher: "Editor",
      sermonDate: "2026-07-06",
      series: "No visible",
      status: "draft"
    },
    {
      id: "predicacion-3",
      title: "Predicacion pendiente",
      youtubeUrl: "https://www.youtube.com/watch?v=ccc123XYZ09",
      preacher: "Editor",
      sermonDate: "2026-07-07",
      series: "No visible",
      status: "pending_review"
    },
    {
      id: "predicacion-4",
      title: "Predicacion rechazada",
      youtubeUrl: "https://www.youtube.com/watch?v=ddd123XYZ09",
      preacher: "Editor",
      sermonDate: "2026-07-08",
      series: "No visible",
      status: "rejected"
    }
  ];

  it("shows only published Predicaciones publicly with a YouTube embed", () => {
    render(<App content={{ ...content, sermons }} />);

    const publicSermons = screen.getByRole("region", {
      name: "Predicaciones publicadas"
    });
    const sermonCard = within(publicSermons).getByRole("article", {
      name: "La fe que sirve"
    });

    expect(
      within(sermonCard).getByTitle("Video de predicacion: La fe que sirve")
    ).toHaveAttribute("src", "https://www.youtube-nocookie.com/embed/abc123XYZ09");
    expect(within(sermonCard).getByText("Predicador: Pastora Ana")).toBeInTheDocument();
    expect(within(sermonCard).getByText("Fecha: 2026-07-05")).toBeInTheDocument();
    expect(within(sermonCard).getByText("Serie: Fe practica")).toBeInTheDocument();
    expect(
      within(sermonCard).getByText("Una predicacion sobre servir a otros.")
    ).toBeInTheDocument();
    expect(within(publicSermons).queryByText("Borrador de predicacion"))
      .not.toBeInTheDocument();
    expect(within(publicSermons).queryByText("Predicacion pendiente"))
      .not.toBeInTheDocument();
    expect(within(publicSermons).queryByText("Predicacion rechazada"))
      .not.toBeInTheDocument();
  });

  it("lets an Editor create and submit a Predicacion draft for review", async () => {
    render(
      <App
        authConfig={authConfig}
        content={content}
        googleAuthClient={googleAuthClientReturning("editora@example.com")}
      />
    );

    const publicSermons = screen.getByRole("region", {
      name: "Predicaciones publicadas"
    });

    fireEvent.click(screen.getByRole("button", { name: "Entrar con Google" }));

    const panel = screen.getByRole("region", { name: "Panel privado" });

    expect(
      await within(panel).findByText(/Sesion activa: editora@example.com/)
    ).toBeInTheDocument();
    expect(panel.querySelector('input[type="file"]')).toBeNull();

    fireEvent.change(within(panel).getByLabelText("Titulo de la predicacion"), {
      target: { value: "Cristo en el centro" }
    });
    fireEvent.change(within(panel).getByLabelText("URL de YouTube"), {
      target: { value: "https://youtu.be/def456UVW12" }
    });
    fireEvent.change(within(panel).getByLabelText("Predicador"), {
      target: { value: "Pastor Luis" }
    });
    fireEvent.change(within(panel).getByLabelText("Fecha de la predicacion"), {
      target: { value: "2026-07-12" }
    });
    fireEvent.change(within(panel).getByLabelText("Serie"), {
      target: { value: "Evangelio" }
    });
    fireEvent.change(within(panel).getByLabelText("Descripcion (opcional)"), {
      target: { value: "Mensaje dominical desde YouTube." }
    });
    fireEvent.click(
      within(panel).getByRole("button", { name: "Crear borrador de predicacion" })
    );

    const sermonCard = within(panel).getByRole("article", {
      name: "Cristo en el centro"
    });
    expect(within(sermonCard).getByText("Borrador")).toBeInTheDocument();
    expect(
      within(sermonCard).getByText("YouTube: https://youtu.be/def456UVW12")
    ).toBeInTheDocument();
    expect(within(sermonCard).getByText("Predicador: Pastor Luis")).toBeInTheDocument();
    expect(within(sermonCard).getByText("Fecha: 2026-07-12")).toBeInTheDocument();
    expect(within(sermonCard).getByText("Serie: Evangelio")).toBeInTheDocument();
    expect(within(publicSermons).queryByText("Cristo en el centro"))
      .not.toBeInTheDocument();

    fireEvent.click(
      within(sermonCard).getByRole("button", {
        name: "Enviar al administrador para aprobar"
      })
    );

    expect(within(sermonCard).getByText("Pendiente de revision")).toBeInTheDocument();
    expect(within(panel).queryByRole("button", { name: "Aprobar predicacion" }))
      .not.toBeInTheDocument();
    expect(within(panel).queryByRole("button", { name: "Rechazar predicacion" }))
      .not.toBeInTheDocument();
    expect(within(publicSermons).queryByText("Cristo en el centro"))
      .not.toBeInTheDocument();
  });

  it("lets an Editor create a Predicacion draft from a YouTube Live URL", async () => {
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

    fireEvent.change(within(panel).getByLabelText("Titulo de la predicacion"), {
      target: { value: "Culto en vivo" }
    });
    fireEvent.change(within(panel).getByLabelText("URL de YouTube"), {
      target: { value: "https://www.youtube.com/live/live789RST0?feature=shared" }
    });
    fireEvent.change(within(panel).getByLabelText("Predicador"), {
      target: { value: "Pastor Mateo" }
    });
    fireEvent.change(within(panel).getByLabelText("Fecha de la predicacion"), {
      target: { value: "2026-07-19" }
    });
    fireEvent.change(within(panel).getByLabelText("Serie"), {
      target: { value: "Cultos" }
    });
    fireEvent.click(
      within(panel).getByRole("button", { name: "Crear borrador de predicacion" })
    );

    const sermonCard = within(panel).getByRole("article", { name: "Culto en vivo" });

    expect(within(sermonCard).getByText("Borrador")).toBeInTheDocument();
    expect(
      within(sermonCard).getByText(
        "YouTube: https://www.youtube.com/live/live789RST0?feature=shared"
      )
    ).toBeInTheDocument();
  });

  it("lets an Administrador approve or reject pending Predicaciones and controls public visibility", async () => {
    render(
      <App
        authConfig={authConfig}
        content={content}
        googleAuthClient={googleAuthClientReturningSequence([
          "editora@example.com",
          "admin@example.com"
        ])}
      />
    );

    const publicSermons = screen.getByRole("region", {
      name: "Predicaciones publicadas"
    });

    fireEvent.click(screen.getByRole("button", { name: "Entrar con Google" }));

    const panel = screen.getByRole("region", { name: "Panel privado" });

    expect(
      await within(panel).findByText(/Sesion activa: editora@example.com/)
    ).toBeInTheDocument();

    fireEvent.change(within(panel).getByLabelText("Titulo de la predicacion"), {
      target: { value: "Gracia para hoy" }
    });
    fireEvent.change(within(panel).getByLabelText("URL de YouTube"), {
      target: { value: "https://www.youtube.com/watch?v=ghi789RST34" }
    });
    fireEvent.change(within(panel).getByLabelText("Predicador"), {
      target: { value: "Pastora Ana" }
    });
    fireEvent.change(within(panel).getByLabelText("Fecha de la predicacion"), {
      target: { value: "2026-07-13" }
    });
    fireEvent.change(within(panel).getByLabelText("Serie"), {
      target: { value: "Gracia" }
    });
    fireEvent.click(
      within(panel).getByRole("button", { name: "Crear borrador de predicacion" })
    );
    const approvedDraft = within(panel).getByRole("article", { name: "Gracia para hoy" });
    fireEvent.click(
      within(approvedDraft).getByRole("button", {
        name: "Enviar al administrador para aprobar"
      })
    );

    fireEvent.change(within(panel).getByLabelText("Titulo de la predicacion"), {
      target: { value: "Predicacion interna" }
    });
    fireEvent.change(within(panel).getByLabelText("URL de YouTube"), {
      target: { value: "https://www.youtube.com/watch?v=jkl012MNO56" }
    });
    fireEvent.change(within(panel).getByLabelText("Predicador"), {
      target: { value: "Editor" }
    });
    fireEvent.change(within(panel).getByLabelText("Fecha de la predicacion"), {
      target: { value: "2026-07-14" }
    });
    fireEvent.change(within(panel).getByLabelText("Serie"), {
      target: { value: "Interna" }
    });
    fireEvent.click(
      within(panel).getByRole("button", { name: "Crear borrador de predicacion" })
    );
    const rejectedDraft = within(panel).getByRole("article", {
      name: "Predicacion interna"
    });
    fireEvent.click(
      within(rejectedDraft).getByRole("button", {
        name: "Enviar al administrador para aprobar"
      })
    );

    expect(within(publicSermons).queryByText("Gracia para hoy")).not.toBeInTheDocument();
    expect(within(publicSermons).queryByText("Predicacion interna"))
      .not.toBeInTheDocument();

    fireEvent.click(within(panel).getByRole("button", { name: "Cerrar sesion" }));
    fireEvent.click(screen.getByRole("button", { name: "Entrar con Google" }));

    expect(
      await within(panel).findByText(/Sesion activa: admin@example.com/)
    ).toBeInTheDocument();

    const approvedCard = within(panel).getByRole("article", { name: "Gracia para hoy" });
    fireEvent.click(
      within(approvedCard).getByRole("button", { name: "Aprobar predicacion" })
    );

    const rejectedCard = within(panel).getByRole("article", {
      name: "Predicacion interna"
    });
    fireEvent.click(
      within(rejectedCard).getByRole("button", { name: "Rechazar predicacion" })
    );

    expect(within(approvedCard).getByText("Publicado")).toBeInTheDocument();
    expect(within(rejectedCard).getByText("Rechazado")).toBeInTheDocument();
    expect(within(publicSermons).getByText("Gracia para hoy")).toBeInTheDocument();
    expect(
      within(publicSermons).getByTitle("Video de predicacion: Gracia para hoy")
    ).toHaveAttribute("src", "https://www.youtube-nocookie.com/embed/ghi789RST34");
    expect(within(publicSermons).queryByText("Predicacion interna"))
      .not.toBeInTheDocument();
  });
});

describe("SocialEmbed editorial flow", () => {
  const socialEmbeds: SocialEmbedPublication[] = [
    {
      id: "social-1",
      title: "YouTube visible",
      platform: "youtube",
      embedReference: "https://www.youtube.com/watch?v=abc123XYZ09",
      visibilityIntent: "visible",
      displayOrder: 2,
      status: "published"
    },
    {
      id: "social-2",
      title: "Facebook visible",
      platform: "facebook",
      embedReference: "https://www.facebook.com/iglesia/posts/123",
      visibilityIntent: "visible",
      displayOrder: 1,
      status: "published"
    },
    {
      id: "social-3",
      title: "Instagram pendiente",
      platform: "instagram",
      embedReference: "https://www.instagram.com/p/pendiente/",
      visibilityIntent: "visible",
      displayOrder: 3,
      status: "pending_review"
    },
    {
      id: "social-4",
      title: "YouTube oculto",
      platform: "youtube",
      embedReference: "https://www.youtube.com/watch?v=def456UVW12",
      visibilityIntent: "hidden",
      displayOrder: 4,
      status: "published"
    },
    {
      id: "social-5",
      title: "Facebook rechazada",
      platform: "facebook",
      embedReference: "https://www.facebook.com/iglesia/posts/rechazada",
      visibilityIntent: "visible",
      displayOrder: 5,
      status: "rejected"
    }
  ];

  it("shows only approved visible SocialEmbeds publicly in display order", () => {
    render(<App content={{ ...content, socialEmbeds }} />);

    const publicSocialEmbeds = screen.getByRole("region", {
      name: "Embeds sociales publicados"
    });
    const publicCards = within(publicSocialEmbeds).getAllByRole("article");

    expect(
      publicCards.map(
        (card) => within(card).getByRole("heading", { level: 3 }).textContent
      )
    ).toEqual(["Facebook visible", "YouTube visible"]);
    expect(
      within(publicSocialEmbeds).getByRole("link", { name: "Abrir contenido manual" })
    ).toHaveAttribute("href", "https://www.facebook.com/iglesia/posts/123");
    expect(within(publicSocialEmbeds).getByTitle("Embed social: YouTube visible"))
      .toHaveAttribute("src", "https://www.youtube-nocookie.com/embed/abc123XYZ09");
    expect(
      within(publicSocialEmbeds).getAllByText(
        "Contenido agregado manualmente; sin publicacion automatica ni Meta APIs."
      )
    ).toHaveLength(2);
    expect(within(publicSocialEmbeds).queryByText("Instagram pendiente"))
      .not.toBeInTheDocument();
    expect(within(publicSocialEmbeds).queryByText("YouTube oculto"))
      .not.toBeInTheDocument();
    expect(within(publicSocialEmbeds).queryByText("Facebook rechazada"))
      .not.toBeInTheDocument();
  });

  it("lets an Editor submit manual SocialEmbeds and an Administrador approve or reject them", async () => {
    render(
      <App
        authConfig={authConfig}
        content={content}
        googleAuthClient={googleAuthClientReturningSequence([
          "editora@example.com",
          "admin@example.com"
        ])}
      />
    );

    const publicSocialEmbeds = screen.getByRole("region", {
      name: "Embeds sociales publicados"
    });

    fireEvent.click(screen.getByRole("button", { name: "Entrar con Google" }));

    const panel = screen.getByRole("region", { name: "Panel privado" });

    expect(
      await within(panel).findByText(/Sesion activa: editora@example.com/)
    ).toBeInTheDocument();

    fireEvent.change(within(panel).getByLabelText("Titulo del embed social"), {
      target: { value: "Culto en vivo" }
    });
    fireEvent.change(within(panel).getByLabelText("Plataforma"), {
      target: { value: "youtube" }
    });
    fireEvent.change(within(panel).getByLabelText("URL o referencia de embed"), {
      target: { value: "https://www.youtube.com/watch?v=ghi789RST34" }
    });
    fireEvent.change(within(panel).getByLabelText("Intencion de visibilidad"), {
      target: { value: "visible" }
    });
    fireEvent.change(within(panel).getByLabelText("Orden de aparicion"), {
      target: { value: "1" }
    });
    fireEvent.click(
      within(panel).getByRole("button", { name: "Crear borrador de embed social" })
    );
    const approvedDraft = within(panel).getByRole("article", { name: "Culto en vivo" });
    fireEvent.click(
      within(approvedDraft).getByRole("button", {
        name: "Enviar embed social a revision"
      })
    );

    fireEvent.change(within(panel).getByLabelText("Titulo del embed social"), {
      target: { value: "Historia de Instagram" }
    });
    fireEvent.change(within(panel).getByLabelText("Plataforma"), {
      target: { value: "instagram" }
    });
    fireEvent.change(within(panel).getByLabelText("URL o referencia de embed"), {
      target: { value: "https://www.instagram.com/p/rechazada/" }
    });
    fireEvent.change(within(panel).getByLabelText("Orden de aparicion"), {
      target: { value: "2" }
    });
    fireEvent.click(
      within(panel).getByRole("button", { name: "Crear borrador de embed social" })
    );
    const rejectedDraft = within(panel).getByRole("article", {
      name: "Historia de Instagram"
    });
    fireEvent.click(
      within(rejectedDraft).getByRole("button", {
        name: "Enviar embed social a revision"
      })
    );

    expect(within(publicSocialEmbeds).queryByText("Culto en vivo"))
      .not.toBeInTheDocument();
    expect(within(publicSocialEmbeds).queryByText("Historia de Instagram"))
      .not.toBeInTheDocument();

    fireEvent.click(within(panel).getByRole("button", { name: "Cerrar sesion" }));
    fireEvent.click(screen.getByRole("button", { name: "Entrar con Google" }));

    expect(
      await within(panel).findByText(/Sesion activa: admin@example.com/)
    ).toBeInTheDocument();

    const approvedCard = within(panel).getByRole("article", { name: "Culto en vivo" });
    fireEvent.click(
      within(approvedCard).getByRole("button", { name: "Aprobar embed social" })
    );

    const rejectedCard = within(panel).getByRole("article", {
      name: "Historia de Instagram"
    });
    fireEvent.click(
      within(rejectedCard).getByRole("button", { name: "Rechazar embed social" })
    );

    expect(within(approvedCard).getByText("Publicado")).toBeInTheDocument();
    expect(within(rejectedCard).getByText("Rechazado")).toBeInTheDocument();
    expect(within(publicSocialEmbeds).getByText("Culto en vivo")).toBeInTheDocument();
    expect(within(publicSocialEmbeds).getByTitle("Embed social: Culto en vivo"))
      .toHaveAttribute("src", "https://www.youtube-nocookie.com/embed/ghi789RST34");
    expect(within(publicSocialEmbeds).queryByText("Historia de Instagram"))
      .not.toBeInTheDocument();
  });
});

describe("Noticia revision pendiente", () => {
  const publishedNews: NewsPublication[] = [
    {
      id: "noticia-1",
      title: "Culto de domingo",
      summary: "Resumen original del culto.",
      body: "Cuerpo original del culto de domingo.",
      imageReference: "culto.jpg",
      status: "published"
    }
  ];

  const contentWithPublishedNews: SiteContent = {
    ...content,
    news: publishedNews
  };

  it("lets an Editor propose changes to a Published Noticia creating a Revision pendiente", async () => {
    render(
      <App
        authConfig={authConfig}
        content={contentWithPublishedNews}
        googleAuthClient={googleAuthClientReturning("editora@example.com")}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Entrar con Google" }));

    const panel = screen.getByRole("region", { name: "Panel privado" });

    expect(
      await within(panel).findByText(/Sesion activa: editora@example.com/)
    ).toBeInTheDocument();

    const publishedCard = within(panel).getByRole("article", {
      name: "Culto de domingo"
    });

    fireEvent.click(within(publishedCard).getByRole("button", { name: "Editar publicado" }));

    fireEvent.change(within(panel).getByLabelText("Titulo de la noticia"), {
      target: { value: "Culto de domingo actualizado" }
    });
    fireEvent.change(within(panel).getByLabelText("Resumen"), {
      target: { value: "Resumen actualizado del culto." }
    });
    fireEvent.change(within(panel).getByLabelText("Cuerpo"), {
      target: { value: "Cuerpo actualizado del culto de domingo." }
    });
    fireEvent.click(within(panel).getByRole("button", { name: "Proponer cambios" }));

    expect(within(panel).getByText("Pendiente de revision")).toBeInTheDocument();
    expect(within(panel).getByText("Culto de domingo actualizado")).toBeInTheDocument();
  });

  it("keeps the public site showing the previous Version publicada while Revision pendiente is waiting", async () => {
    render(
      <App
        authConfig={authConfig}
        content={contentWithPublishedNews}
        googleAuthClient={googleAuthClientReturning("editora@example.com")}
      />
    );

    const publicNews = screen.getByRole("region", { name: "Noticias publicadas" });

    expect(within(publicNews).getByText("Culto de domingo")).toBeInTheDocument();
    expect(within(publicNews).queryByText("Resumen actualizado del culto.")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Entrar con Google" }));

    const panel = screen.getByRole("region", { name: "Panel privado" });

    expect(
      await within(panel).findByText(/Sesion activa: editora@example.com/)
    ).toBeInTheDocument();

    const publishedCard = within(panel).getByRole("article", {
      name: "Culto de domingo"
    });

    fireEvent.click(within(publishedCard).getByRole("button", { name: "Editar publicado" }));

    fireEvent.change(within(panel).getByLabelText("Titulo de la noticia"), {
      target: { value: "Culto de domingo actualizado" }
    });
    fireEvent.change(within(panel).getByLabelText("Resumen"), {
      target: { value: "Resumen actualizado del culto." }
    });
    fireEvent.change(within(panel).getByLabelText("Cuerpo"), {
      target: { value: "Cuerpo actualizado del culto de domingo." }
    });
    fireEvent.click(within(panel).getByRole("button", { name: "Proponer cambios" }));

    expect(within(publicNews).getByText("Culto de domingo")).toBeInTheDocument();
    expect(within(publicNews).queryByText("Culto de domingo actualizado")).not.toBeInTheDocument();
    expect(within(publicNews).queryByText("Resumen actualizado del culto.")).not.toBeInTheDocument();
  });

  it("prevents multiple concurrent Revision pendiente entries for the same Noticia", async () => {
    render(
      <App
        authConfig={authConfig}
        content={contentWithPublishedNews}
        googleAuthClient={googleAuthClientReturning("editora@example.com")}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Entrar con Google" }));

    const panel = screen.getByRole("region", { name: "Panel privado" });

    expect(
      await within(panel).findByText(/Sesion activa: editora@example.com/)
    ).toBeInTheDocument();

    const publishedCard = within(panel).getByRole("article", {
      name: "Culto de domingo"
    });

    fireEvent.click(within(publishedCard).getByRole("button", { name: "Editar publicado" }));

    fireEvent.change(within(panel).getByLabelText("Titulo de la noticia"), {
      target: { value: "Culto de domingo actualizado" }
    });
    fireEvent.change(within(panel).getByLabelText("Resumen"), {
      target: { value: "Resumen actualizado del culto." }
    });
    fireEvent.change(within(panel).getByLabelText("Cuerpo"), {
      target: { value: "Cuerpo actualizado del culto de domingo." }
    });
    fireEvent.click(within(panel).getByRole("button", { name: "Proponer cambios" }));

    expect(within(panel).getByText("Pendiente de revision")).toBeInTheDocument();
    expect(
      within(panel).queryByRole("button", { name: "Editar publicado" })
    ).not.toBeInTheDocument();
  });

  it("lets an Administrador approve a Revision pendiente so it becomes the new Version publicada", async () => {
    render(
      <App
        authConfig={authConfig}
        content={contentWithPublishedNews}
        googleAuthClient={googleAuthClientReturningSequence([
          "editora@example.com",
          "admin@example.com"
        ])}
      />
    );

    const publicNews = screen.getByRole("region", { name: "Noticias publicadas" });

    fireEvent.click(screen.getByRole("button", { name: "Entrar con Google" }));

    const panel = screen.getByRole("region", { name: "Panel privado" });

    expect(
      await within(panel).findByText(/Sesion activa: editora@example.com/)
    ).toBeInTheDocument();

    const publishedCard = within(panel).getByRole("article", {
      name: "Culto de domingo"
    });

    fireEvent.click(within(publishedCard).getByRole("button", { name: "Editar publicado" }));

    fireEvent.change(within(panel).getByLabelText("Titulo de la noticia"), {
      target: { value: "Culto de domingo actualizado" }
    });
    fireEvent.change(within(panel).getByLabelText("Resumen"), {
      target: { value: "Resumen actualizado del culto." }
    });
    fireEvent.change(within(panel).getByLabelText("Cuerpo"), {
      target: { value: "Cuerpo actualizado del culto de domingo." }
    });
    fireEvent.click(within(panel).getByRole("button", { name: "Proponer cambios" }));

    fireEvent.click(within(panel).getByRole("button", { name: "Cerrar sesion" }));
    fireEvent.click(screen.getByRole("button", { name: "Entrar con Google" }));

    expect(
      await within(panel).findByText(/Sesion activa: admin@example.com/)
    ).toBeInTheDocument();

    const revisionCard = within(panel).getByRole("article", {
      name: "Culto de domingo"
    });

    fireEvent.click(within(revisionCard).getByRole("button", { name: "Aprobar revision" }));

    expect(within(panel).getByText("Publicado")).toBeInTheDocument();
    expect(within(panel).queryByText("Pendiente de revision")).not.toBeInTheDocument();
    expect(within(publicNews).getByText("Culto de domingo actualizado")).toBeInTheDocument();
    expect(within(publicNews).queryByText("Culto de domingo")).not.toBeInTheDocument();
  });

  it("lets an Administrador reject a Revision pendiente so the previous Version publicada remains unchanged", async () => {
    render(
      <App
        authConfig={authConfig}
        content={contentWithPublishedNews}
        googleAuthClient={googleAuthClientReturningSequence([
          "editora@example.com",
          "admin@example.com"
        ])}
      />
    );

    const publicNews = screen.getByRole("region", { name: "Noticias publicadas" });

    fireEvent.click(screen.getByRole("button", { name: "Entrar con Google" }));

    const panel = screen.getByRole("region", { name: "Panel privado" });

    expect(
      await within(panel).findByText(/Sesion activa: editora@example.com/)
    ).toBeInTheDocument();

    const publishedCard = within(panel).getByRole("article", {
      name: "Culto de domingo"
    });

    fireEvent.click(within(publishedCard).getByRole("button", { name: "Editar publicado" }));

    fireEvent.change(within(panel).getByLabelText("Titulo de la noticia"), {
      target: { value: "Culto de domingo actualizado" }
    });
    fireEvent.change(within(panel).getByLabelText("Resumen"), {
      target: { value: "Resumen actualizado del culto." }
    });
    fireEvent.change(within(panel).getByLabelText("Cuerpo"), {
      target: { value: "Cuerpo actualizado del culto de domingo." }
    });
    fireEvent.click(within(panel).getByRole("button", { name: "Proponer cambios" }));

    fireEvent.click(within(panel).getByRole("button", { name: "Cerrar sesion" }));
    fireEvent.click(screen.getByRole("button", { name: "Entrar con Google" }));

    expect(
      await within(panel).findByText(/Sesion activa: admin@example.com/)
    ).toBeInTheDocument();

    const revisionCard = within(panel).getByRole("article", {
      name: "Culto de domingo"
    });

    fireEvent.click(within(revisionCard).getByRole("button", { name: "Rechazar revision" }));

    expect(within(panel).getByText("Publicado")).toBeInTheDocument();
    expect(within(panel).queryByText("Pendiente de revision")).not.toBeInTheDocument();
    expect(within(publicNews).getByText("Culto de domingo")).toBeInTheDocument();
    expect(within(publicNews).queryByText("Culto de domingo actualizado")).not.toBeInTheDocument();
  });
});

describe("Noticia editorial flow", () => {
  it("lets an Editor create, edit and submit a Noticia draft for review", async () => {
    render(
      <App
        authConfig={authConfig}
        content={content}
        googleAuthClient={googleAuthClientReturningSequence(["editora@example.com"])}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Entrar con Google" }));

    const panel = screen.getByRole("region", { name: "Panel privado" });
    const publicNews = screen.getByRole("region", { name: "Noticias publicadas" });

    expect(
      await within(panel).findByText(/Sesion activa: editora@example.com/)
    ).toBeInTheDocument();

    fireEvent.change(within(panel).getByLabelText("Titulo de la noticia"), {
      target: { value: "Encuentro de familias" }
    });
    fireEvent.change(within(panel).getByLabelText("Resumen"), {
      target: { value: "Una jornada para compartir en comunidad." }
    });
    fireEvent.change(within(panel).getByLabelText("Cuerpo"), {
      target: { value: "La iglesia invita a todas las familias este sabado." }
    });
    fireEvent.change(
      within(panel).getByLabelText("Referencia de imagen (opcional)"),
      {
        target: { value: "familias.jpg" }
      }
    );
    fireEvent.click(within(panel).getByRole("button", { name: "Crear borrador" }));

    expect(within(panel).getByText("Borrador")).toBeInTheDocument();
    expect(within(panel).getByText("Encuentro de familias")).toBeInTheDocument();
    expect(within(publicNews).queryByText("Encuentro de familias")).not.toBeInTheDocument();

    fireEvent.click(within(panel).getByRole("button", { name: "Editar borrador" }));
    fireEvent.change(within(panel).getByLabelText("Titulo de la noticia"), {
      target: { value: "Encuentro de familias actualizado" }
    });
    fireEvent.click(within(panel).getByRole("button", { name: "Guardar borrador" }));

    expect(
      within(panel).getByText("Encuentro de familias actualizado")
    ).toBeInTheDocument();

    fireEvent.click(within(panel).getByRole("button", { name: "Enviar a revision" }));

    expect(within(panel).getByText("Pendiente de revision")).toBeInTheDocument();
    expect(
      within(panel).queryByRole("button", { name: "Aprobar noticia" })
    ).not.toBeInTheDocument();
    expect(
      within(panel).queryByRole("button", { name: "Rechazar noticia" })
    ).not.toBeInTheDocument();
    expect(
      within(publicNews).queryByText("Encuentro de familias actualizado")
    ).not.toBeInTheDocument();
  });

  it("lets an Administrador approve or reject pending Noticias and controls public visibility", async () => {
    render(
      <App
        authConfig={authConfig}
        content={content}
        googleAuthClient={googleAuthClientReturningSequence([
          "editora@example.com",
          "admin@example.com"
        ])}
      />
    );

    const publicNews = screen.getByRole("region", { name: "Noticias publicadas" });

    fireEvent.click(screen.getByRole("button", { name: "Entrar con Google" }));

    const panel = screen.getByRole("region", { name: "Panel privado" });

    expect(
      await within(panel).findByText(/Sesion activa: editora@example.com/)
    ).toBeInTheDocument();

    fireEvent.change(within(panel).getByLabelText("Titulo de la noticia"), {
      target: { value: "Culto especial" }
    });
    fireEvent.change(within(panel).getByLabelText("Resumen"), {
      target: { value: "Invitacion abierta para el domingo." }
    });
    fireEvent.change(within(panel).getByLabelText("Cuerpo"), {
      target: { value: "El Administrador aprobara esta Noticia." }
    });
    fireEvent.click(within(panel).getByRole("button", { name: "Crear borrador" }));
    fireEvent.click(within(panel).getByRole("button", { name: "Enviar a revision" }));

    fireEvent.change(within(panel).getByLabelText("Titulo de la noticia"), {
      target: { value: "Aviso interno" }
    });
    fireEvent.change(within(panel).getByLabelText("Resumen"), {
      target: { value: "Este aviso no debe quedar publicado." }
    });
    fireEvent.change(within(panel).getByLabelText("Cuerpo"), {
      target: { value: "El Administrador rechazara esta Noticia." }
    });
    fireEvent.click(within(panel).getByRole("button", { name: "Crear borrador" }));
    fireEvent.click(within(panel).getByRole("button", { name: "Enviar a revision" }));

    expect(within(publicNews).queryByText("Culto especial")).not.toBeInTheDocument();
    expect(within(publicNews).queryByText("Aviso interno")).not.toBeInTheDocument();

    fireEvent.click(within(panel).getByRole("button", { name: "Cerrar sesion" }));
    fireEvent.click(screen.getByRole("button", { name: "Entrar con Google" }));

    expect(
      await within(panel).findByText(/Sesion activa: admin@example.com/)
    ).toBeInTheDocument();

    const approvedCard = within(panel).getByRole("article", {
      name: "Culto especial"
    });
    fireEvent.click(within(approvedCard).getByRole("button", { name: "Aprobar noticia" }));

    const rejectedCard = within(panel).getByRole("article", { name: "Aviso interno" });
    fireEvent.click(within(rejectedCard).getByRole("button", { name: "Rechazar noticia" }));

    expect(within(panel).getByText("Publicado")).toBeInTheDocument();
    expect(within(panel).getByText("Rechazado")).toBeInTheDocument();
    expect(within(publicNews).getByText("Culto especial")).toBeInTheDocument();
    expect(within(publicNews).queryByText("Aviso interno")).not.toBeInTheDocument();
  });
});
