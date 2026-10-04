# Boletín de apuestas deportivas

React + Vite + Tailwind, optimizado para móvil.

## Producción en Vercel

La clave de The Odds API **no se expone al navegador**. Configura en Vercel:

- `ODDS_API_KEY` = tu clave de The Odds API
- `SPORTSRADAR_KEY` = opcional, para el adaptador de props

La app consulta `/api/odds`, una función serverless que actúa como proxy. Así el frontend no necesita `VITE_ODDS_API_KEY` y la clave privada no queda embebida en JavaScript público.

## Desarrollo

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

Si la API no responde o falta la clave, la aplicación conserva/muestra los 3 datos de referencia y los etiqueta como `momio de referencia`.
