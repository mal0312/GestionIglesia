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
