import { describe, it, expect } from 'vitest';
import { ticketsToCsv, escapeCsvValue, CSV_SEPARATOR, UTF8_BOM } from '../csv';
import { makeTicket } from '../../test/fixtures';

describe('escapeCsvValue', () => {
  it('laisse une valeur simple inchangée', () => {
    expect(escapeCsvValue('Robinet')).toBe('Robinet');
  });

  it('entoure de guillemets une valeur contenant une virgule', () => {
    expect(escapeCsvValue('Fuite, urgente')).toBe('"Fuite, urgente"');
  });

  it('entoure de guillemets une valeur contenant un point-virgule (séparateur)', () => {
    expect(escapeCsvValue('Fuite; urgente')).toBe('"Fuite; urgente"');
  });

  it('double les guillemets internes', () => {
    expect(escapeCsvValue('Panne "totale"')).toBe('"Panne ""totale"""');
  });

  it('entoure de guillemets une valeur avec saut de ligne', () => {
    expect(escapeCsvValue('ligne1\nligne2')).toBe('"ligne1\nligne2"');
  });
});

describe('ticketsToCsv', () => {
  it('utilise le point-virgule (compatibilité Excel FR)', () => {
    expect(CSV_SEPARATOR).toBe(';');
    const header = ticketsToCsv([]).split('\r\n')[0];
    expect(header.split(';')).toHaveLength(10);
  });

  it('produit une ligne d’en-tête même sans ticket', () => {
    const csv = ticketsToCsv([]);
    const lines = csv.split('\r\n');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('Titre');
    expect(lines[0]).toContain('Résolu le');
  });

  it('traduit les valeurs métier en français', () => {
    const csv = ticketsToCsv([
      makeTicket({ status: 'in_progress', category: 'elevator', urgency_level: 'critical' }),
    ]);
    const row = csv.split('\r\n')[1];
    expect(row).toContain('En cours');
    expect(row).toContain('Ascenseur');
    expect(row).toContain('Critique');
  });

  it('échappe un titre contenant le séparateur pour ne pas casser les colonnes', () => {
    const csv = ticketsToCsv([makeTicket({ title: 'Fuite; salle de bain' })]);
    const row = csv.split('\r\n')[1];
    expect(row).toContain('"Fuite; salle de bain"');
    // 10 colonnes → 9 séparateurs hors valeurs échappées
    const outsideQuotes = row.replace(/"[^"]*"/g, '');
    expect((outsideQuotes.match(/;/g) ?? []).length).toBe(9);
  });

  it('n’est pas cassé par une virgule dans un champ', () => {
    const csv = ticketsToCsv([makeTicket({ title: 'Fuite, salle de bain' })]);
    const row = csv.split('\r\n')[1];
    // La virgule n'étant plus séparatrice, les colonnes restent intactes.
    const outsideQuotes = row.replace(/"[^"]*"/g, '');
    expect((outsideQuotes.match(/;/g) ?? []).length).toBe(9);
  });

  it('utilise des fins de ligne CRLF (RFC 4180)', () => {
    const csv = ticketsToCsv([makeTicket()]);
    expect(csv).toContain('\r\n');
  });

  it('expose un BOM UTF-8 à préfixer au fichier téléchargé', () => {
    expect(UTF8_BOM).toBe('﻿');
  });

  it('gère les champs joints manquants (résidence / assigné absents)', () => {
    const csv = ticketsToCsv([
      makeTicket({ apartment: null, assignee: null, reporter: null }),
    ]);
    expect(csv.split('\r\n')).toHaveLength(2);
  });
});
