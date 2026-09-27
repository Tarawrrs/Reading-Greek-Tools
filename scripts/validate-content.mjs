#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const htmlPath = path.join(root, 'Reading-Greek-1-2.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const errors = [];
const warnings = [];

function embeddedJson(id) {
  const match = html.match(new RegExp(`<script id="${id}" type="application/json">([\\s\\S]*?)<\\/script>`));
  if (!match) {
    errors.push(`missing embedded JSON: ${id}`);
    return id === 'lexicon-meta' || id === 'vocabulary-next' ? {} : [];
  }
  try {
    return JSON.parse(match[1]);
  } catch (error) {
    errors.push(`${id} is not valid JSON: ${error.message}`);
    return id === 'lexicon-meta' || id === 'vocabulary-next' ? {} : [];
  }
}

const base = embeddedJson('vocabulary');
const additions = embeddedJson('vocabulary-additions');
const meta = embeddedJson('lexicon-meta');
const next = embeddedJson('vocabulary-next');
const grammarRows = embeddedJson('vocabulary-grammar');
const allowedPos = new Set(['Noun', 'Proper noun', 'Verb', 'Adjective', 'Pronoun', 'Adverb', 'Preposition', 'Article', 'Conjunction', 'Particle', 'Phrase', 'Interjection', 'Other']);
const expectedGroups = ['6:6A–D', '7:7A–C', '7:7D–F', '7:7G–H', '8:8A–C'];
const actualGroups = (next.groups || []).map(group => `${group.section}:${group.segment}`);
if (JSON.stringify(actualGroups) !== JSON.stringify(expectedGroups)) errors.push(`unexpected Sections 6–8 learning-list groups: ${actualGroups.join(', ')}`);
const nextRows = (next.groups || []).flatMap(group => {
  if (!Array.isArray(group.entries) || !group.entries.length) errors.push(`empty learning list ${group.segment}`);
  const seen = new Set();
  return (group.entries || []).map((entry, index) => {
    if (!Array.isArray(entry) || entry.length < 3 || entry.length > 4) errors.push(`${group.segment} entry ${index}: expected [headword, gloss, POS, optional class]`);
    const [lemma, en, pos, cls] = entry;
    if (!allowedPos.has(pos)) errors.push(`${group.segment} ${lemma}: unknown POS ${pos}`);
    if ((pos === 'Noun' || pos === 'Verb') && !cls) errors.push(`${group.segment} ${lemma}: noun/verb class required`);
    if (seen.has(lemma)) errors.push(`${group.segment}: duplicate headword ${lemma}`);
    seen.add(lemma);
    return {g: lemma, lemma, en, pos, class: cls, section: group.section, segment: group.segment, page: group.page, learn: true};
  });
});
if (!Array.isArray(grammarRows) || !grammarRows.some(row => row.lemma === 'ὀφρύς' && row.class === '3h · f.')) errors.push('missing Section 6 grammar-only 3h headword');
const rows = [...base, ...additions, ...nextRows, ...grammarRows];
const required = ['g', 'lemma', 'en', 'section', 'segment', 'page'];
const ids = new Map();

for (const [index, row] of rows.entries()) {
  for (const field of required) {
    if (row[field] === undefined || row[field] === '') errors.push(`row ${index}: missing ${field}`);
  }
  if (!Number.isInteger(row.section) || row.section < 1 || row.section > 20) errors.push(`row ${index}: invalid section ${row.section}`);
  if (!new RegExp(`^${row.section}(?:[A-Z]|[A-Z]–[A-Z])$`).test(row.segment || '')) errors.push(`row ${index}: segment ${row.segment} does not match section ${row.section}`);
  if (!Number.isFinite(row.page) || row.page < 1) errors.push(`row ${index}: invalid page ${row.page}`);
  if (row.id !== undefined) {
    if (ids.has(row.id)) errors.push(`duplicate vocabulary id ${row.id} at rows ${ids.get(row.id)} and ${index}`);
    ids.set(row.id, index);
  }
}

const cardIds = [...html.matchAll(/<article id="([^"]+)" class="grammar-sheet"/g)].map(match => match[1]);
const duplicateCards = cardIds.filter((id, index) => cardIds.indexOf(id) !== index);
if (duplicateCards.length) errors.push(`duplicate grammar card ids: ${[...new Set(duplicateCards)].join(', ')}`);
for (const id of cardIds) {
  const start = html.indexOf(`<article id="${id}"`);
  const end = html.indexOf('</article>', start);
  if (end < 0 || !html.slice(start, end).includes('class="source-ref"')) errors.push(`#${id}: missing source-ref`);
}

for (const requiredOverride of ["'\u03b5\u1f30\u03c2'", "'\u03c4\u03af\u03c2, \u03c4\u03af'", "'\u03c4\u03b9\u03c2, \u03c4\u03b9'", "'\u03c0\u1ff6\u03c2'", "'\u03c0\u03c9\u03c2'"]) {
  if (!html.includes(requiredOverride)) errors.push(`missing accent-sensitive lexeme override ${requiredOverride}`);
}

const irregularCard = (() => {
  const start = html.indexOf('<article id="irregular-verbs"');
  const end = html.indexOf('</article>', start);
  return html.slice(start, end);
})();
for (const row of nextRows) {
  if (row.class === 'irregular' && !irregularCard.includes(row.lemma)) errors.push(`new irregular form missing from #irregular-verbs: ${row.segment} ${row.lemma}`);
}
for (const entry of Object.values(meta)) {
  if (entry.class === 'irregular') {
    const lemma = String(entry.headword).split(/[ ,(]/)[0];
    if (!irregularCard.includes(lemma)) warnings.push(`review irregular verb coverage: ${entry.headword}`);
  }
}

if (!html.includes("document.documentElement.lang='en'")) errors.push('document language must be set to English');
if (!html.includes('class="floating-top"')) errors.push('missing global back-to-top control');
for (const section of [6, 7, 8]) if (!html.includes(`data-scope="${section}"`)) errors.push(`missing Section ${section} filter`);
for (const id of ['type-three-h', 'comparative-adjectives', 'aorist-indicative', 'infinitives', 'aorist-participles', 'present-optative', 'aorist-reading', 'infinitive-uses', 'genitive-expanded', 'optative-usage']) if (!cardIds.includes(id)) errors.push(`missing Section 6–8 reference #${id}`);

console.log(`Validated ${rows.length} vocabulary rows (${nextRows.length} new learning-list entries), ${Object.keys(meta).length} metadata entries, and ${cardIds.length} reference cards.`);
for (const warning of warnings) console.warn(`WARNING: ${warning}`);
if (errors.length) {
  for (const error of errors) console.error(`ERROR: ${error}`);
  process.exit(1);
}
console.log(`OK with ${warnings.length} warning(s).`);
