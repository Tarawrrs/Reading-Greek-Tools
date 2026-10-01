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
    return ['lexicon-meta', 'vocabulary-next', 'vocabulary-running', 'verb-types'].includes(id) ? {} : [];
  }
  try {
    return JSON.parse(match[1]);
  } catch (error) {
    errors.push(`${id} is not valid JSON: ${error.message}`);
    return ['lexicon-meta', 'vocabulary-next', 'vocabulary-running', 'verb-types'].includes(id) ? {} : [];
  }
}

const base = embeddedJson('vocabulary');
const additions = embeddedJson('vocabulary-additions');
const running = embeddedJson('vocabulary-running');
const meta = embeddedJson('lexicon-meta');
const next = embeddedJson('vocabulary-next');
const grammarRows = embeddedJson('vocabulary-grammar');
const verbTypes = embeddedJson('verb-types');
const allowedPos = new Set(['Noun', 'Proper noun', 'Verb', 'Adjective', 'Pronoun', 'Adverb', 'Preposition', 'Article', 'Conjunction', 'Particle', 'Phrase', 'Interjection', 'Other']);
const runningRows = (running.groups || []).flatMap(group => {
  if (!Array.isArray(group.entries) || !group.entries.length) errors.push(`empty running list ${group.segment}`);
  const seen = new Set();
  return (group.entries || []).map((entry, index) => {
    if (!Array.isArray(entry) || entry.length < 4 || entry.length > 6) errors.push(`${group.segment} running entry ${index}: expected [form, lemma, gloss, POS, optional class, optional headword]`);
    const [g, lemma, en, pos, cls, headword] = entry;
    if (!allowedPos.has(pos)) errors.push(`${group.segment} ${g}: unknown POS ${pos}`);
    if ((pos === 'Noun' || pos === 'Verb') && !cls) errors.push(`${group.segment} ${g}: noun/verb class required`);
    if (seen.has(g)) errors.push(`${group.segment}: duplicate running form ${g}`);
    seen.add(g);
    return {g, lemma, en, pos, class: cls, headword, section: group.section, segment: group.segment, page: group.page, learn: false, sourceBook: 'Text', sourceKind: 'running'};
  });
});
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
const rows = [...base, ...additions, ...runningRows, ...nextRows, ...grammarRows];
const listedLemmas = new Set(rows.map(row => row.lemma));
for (const [lemma, type] of Object.entries(verbTypes)) {
  if (!listedLemmas.has(lemma)) errors.push(`verb-types: unused lemma ${lemma}`);
  if (typeof type !== 'string' || !type.trim()) errors.push(`verb-types: missing type for ${lemma}`);
}
const plainGreek = value => String(value).normalize('NFD').replace(/\p{M}/gu, '').replace(/ς/g, 'σ').toLowerCase();
const checks = JSON.parse(fs.readFileSync(path.join(root, 'data/textbook-vocabulary-checks.json'), 'utf8'));
const auditedSegments = new Set();
const expectedRunningSegments = [3, 4, 5, 6, 7, 8].flatMap((section, index) => [...'ABCDEFGH'.slice(0, [5, 4, 4, 4, 8, 3][index])].map(letter => `${section}${letter}`));
const pendingRunningSegments = new Set(checks.pendingRunningSegments || []);
for (const check of checks.segments || []) {
  if (auditedSegments.has(check.segment)) errors.push(`duplicate textbook audit segment ${check.segment}`);
  auditedSegments.add(check.segment);
  for (const headword of check.headwords || []) {
    const key = plainGreek(headword);
    if (!rows.some(row => plainGreek(row.lemma) === key || plainGreek(row.g) === key)) errors.push(`${check.segment} Text p.${check.page}: missing headword ${headword}`);
  }
  for (const form of check.newSourceForms || []) {
    if (!runningRows.some(row => row.segment === check.segment && row.page === check.page && plainGreek(row.g) === plainGreek(form))) errors.push(`${check.segment} Text p.${check.page}: missing running form ${form}`);
  }
}
for (const segment of expectedRunningSegments) {
  if (auditedSegments.has(segment) === pendingRunningSegments.has(segment)) errors.push(`running vocabulary ${segment}: must be audited or pending, not both/neither`);
}
for (const segment of pendingRunningSegments) if (!expectedRunningSegments.includes(segment)) errors.push(`unexpected pending running segment ${segment}`);
for (const expected of checks.taxonomyChecks || []) {
  const match = runningRows.find(row => row.segment === expected.segment && row.page === expected.page && plainGreek(row.lemma) === plainGreek(expected.lemma));
  if (!match || match.pos !== expected.pos || match.class !== expected.class) errors.push(`${expected.segment} Text p.${expected.page}: taxonomy mismatch for ${expected.lemma}`);
}
for (const row of rows) {
  const lemma = plainGreek(row.lemma);
  const vowel = lemma.endsWith('αομαι') ? 'α' : lemma.endsWith('εομαι') ? 'ε' : lemma.endsWith('οομαι') ? 'ο' : '';
  if (vowel && !verbTypes[row.lemma]?.startsWith(`${vowel}-contract · middle`)) errors.push(`${row.segment} ${row.lemma}: middle contract type must be explicit (${vowel})`);
}
for (const lemma of ['πλέω', 'ἐπιπλέω']) if (verbTypes[lemma] !== 'limited ε-contraction') errors.push(`${lemma}: partial contraction exception missing`);
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

console.log(`Validated ${rows.length} vocabulary rows (${runningRows.length} checked running entries, ${nextRows.length} learning-list entries), ${Object.keys(meta).length} metadata entries, and ${cardIds.length} reference cards.`);
console.log(`Textbook running-vocabulary inventory: ${auditedSegments.size}/${expectedRunningSegments.length} segments checked against source pages.`);
for (const warning of warnings) console.warn(`WARNING: ${warning}`);
if (errors.length) {
  for (const error of errors) console.error(`ERROR: ${error}`);
  process.exit(1);
}
console.log(`OK with ${warnings.length} warning(s).`);
