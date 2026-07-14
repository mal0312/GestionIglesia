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
pnpm run dev
```

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
VITE_FIREBASE_MESSAGING_SENDER_ID=...
```

Si faltan, el sitio usa el contenido estatico y no inicializa Firebase. Para mantener el objetivo de costo 0 USD, la persistencia de noticias usa un unico documento en Firestore, lecturas puntuales sin listeners en tiempo real, cache local de 5 minutos y omite escrituras cuando el contenido no cambia.
