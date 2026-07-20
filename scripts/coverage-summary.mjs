#!/usr/bin/env node
// Agrège les rapports de couverture des trois packages en un tableau Markdown.
//
// Chaque package produit un `coverage/coverage-summary.json` (reporter
// json-summary). Ce script en lit le total et écrit un tableau sur la sortie
// standard — destiné au résumé de job GitHub Actions ($GITHUB_STEP_SUMMARY),
// pour que la couverture soit visible sans télécharger d'artefact.
//
// Usage : node scripts/coverage-summary.mjs >> "$GITHUB_STEP_SUMMARY"

import { readFileSync } from 'node:fs';

const PACKAGES = [
  { name: 'Mobile (Jest)', path: 'apps/mobile/coverage/coverage-summary.json' },
  { name: 'Web (Vitest)', path: 'apps/web/coverage/coverage-summary.json' },
  { name: 'Shared (Jest)', path: 'packages/shared/coverage/coverage-summary.json' },
];

const pct = (v) => (typeof v === 'number' ? `${v.toFixed(1)} %` : '—');

const rows = [];
for (const pkg of PACKAGES) {
  try {
    const total = JSON.parse(readFileSync(pkg.path, 'utf8')).total;
    rows.push(
      `| ${pkg.name} | ${pct(total.statements.pct)} | ${pct(total.branches.pct)} | ${pct(total.functions.pct)} | ${pct(total.lines.pct)} |`
    );
  } catch {
    rows.push(`| ${pkg.name} | rapport absent | | | |`);
  }
}

const out = [
  '## Couverture des tests',
  '',
  '| Package | Instructions | Branches | Fonctions | Lignes |',
  '|---------|-------------|----------|-----------|--------|',
  ...rows,
  '',
  '_Seuil appliqué : 70 % sur chaque package._',
  '',
].join('\n');

process.stdout.write(out);
