# Gestion Iglesia

Sitio web institucional administrable para una iglesia.

## Primer tracer bullet

La primera version ejecutable entrega una home publica en espanol con informacion inicial de la iglesia, secciones futuras y Donacion economica fija con alias, QR e instrucciones.

El MVP mantiene el objetivo de costo mensual 0 USD: no procesa pagos, no registra comprobantes y no requiere dominio propio para comenzar.

## Comandos

```bash
pnpm install
pnpm run typecheck
pnpm run test
pnpm run build
pnpm run dev
```

## Deploy gratuito sin dominio propio

El target elegido para el MVP es GitHub Pages, usando la URL gratuita del
repositorio y sin dominio propio. Para este repo, la URL esperada es
`https://mal0312.github.io/GestionIglesia/`.

El workflow `.github/workflows/deploy-pages.yml` valida variables de produccion,
ejecuta typecheck, tests y build, y publica `dist/` en GitHub Pages cuando se
hace push a `main` o cuando se ejecuta manualmente desde GitHub Actions.

Antes del primer deploy, configura GitHub Pages en `Settings > Pages` con
`Build and deployment: GitHub Actions`.

Variables de repositorio requeridas en GitHub Actions:

- `VITE_AUTHORIZED_EDITOR_EMAILS`: emails separados por coma con rol Editor.
- `VITE_AUTHORIZED_ADMIN_EMAILS`: emails separados por coma con rol Administrador.
- `VITE_GOOGLE_CLIENT_ID`: cliente OAuth web de Google para el dominio de Pages.
- `VITE_FIREBASE_API_KEY`: `apiKey` de la app web Firebase.
- `VITE_FIREBASE_PROJECT_ID`: `projectId` Firebase.
- `VITE_FIREBASE_APP_ID`: `appId` de la app web Firebase.
- `VITE_FIREBASE_MESSAGING_SENDER_ID`: opcional para la app, pero puede copiarse de Firebase.

Secret requerido en GitHub Actions:

- `VITE_GOOGLE_APPS_SCRIPT_EMAIL_ENDPOINT`: URL HTTPS del deployment de Google Apps Script que recibe los formularios publicos.

`VITE_BASE_PATH` lo define el workflow como `/${{ github.event.repository.name }}/` para que los assets de Vite funcionen en GitHub Pages. Para otra plataforma gratuita con raiz propia, puede omitirse o dejarse como `/`.

Para probar la configuracion de produccion localmente sin publicar, copia
`.env.production.example` a un archivo temporal con valores reales y ejecuta:

```bash
set -a
source .env.production
set +a
pnpm run check:production-env
pnpm run build
```

## Smoke check de produccion

Despues de cada deploy, verifica la URL publicada con esta lista corta:

- Abrir la home publica y confirmar que carga sin errores de consola.
- Confirmar que el Visitante ve contenido publicado, secciones publicas y Donacion economica con alias y QR.
- Entrar al panel con una cuenta Editor autorizada y confirmar que puede preparar contenido sin acciones finales de aprobacion.
- Entrar al panel con una cuenta Administrador autorizada y confirmar que ve acciones de aprobacion/publicacion.
- Enviar un Contacto de prueba y confirmar que llega por Google Apps Script a los destinatarios configurados.
- Enviar una Donacion de mercaderia de prueba y confirmar que usa el mismo camino de email configurado.

El deploy mantiene las restricciones del MVP: sin servicios pagos nuevos, sin
procesamiento de pagos, sin publicacion social automatica y sin sincronizacion
con APIs de Meta.

## Panel privado

El panel privado usa una allowlist configurable de cuentas Google. Para desarrollo
o despliegue, define estos valores:

```bash
VITE_AUTHORIZED_EDITOR_EMAILS=editora@example.com
VITE_AUTHORIZED_ADMIN_EMAILS=admin@example.com
VITE_GOOGLE_CLIENT_ID=000000000000-example.apps.googleusercontent.com
VITE_DEV_GOOGLE_SIGN_IN_EMAIL=editora@example.com
```

`VITE_GOOGLE_CLIENT_ID` debe ser un cliente OAuth web de Google Cloud con los
origenes JavaScript autorizados del despliegue y del entorno local, por ejemplo
`http://localhost:5173`.

Si no hay `VITE_GOOGLE_CLIENT_ID`, `VITE_DEV_GOOGLE_SIGN_IN_EMAIL` es solo para
`pnpm run dev`: simula la cuenta devuelta por Google. Si tampoco se define, la
app pide el email con un prompt en modo desarrollo. La integracion de Google esta
modelada como un cliente inyectable para poder probar el flujo sin guardar emails
reales en el comportamiento del producto.

## Persistencia Firebase

La app activa Firestore solo si existen estas variables de entorno:

```bash
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_APP_ID=...
```

Esta variable puede copiarse tambien desde Firebase si esta disponible:

```bash
VITE_FIREBASE_MESSAGING_SENDER_ID=...
```

Si faltan, el sitio usa el contenido estatico y no inicializa Firebase. Para mantener el objetivo de costo 0 USD, la persistencia de noticias usa un unico documento en Firestore, lecturas puntuales sin listeners en tiempo real, cache local de 5 minutos y omite escrituras cuando el contenido no cambia.

## Contenido fijo de la iglesia

La identidad publica inicial y Donacion economica fija se configuran en
`src/content/siteContent.ts`. Para cambiar nombre de iglesia, textos
institucionales, alias, QR o instrucciones de Donacion economica, actualiza los
campos de `siteContent` y vuelve a ejecutar el deploy.

Los destinatarios de Contacto y Donacion de mercaderia no se exponen al cliente:
se actualizan en el Google Apps Script publicado como endpoint.
