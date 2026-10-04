export default async function handler(req, res) {
  const { sport, markets = 'h2h,totals' } = req.query;
  const key = process.env.ODDS_API_KEY;
  if (!key) return res.status(500).json({ error: 'ODDS_API_KEY no configurada' });
  if (!sport) return res.status(400).json({ error: 'sport requerido' });
  const url = new URL(`https://api.the-odds-api.com/v4/sports/${sport}/odds`);
  url.searchParams.set('regions', 'us');
  url.searchParams.set('markets', markets);
  url.searchParams.set('oddsFormat', 'american');
  url.searchParams.set('apiKey', key);
  try {
    const r = await fetch(url);
    const text = await r.text();
    if (r.status === 429) return res.status(429).json({ error: 'rate-limit' });
    res.status(r.status).setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
    res.setHeader('Content-Type', 'application/json');
    return res.send(text);
  } catch (e) {
    return res.status(502).json({ error: 'upstream-error' });
  }
}
