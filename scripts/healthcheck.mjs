#!/usr/bin/env node
/**
 * Sondes de supervision de ResidenceConnect.
 *
 * Vérifie la disponibilité et le temps de réponse des services en production :
 *  - le dashboard web (Vercel) ;
 *  - l'API backend (Supabase Auth).
 *
 * Sortie en code non nul si au moins une sonde dépasse un seuil (indisponibilité
 * ou latence excessive), ce qui fait échouer le workflow GitHub Actions et
 * déclenche le signalement (voir .github/workflows/monitoring.yml).
 *
 * Les valeurs par défaut peuvent être surchargées par variables d'environnement.
 * La clé anonyme Supabase est PUBLIQUE (exposée côté client par conception).
 */

const WEB_URL = process.env.WEB_URL || 'https://residence-connect-web.vercel.app';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ymwhvjtvdktinoyxafdr.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inltd2h2anR2ZGt0aW5veXhhZmRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMDk5MjQsImV4cCI6MjA5NTg4NTkyNH0.01f6ZVbvZE9_hYECwpCH3JkbWK_odisWEq5QX6NXUH8';

// Seuils d'alerte.
const LATENCY_MS = Number(process.env.LATENCY_MS || 3000); // temps de réponse max toléré
const TIMEOUT_MS = 10000; // au-delà, la sonde considère le service injoignable

/** @type {{name:string,url:string,headers?:Record<string,string>,okStatus:(s:number)=>boolean}[]} */
const probes = [
  {
    name: 'Dashboard web (Vercel)',
    url: `${WEB_URL}/login`,
    okStatus: (s) => s === 200,
  },
  {
    name: 'API backend (Supabase Auth)',
    url: `${SUPABASE_URL}/auth/v1/settings`,
    headers: { apikey: SUPABASE_ANON_KEY },
    okStatus: (s) => s === 200,
  },
];

async function runProbe(probe) {
  const start = Date.now();
  try {
    const res = await fetch(probe.url, {
      headers: probe.headers,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const ms = Date.now() - start;
    const statusOk = probe.okStatus(res.status);
    const latencyOk = ms <= LATENCY_MS;
    return { ...probe, status: res.status, ms, statusOk, latencyOk, up: true };
  } catch (err) {
    return { ...probe, status: 0, ms: Date.now() - start, statusOk: false, latencyOk: false, up: false, err: err.name };
  }
}

const results = await Promise.all(probes.map(runProbe));

let alerts = 0;
console.log(`Supervision ResidenceConnect — ${new Date().toISOString()}`);
console.log(`Seuils : disponibilité HTTP 200, latence <= ${LATENCY_MS} ms, timeout ${TIMEOUT_MS} ms\n`);

for (const r of results) {
  const alert = !r.statusOk || !r.latencyOk;
  if (alert) alerts++;
  const tag = alert ? 'ALERTE' : 'OK';
  const detail = !r.up
    ? `INJOIGNABLE (${r.err})`
    : `HTTP ${r.status} en ${r.ms} ms` + (!r.latencyOk ? ` — latence > ${LATENCY_MS} ms` : '');
  console.log(`[${tag}] ${r.name} — ${detail}`);
}

console.log(
  `\n${alerts === 0 ? 'Tous les services sont disponibles.' : `${alerts} sonde(s) en alerte — signalement déclenché.`}`,
);
process.exit(alerts === 0 ? 0 : 1);
