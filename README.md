# Boletín de apuestas deportivas

React + Vite + Tailwind. App móvil tipo tipsheet en español.

## Variables

Copia `.env.example` a `.env` y configura:

- `VITE_ODDS_API_KEY`: The Odds API.
- `VITE_SPORTSRADAR_KEY`: proveedor de estadísticas de jugador/equipo.

## Desarrollo

```bash
npm install
npm run dev
```

## Datos

La app consulta The Odds API cada 60 segundos para MLB, NFL y Liga MX cuando hay cobertura. Si falta API, hay rate limit o un mercado no está disponible, conserva la última información y/o muestra las tres selecciones de referencia marcadas como **momio de referencia**.

Las probabilidades se normalizan quitando el vig dentro del mercado cuando se obtienen múltiples outcomes. El parlay usa el producto de las probabilidades mostradas.

> Importante: las cuotas son informativas y no garantizan resultados. +18.
