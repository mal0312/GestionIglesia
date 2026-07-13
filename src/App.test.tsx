import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { App } from "./App";
import type { AuthConfig, GoogleAuthClient } from "./domain/auth";
import type { EventPublication, NewsPublication, SiteContent } from "./domain/siteContent";

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
  events: [],
  futureSections: [
    { title: "Eventos", description: "Actividades proximas." },
    { title: "Campanas", description: "Iniciativas y necesidades." },
    { title: "Noticias", description: "Comunicaciones aprobadas." },
    { title: "Predicaciones", description: "Mensajes con YouTube." }
  ],
  news: [],
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
