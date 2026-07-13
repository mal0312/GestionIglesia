import type { SiteContent } from "../domain/siteContent";

const qrPlaceholder =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180' viewBox='0 0 180 180'%3E%3Crect width='180' height='180' fill='%23fff7ed'/%3E%3Crect x='18' y='18' width='48' height='48' fill='%231f2937'/%3E%3Crect x='30' y='30' width='24' height='24' fill='%23fff7ed'/%3E%3Crect x='114' y='18' width='48' height='48' fill='%231f2937'/%3E%3Crect x='126' y='30' width='24' height='24' fill='%23fff7ed'/%3E%3Crect x='18' y='114' width='48' height='48' fill='%231f2937'/%3E%3Crect x='30' y='126' width='24' height='24' fill='%23fff7ed'/%3E%3Crect x='84' y='84' width='18' height='18' fill='%231f2937'/%3E%3Crect x='108' y='84' width='12' height='12' fill='%231f2937'/%3E%3Crect x='84' y='114' width='12' height='12' fill='%231f2937'/%3E%3Crect x='126' y='108' width='18' height='18' fill='%231f2937'/%3E%3Crect x='150' y='138' width='12' height='12' fill='%231f2937'/%3E%3Ctext x='90' y='174' font-family='Arial,sans-serif' font-size='12' text-anchor='middle' fill='%231f2937'%3EQR Donacion%3C/text%3E%3C/svg%3E";

export const siteContent: SiteContent = {
  churchName: "Iglesia Comunidad de Fe",
  welcomeTitle: "Un lugar para conocer la vida de la iglesia",
  welcomeText:
    "Este sitio publico reunira eventos, campanas, noticias, predicaciones, redes sociales y canales de contacto para que cada Visitante encuentre informacion confiable en un solo lugar.",
  donation: {
    alias: "iglesia.donacion",
    qrImageUrl: qrPlaceholder,
    qrAltText: "QR para realizar una Donacion economica",
    instructions:
      "Usa el alias o escanea el QR desde tu aplicacion bancaria. Si necesitas avisar una transferencia, comunicate por los canales oficiales de la iglesia.",
    noPaymentProcessingNotice:
      "El sitio no procesa pagos: la Donacion economica se realiza fuera del sistema.",
    noReceiptStorageNotice:
      "El sitio no registra ni guarda comprobantes de pago en el MVP."
  },
  events: [],
  futureSections: [
    {
      title: "Eventos",
      description: "Actividades proximas y archivo de encuentros publicados."
    },
    {
      title: "Campanas",
      description: "Iniciativas, necesidades y llamados a colaborar."
    },
    {
      title: "Noticias",
      description: "Comunicaciones importantes aprobadas por la iglesia."
    },
    {
      title: "Predicaciones",
      description: "Mensajes publicados con videos de YouTube."
    }
  ],
  news: [],
  costNote:
    "El MVP esta preparado para comenzar con hosting gratuito y sin dominio propio requerido."
};
