import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
 Camera, Plus, Check, X, ChevronRight, ChevronLeft, Trash2, Download,
 FileText, Building2, Sparkles, Loader2, ArrowLeft, Image as ImageIcon,
 Info, AlertCircle, Calendar, Users, Clock, Target, Briefcase, Edit3,
 Share2, Mail,
} from 'lucide-react';

/* ============================================================
 HUMANOID READINESS SCAN — Lapento
 Mobile-first webapp voor in-person bedrijfsbezoeken.
 Lokale opslag via localStorage. Foto's worden gecomprimeerd.
 AI-analyse via /api/analyze proxy (server-side API key). Word-export via HTML→.doc.
 ============================================================ */

const STORAGE_PREFIX = 'scan';

const TRAITS = [
 { id: 'repetitive', label: 'Repetitief / monotoon' },
 { id: 'heavy', label: 'Fysiek zwaar' },
 { id: 'unsafe', label: 'Onveilig / risicovol' },
 { id: 'precision', label: 'Precisiewerk' },
 { id: 'dirty', label: 'Vies / ongezond' },
 { id: 'extreme', label: 'Hitte / lawaai' },
 { id: 'shifts', label: '24/7 / nachtdienst' },
 { id: 'shortage', label: 'Personeelstekort' },
];

const SECTORS = [
 'Maakindustrie / metaal',
 'Voedingsmiddelen',
 'Verpakking & logistiek',
 'Bouw / installatie',
 'Healthcare / zorg',
 'Agro / glastuinbouw',
 'Automotive',
 'Hospitality / horeca',
 'Anders',
];

/* Algemene automatisering — voor alle sectoren */
const AUTOMATION_BASE = [
 'Geen automatisering',
 'ERP-systeem',
 'MES-systeem',
 'WMS / voorraadbeheer',
 'PLC-besturing',
 'IoT-sensoren / data',
 'Vision-AI / camerasysteem',
 'Cobot(s)',
 'Industriële robot(s)',
 'AGV / AMR (autonoom transport)',
 '3D-printing / additive',
];

/* Sector-specifieke automatisering */
const AUTOMATION_BY_SECTOR = {
 'Maakindustrie / metaal': [
 'CNC-bewerking',
 'Lasrobot(s)',
 'Plaatbewerkingsrobot',
 'Buigmachine / kantbank',
 'Laser- / plasmasnijden',
 'Geautomatiseerde tooling',
 ],
 'Voedingsmiddelen': [
 'Etiketteer- / sluitmachine',
 'Pick & place verpakkingsrobot',
 'CIP / cleaning-systeem',
 'X-ray / metaaldetectie',
 'Wegen / portioneren',
 'Gekoelde geautomatiseerde opslag',
 ],
 'Verpakking & logistiek': [
 'Palletizer / depalletizer',
 'Sorteerinstallatie',
 'Conveyor / transportband',
 'Pick-by-light / voice picking',
 'Shuttle / mini-load',
 'Geautomatiseerde verpakking',
 ],
 'Bouw / installatie': [
 'Prefab-automatisering',
 'BIM / digitale bouwplanning',
 '3D-scanning / drones',
 'Geautomatiseerde betonproductie',
 'Bouwrobot (metselen / lassen)',
 ],
 'Healthcare / zorg': [
 'EPD / ECD',
 'Geautomatiseerde medicijndispenser',
 'Logistieke transportrobot',
 'Schoonmaak- / desinfectierobot',
 'Tilliften / hulpmiddelen',
 'Telemonitoring',
 ],
 'Agro / glastuinbouw': [
 'Klimaatregeling / IoT',
 'Sorteer- / verpakkingsmachine',
 'Pluk- / snijrobot',
 'Geautomatiseerd spuit- / watergeefsysteem',
 'Trolley / transportautomaat',
 ],
 'Automotive': [
 'Lakstraat / spuitrobot',
 'Lasrobot(s)',
 'Assemblage cobots',
 'AGV / kitting',
 'EOL-test / vision-AI',
 ],
 'Hospitality / horeca': [
 'Bestelsysteem / POS',
 'Servicerobot (eten brengen)',
 'Geautomatiseerde vaatwas',
 'Kookrobot / wokrobot',
 'Receptie / check-in zuil',
 ],
 'Anders': [],
};

/* Sector-specifieke proces-templates voor quick-pick.
 Gebaseerd op typische taken die humanoids 2026-2028 kunnen overnemen. */
const PROCESS_TEMPLATES = {
 'Maakindustrie / metaal': [
 { name: 'Opspanning werkstuk in CNC', traits: ['precision', 'repetitive'] },
 { name: 'Gereedschapswisseling', traits: ['repetitive', 'precision'] },
 { name: 'Spaanvorming beoordelen / vision', traits: ['precision'] },
 { name: 'Maatcontrole / kwaliteitscheck', traits: ['precision', 'repetitive'] },
 { name: 'Materiaalhandling tussen machines', traits: ['heavy', 'repetitive'] },
 { name: 'Multi-machine bediening', traits: ['repetitive', 'shifts'] },
 { name: 'Lassen / spuitwerk', traits: ['precision', 'extreme'] },
 ],
 'Voedingsmiddelen': [
 { name: 'Inpakken / verpakken', traits: ['repetitive'] },
 { name: 'Etiketteren', traits: ['repetitive', 'precision'] },
 { name: 'Sorteren / portioneren', traits: ['repetitive'] },
 { name: 'Pick & place producten', traits: ['repetitive'] },
 { name: 'Schoonmaak / CIP', traits: ['repetitive', 'dirty'] },
 { name: 'Voorraadcontrole / scannen', traits: ['repetitive'] },
 { name: 'Werken in koel-/vriescel', traits: ['extreme', 'shifts'] },
 ],
 'Verpakking & logistiek': [
 { name: 'Picking & packing (orderpicken)', traits: ['repetitive', 'shortage'] },
 { name: 'Laden en lossen vrachtwagens', traits: ['heavy', 'repetitive'] },
 { name: 'Sorteren pakketten', traits: ['repetitive'] },
 { name: 'Pallets stapelen / depalletizeren', traits: ['heavy', 'repetitive'] },
 { name: 'Inventarisatie / scanning', traits: ['repetitive'] },
 { name: 'Materiaalhandling intern', traits: ['repetitive', 'heavy'] },
 ],
 'Bouw / installatie': [
 { name: 'Materiaaltransport op werf', traits: ['heavy'] },
 { name: 'Schoonmaak / opruimen werkplek', traits: ['dirty'] },
 { name: 'Prefab assemblage', traits: ['repetitive'] },
 { name: 'Inspectie / 3D-scanning', traits: ['precision'] },
 { name: 'Metselen / lassen / boren', traits: ['repetitive', 'precision'] },
 ],
 'Healthcare / zorg': [
 { name: 'Maaltijden brengen', traits: ['repetitive', 'shortage'] },
 { name: 'Medicatie ronde', traits: ['repetitive', 'precision'] },
 { name: 'Logistiek / transport in gebouw', traits: ['repetitive', 'shifts'] },
 { name: 'Schoonmaak / desinfectie', traits: ['repetitive', 'dirty'] },
 { name: 'Bedden opmaken', traits: ['repetitive', 'heavy'] },
 { name: 'Receptie / wegwijs maken', traits: ['shifts', 'shortage'] },
 ],
 'Agro / glastuinbouw': [
 { name: 'Plukken / oogsten', traits: ['repetitive', 'shortage'] },
 { name: 'Snijden / snoeien', traits: ['repetitive', 'precision'] },
 { name: 'Sorteren producten', traits: ['repetitive'] },
 { name: 'Verpakken', traits: ['repetitive'] },
 { name: 'Spuiten / behandelen', traits: ['dirty', 'extreme'] },
 { name: 'Transport in kas', traits: ['repetitive', 'heavy'] },
 ],
 'Automotive': [
 { name: 'Assemblage onderdelen', traits: ['repetitive', 'precision'] },
 { name: 'Kwaliteitscontrole / EOL-test', traits: ['repetitive', 'precision'] },
 { name: 'Materiaalhandling / kitting', traits: ['repetitive', 'heavy'] },
 { name: 'Lakstraat / spuitwerk', traits: ['extreme', 'dirty'] },
 { name: 'Lassen', traits: ['precision', 'extreme'] },
 ],
 'Hospitality / horeca': [
 { name: 'Tafels indekken', traits: ['repetitive', 'shortage'] },
 { name: 'Tafels en stoelen plaatsen', traits: ['repetitive', 'heavy'] },
 { name: 'Eten en drinken brengen', traits: ['repetitive', 'shortage'] },
 { name: 'Mise-en-place / koken assisteren', traits: ['repetitive', 'precision'] },
 { name: 'Schoonmaak / afruimen', traits: ['repetitive', 'dirty'] },
 { name: 'Receptie / welcome', traits: ['shifts', 'shortage'] },
 ],
 'Anders': [],
};

/* Algemene templates die in alle sectoren bruikbaar zijn */
const PROCESS_TEMPLATES_GENERAL = [
 { name: 'Schoonmaak / facility', traits: ['repetitive', 'dirty'] },
 { name: 'Beveiliging / surveillance', traits: ['shifts'] },
 { name: 'Receptie / wegwijs', traits: ['shifts'] },
 { name: 'Materiaaltransport intern', traits: ['repetitive', 'heavy'] },
];

/* Doelstellingen — multi-select */
const GOAL_OPTIONS = [
 'Personeelstekort opvangen',
 'Productiviteit verhogen',
 'Kwaliteit verbeteren',
 'Werkdruk verlagen',
 '24/7 productie mogelijk maken',
 'Kosten verlagen',
 'Veiligheid verbeteren',
 'Verzuim reduceren',
 'Concurrentiepositie versterken',
 'Aantrekkelijke werkgever zijn',
 'Schaalvergroting',
 'Innovatie / voorop lopen',
];

/* Tijdslijn — single-select */
const TIMELINE_OPTIONS = [
 'Direct (< 3 maanden)',
 '3-6 maanden',
 '6-12 maanden',
 '1-2 jaar',
 '2-3 jaar',
 '3+ jaar',
 'Nog niet bepaald',
];

/* Investeringsruimte — single-select */
const BUDGET_OPTIONS = [
 '< €25k (verkennen)',
 '€25-50k',
 '€50-150k',
 '€150-500k',
 '€500k - €1M',
 '> €1M',
 'Business case eerst',
 'Onbekend',
];

/* Zorgen / aandachtspunten — multi-select */
const CONCERN_OPTIONS = [
 'Personeelsweerstand',
 'Verandermanagement',
 'ICT-volwassenheid / netwerk',
 'Eerdere mislukte projecten',
 'Onbekendheid met technologie',
 'Continuïteit productie',
 'Veiligheid medewerkers',
 'Onderhoud / service',
 'Leverancier-afhankelijkheid',
 'Subsidie / financiering',
 'Privacy / data',
 'Ruimte / inrichting fabriek',
];

/* ---------- helpers ---------- */

const fmtDate = (iso) => {
 if (!iso) return '';
 const d = new Date(iso);
 return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' });
};

const newId = () => 'id-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);

async function compressImage(file, maxDim = 1280, quality = 0.72) {
 return new Promise((resolve, reject) => {
 const reader = new FileReader();
 reader.onload = (e) => {
 const img = new window.Image();
 img.onload = () => {
 const ratio = Math.min(maxDim / img.width, maxDim / img.height, 1);
 const w = Math.round(img.width * ratio);
 const h = Math.round(img.height * ratio);
 const canvas = document.createElement('canvas');
 canvas.width = w; canvas.height = h;
 const ctx = canvas.getContext('2d');
 ctx.drawImage(img, 0, 0, w, h);
 resolve(canvas.toDataURL('image/jpeg', quality));
 };
 img.onerror = reject;
 img.src = e.target.result;
 };
 reader.onerror = reject;
 reader.readAsDataURL(file);
 });
}

/* localStorage wrapper — werkt overal in productie */
const STORAGE_AVAILABLE = (() => {
  try {
    const testKey = '__lp_test__';
    localStorage.setItem(testKey, '1');
    localStorage.removeItem(testKey);
    return true;
  } catch { return false; }
})();
const memStore = new Map();
const hasStorage = () => STORAGE_AVAILABLE;

async function loadAllScans() {
 if (!hasStorage()) {
 return Array.from(memStore.values()).map(normalizeScan).filter(Boolean).sort((a, b) => new Date(b.created) - new Date(a.created));
 }
 try {
 const out = [];
 for (let i = 0; i < localStorage.length; i++) {
 const key = localStorage.key(i);
 if (!key || !key.startsWith(STORAGE_PREFIX + ':')) continue;
 try {
 const value = localStorage.getItem(key);
 if (value) {
 const parsed = JSON.parse(value);
 const norm = normalizeScan(parsed);
 if (norm) out.push(norm);
 }
 } catch {}
 }
 return out.sort((a, b) => new Date(b.created) - new Date(a.created));
 } catch (e) {
 console.warn('Storage load failed:', e);
 return [];
 }
}

async function saveScan(scan) {
 scan.updated = new Date().toISOString();
 memStore.set(scan.id, scan);
 if (!hasStorage()) return;
 try {
 localStorage.setItem(`${STORAGE_PREFIX}:${scan.id}`, JSON.stringify(scan));
 } catch (e) {
 console.warn('Storage save failed (kept in memory):', e);
 }
}

async function removeScan(id) {
 memStore.delete(id);
 if (!hasStorage()) return;
 try {
 localStorage.removeItem(`${STORAGE_PREFIX}:${id}`);
 } catch (e) {
 console.warn('Storage delete failed:', e);
 }
}

/* Exporteer alle scans naar één JSON-bestand */
async function exportAllScans() {
 const scans = await loadAllScans();
 const payload = {
 version: 1,
 exported: new Date().toISOString(),
 scans,
 };
 const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
 const url = URL.createObjectURL(blob);
 const a = document.createElement('a');
 const ts = new Date().toISOString().slice(0, 10);
 a.href = url;
 a.download = `Lapento-scans-backup_${ts}.json`;
 document.body.appendChild(a);
 a.click();
 setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
 return scans.length;
}

/* Importeer scans uit JSON-bestand. Voegt toe (overschrijft niet bij conflict). */
async function importScansFromFile(file) {
 const text = await file.text();
 const data = JSON.parse(text);
 const incoming = Array.isArray(data) ? data : (data.scans || []);
 let count = 0;
 for (const raw of incoming) {
 const scan = normalizeScan(raw);
 if (scan) {
 await saveScan(scan);
 count++;
 }
 }
 return count;
}

function emptyScan() {
 return {
 id: newId(),
 created: new Date().toISOString(),
 scanType: null, // 'humanoid' | 'automation'
 company: { name: '', contact: '', sector: '', employees: '', location: '', date: new Date().toISOString().slice(0, 10) },
 context: {
 automationItems: [], automation: '',
 goalItems: [], goal: '',
 timeline: '', timelineNote: '',
 budget: '', budgetNote: '',
 concernItems: [], concerns: '',
 },
 processes: [],
 analysis: null,
 };
}

function emptyProcess() {
 return {
 id: newId(),
 name: '',
 description: '',
 photos: [],
 traits: [],
 workers: '',
 hoursPerDay: '',
 daysPerWeek: '',
 notes: '',
 };
}

/* Maakt scans backwards compatible bij data-structuur wijzigingen.
 Voegt ontbrekende velden toe met defaults. */
function normalizeScan(s) {
 if (!s || typeof s !== 'object') return null;
 return {
 id: s.id || newId(),
 created: s.created || new Date().toISOString(),
 updated: s.updated || s.created || new Date().toISOString(),
 scanType: s.scanType ?? null,
 company: {
 name: '', contact: '', sector: '', employees: '', location: '',
 date: new Date().toISOString().slice(0, 10),
 ...(s.company || {}),
 },
 context: {
 automationItems: [], automation: '',
 goalItems: [], goal: '',
 timeline: '', timelineNote: '',
 budget: '', budgetNote: '',
 concernItems: [], concerns: '',
 ...(s.context || {}),
 },
 processes: (s.processes || []).map(p => ({
 ...emptyProcess(),
 ...p,
 traits: p.traits || [],
 photos: p.photos || [],
 })),
 analysis: s.analysis || null,
 };
}

/* ============================================================
 AI-ANALYSE
 ============================================================ */

async function generateAnalysis(scan, onProgress) {
 const processesText = scan.processes.map((p, i) => {
 const traits = p.traits.map(t => TRAITS.find(x => x.id === t)?.label).filter(Boolean).join(', ') || 'geen';
 return `Proces ${i + 1}: ${p.name}
 Beschrijving: ${p.description || '-'}
 Kenmerken: ${traits}
 Inzet: ${p.workers || '?'} medewerker(s), ${p.hoursPerDay || '?'} uur/dag, ${p.daysPerWeek || '?'} dagen/week
 Notities: ${p.notes || '-'}`;
 }).join('\n\n');

 const combine = (items, note) => [
 (items || []).join(', '),
 note,
 ].filter(Boolean).join(' — ') || '-';

 const automationStr = combine(scan.context.automationItems, scan.context.automation);
 const goalStr = combine(scan.context.goalItems, scan.context.goal);
 const timelineStr = [scan.context.timeline, scan.context.timelineNote].filter(Boolean).join(' — ') || '-';
 const budgetStr = [scan.context.budget, scan.context.budgetNote].filter(Boolean).join(' — ') || '-';
 const concernsStr = combine(scan.context.concernItems, scan.context.concerns);

 const isHumanoid = scan.scanType === 'humanoid';

 const opdrachtBlock = isHumanoid ? `
OPDRACHT — HUMANOID READINESS SCAN
Beoordeel elk proces specifiek op de geschiktheid en SNELHEID van inzet door een humanoid robot. Wees realistisch: humanoids hebben in 2026 nog beperkingen in dexteriteit, snelheid, batterij en kosten. Veel taken zijn op kortere termijn beter af met cobots, AMRs of vision-AI — vermeld dat eerlijk.

Geef per proces:
- Humanoid Readiness Score (1-10): 1=ongeschikt voor humanoid, 5=haalbaar 2027-2028, 10=direct toepasbaar in 2026
- Robottype: humanoid (specifiek model indien relevant: Figure, 1X Neo, Optimus, UBTECH, etc), of als alternatief: cobot, AMR, vision-AI als humanoid niet de juiste route is
- Indicatieve ROI/terugverdientijd in jaren — wees voorzichtig, humanoids kosten nu €50-200k
- 2-4 concrete vervolgstappen voor het MKB
- 1-3 risico's of aandachtspunten

Sluit af met:
- Strategisch advies (3-5 zinnen, geen vaagheid)
- Top-3 prioriteiten in volgorde van humanoid-snelheid
- 2-3 quick wins voor de komende 6 maanden — focus op VOORBEREIDING op humanoids
- 3-4 humanoidActions: hele concrete eerste stappen om NU te beginnen met de voorbereiding op humanoids. Denk aan: "begin met video-opnames van werkzaamheden via een bodycam of smart glasses, deze data is goud waard voor toekomstige humanoid-training", "leg processen vast in digitale werkinstructies via Soply (lapento.nl/soply) — daar haal je nu al voordeel uit én bouw je de basis voor humanoids", "creëer een werkomgeving die humanoid-vriendelijk is (geen extreme obstakels, goede verlichting)"

Schema:
{"summary":"string","processes":[{"name":"string","score":number,"robotType":"string","roi":"string","nextSteps":["string"],"risks":["string"]}],"strategicAdvice":"string","priorities":["string"],"quickWins":["string"],"humanoidActions":["string"]}` : `
OPDRACHT — BREDE AUTOMATISERINGSSCAN
Beoordeel elk proces op het BREDE plaatje van automatiseringsmogelijkheden. Kies per proces de beste route — dit kan een humanoid zijn, maar veel vaker is een cobot, AMR, vision-AI, MES-koppeling of speciale machine sneller en goedkoper.

Geef per proces:
- Automation Readiness Score (1-10): 1=onmogelijk te automatiseren, 5=mogelijk maar vereist investering en tijd, 10=direct te automatiseren met bewezen tech
- Robottype: kies de BESTE optie — cobot, industriële robot, AMR/AGV, humanoid, vision-AI, geautomatiseerde tooling, software-automatisering, of combinatie
- Indicatieve ROI/terugverdientijd in jaren
- 2-4 concrete vervolgstappen
- 1-3 risico's of aandachtspunten

Sluit af met:
- Strategisch advies (3-5 zinnen)
- Top-3 prioriteiten in volgorde
- 2-3 quick wins voor de komende 6 maanden

Schema:
{"summary":"string","processes":[{"name":"string","score":number,"robotType":"string","roi":"string","nextSteps":["string"],"risks":["string"]}],"strategicAdvice":"string","priorities":["string"],"quickWins":["string"]}`;

 const prompt = `Je bent een ervaren robotica- en humanoids-adviseur voor het Nederlandse MKB. Je werkt voor Lapento (Thijs Dorssers) en kent het Nederlandse robotica-ecosysteem (NLrobotics, FME, Brainport, fieldlabs). Je geeft pragmatisch, eerlijk en concreet advies — geen corporate gebakken lucht.

BEDRIJFSPROFIEL
Naam: ${scan.company.name}
Locatie: ${scan.company.location}
Sector: ${scan.company.sector}
Aantal medewerkers: ${scan.company.employees}
Contactpersoon: ${scan.company.contact}
Bezoekdatum: ${fmtDate(scan.company.date)}

CONTEXT
Huidige automatisering: ${automationStr}
Doelstelling: ${goalStr}
Tijdslijn: ${timelineStr}
Investeringsruimte: ${budgetStr}
Aandachtspunten/zorgen: ${concernsStr}

GEÏNVENTARISEERDE PROCESSEN (${scan.processes.length})
${processesText}
${opdrachtBlock}

Antwoord UITSLUITEND in geldige JSON, geen markdown, geen toelichting eromheen.`;

 if (onProgress) onProgress('AI analyseert de processen...');

 const response = await fetch('/api/analyze', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ prompt }),
 });

 if (!response.ok) {
 let payload = {};
 try { payload = await response.json(); } catch {}
 if (payload.error === 'RATE_LIMIT') {
   const e = new Error(payload.message || 'Rate limit bereikt'); e.code = 'RATE_LIMIT'; throw e;
 }
 if (payload.error === 'OVERLOADED') {
   const e = new Error(payload.message || 'Servers overbelast'); e.code = 'OVERLOADED'; throw e;
 }
 throw new Error(payload.message || ('AI-call mislukt (status ' + response.status + ')'));
 }

 const data = await response.json();
 const text = (data.text || '').trim();

 // Strip code fences als die er per ongeluk zijn
 const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();

 try {
 return JSON.parse(cleaned);
 } catch (e) {
 // Probeer eerste { tot laatste } te pakken
 const start = cleaned.indexOf('{');
 const end = cleaned.lastIndexOf('}');
 if (start >= 0 && end > start) {
 return JSON.parse(cleaned.slice(start, end + 1));
 }
 throw new Error('AI-respons kon niet geparsed worden');
 }
}

/* ============================================================
 WORD EXPORT (HTML met Word-headers, opgeslagen als .doc)
 ============================================================ */

function buildWordHtml(scan) {
 const a = scan.analysis;
 const processBlock = scan.processes.map((p, i) => {
 const proc = a?.processes?.find(ap => ap.name === p.name) || null;
 const traits = p.traits.map(t => TRAITS.find(x => x.id === t)?.label).filter(Boolean);
 const photoTags = (p.photos || []).map(src =>
 `<img src="${src}" width="380" style="width:380px;height:auto;margin:8px 4px;border:1px solid #d4d4d4;" />`
 ).join('');

 return `
 <h2 style="color:#0F0F0F;border-bottom:2px solid #36B49E;padding-bottom:6px;margin-top:28px;">
 ${i + 1}. ${escapeHtml(p.name)}
 ${proc ? `<span style="float:right;font-size:13pt;padding:4px 12px;border-radius:14px;color:white;background:${proc.score >= 7 ? '#36B49E' : proc.score >= 5 ? '#F59E0B' : '#DC2626'};">Score ${proc.score}/10 — ${proc.score >= 7 ? 'Kansrijk' : proc.score >= 5 ? 'Mogelijk' : 'Lage kans'}</span>` : ''}
 </h2>
 <p><strong>Beschrijving:</strong> ${escapeHtml(p.description || '-')}</p>
 <p><strong>Inzet:</strong> ${escapeHtml(p.workers || '?')} medewerker(s) — ${escapeHtml(p.hoursPerDay || '?')} uur/dag — ${escapeHtml(p.daysPerWeek || '?')} dagen/week</p>
 <p><strong>Kenmerken:</strong> ${traits.length ? traits.map(escapeHtml).join(', ') : '-'}</p>
 ${p.notes ? `<p><strong>Notities ter plaatse:</strong> ${escapeHtml(p.notes)}</p>` : ''}
 ${photoTags ? `<div>${photoTags}</div>` : ''}
 ${proc ? `
 <table style="width:100%;border-collapse:collapse;margin-top:14px;">
 <tr><td style="width:38%;background:#F5F2ED;padding:8px;border:1px solid #d4d4d4;"><strong>Robottype</strong></td>
 <td style="padding:8px;border:1px solid #d4d4d4;">${escapeHtml(proc.robotType)}</td></tr>
 <tr><td style="background:#F5F2ED;padding:8px;border:1px solid #d4d4d4;"><strong>Indicatieve ROI</strong></td>
 <td style="padding:8px;border:1px solid #d4d4d4;">${escapeHtml(proc.roi)}</td></tr>
 </table>
 <p style="margin-top:14px;"><strong>Vervolgstappen</strong></p>
 <ul>${(proc.nextSteps || []).map(s => `<li>${escapeHtml(s)}</li>`).join('')}</ul>
 <p><strong>Risico's & aandachtspunten</strong></p>
 <ul>${(proc.risks || []).map(s => `<li>${escapeHtml(s)}</li>`).join('')}</ul>
 ` : '<p style="color:#888;"><em>Geen AI-analyse beschikbaar voor dit proces.</em></p>'}
 `;
 }).join('');

 const summary = a ? `
 <div style="background:#F5F2ED;padding:18px;border-left:4px solid #36B49E;margin:20px 0;">
 <h2 style="margin-top:0;">Samenvatting</h2>
 <p>${escapeHtml(a.summary)}</p>
 <p><strong>Strategisch advies:</strong> ${escapeHtml(a.strategicAdvice)}</p>
 <p><strong>Top-3 prioriteiten:</strong></p>
 <ol>${(a.priorities || []).map(p => `<li>${escapeHtml(p)}</li>`).join('')}</ol>
 <p><strong>Quick wins (komende 6 maanden):</strong></p>
 <ul>${(a.quickWins || []).map(p => `<li>${escapeHtml(p)}</li>`).join('')}</ul>
 ${scan.scanType === 'humanoid' && a.humanoidActions?.length ? `
 <div style="background:#EAFFFA;border:1px solid #36B49E;padding:14px;margin-top:18px;border-radius:6px;">
 <p style="margin-top:0;"><strong style="color:#1E4768;">Voorbereiding op humanoids — start vandaag</strong></p>
 <ol>${a.humanoidActions.map(p => `<li>${escapeHtml(p)}</li>`).join('')}</ol>
 </div>
 ` : ''}
 </div>
 ` : '';

 const reportTitle = scan.scanType === 'humanoid' ? 'Humanoid Readiness Scan' : 'Automatiseringsscan';

 return `<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
<meta charset='utf-8'>
<title>${escapeHtml(reportTitle)} — ${escapeHtml(scan.company.name)}</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->
<style>
 body { font-family: 'Calibri', 'Arial', sans-serif; color:#0F0F0F; line-height:1.5; max-width:800px; }
 h1 { font-size:24pt; margin-bottom:0; }
 h2 { font-size:14pt; margin-top:24px; }
 h3 { font-size:12pt; }
 p, li { font-size:11pt; }
 .meta { color:#666; font-size:10pt; margin-top:0; }
 .brand { font-size:11pt; color:#2A2A28; font-weight:bold; }
 .brand-accent { color:#36B49E; }
</style>
</head>
<body>
 <p class="brand">lapento <span class="brand-accent">●</span></p>
 <h1>${escapeHtml(reportTitle)}</h1>
 <p class="meta">${escapeHtml(scan.company.name)} — bezocht op ${fmtDate(scan.company.date)}</p>

 <h2>Bedrijfsprofiel</h2>
 <table style="width:100%;border-collapse:collapse;">
 <tr><td style="width:35%;background:#F5F2ED;padding:8px;border:1px solid #d4d4d4;"><strong>Bedrijf</strong></td>
 <td style="padding:8px;border:1px solid #d4d4d4;">${escapeHtml(scan.company.name)}</td></tr>
 <tr><td style="background:#F5F2ED;padding:8px;border:1px solid #d4d4d4;"><strong>Contactpersoon</strong></td>
 <td style="padding:8px;border:1px solid #d4d4d4;">${escapeHtml(scan.company.contact)}</td></tr>
 <tr><td style="background:#F5F2ED;padding:8px;border:1px solid #d4d4d4;"><strong>Sector</strong></td>
 <td style="padding:8px;border:1px solid #d4d4d4;">${escapeHtml(scan.company.sector)}</td></tr>
 <tr><td style="background:#F5F2ED;padding:8px;border:1px solid #d4d4d4;"><strong>Locatie</strong></td>
 <td style="padding:8px;border:1px solid #d4d4d4;">${escapeHtml(scan.company.location)}</td></tr>
 <tr><td style="background:#F5F2ED;padding:8px;border:1px solid #d4d4d4;"><strong>Medewerkers</strong></td>
 <td style="padding:8px;border:1px solid #d4d4d4;">${escapeHtml(scan.company.employees)}</td></tr>
 </table>

 <h2>Context</h2>
 <p><strong>Huidige automatisering:</strong> ${escapeHtml((scan.context.automationItems || []).join(', ') || '-')}</p>
 ${scan.context.automation ? `<p><strong>Toelichting automatisering:</strong> ${escapeHtml(scan.context.automation)}</p>` : ''}
 <p><strong>Doelstelling:</strong> ${escapeHtml((scan.context.goalItems || []).join(', ') || '-')}</p>
 ${scan.context.goal ? `<p><strong>Toelichting doelstelling:</strong> ${escapeHtml(scan.context.goal)}</p>` : ''}
 <p><strong>Tijdslijn:</strong> ${escapeHtml(scan.context.timeline || '-')}</p>
 ${scan.context.timelineNote ? `<p><strong>Toelichting tijdslijn:</strong> ${escapeHtml(scan.context.timelineNote)}</p>` : ''}
 <p><strong>Investeringsruimte:</strong> ${escapeHtml(scan.context.budget || '-')}</p>
 ${scan.context.budgetNote ? `<p><strong>Toelichting budget:</strong> ${escapeHtml(scan.context.budgetNote)}</p>` : ''}
 <p><strong>Aandachtspunten:</strong> ${escapeHtml((scan.context.concernItems || []).join(', ') || '-')}</p>
 ${scan.context.concerns ? `<p><strong>Toelichting aandachtspunten:</strong> ${escapeHtml(scan.context.concerns)}</p>` : ''}

 ${summary}

 <h2 style="margin-top:32px;">Procesanalyse</h2>
 ${processBlock}

 <p style="margin-top:40px;color:#888;font-size:9pt;border-top:1px solid #d4d4d4;padding-top:10px;">
 Opgesteld door Lapento — Co-entrepreneurship voor de maakindustrie.<br>
 Deze scan is een eerste indicatie en geen vervanging voor een diepgaande engineering-analyse.
 </p>
</body>
</html>`;
}

function escapeHtml(s) {
 return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

function buildScanFilename(scan) {
 const safeName = (scan.company.name || 'scan').replace(/[^\w-]+/g, '_');
 const prefix = scan.scanType === 'humanoid' ? 'Humanoid-Scan' : 'Automatiseringsscan';
 return `${prefix}_${safeName}_${scan.company.date || ''}.doc`;
}

function downloadWord(scan) {
 const html = buildWordHtml(scan);
 const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
 const url = URL.createObjectURL(blob);
 const a = document.createElement('a');
 const filename = buildScanFilename(scan);
 a.href = url;
 a.download = filename;
 document.body.appendChild(a);
 a.click();
 setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
 return filename;
}

/* Download Word én open Mail-app met thijs@lapento.nl als ontvanger.
 Gebruiker moet zelf het bestand toevoegen via paperclip — dat is een browser-limiet. */
function mailToThijs(scan) {
 const filename = downloadWord(scan);
 const company = scan.company.name || 'onbekend bedrijf';
 const sector = scan.company.sector || '-';
 const datum = fmtDate(scan.company.date) || '-';
 const aantalProcessen = scan.processes.length;
 const type = scan.scanType === 'humanoid' ? 'Humanoid Readiness Scan' : 'Automatiseringsscan';
 const heeftAnalyse = !!scan.analysis;

 const subject = `${type} - ${company}`;
 const body = `Hoi Thijs,

Hierbij het concept-rapport van het bezoek aan ${company}.

Type scan: ${type}
Sector: ${sector}
Bezoekdatum: ${datum}
Aantal geïnventariseerde processen: ${aantalProcessen}
${heeftAnalyse ? 'AI-analyse: aanwezig' : 'AI-analyse: nog niet uitgevoerd (rate-limit of overgeslagen)'}

Het Word-rapport is gedownload: ${filename}
→ Voeg het hier toe via de paperclip onderin (kies uit Downloads / Bestanden).

Verstuurd vanuit de Lapento Humanoid Readiness Scan tool.`;

 // setTimeout zodat de download-actie eerst start voordat we de mail-app openen
 setTimeout(() => {
 const mailto = `mailto:thijs@lapento.nl?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
 window.location.href = mailto;
 }, 400);
}
/* ============================================================
 SCORE METER — visuele indicator rood/oranje/groen
 ============================================================ */
const SCORE_COLORS = (score) => {
 if (score >= 7) return { bg: '#36B49E', label: 'Kansrijk', textColor: '#0F5840' };
 if (score >= 5) return { bg: '#F59E0B', label: 'Mogelijk', textColor: '#7C2D12' };
 return { bg: '#DC2626', label: 'Lage kans', textColor: '#7F1D1D' };
};

function ScoreMeter({ score, size = 'normal' }) {
 const pct = Math.max(0, Math.min(10, score)) * 10;
 const c = SCORE_COLORS(score);
 const big = size === 'big';
 return (
 <div className={big ? '' : 'mt-1'}>
 <div className="flex items-center justify-between mb-1.5">
 <div className="flex items-baseline gap-2">
 <span className={`font-bold ${big ? 'text-3xl' : 'text-xl'}`} style={{ color: c.textColor }}>{score}</span>
 <span className={`font-semibold ${big ? 'text-base' : 'text-xs'} text-stone-500`}>/10</span>
 </div>
 <span className={`px-2.5 py-0.5 rounded-full font-bold text-white ${big ? 'text-sm' : 'text-xs'}`} style={{ backgroundColor: c.bg }}>{c.label}</span>
 </div>
 <div className="relative h-3 rounded-full overflow-hidden" style={{ background: 'linear-gradient(to right, #DC2626 0%, #DC2626 25%, #F59E0B 35%, #F59E0B 55%, #36B49E 65%, #36B49E 100%)' }}>
 <div className="absolute top-0 bottom-0 bg-white" style={{ left: `calc(${pct}% - 2px)`, width: '4px', boxShadow: '0 0 0 1px rgba(0,0,0,0.4)' }}/>
 </div>
 <div className="flex justify-between text-[10px] text-stone-500 mt-1 font-medium">
 <span>1</span><span>5</span><span>10</span>
 </div>
 </div>
 );
}

function OverallScore({ analysis }) {
 if (!analysis?.processes?.length) return null;
 const avg = analysis.processes.reduce((s, p) => s + (p.score || 0), 0) / analysis.processes.length;
 const rounded = Math.round(avg * 10) / 10;
 const c = SCORE_COLORS(rounded);
 return (
 <div className="rounded-xl p-5 border-2" style={{ borderColor: c.bg, backgroundColor: '#FFFFFF' }}>
 <div className="text-xs font-bold tracking-widest text-stone-600 uppercase mb-2">GEMIDDELDE KANSEN</div>
 <ScoreMeter score={rounded} size="big" />
 <p className="text-xs text-stone-600 mt-3">Gemiddelde score over alle {analysis.processes.length} processen.</p>
 </div>
 );
}
/* ============================================================
 UI COMPONENTS
 ============================================================ */

const LAPENTO_LOGO = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAkoAAAB3CAYAAAD8WG/DAAABCGlDQ1BJQ0MgUHJvZmlsZQAAeJxjYGA8wQAELAYMDLl5JUVB7k4KEZFRCuwPGBiBEAwSk4sLGHADoKpv1yBqL+viUYcLcKakFicD6Q9ArFIEtBxopAiQLZIOYWuA2EkQtg2IXV5SUAJkB4DYRSFBzkB2CpCtkY7ETkJiJxcUgdT3ANk2uTmlyQh3M/Ck5oUGA2kOIJZhKGYIYnBncAL5H6IkfxEDg8VXBgbmCQixpJkMDNtbGRgkbiHEVBYwMPC3MDBsO48QQ4RJQWJRIliIBYiZ0tIYGD4tZ2DgjWRgEL7AwMAVDQsIHG5TALvNnSEfCNMZchhSgSKeDHkMyQx6QJYRgwGDIYMZAKbWPz9HbOBQAABRuUlEQVR42u2dd3xT1fvHPzc3qxnN6KKD0hZkySj7JyigAipDRFFQNgqKYAUElCHgQAGVLdOBFFAREMSvA1kqe5ZZhpTV0pa2GU2anZzfH+VeWmabpGkK5/165QWvNmnufe45z/mc5zznOQwhBJQHg6vZOSQ/Px8sKwRQ3ufOwO12QavVIi42hqHWpFAoFMqDgJCa4MHhu+++w/Ll30Gj0cDtdpfrsyzLwmAwoFevl/DB1CnUmBQKhUKhQqki+XHNT2T1qtVQKBTweDyVcg0Mw8DhcCA6Jgbz583hoyT/nc8gE8ZPgFAohNvthkwuw4wZMxAZEV6lIyksy0IsFkMsFnsllMRiMYQCqq0pFAqFQoVShbJv3wEyc8ZMMAwDhmFQWct/LMtCr9ejbbu2pX6+6ZdNSEtLg0ajASEERUVFmDTpfSxdsqjKP3BCCP/y6nOgS7UUCoVCoUKpwsjKukomTpoIoVAIiUQCj8cDhqmcQA0hBDHRMejZs2epn2/ZsgVhYWEQiUTweDyQyWTYvWsXZs78nIwbN4bm51AoFAqF8oAgCPQXjp8wEQX5BZBIJHC73SCEwOPxBPzFMAxMJhPaPNYGMdHVePGzYeMv5MqVKxCJRPz1OZ1OaLVapKauxM8/b6QhFQqFQqFQqFDyP1M/+JAcOXwYoaGh5c6R8TeEEIhEoluiSRs3bIRIJLplacrj8SA0VInp06cj7egxKpYoFAqFQqFCyX+sWv09WffTOmg0Grhcrsq9aYEARUVFaNK0CZokN+ajSQcPHSbHjh2DTCa7JcGcEAKBQABCCCaMn4C8vHwqligUCoVCoULJd/bu209mfTEbKrWq0na4lYRhGLhcLvR8oXQ0ae1Pa+Fyue6YM+XxeCCVSnH16lVMnDiJth4KhUKhUKhQ8o2srKtk0sRJEArZSt3hVlIkWa1W1KlTB0891ZFXRBcvXSb//vsvFArFXZcF3W43VCoVdu/ejRkzPqNRJQqFQqFQqFDynvHjJ6CgoIDf4VbpNywQwGaz4fnnny/18/Xr1qGwsBAsy97zb7hcxRWqV65cifU/b6BiiUKhUCiU+5QKLQ8wdeqH5MiRI9BqtZWelwQUR5Psdjvi4uLQuUtn/ucFOj35/fc/IJfLyyzmipO7QzF9+gwkJSaS5BK5ThQKhUKhlCT99Bly6NBhSKUSeDzlm18zDAOn04Ho6Bg83r4tHWvuF6G0atX3ZN3atdAEiUgCiqNJFosFAwcOhCpUyTe2Tb9sQk5OTrmO9uCSu0EIJkyYiOXfLSdVvXI3hUKhUCqG3bv3YOrUqQgLCyv3mCgQsDCbTWjXrh0eb9+WGvN+EEp79u4js2bNgkqtDorlthuK3ImIiAi88MILpX73888/IyQkpNzXWjK5e9LESVi6dDFtURQKhUK5BYlEAq1WC7VaXe7yOAKBACKREEqFghqyEvB7jlJm1lUyadL7EAqFQZG8XbKhmc1mdO7SGZGRNyI/69dvIBkZGZBKpV5da8nk7uk0uZtCoVAot4EQArfb7dMrWAIPVCj5yITxE6ALouRtDpfLBbVajV69epX6+Y8//giJROKToOOSu1etXIl163+mYolCoVAoFCqUbmXK1A/IkSNHgqLydklYloXZbMbTzzyN6nGxfDTp9z/+JOnp6bctMFleuOTumTNmIi2NVu6mUCgUCoUKpRIUJ28HR+Xtm3G73VAqlejTp0+pn69etfq2x5V4Q8nK3ePHj8e1a3lULFEoFAqFQoUSsPd68rY6iJK3OViWhclkwtNPP42EGvF8NGnL1m3k2LFj5SoJcC+45O7s7GxMnPQ+bV0UCoVCoTzoQikzKysok7c5uGhSv/79Sv08dUUqhEKh36+XS+7es3s3ps+YSaNKFAqFQqE8yEJpwviJ0BXogi55G7gRTercuXOpaNLWrdtJWlqaX6NJJbmR3L2KJndTKBQKhfKgCiUueVsZqgyq5G0AAFMsWFQqFfoP6F/qV999912FRJNKwiV3z5g+A0fSjlKxRKFQKBTKgySUVq5aHbTJ2wDACoqjSd2f615qp9uff24mR9OOVlg0iYOv3I3ikgk0uZtCoVAolAdEKO3Zu4/MnjU7KJO3gdJVuPv1K52b9O3y7yASiwKSS1UquXviJNraKBQKhUK534VSZmYWmTRxUtAmbwPFVbhNJhN69eqFqMgIPpq0YcMv5OSJk36pm1RW+OTuPXswfTpN7qZQKBQK5b4WSuPHT4BeF5zJ20BxNMlutyM+Ph69X+5d6nfLly9HSIg04NfNJ3evWoV162hyN4VCoTxo+GPcCcbAxINAuQ7FnTzlA5KWlgatVhuUeUlAcTTJYrFgzJh3oApV8tGkFStWkvPnz0Oj0VRK4jmf3D1jBpKSkkiTJo0Z2vz8h8FYSK5cuYKLFy8iKysL167lwWAwoKioCHa7DR4PAcMwkEqlUCqVCA8PQ2xMLBKTElGzZk1EV4uiz8MLMrOukvPnz+PChYu4evUqCgryYTKZYbfbQQgBywogkUihUCig1WoQFRWFuLjqSExMQO2Haj0wNtcbjCQrKwtXrlzB1avZyM/Ph9FohNVqgdPpBMMIIJVKoFAoERamRXR0DBISaiA+Ph4R4WEPfNss0OlJRkYGMjIuICszE3n5eSgsNMFiscDtdoNhAJFIDLlcDq1Wg2rVopGQUAMP1aqFpKTEoLBfSEiIT0KHEAKhUHhfPM+Lly6Ty5cvIzMzC7m5uSgoKIDJVAiLxQqHwwFCiv21WCyGTCZDaGgowsLCUK1aFOLi4hAfH4/46nEBe65ltvrKlavJ+nXrqoRIevjhh/Hiiz2ZG51MR1JTUys8gftejZxP7p4wAd99t5xEllgWpJSfEydPkb179+Hw4UPIyLiAgoIC2Gw2vpMJBAL+35KClRDC/ysUCqFWq5GYmEhatWqJdm3bol69umV+Lpv/2kJsNlup7ygLDMPA4XAgISERTZIbed0O/vjzL+JwOCAQMOX6brvdgYYNG+ChWjXL/d2HDh8m//67EwcPHsLly5dRWFgIl8vF25qz+51sLhAIIJPJEBkZSerUro0WLVugVatWqBFf/b7pDwU6PTlx4gSOHDmCEydO4sqVy9Dp9LDb7dd9EAOBgAHDMLytStqIYRiIRGJoNMVts3mzZnik9SNo3KhhpdooJ/ca2bt3L4RCEYCyD/oeD4FEIsFTnTqU+fozs66Sf/7+Bzt37cK5c+dQUFAAh8PB+3qund1sv5LtTKFQIC4ujjRr1gyPP94eLVs0rxD7/fq/3wghAMPcfpLMsiyOHj0KsVjslVgihEAkEiH32jX873+/EbeHlKvPl6Rrl84Bb0Pn/jtPDh06jCNHDuPcuXPIzb2GoqIiXkuU9NUlfUfJPsGN3UKhEEqlAtWiqpE6deugWbNmaNq0aYX6D6YsD23Pnn1kxIgRCAkJCerwH8uyMBoLMWfuHDzevi1vtNmz55Jvvvmm0qJJN19jYWEhWrRogWXLlgS0wc787HOyYkWqV3ZgWRYGgwEv9uyJyZMnVZqzzs7JIX/+uRl//bUFZ8+eg9VqgVAohEQigVAoLCVY7tROb+6ILpcLDocDDocDcrkcycnJ6PnC8+jY8e5OXac3kK5du8FgMJS73ATLstDr9ejXry8+/uhDr+zp7fezLAudTodx48ZixPA3y/TdeoOB/O9/v+G3337DmTNnYbfbIRZLIJGIwbLsLTa9m82B4tw9p9MJh8MBt8cDtUqFxo0bo3PnZ9Cl8zNVUjDpDUaye/dubN++HUePHkNeXh5cLhdEIhHEYvEt7fNmW91sI65t2u12OJ1OSKUhqFu3Dp55+mk80/lpaDWagNtp+45/yKuvvgalUlHmSSfDMHyplk2bNiE87O7XfepUOln9/Q/4559/oNPp+P4tEonu2c5utqPb7YbD4YDdbodIJEL9+vXwwgsvoMdz3f1mu4wLl8hzzz0Hj8dzyzMsiVgshlQq9Xr85OxosVh8GfKxYcPPqJmUUOFt50pmFtm6dSt27NiBM2fOwmQyQSAQQCwWQyQSlclv3Mlnl/QfhBCo1Wo8/HB9dOjQAY+3b4+wMK1f7++eEaXMzCwyadKN5O1gzEsqKUDaPvZoKZF04eIlsnbt2qA5qLd0cvcM8t5779KoUhm4dPky+X71D/hz82bk5eVBIpFAKpVCKtWAEMK/vHnGLMtCJpPxEcd9+/djz549SE5OJq+9NhhtH3vsts/I6XRBJpOBYRiwLFtuoQQAMpnMe5fHMFCpVPwsqzxCqXgQLputvv7mW/LTT2uRmZkJiUSCkBApZDLZdZt7vPYJ3MABFOfx7dq1C//++y+WLfuK9HzhefTt26dK9I0zZ86SDRs3Yvv2Hbh69Sq/xKtQKPgNL962T5ZlIZfLed976lQ60tLSsCI1Fc8/34O8PnRIQG0kEomg0aihUJRPKLndbkgkEjidjrsIfz1ZtHAxNv6yCVabFQq5HBrNjf7tbTsrbrPFy16nTqXj6NEpWLPmJzJ8+Jt4tE1rn+0nEAj4HeB3E0q+3AP3eS4C7otQKm/0u7wcPXqMrPnpJ/z7707odDq+n2s0mlsizL74Pu65cv5j79592LVrN5YuXYaOHTuQF1/siYQaNfzSP+4plMaPnwC9Xg+FQhF8RSVvCm9KJBK8OWJ4qZ8vXrwYZrMZKpUqaK7/RnL3atR66CHS84XnqVi6C3PnzSdr166DXm+AQnHDeXo8Hr88U84RcyiuD0wnTpxASspIdOrUiYwa+Taio6uVek4Oh51fSvFmluh2u32eeLjd7us5GuXbgerxeGA2m+/6ni1btpIFXy7Ef//9B5lMVsrugH/szj0/hmF4YZGVlYXpM2Zi7br15LXXXq2UpYKycCr9NFmxIhU7duyAuagIcpmMF67cEpC/26ZMFgK5XAaDwYD58xfg11//R4YNewOdn3k6IDbinll52y4hBHZ7cX+5Hbt27yHTpn2Cy5cvQ6VSQSJR+bV/c3+Hm9icPXsWI0a8hd69e5P33h3rs+04e9xNKPnT/r4IpYrrD+nk66+/xT///AO73Q653P++uiz+w2g04rvvVmDjxl/QrVtXMnDAAERFRfp043eVlpMnTyVpaWlQKpVBLZKKl9yMeP7551Gvbh3eIPv2HyB/bf4raKJJNw9UoaGhmDljJo4cSaNbGW7D9h1/k2e7P0eWLv0KLpcLGo0aLMv6RWDc69m43W7IZDIoFAr8/vsf6NuvP7Zs3VbqOTnsDj43p6rBMMxdQ/iTp3xARr8zFpmZmdBqtRCJRAGzu1gshkajQWZmFsaPn4CUt0eRzMysoOkj+fkFZNon08mgQYPx22+/QSAQQKNWQygU8iKiotITOBsJhUJotVrk5OTgvffGY/yEScRgNAatHxEIBPwy4s2sXPU9GTEiBXl5edBqtfwAWBE25OwXEhIChUKB1NRUDH51CCnQ6agP9hJjoYnM/OwLMmjQq/jrr78gFouhUqkgEAgq3GfcqW9w6SWpqSvxSp+++P6HH316vncUSqkrV5Gf168P2srbJR2+w+FAdHQ0Xnvt1VK/+3LBl0E7iN1cuTv32jXaUUswY+bnZOTI0cjOzkFYmJbvdIHMj+OiAmq1CmazGe+8MwbLvvqGvwCrzQp3FRRKXLLw7YRSRsYF8uJLvcn69euhUoVCKpXC5XIF1O7cQCmVSqBWq7Fjxw706z8Af23ZWul95Lff/iB9+vbD999/D5Zl+QhSoNsml7/EDUqbNm3CwIGDkX76TND6EbfbDZvNVupnS5YuI59++ilkshBIJJKAjTVc3w4LC8OBAwcxbNhw5OcXUB9cTnbu2k369euPFStW8P2hIoVuefwHwzDQaDQwm82YNu0TvDFsOLl85YpXF3VbobR7z14yZ/YcqIK08vbNM5WioiK8/vrrpRK4flq7jhw5cqRSd7qVpbNKpVJk5+Rg4gRauZubrb825HWyYsUKKJUK3nlW5gYCt9sNkUgEpVKJ2bNnY9bsOQQArFYrXNc7ZFWD2yFakqPHjpNXXxuK//77D1qtNqCzwbvNEFUq1fWSH2OxZOmySmsIH3z4EXn3vfHQ6/XQarV826hs0et2u6HVanH58mUMGTIUu3bvCboBn8tTKimUVn3/A5k3b36p3JVAw0WqT58+jVHvjKEOuBwsXLSYvPVWCq5evRo0/eF2vpuLvu7ZswcDBgzCtu07yt0/bhFKVzKzyPuT3g/qytslnb3ZbEbz5s3xwgs9SpQD0JNlS5cFtUgq+SBVKhX27t2LTz+d8UDPaC5fySSvDRmK/fv3IywszG95Hv4atAkhCAsLw5IlS7Hmp7UkJEQW1NHWew1cVusNoXTs+AkyfPhbMJtNUCgUQXVfJYXq3Lnz8On0wPaTrKyrpE/f/mTNmp+gVqsgEomC7rm7XC7I5XI4nU6MHDkKO/7+J+h8SXFeXBEfifj8s8+hVqtvycOqDNup1WocPnQIk6d8QKNKZWDM2HFkwYIvIZfL+ahzsMJFX0NDQ2GxWDB69DtYsWJluZ7zLUJpwvgJ0On0QVt5+2YDsCyLUaNHlfr5ksVLkJ2T43XNisroqFqtFqtXr8batesfyI565UomeeONYbh06RLUanVQdjwuKVGr1WL+/AWYP3+ez0XkKus+iicZxYNWZmYWGTVqNGw2K6RSaVDmI3KiOTw8HKmpK/HxtE8DYvT002fIq68NwcmTJxEWFlapSwplFZQsy2LsuHexd9/+oLlQbtee213crz/66OOgmoxzPnj9+vX448/NVCzdAWNhIRn86hDyxx9/Ijw8PKgms2XtH3K5HDNmzsT8BQvL/JxLCaX3rydvh4YGd/I2ULwd2mg04sWXXkKjhg34aFJa2rHi/IogTOC+10AQGhqKmTNn4vADltxdUKAjb6W8jezsbCiVyqCfnXD5UgcOHCx3/aRguxcAmDBxEvLz8xESEhL0fcblciE8PByrV6/GvPlfVqjhT55KJ8OGvYm8vLygb5cl/YhQKAQDYNy4d3H+fEbQNE632w2BgMWXCxeTy5cvIyQkJKgGWY/Hg5AQGebNm08V0R1ISRmJAwcOBHXh6Xs9YwDQarVYtGgRFny5qEz9gxdKqalVI3mbm51YrVbUSEjA668PLfW7WbNn8cmqVXGWD1xP7s59cJK73xs/ARkZGRU2GHEVX1mWveV1cyXY8ggMrpZQVYTbhTTu3fHk2LFjXu0MvZtdvbVtWcVSWFgYli5dio2/bKqQB5Bx4SJJSXkbZrMZMpnMbwLyhs0EFWYrrlSK2WzGe+MnBM0AJZPJ8Ouvv+Lnn3+GSqUqV1/nKnCXfFWEDw4JkeLSpUtY9tXXNKp0E8PeHEEOHz5cJTTCvZ4zl8i/aNEirFr9wz2ftQAAdu/eS+bMmcMXzaoKTt5ut2P06FGlznNLXbmKHDl0pFzF0IJN7UqlUuTk5GDCxAcjufvzL2aRXbt2+X25jRvAufotZrMZBoMBer0Ber0eBoMBhYWFsFgscLlc/PvL44CrYhvjHIVQKER+fj62bt1arhppXHFNTmgVFRVdt6uef3G2tVqt/PENXIFNf/YVpVKJTz+djtNnzvp1UNPpDWT06Heg1+v9EmUraTO32w2r1YrCQhPfHg0GA8xmMxwOJ/9eX4WA2+2GQqFAeno6pn7wEQmGNieRSLBz504UFRXdsz1wduBsUbISs9Pp5Hc1cXb1Z9RLLpdj/fqfy/2My/Lyl9j25eUNH338Cfn7778rRCSVnGyVPJbm5omYP58zJ5bUajU+//xz/Ltz9137iDAz6yqZ9P77QV95m4M7SqPbs93wxOPt+ad++UomWbZ0GZRVYNnwXh1VpVJh3969mD59JnnvvXH3bTHKf/7dSVJTV/o1jMvVWTKZzfC43VCpQhEbm4Do6GhotVq+4JzdboPRYMS1vDxkZ2ejoEAHh8N+vdq3tEoLofI4qLIuf3BOy+FwwGKxQCQSITIyEvHx8YiJiYFWq4FYLC62vcmM/Pw8ZGVlISvrKgwGAxiGgUwm42sN+Uvsmc1mfPTRx1i1coXf7DJlylRwB2j70i45m9ntdlit1uJ6SxoNkpKSEB1dDWq1BmKxCEVFFuTn5eHylSvIycmB3W6HTCbj7elL5E2j0WD9uvV47LHHyJNPtK9UX8KJJe7/d+vDLpcLZrP5+nJYcc2jkJAQiERCOJ3FAr348GUbf3CqP5LCuWvMzMzExl82ke7PdmPK8hmu8OzthQgDhrkhCHy9PofTef2YPW/utfw5YevWbyA//PADwsLC/Oanub7BHcnidDqv5xwLIRSyfO6a2+2Gy8Udeizij6rytsjvzbYUCAQQiUSYOnUqVqauIDcXFeaF0uhRo2E0GCCXy4NeYBQPcHZUi47GqFGlE7g//+xzFBYWBmVxSW8cXHh4OFasWIEaNWqQl1/udV+KpZkzP4NYLPbrLMtoNEImk6Fd28fwxBNPILlxYyQk3L2MfYFOTzLOZ2Dvvn34559/cPbsWf7oCH90yGCPYpZFfDocDhQVFSE2NhbPPdcd7du3R726daFWq+5q28zMLHL02DFs37Yde/buhcFgQGhoqF8mZW63G0qlEmlpaVi67GsydMirPveTb75dTrZu3Yrw8HCvBwVuELBarbDb7YiLi8Mjj/wfHm3TBvXq10d0tag7Xufhw0fI1m3bsfmvv5CTne2zrQghkEglmD17Np58on1QRDPvJtw9Hg8MBgM0Gg06duyAR/7vEdSpWweREZGIjAzn7Zadk0uys7Nx9OhRbN++A8eOHYNIJPLLZgRuk9DmzX+h+7Pd7vn+xIR45uuvvyZ3Ei4ejwciIYvf/9iM1NRUKJXKcj9PrpxHo0aNMOad0XD7UAU8KbHsx3pkZFwkX3zxBUJDQ/0ycSzZN2w2G9RqNRo3aoQ6desiKSkRUVFRUCgUEApFcLmcKDIXIfdaLjIyMnD69BmcO3cOer0eUqmUn+T54p+5Zeq8vDx8On065s2dc/uIUsOGDXD69OkqMwO22Wz4eOwYhJeombRh4yayffv2oDj01l9REYvFgoiICMTXiL8vB+g5c+eTCxcu+GWWwrIsf3Bo586dMaB/P9SrV7fMziBMq2HCtM3QokUzvDXiTWz+awtJTV2JtLQ0KBQKsCx730eX7ubUjEYjIiMj8frrQ9G9e3eEact+GGtcXCwTFxeLLp2fwfmMC2T16u+xadMmvvK5r/3V7XYjNDQU3333HZ566ilSIz7Oa7F0+sxZsmTJUqjVan53ljc+yu12w1hYiDq1a6N3717o0KEDNPcQlBxNmzZhmjZtgoED+pMVqan4/ocfIbh+rpU3tuIiMhcuXMCXCxeT4W++wQSrz7NaLGCFQvTv3w+9er2E+Op3Pg0+uloUE10tCk2bJGPQwAHYsmUrmTtvPq5cueLzSRKEEEilUpw8eRK51/JIVGTEPW3WqOHD93zP8ROniC+V/D0eD0KVSjRo8HDAnuGMmTNhsVj8cjoHN+GyWCyoU6cOunbtgnbt2iExoezC7cLFS2THjh3YtOlXnDt3DnK5nD81wBcfolarsW3bdmzYuIk81/3WKKLg/fcnMf0H9IdOp/N7HoE/EQqF0Ov16NGjBzp2eJK/katXs8ncOXOqbF7SbR2G1Qq5QoEFC+ajTetH7rto0sVLl8maNWvKndB5J3uZTGZotVrMnj0L0z+dxpRHJN2OTh07MKkrljNjx44BwzCw2WxB3TcqSiQRQmA0GtG1axesXLkCgwcNZMojkm6mZlIi8/6kCczixYtQs2ZNGI1GvyxFCIVCFBYW4quvvvLpb82ePQd2u/16bpt3bZErqDgyJQXr1q5hXuz5AlNWkVSSiIhw5p3Ro5gF8+ZCrVbDYrF4bStOTK5ZswbZObkkGH2eyWRC9fh4LFmyGGPHvMPcTSTdjg4dnmSWf/sNmjRpApPJ5FO7IoRAJBJBp9Ph+PHjfrtPh8Phc56SJ4CBgF82/Up27drlN5FUWFgIZWgoJk6cgLU//cgMHNCfKY9IKo7e1WAGDRzArF/3E/Puu+MQEhLi8/Pm+ohMJsOiRYug1xtu6SMCABjzzmhm6NCh0Ot0FbZTxddIksViQWJiIkaNHnmL4tXr9RCJRFV+iYSLJKnUaixc+CUalih7cD+xYkWqXxo31/kaNmyA5d9+g/bt2vrVXv379WWWLFmMqKioMiWg3i9wURGHw4EJEybgk2kfM9Wiovxm26ZNkpk1P37PdOzYAQaDwS9OLjQ0FJs3b8bZc+e9cgJ/bdlKdu/e7fWgwA32sbGxWLp0CV57bbBf7PV//9eKWbpkMaKqVePznLwVkwUFBfj++x+CUiQ1bNgQX3+1DMmNG3ltt7AwLTNnziwkJiZ4baubIzgnT57y6+TDD38kYM9m2bKv/FLCgcsrfvSxR5G6Yjl693rJLzfRt88rzHfLv0XTpk199iNcFDEzMxOrVq/GbYUSAKSkjGCGjxjBJ14Gk1jiMtTfnzwZqtBQ/sLWrFlLtm3ddl/kJbEsi6KiIkRERGDx4kWlDve9n8jMuko2b95crp1Wd3OwycnJSF2xnKlWLapC7NWwwcPM0qVLUL16dVgsFr/uvAjWSBJ3ZMxnn81E714vVlg7/OLzz5guXbr4RSxxk6k1a3706vPffrvc6wK1LMvCbDajbt26+GrZUjT089JIQkINZt7c2ZDL5V4fwuzxeCCXy/Hbb7+hQKcPihkll6uSkFADc+fOgdaHaCWHKjSUmThxos+J3VyeUkZGBh5EVq76nly4cAEhIVKf7MiyLPR6PXr16oUv589joqtV82vfiI+vznzz9TLmmWee9tmPcDmP69f/jGt5+eS2QgkA3nhjKDNy1CgYjUb/KWAfEQqFMBgMGDp0KFo0b8pf0PnzF8jcuXO9SowLNoTCYkcbHRODRYsXoVbNpPt2p9svv2yCwWCAUCj02cHGxcVh1hefV/g1x8ZEM/PmzYFKpYLT6aySZ7uVB4fDgWnTPsbj7dtV+I1O/3Qa07JlS58jjJwQ2LZtO/ILyncS/Lbtf5MTJ05AJpN5lWRrtVoRGxuLefPmIiIivEJsVqtmTWbSpEmwWq1etT9CCMRiMXJycvDHH38GRTvjSkdMmzYNWo3ab3Zr3qwp88QTj8NsNnvdprjlt+zs7AdSKK1btw4hIVK43d6PrVwk6cUXX8SkieMr1JfMnDGdad++PQoLC31+5teuXcPGjRtxR6EEAK8OHsiMGzcOJpOp0sVSsaGNaNu2LV5/fUipC/nwgw9gtVqrdGVkTggWFpoQX6MGFi9ehIQa8ff1KLxlyxZIpVKfxC33vD/88INSByFXJDXi45kPPpjqlzyDYIVlWRiNRqSkvIUOTz4RsJv86KMPodFofBKhJZ3c9u3by/XZn3/+GQKBwCs/4vF4IBAI8Mkn0xBZQSKJo2OHJ5hu3bp5ndvFiaU//vgjKNpaYWEh+vXri4fr1/O73Xr06AGGEfgcDTEajTAYCx+o4pOb/9pKzp8/D6nU++OZuIh/y1YtMWXypID4ko8//ggJCb4tu3KbH37//fe7CyUA6Nv3FWbCxAkwm82VVuWaqz9SrVoUpkydXOp3c+bMI4cOH/ZLkllliySj0YhatWph8eKFiIuNua9F0r79B8mFCxcglUp96oBGoxG9e/dC0ybJAbXXY4+2YZ5//nm/JCEHo0gqLCxE+/btMXBA/4DaNSa6GjN8+Jswm80+LW1yuTjbt+8o82cuXrpCDh065FU0ibNZ//79Sx2jVJEMG/YGwsPDvRKV3CCQnp6O4ydOVtrgX1zmxYHY2Fj07du3Qr6j9SP/x9SoEQ+73e71+MUwxbusi4osD1Q06bfffvNpzOeW75VKJaZMnhyw61aFKpmJEyf4VDKAq6OVkXEBO3fdKEJ5R6/U66UXmSlTpsBitYJcnzUFsiNxJ/5++OGHiIqM5J/a9h3/kOXLl99SDO52FUgFAsE9X4EojX8nkWQwGFCvfn0sWrQQ/kyWDVb+/fdfn6IGDMPA4XCgWrVqGDx4UKXcw+uvD0VERMR9tQRX0rGNHTumUq6h5wvPM40aNfIpD4xLyDx16hRyyngE0D///O1VuJ6r6Va9enWMGD4sYA0hNiaa6dz5GRQVFXllJ67Eyo4dOyqtvRXnkxWha9cuUKtCK8x2Dz9cH3a73esEeIGAuV4N3P7AiKTca3kkLS3NpyRugUAAk8mEQYMGIb56XECdZMsWzZlnnnnap6V8rhL8tm3bcU+hBAA9enRnPv74I9jsjusHGgZGLHFrmyNHjUSrVi14Q+fk5JJPP/kEcrm8lNDhZksul4svc89Vw7VYLHd8cQXhuLL4LpeLj1CVFFq3O8OqpMjyViQ1btwYCxcuQHh4GPMgdMIjR45AIpF4rfYFAgGKiorw3HPdodVoKsVmkRHhzHPPPedz9COY4BzbSy+9hBrx1SutLb788ss+LW2W3NZ97NixMn1mz569Xi3fc8nj3bp1C4ht0k+fIStXrSZvpYwkW7du83ozBLf8tm/f/kprb9wxIU899VSFfk/duvV8zl/lxpUHhQMHDqCgoMDrXeRcOZWEhAQMHjSgUnzJgIEDfTp6iDtK7PDhwzfG7Ht9qEvnZxixSEwmTJjAh7YrInmaEx0sy+JaXh5eevFF9Ovbp5ShU1LeRsb5DCiUCnjcHghYAYRCIUQiEcRicamXSCiEUCwCK2DBCgRACVHj8bjh8ZDr5wc54HIVb4V2OBxwOZ1wXBdbbrcbbrcbHrcH5HrVVf78GQELwfWDLUtGqHiHVOyVbtl9wdWDatGiBb7+ehnzoHTAy1eyyKVLlyAWi71uPy5X8fEugRqc7kT37s/ixx9/vC+KmzJM8aw5IiICvXv3qtRr6da1M7N48WKSl5fnU7kPj8eDtLSj6NSxw13fl1+gI2fPnvVqKZg7S61jx44VYou8vHxy/PgJ7Nu/D2lpabh48RJfokIikUIoZL22jVQqxfnz55Fx4SJJSkwIqA/iBGa9evVQ+6FaFfrd1atX58979IX7uTL/zRw8eMjn52u1WtG9+7OVdg+1a9VkHnnkEbJ9+3avNntxk4msrCwcP3GKNGxQnynT1qOOHZ9kROLPyHvvvgen0wmRSOQXscRFZbhlNqfTiaKiIjzx5BOYOnVyqU7009r1RKPR4M3hb0KlViEsLAwqlQoqlQpKhQIhMhmkUmmpit3lwVhoIlw0yma1wmK1oqioCGazGSaTCabCQhgMRv4AUIPBAKPRCLPZjKKiIthsNjidzuLzfnBdTAlZCIVCCIVCPjJVUFCANm3aYPHihQ+MSAKA//47B5PJ5HUpB4FAALPZjDZtWldq1AMAasRXZ5KTk8muXbuqfKFTgUCAwsJCPPPMMxWejFwWWrd+BD/88KPXlai5qNK5c+fu+d6zZ89Bp9PxR9WUdzCoW7cOHqrlvx2qJ0+lk4MHD+LAgYNIT09Hfn4+PB4PxBIJJGIxNBoNP/HyNUnZYDDg2LFjSEpMCLgwdzgcaNSoUYV/V3h4mNclHx5U0tPTIRZ7H/Xnzirt1KlTpd5Hp04dsW3bNq+j01wfP3XqFBo2qI8y79Fu364tM2vWF2TMmLFwOBxeOzJOHHEnj3PCS6VSoWbNmujQ4UkMHHhryO7Fns8zL/Z8vsIMqwpVemXR/AIdKSwshEGvR15+PnJzcnEtNxc5OTm4lpeH/Px8GI1GWCwWmM1mdHrqKcyfN4d50Drgf/+d9ykCw7WZRx55JCjup02b1vj777+rfJ4SVy+mQ4cOQXE9jzzSGmvW/ORTMqZIJEJWVtY933vu3Fmvcs24wb5u3Xo+3Wtu7jVy7Nhx7Nu/H2lpabh8+TIsFguEQiGkUimUSiV/zht3QKg/SUtLw3OVMPNnGAZ169at8O9RKBT3RSHiQJF1NZtkZ2dDLPYuEMKlRjRr1qzSJ7PNmjWHVhsGm83qdVSRYRj+eLdyFbNp3foRZu7cOWT06Hdgs9nKdQAhtyxlsVjgcDigVqvRpEkymjRpiuTkxqhZq9ZdD4u8FwU6PbHbHXA6r+cbOV1wOB3FD5wQuEusNXPRHQEjACNgipfvhCIIWAEkYglEIhGEouIlvXsJqPAwLRMepgXuMDPTG4xEp9Mh+2o2cnJz0fOFHsyD2AkvXrzoU04Pt2OncePkoLifxo0bIyREVqWjSdyAHx0djTat/y8o2mXdunWgVqvhcDi82rLPpQfo9Xqcz7hAaiYl3vG+MjIu+JQPlZSUWO7PHT9+ghy4HjU6c+YM8gsKQK4fzCmRSEpFjSqqbXFLC6dPnwn48/V4PBCLxYiPr17h3yWRFPtyb9vSg0ZmZhZMJlO5I6wl/YnT6USzZk0r/V6iIsOZmjWTyOHDhyGXy732I5cuXSq/UAKAFi2aM/PnzydvjxwJq8VSJrHEVZ32eDxo0KABnnqqEx597LEy1Qw6fuIkKSgoQH5+PnQ6HfS64mWvwsLCG8tedhsc9tIJ2R6Ph88t4oxEPAQEpFQSdsmkbYZh+KUyoVAIsVgMiURCJFIJ5DI5FAoFFEoFQpWhUKlUUKvVUKtVUGs00KjVCA0NRVRUZKl70qhVjEatQk0vnOr9RG5urk/K3ul0IiwsLCAOtiw8XL8eEx4eRnxJfAwGoWS3O1CrVq2guaaY6GpMdHQ0OXfuHEJCvKvjws1s8/Ly7trvsrOzva7DJhAIEBkZec/3ZWfnkKNHj2H//v1IO3oUV65c4eu/SaVSqEJDeQFREVGjuwmlnJwcXM3OJTHRgdtx6/F4IJPJEB4eUeHfVTK1g1IWoZQJXw7t5aLT9evXD4r7qV27Nvbt2+d1gVahUIj8/HzvhBIAJCc3YhZ+uYCkpLyNQqMRIXc5BZxhGBgNBjRp2hSDBg1EuzKex3X48BEy7ZNPcPnS5WLx43KXEjn32ubPsmzp6s8MwIApZYibDQOAz5UqOavj/i35f5DiY3cYQXFCuUQigUwmg1KpJGq1GuER4YiJjoFSqUTnLp0RE12NeZA7IVde3luh5HK5EBUV5fUSaYXMWqKikJubW2XzIIq3wbrw0EO1guq6YmJikJ6e7tN9uVwu6HS6e7ZJgYD1arbJsixCQmS3/X1a2lFy4OAhHDxwAGfOnoVOp+Prs0gkEj55PFDCqKRdiqO6BIQwyMzMwokTxxETHRXA9uZGSEgI5HI5VSZBN5nN8cmPeTweyORyxMUFx2S2Ro14nz7P1UnLyb1GvD5H4uGH6zMLFy0kb72VAl1+PmRy+S2dnmEYFBVZMOT1oRgx/M1bBrij+TlEK5GiurJ0+fpDh4+QlLdSYLVa+Q51syrko0R3EDy3/I6A37l2r1nI7Tr47f5f8ns8Hg+KiopQWFiIy5cvAwDy8vLQu3dvvx2QWVUxFpqIt3Vfbgx87jLN4AMtlHyZgQWLWAoWx8YRGRkBt9vjk10JITAYjHd9j8ViAct6vxysVqsAAFeuZJJjx49j3759OHbsODIzM2Gz2SASiSCRSKBSqQIeNeKeLffyeDyw2+3XCzAKEBERjvbt20Kj0Qb02XLRLK1G9UD7xGBEp9P7VOPO5XJBrVYjLEwbFPcTFRXl9eS8uI5Wcc0xk8kEoS8XUqf2Q8ziRQvJiBFvITcnB/IStT24CsqDBw++RSRtzswgy8+lob4qHMMfblHqb+7du4+MGTsOLpfL54NTve3IZfnZnRSoUCgEy7LQ6fV4++238c47ox54h8DVqvKt6rIHGo0mqO5LrVZV6RwlLjISHh4WZHZVA/A9QldUVHTnaJKxkHhbNJQb7L///gfodDpy4sQJGI1GEADS61Ejbtkw0FEjgYDhj+5wuVyw2WxwuVyQyWRISEhAkybJaNmiJRo1boSoyAimMtqcL+c8UioOs9ns0+TE7XZDqVBUaBHRcvkRldqnI864lA+z2QyfW2xSUiKzePEiMmLEW8jMzOSPFeGq1r799lu80fR2G/ng8A6kGwswrG4zPJdQt5RBf/31f+Tjj6cBAMRicZWsU8OAQX5+Pl597TWMGplCZ00Anzvma4QgJCQkqO5LJpNV+WcjEAiC7j5kMrnf2t2dnbrHa5HLDfb/+9//AAAhISFBETVyu92wWm38pCQ8PBzNmzdHixbN0bx58wo5U41yf01ovc3p4j4nDZEGzf2EhEgh9OGoKS4S63A44BdpHx9fnVm8ZBEZMfwtXLhwAWq1GkVFRYiNjS09i7NZ0a5aDcx55OlbOuzcufPJt99+C5lMBpZlq9xMnXNWeoMew94chuFvDqNO6ToetxvE4+YHGW+RSMRBdV9isbhKPxcuvCwSBdd9+LIcVqrdedx3/Y7inVDe206hUPD/D2zU6EaSstPphM1mh9vtglwuR61aNdEkuQlatmqJhg0bIuIBqfpP8Yc/8PjBnwTPGZisUAiBwPdkfo/HA7/FQGOio5nFixeRt95KwdmzZ6GQy3H+/HkU6PQkTFt83ESiSsMkqkovn5xKTyezvpiNffv2Qa1WV+i22IoWSQaDASkpKRgy5FXqnEraRyAAwwgAeMDA+0UVtyu4IowuV9WvzA1CeBEbTALOX4LiTqhVoYxIJCK+LPEFyk/dGjWywu5wQMiyiIiIwP/9Xz20bNESzZo1Rd26dajvoXjb0vziT4LGj1yP7jJ+sItfF4sjIyOYhYu+JCkpI3Hq5Ek4nE689+57GDPmHVKnTm3+eg3GQpKeno4/fv8df/21BTabDRqNpmoutV1fTjIajRgzdgwG9O9HHdVNFNeoYkGcTkAg8LozWW22oLovq9Vatd0iw8Dt8cBmD65DP+12h39mlOzd3ZtMFhK0k7Jbo0Y2uN0eKBRy1K5dG02aJKNVq1Zo0KABuIkoheILXO6YT4eW32W5O+B+xOGA2+MBK2R8ylMSCln4PasuTKtlFn65gLz99kikpaXh2LFjGDRoMGrVqkVUahWKzEXIyclBbm4un7Atv82OuSojkgiByWzG+Anj8XLvXtRh3U4oiUUQiUQ+CQuGYWA2m4PqvgoLC6v0wbhchKKw0BRU12U2++d6ZLK757SpVCq43e6gqLVzY+s+bkSN7HYIhUJERUWhfv36aNWqJZo2bVrhZ6RRHkxkMhk8Hu8r4nP1y4IFk8kEl8sNiYTxeucby7KQyWSokO0HKlUos3z5Nxgy5HVy4MABqFQqnDx5Eh6PB4LrdYdkMhnvqKviziHOuVosFkyeMhkvPN+DOq87oNWomZCQEGIwGLzuhCzLQldQEFT3lZeX55dDNysTj8eDa9euBdU16XS660u1vvVPpVJ51/dERkbxQqkyKBk1cjgcsNvt8Hg8UCqVqFu3Lpo1bYoWLVugQYMG0KjpdnpKxaJShfqUp8SyLEwmE7Jzcokvp2z4i/z8fJ82EXmuV8xXKpWo0H2ay5YtYd58cwT5d+dOhIeF8UeIVMU8pJsdHLez78MPP0S3bl2oE7sHoaGhyMrK8mr2zu0yysnNDap7ysnJ8Wn7abAI/osXLwaZXXPBsgKfznsTCNh7lpOoUaNGQP1QyaiRy+Xij3MSiUSoVq0aGjz8MFq0bIFmzZqiZlIS9SmUgBIeHu71Z7nJrNlsRm5uLqKrRVX6/WRmZvm05OZ2u6FUKiteKAHAwoULmLdHjibbtm6FVqvlxVJVFklc9e5pn0zD0091og6tDISVEMreIBQKkZeXFzSzlYwLF0leXl6VPnSTO0D2v//+C6rrys7O9smuxXWORAgPu7vjr5mUBJZlK9xflIwa2Ww2EEIQGhqKBg0eRtOmTdGqZUvUr18fqiCpP0N5MImJifUplYAr0Hj+/HkkN25U6ffz33//+dS/XS4XNBoNNGoVE5DKX3PnzGLGjn2X/P777z4PmMEgkjweD2Z+NhNPPN6eOrYyEhsb6/UyBxdRMhqNOH/+fFDMVk6ePAmTyQS1Wl0l8+uAGweUXrhwIWgE6Jmz50hubq7XQombCSoUCoRH3F0oJdWqCbncv0Vt7xQ1EovFiI6ORoMGDdCyZQs0bdIEiYkJ1H9Qgoa4uFiEhPi2wUEgECAtLQ0vPN+j0u/n7NmzEIvFXh/w63K5EB0dXTxRD9RFf/bZDEYkFpNfNm6skmJJIBCAq+T7+Ref47FH21AnVw6SkpJ8ygXhGu7BgwfxaJvWlX4/u3fvqdJHl3CIRCLodDrs378f3Z/tVunXc+zYcRQVFfm0C9bpdCE+PuKelacTa8QzcXGxJCMjA1Kp1OcBAgB/TAghBCqVCo0bNULTZk3RsmVLtGrZImAN5kjaMdIkuRH1UZQyU69uHUaj0RCdTufVRIXL6UlLO1rp93Lo8BFy9Wq21ztbuQkXd2B4QGvJfzLtI0YsFpG1P62FVqutMjNxlmVht9shEorwxazP0apVS+qAykmtWjUhkUh8qoYskUiwd+8+4O3KvZcCnZ4cOHDA59lXMMDlFvzxx59BIZR27tzpU4J88YTGgYSEGmV6f8OGDZCenu5T1XeGYWCxWAEQxMbGomHDBmjVqhWSk5NRI756wH1FxoWLZMiQIahZsyYZMuQ1dHjyCeqvKGUiMTEROTk5Xh30zfnoy5cvY8ff/5D27dpWWrvbtm0bHA475HLvTh3g/GL9+vWK/Uqgb2DqlMnMK6+8Ap1OV+H5Af4SSTabDRKJBPPmz6UiyesOmITw8HCvdyF4PB6EhITgzJkz2H/gUKUmBW3evNlrZxJseDweyOVyHDhwAMeOn6jUm8nMukoOHTp0fZuyx6d7qlevfpne26pVK58igwKBAFarFY8/3h7Lli3Bpl82MJ9M+5jp/mw3pjJEEgB88smn8Hg8yMjIwDvvjMGwN0eQw0fSCPVClHvRuHEjvxz0vWHDhkq7B2OhiWzdus0nP+J2u6FWq1GvXiUJJQCYMOE9ZuCggUEvlliWhdVqhVyhwJdfLkDTpk2oSPISVaiCqVOnDmw2m08FzTweD3766adKvZc1a366L6JJJe3qdDqxbNlXlXodGzZsgMFg8OnQVI+neFabnNy4TO9v1qwZIiIi4O0BuRwGgwHNmjatdP8wZ+58snfvXsjlckgkEoSGKrFnzx4MHfoGJk2aTC5cuEgFE+WOtGzZEhKJxOsJoMfjgUKhwL//7kTa0eOksvxIZmam1/fBJaXXrl0bXN5mpVXLG/POaGbo0KHQ6XT8zpBgE0kWiwVqtRoLF36Jhg0bUJHkh07oS90aLkl3+/btOHqscjrht8tXkHPnzkEqlVb5aFJJ5xYaGoq///4bv/+xuVJu6tq1PLJu3XooFAqvBSjDMHA47IiJiUGT5MZlamRhWg3TrFkzWCwWr3b8cBG5PXv2YPl3qZXaIH5c8xP55ptv+A0GHo/nejVvBSQSMTb+sgn9+g/A7DlzSX6BjgqmgE9I/NNXK5KmTZKZGjVq+GVCu2DB/IDbOL9AR1JTV0Iul/vkR5xOJ1q3vpELW6llhVNSRjAjRoyAwWDgzzIKFpFUVFSE8PBwLFq0EPXo+Ul+oU2b1ggNDfUpN41Lsps9e07Ar//8+Qzy1VdfQalU3jfRpJIOOCQkBJ/N/AxZV7MDPojOX7AABQUFPpUF4GaCzZs3L9fnnn76KZ9tp1KpsHTpUpz773ylCJA1P60ln346HUql8hb7ea6feaVWF1ci//rrb9CnT1+krlxFxVJAxxXfUoIZgSAgxzi1a9cWNpvN61IBXFRp7959WJG6MqBt7IsvZuHatWs+pUW43W6Ehobi8cfbB4dQAoA33hjKjBo9CkajkR8IK7UxC4uLZkXHxGDx4kWoVasmFUl+IqFGPNO4cWOvZ+8lO+HBgwexcNGSgHbCiZPeh9VqrfLVuG9Hce0hMfQGPcaNezeg373p19/Ixo2/+CyiuQTMJ598slyfe+Lx9kzNmjW9nkVz32uz2TBx4qSAP7uFixaTadM+gVwu56/nTgOAQCCARqOBwWDAjBkz0fPFXuSPPzdTwRQAZLIQr8c3QgiELAu9Xl/h19m5c2efIjIlxca8efOxe8/egLSvVat/IL/++it/NJG3k62ioiI0b94cCTXimaARSgAweNBAZty4cTCZTJUqloRCIUyFJsTHx2PJ4oVISKhBRZKf6dKli8/HRrjdbn4Gv+nX3wLSCYePSCGnTp3y2YEEM9zS5vHjxzH09WEBsev+AwfJtGnTIJfLfRKfDMPAZrOhVq1aeLTNI+VuXN26dYPFYvVJwMvlcpw5cwZvDBseENvl5l4jI0e9QxYuXMQf13IvGxJC4Ha7IRQKodFocPnyZbz1Vgpmz5lHxVIFo1QqIRAIvD53TCQS4dq1a7h48XKFPquHatVkWrduDbPZ7FMOMcMwYFkW48a9iwMHK3YDzi+bfiWff/65X1YsAOCFF14oLaCCpRH17fsKM3HiRJjNZhBCAi6WuIKGNWvVwuIlixAbG0tFUgXQtcszTGJiok9r4DdmaDJMnToVGzduqrBOWKDTkaGvDyP//vuvTzOVqiSW1Go19u7di1f69CMXL16qMNvu3LmLjB79Dh+R8UUocctuXbt29erzzz33LGJiouFwOHzKoQsNDcXu3bsxZOgbpKAC84DW/7yB9Os/ANu2bYdGo+GX18oz8LrdbojFYkRERKBjxw7UOVUwGo3GpyOPWJZFYWEh9h/YH4DxuK/PfZITdw6HAykpb+PXCprUfrv8OzJlylSfSnyUjCY1btwY7do+ygSlUAKAl17qyUyZOgVWq5U/jThgIslgQN169bBo0UJUi4qiIqkC6dmzJywWq0+zFU5MSyQSTJk6FbPnzPV7J9y1ew8ZOHAw9u3b90CIJA6XywWVSoX09HQMHDQYP61d53fbfvPtcjJq9DtwOp0QiUQ+RemKk7gdiImJwbNe1oLSajTMSy+95PMsmot27t+/HwMHDcbOXbv9arstW7aSgYMGkylTPoDRaIRK5f0MWigUQq/XY+DAgWjwcH3q8yqY8PBwrwsgAsVRS6lUijVrKn7Xb7Omyczjj7dHYWGhT/2Bq/4PABMnTcLkKR+Q7Owcv/SJjAsXyMhRo8msWbMhk8m8Okf0Zj/icrkwePDgW0VUsDWmHs91Zz76+CPYbDZ+Tb2iRZLBYECjxo2xaOGXiAgPow6jgunfrw+TlJQIq9XqU1SJE0sKhQJff/0ter/ch2zf8bfPnfDcuf/I+5OnkJSUt5GTk+NzOLeqRpYUCjlsNhs+/PBj9B8wiPzxx58+23bnzl1k4KBXyezZcyASiSAUCn1eyuQO4+zVqxe0GrXXDWrIa4OZpKQkn9slF1nKyclBSspITJg4iZw4ecpr2124eIl8910qefmVPuSdMeNw7NhxqNUqCIVCr9slF51o2bIlhg55lfq8AFA9LpbRasO8rlNECEFISAjOnTuHKVM/LFd7upqdW+729+abb0Iul/vs+zweDwQCAZRKJX7+eQP69O2HufMWkPMZF7zqE2fOnCUzZn5O+vcfhO3bd0CtVoMQ4pNI4vpDu3Zt0b7dY7c8HGEwNqgunZ9hRCIRmThhIn/OV0XkhXAzquYtWuCbr5dRZxFAhgx5DRMmTERISIhPx9lwHUSjUePcuXMYNWo0kpOTSefOz+D//u//EF89rkzPNfdaHklLS8Nff23B7t27YTaboVQq+V12DyJutwcsy0KtVuHEiRMY9+54LFm6jLRt+xjatGmDhx56CBq16p72PXP2HNm/fz+2bNmKY8eOAQC/hd3XpHiBQACLxYJatWrh1cEDfe7DI0aMwJgxYyCVSn167m63m6/j8uuv/8PWrdvQpEkT0rbtY0hOTkb9enXveK1ZV7PJxYsXcezYMRw6dBinT5+GwWCARCKBUqng/74vNnM4HFCr1fjgg6nUGQWQGjVq4OLFi17X+OFOtN+wYQOys7NJ3759UL9+PYSH3ZjgZ2fnkLy8PFy4eBGnTp3CoUOHQQjBurVryvVdNZMSmUGDBpG5c+f6fOwY56fVahUsFguWffUV1qxZg4YNGpBmzZuhfv36iIuNhUqthrrE4dAGYyExGAzIyszEiZMnceDAQZw4cQJFRUVQKBR+mcRyPl4ul2PkyJG31wrB2qA6dezAiMVi8t649/wSnr+dSNLpdGjdpg2WLF5IRVKAebZbV+a3334ne/fuhVKp9Lmxu91ufo26eIA5BLVajcTERFKzZhJiY+Og1WoglUoBAFarDQaDHlevZuPihQu4cPEiCgoKAAByuZxfarvfdrd54+Dcbjcf2r5y5Qq+/vobpKauREREBKpXjyMxMbEICwtDSEgIGAawOxwwGgzIzcnFlcxMZGdnw2w2QywW8zuz/CU+uWW3lLdT/PL3nurUgdn6zDPk999/h0aj8Wlw4PwV15b27t2LnTt3Qi6XIywsjISFhUGlUkEsFsPtdsFkMkGn00On08FkMvF+TyqVQqPRgBDisw/katw4nU588cUXZZ5IUPxDgwYNsG3bNp8ilh6PB0qlEgcOHMCBAwcQHh4GhUJBQIr7nqWoCOaiItjtdgCAWCyGUCjEmbP/kTq1a5Xri4cOeZXZvXs3SUtL85ufZlkWGrUabpcLe/fvx85duyASiSCXyyGXyxESIiUCAQuPxwOr1Qqz2QyLxcL3h5CQEKjV6ut1wnz3IyzLoqCgAOPHj0fNpESmSgklAGjfri0za/YXZMyYsfwJ3P4QS0KhEAU6HR5v3x7z58+ljqKSePfdcejbtx+cThdYVuCzKOHaBjeou1wunDhxAkeOHOGX6YrXsQGA8D8TCoV8FWOgeHZRlg7I7WB5EMQUZ1uJRIKQkBAQQmAwGHDt2jXs23cAhHhuGZBZloVIJIJIJPLbQH+7yU6PHj3w5OPt/daPx40bi+PHjyE/v8Cn8wlLDg4AoFAoeKGSn5+PnJycUknYAoEAQqEQQqEQcrmcz7nw14BQPDgzMJkK8cEHU73aHUjxjZYtW/hU+bpkf+QmHYWFJhgMN8rrCAQCvp9y7Uqn0+HEiROoU7tWub9r6tSpGDBgAGw2m18CFtzkCwwDRYl27na7YTAYoNN5eN8sEAggEAgqpD+U9CFPPdUJffu8fMf+IAj2htW69SPM3LnF+Qx2u93nI0+EQiEKCgrQqVMnKpIqmcSEGsy4cWNhNpv8movGdSSBQACZTAa1Wg2NRgO1Wg2VSgW1WlXqZ3K5HCzLwu0uewfkzviy2+1BV1W+vJTH9pxD83g8/ICuVqug0WhKvdRqNRQKBZ/IyX3GX3BFYR966CF89OFUvz6A8DAt89FHH/FO2V/Pl2uX3G4gmUwGhUIBpVIJpVIJuVwOsVgMgUDAv9dfNhMImOuDqhHvvjsOz/d4jvq+SiC5cSMmKSnJL7t+PR4P3w/FYjHEYjFEIhG/W42b8HFtiFv2Li8JNaozH3/8ERwOh1/7Q8k+wf1d7l4kEgkfCeMmF/72IUIhC5PJhDp16mDK5Ml37z9VoXG1aNGcWbBgPkJkMr7gny8iqWu3rpj1xWfUUQQB3Z/txgwY0B8FBQU+nfF1p0Gd62B3e5V3azXLsjAajejQoQM6duwIs9kcsB2aFYHFYvE6ufRu9i2vXcsj7BwOB6RSKT799JMKsUnzZk2ZiRMnwGQyVcipAZztbn5VRISSZVm4XG4UFRVh4sQJ6NvnFer7KpFOnTrBZrP57ZxTrs2UfN0sRiQSCU6dOuX1dzz2aBvm/fffr/Bah/e6F/9OtCwID4/ArFlfQFUiL6rKCiUASE5uzHz55QKEhobC4oVY4kRSj+efx/RPP6GOIogYO+YdpkuXLhUilipikLbb7dBqtZgx/ROmXr16cDicVTaqxDAMkpOTfaofFGj7u91uuFwuTP/0U9StU7vCLrrHc92ZUaNGQa/XB9URS+X1e1wl/JkzZqB3r5eo76vsyWH3ZxERERGwPsdV3c/MzESGD4ciP9+jOzNx4kSYTGZ+J1tVRCgUoqioCBqNBl8umIca8dXv+RCq1J02eLg+s3DRQmg0GlgsljKLJS5Zq3fv3n4P01P8w2czpzMdOnQIarHErZE7HA5+txDLCiAUslXS5gzDwG63Y9KkiRgwYAAKCgrAsmzQCgKWZeF0OuF0OjF9+qd47LE2FX6hgwcNYEaPHgWDwRDQ2m7+EJQsy0Kn0yE+Ph7Lli1Bp04dqO8LAiIjwpmXX34ZJpPJb1GlsvQds9mMkydP+vR3evd6kfn44w/hcrlgt9uDfmJ7O5FkMBgQGxuLJUsWo3bth8rUJ6qcJKxT+yFmyeJFiIyMRFFR0T0bGucs+vXvj0mTJlBHEcTMnTOL6d69O/Lz8/kkvmASFQBgNBoxfvx4tG/XlgGA8PCIKp+jVFRUhBHDhzGDBg3kd/4FmyDgZoEikQizZn2Bjh2eDJjRXx08iJk8+X3YbDY4HI6ADW7etlOhUAi73Q6jsRA9evTAz+vXMg/XpwUlg4mhQ15lGjRoEFCxBABpaUd9/hvPduvKfLlgPrRaLQwGA4RCNuh9oEAgAMMwKCgoQKtWrfDN11/dcYfbfSGUACApKZFZvHgRYmJjYTabb6tquV03Op0Or772Kt4dN4Y6iirAJ9M+YkaMGAGz2Rw0MxaWLd6qajKZMH78e+j1Uk++LalUqip9SG7JarbvjhvLjB07BhaLNWhszwlmnU6HxMREfPXVMrR97NGA9+WXXuzJzJs3F6GhoTAajXySaTA9R66d6nQ6VKtWDZ9/PpNG0IOYDz/8ADKZLCDim1t+S09P98vfa9myBfPdd8vRvn176HR6uFyuoIyscxMHq9UKq9WGIUOGYNnSxUxERHi5+kWVzUCNj6/OLF68CAkJCSgsLCzl1Ll8Ar1ej2FvDsOokW9TZ1GFeHPY68zcubMREREBnU7HDwKV1cnMZjMABtOnf4o+r5TeQqpShUIkElXpEgElB/xBAwcwCxbMQ2RkZKXbnmVZvo7Kiz17Yt3aNUxF5iTdi0fbtGZWfLccbds+Bp1Od31wqFzBxNnJ7XZDr9dDJBLh9deHYtMvG5hOHelSWzBTp/ZDzMyZM0AIgc1mq9CJCXeUyKVLl3Hp8hW/OKtqUZHMvLmzmSlTJkOpVEKn0/PnNlb2JILrFy6XCzqdDrVq1cKihQsw8u23vLowQVVuaLEx0cyixYvwUO3apWZ5DMPAYDAgJSUFw98cRp1FFaRd27bMytQV6NXrJdjtdhQWFkIgYALSCUvOzgsKClCvXj18/fUydH7m6Vu+WKlU8rV2qvoSHEeb1o8wK1NXoHfvXrDbHddtLwiI7bnvcTgc0Ov1qFWrJubNnYMpU94PCuPGxEQzC+bPYyZPfh+hoaHQ6XR8Eb1APX+ufXK7//R6PaRSKfr164tVK1Px1ojh1OdVob62YMF8hIaGwmAw8M+1IhAKhTCZCnH69Bm//t0Xe77ArF61Ev369oVAIIDeYOD7RKCX8Dn/4XQ6odfroVarMXbsGPz4w2qmVauWXvcLQVVvaFGREcyihV+i/sMPw2g08lu3x4wdgyH0DKPbOllfXoFEq9Uw70+ayHy1bCnatWsLq9UGo9FYqhP665q44mY3z87fTknB6lWpzJ2OnFAoFJDL5bxQCmZ7lgeNRs1MmjiB+eqrJWjXti2sViuMRiM8Ho9fbV/S7kBxvpTBYED1uDi8P2kSfvzhe6Zt28eCzlAvvdiTWb1qJQYNGgiJRAK9Xs8voVSEaOLEEcsK4HK5YDQaYTKZEBcXhxEjRmD1qpV4d9xYpnoAKm376kMC2e6rwrW2bNGcWbGieBnLaDTyuxT91Y5utJ3iFIF9+/b6/R4iIyOYd98dy6SmrkCfV16BTCaDXq+HxWIBAL/76zvdm9lshsFgQGRkJFJS3sLq1SsxoH8/n7+0aqWs34GwMC2z8MsF5O2Ro7B/3z5MmTqFboO9DR6PBy6XCy6Xq9yVTQkhcLlcFXLm3r1ITm7MzJs7B4cOHyHr1/+MXbt2Ib+gAEKWhUQigUgk4jvgzbU3bl4S495X0gly92az2eFyOREZGYnnnnsOffq8gupxsXdtR2pVKBMSEkJyc6/xhQKD3Z7lsn3jxsy8eXNw6NBhsnbdOuzevYffmSiVSkstPd2r7klJ25e0gd1uh9PphFKpRMuWLdCta1d07dol6PtvREQ4887oUejdqxfZsHEj/vxzMy5dugRCCKRSKUQiET+jLmmbe9noZju53W7Y7XbY7XYIBAJERUXhiSeeQKeOHfC4HyuSl6fdetN2uWr5gTw7kSsl4W1NnkD1z9iYGGbe3NnY/NcWsnLlKhw/cQIup5NvRyWXv8vSx7j3ud1uOBwOOBwOkOtRJZvVVmH3kZSYwIx/bxwGDx5EtmzZgr/+2oLTp0+jsLAQLCuERCIu1S/K4jdu1ze4Z+N0OmG32+HxeKBSqdC6dWs8/fRTeLZbV7/2i/tCKAGAWq1iPvtsJtm//wC6dnmGiqTbIJVKoVQqoVAoyu0AuPo10hBppV1/s6ZNmGZNmyA7J4f8++9O7Ny5E+npp5Gfnw+n08nPwoRCIZ8EfLPjKFkg0eVyw+O5fvaQRoPk5GS0b9cOjz/xOKIiI8rchiIjI5GXlweZTFZmu/L2lEqrRNtp1qwp06xZU2RmXSX//P0P/t25E2fOnOYTObnjN0rOHLlEce5VshglV51aq9UiObkxWrVqhUfbtMFDD9Wqcn03NjaGGf7mMAx/cxi2bttOduzYgSNH0pCTkwObzVbqaJKSyxElBSPn+LmBnRMUAoEACoUCSUlJaNy4EVq1aoWmTZpAq9VUip2EQqHXPoQ7l487eiMQ0SS5XM7b3VuhFMjlo04dOzCdOnbA3n37yZYtW3Ho0CFcvXoVJpOJL09Rsn+V7GNcwVLuuXDnp8XERKNWrVpo3LgxmjVrhjpl3BLvC1GREUyfV15Gn1dexpmz58i+fftx8OBBnDt3Dvn5+bDZbPz9cBGhO93XzX6bi96HhIQgMjISdevWQcuWLdGyZUsk1IivkHtjHvRDPx808vILCHdGWXmdjsfjQUR4WFANZAU6PTl39izS008jIyMDV7OvoqBAB7PZDIfDAZfLDUI8fIhWLBZDJpNBo1GjWrVqSEhIRL16dVG3bl1EV4vy6t6MhSZSXDxOAIAEzJ56g5H06tWbz8/z5pk6HA58883XaNjg4XJfR+61PHLmzBmkp5/GxYsXkJ2dA71eD6vVCqfTyQ8y7PXIn1KphFarQbVq0UhISEDt2g+hZs2aQdem/MWRtKPkxIkTOHvmLC5fuYK8vGswmbh2eSMiw9moZNuMji62UZ06dVCnTh0kJSYwweNDdKRY5Hk3dggEAmg1aiZQ/sHXMS48TFuptj995iw5d+4cLl26hJycXH5Jy+Vywu3mjjARQSYrPsw7PDwM1apVQ/Xq1REXFxd0Bx8fP3GSnD9/HhcvXkL21avIy8/nlxydTuctR5qIRCLIZTKo1GpERIQjJiYWiYkJqFmzJu6UEkGFEoVSRgdps9rgcDr4mTl3htD9MjBXtlC643XpjYSzOxfhC6ukCEiwkZl1lZhMZths1uLlEEIgEokhlUqgUCgQqgyFRqOitqI8kOQX6InLdWOSJRQKK12oAvfR0huFUhI6MFcedKC/M3GxMdQ2FModCA8LTr8toI+GQqFQKBQKhQolCoVCoVAoFCqUKBQKhUKhUKhQolAoFAqFQqFCiUKhUCgUCoUKJQqFQqFQKBQqlCgUCoVCoVCoUKJQKBQKhUKhQolCoVAoFAqFCiUKhUKhUCgUKpQoFAqFQqFQqFCiUCgUCoVCoVChRKFQKBQKhUKFEoVCoVAoFAoVShQKhUKhUChUKFEoFAqFQqFQoUShUCgUCoVChRKFQqFQKBQKFUoUCoVCoVAoVChRKBQKhUKhUKFEoVAoFAqFcr8jpCagUKouDMPwL28/S6FQKBQqlCiU+xKHwwG73Q632w1CSLmFksPhKPfnKBQKhQolCoUS9AgEAsTFxUGlUoFlWa/+htPphFgspsakUCiUO/D/0ZjOabOXmkUAAAAASUVORK5CYII=";

const Brand = ({ subtitle = 'Humanoid Readiness Scan' }) => (
 <div className="flex items-center gap-3">
 <img src={LAPENTO_LOGO} alt="Lapento" style={{ height: '28px', width: 'auto' }} />
 <span className="text-xs text-stone-600 hidden sm:block" style={{ letterSpacing: '0.02em' }}>{subtitle}</span>
 </div>
);

const Btn = ({ children, onClick, variant = 'primary', disabled, className = '', icon: Icon }) => {
 const variants = {
 primary: 'lp-btn-secondary',
 accent: 'lp-btn-primary',
 ghost: 'lp-btn-ghost',
 outline: 'lp-btn-outline',
 danger: 'lp-btn-danger',
 };
 return (
 <button
 onClick={onClick}
 disabled={disabled}
 className={`inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg font-semibold ${variants[variant]} ${className}`}
 >
 {Icon && <Icon size={18} />}
 {children}
 </button>
 );
};

const Field = ({ label, hint, children }) => (
 <label className="block">
 <span className="block text-xs font-bold tracking-widest text-stone-500 uppercase mb-2">{label}</span>
 {children}
 {hint && <span className="block text-xs text-stone-600 mt-1">{hint}</span>}
 </label>
);

const Input = (props) => (
 <input
 {...props}
 className={`w-full px-4 py-3 bg-white border-2 border-stone-200 rounded-lg text-base text-stone-800 placeholder:text-stone-500 lp-input focus:outline-none transition ${props.className || ''}`}
 />
);

const TextArea = (props) => (
 <textarea
 {...props}
 className={`w-full px-4 py-3 bg-white border-2 border-stone-200 rounded-lg text-base text-stone-800 placeholder:text-stone-500 lp-input focus:outline-none transition resize-none ${props.className || ''}`}
 />
);

const Chip = ({ active, onClick, children }) => (
 <button
 onClick={onClick}
 className={active ? 'lp-chip lp-chip-active' : 'lp-chip'}
 >
 {children}
 </button>
);

const StepBar = ({ step, total, onJump }) => (
 <div className="flex items-center gap-1.5 px-1">
 {Array.from({ length: total }).map((_, i) => (
 <button
 key={i}
 type="button"
 onClick={() => onJump && onJump(i)}
 aria-label={`Ga naar stap ${i + 1}`}
 className="lp-step-bar"
 >
 <div className={`lp-step-bar-inner ${i <= step ? 'is-done' : ''}`} />
 </button>
 ))}
 </div>
);

/* ============================================================
 HOME VIEW — lijst van scans
 ============================================================ */

function HomeView({ scans, onNew, onOpen, onDelete, onExport, onImport }) {
 const fileRef = useRef();
 const handleImport = async (e) => {
 const f = e.target.files?.[0];
 if (!f) return;
 try {
 const n = await onImport(f);
 alert(`${n} scan${n !== 1 ? 's' : ''} geïmporteerd.`);
 } catch (err) {
 alert('Importeren mislukt: ' + err.message);
 }
 e.target.value = '';
 };
 return (
 <div className="min-h-screen lp-bg">
 <header className="px-5 pt-6 pb-4 border-b border-stone-200">
 <Brand />
 </header>

 <div className="px-5 pt-8 pb-6">
 <h1 className="font-bold text-stone-800 tracking-tight" style={{ fontSize: '40px', lineHeight: '1.05' }}>
 Lopen, kijken,<br />vragen, scoren.
 </h1>
 <p className="text-stone-600 mt-3 text-base leading-relaxed">
 Inventariseer kansen voor robotica en humanoids tijdens een bedrijfsbezoek. Snel, op je iPhone, met foto's. Lever een Word-rapport af voordat je terug bent op kantoor.
 </p>
 </div>

 <div className="px-5 pb-6">
 <button
 onClick={onNew}
 className="lp-btn-primary w-full font-bold text-lg py-5 rounded-xl flex items-center justify-center gap-2"
 >
 <Plus size={22} strokeWidth={2.5} />
 Nieuwe scan starten
 </button>
 <p className="text-xs text-stone-600 text-center mt-2">
 Begint met bedrijfsgegevens en contactpersoon
 </p>
 </div>

 <div className="px-5">
 <div className="text-xs font-bold tracking-widest text-stone-500 uppercase mb-3">
 {scans.length === 0 ? 'Nog geen scans' : `${scans.length} scan${scans.length > 1 ? 's' : ''}`}
 </div>

 {scans.length === 0 ? (
 <div className="bg-white border-2 border-dashed border-stone-300 rounded-xl p-8 text-center">
 <Building2 className="mx-auto text-stone-500 mb-3" size={32} />
 <p className="text-stone-600 text-sm">Tik op"Nieuwe scan starten" om te beginnen.</p>
 </div>
 ) : (
 <div className="space-y-3 pb-32">
 {scans.map(s => (
 <button
 key={s.id}
 onClick={() => onOpen(s)}
 className="w-full bg-white rounded-xl p-4 text-left border-2 border-stone-200 lp-link transition"
 >
 <div className="flex items-start justify-between gap-3">
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2 mb-0.5">
 {s.scanType && (
 <span
 className="text-xs font-bold px-2 py-0.5 rounded"
 style={{
 backgroundColor: s.scanType === 'humanoid' ? '#EAFFFA' : '#EAF1F8',
 color: s.scanType === 'humanoid' ? '#2A8C7B' : '#1E4768',
 }}
 >
 {s.scanType === 'humanoid' ? 'HUMANOID' : 'AUTOMATISERING'}
 </span>
 )}
 </div>
 <div className="font-bold text-stone-800 truncate">{s.company.name || 'Naamloze scan'}</div>
 <div className="text-sm text-stone-600 truncate">{s.company.sector || 'sector onbekend'}</div>
 <div className="flex items-center gap-3 mt-2 text-xs text-stone-600">
 <span>{fmtDate(s.created)}</span>
 <span>•</span>
 <span>{s.processes.length} proces{s.processes.length !== 1 ? 'sen' : ''}</span>
 {s.analysis && <><span>•</span><span className="lp-accent font-semibold">geanalyseerd</span></>}
 </div>
 </div>
 <div className="flex items-center gap-1 flex-shrink-0">
 <button
 onClick={(e) => { e.stopPropagation(); if (confirm('Deze scan verwijderen?')) onDelete(s.id); }}
 className="p-2 text-stone-500 hover:text-red-600"
 aria-label="Verwijder"
 >
 <Trash2 size={18} />
 </button>
 <ChevronRight className="text-stone-500" size={20} />
 </div>
 </div>
 </button>
 ))}
 </div>
 )}

 {/* Backup sectie */}
 <div className="mt-8 pt-6 border-t border-stone-200">
 <div className="text-xs font-bold tracking-widest text-stone-600 uppercase mb-3">Backup</div>
 <div className="flex flex-col sm:flex-row gap-2">
 <button
 onClick={onExport}
 disabled={scans.length === 0}
 className="lp-btn-outline flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold"
 >
 <Download size={16} /> Exporteer alle scans
 </button>
 <input ref={fileRef} type="file" accept="application/json,.json" onChange={handleImport} className="hidden" />
 <button
 onClick={() => fileRef.current?.click()}
 className="lp-btn-outline flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold"
 >
 <Plus size={16} /> Importeer scans
 </button>
 </div>
 <p className="text-xs text-stone-600 mt-2">JSON-bestand. Tip: exporteer regelmatig zodat je niets kwijtraakt.</p>
 </div>
 </div>
 </div>
 );
}

/* ============================================================
 STAP 1 — Bedrijfsgegevens
 ============================================================ */

/* ============================================================
 STAP 0 — Type scan kiezen
 ============================================================ */

const SCAN_TYPES = [
 {
 id: 'humanoid',
 title: 'Humanoid Readiness Scan',
 tagline: 'Welke taken kunnen humanoids overnemen — en hoe snel?',
 description: 'Focus op humanoids. We rangschikken processen op snelheid waarmee een humanoid het zou kunnen overnemen, plus concrete tips om te starten met dataverzameling en digitale werkinstructies.',
 highlights: ['Ranking per proces op humanoid-snelheid', 'Tips: bodycam, smart glasses, Soply', 'Voorbereiding op humanoids in 2026-2028'],
 },
 {
 id: 'automation',
 title: 'Automatiseringsscan (uitgebreid)',
 tagline: 'Het brede plaatje: van cobot tot AMR tot vision-AI',
 description: 'Brede scan voor alle automatiseringsvormen. We kijken niet alleen naar humanoids maar ook naar cobots, AMRs, vision-AI, machine-tooling en software-automatisering — en kiezen per proces de beste route.',
 highlights: ['Alle technologie-opties per proces', 'Korte termijn én lange termijn advies', 'Beste fit per situatie, niet één tool'],
 },
];

function StepType({ scan, update }) {
 const choose = (id) => update({ ...scan, scanType: id });
 return (
 <div className="space-y-5">
 <div>
 <h2 className="font-bold text-2xl text-stone-800">Welke scan wil je doen?</h2>
 <p className="text-stone-700 text-sm mt-1">Kies vóór je naar binnen loopt — bepaalt waarop we focussen tijdens het bezoek.</p>
 </div>

 <div className="space-y-3">
 {SCAN_TYPES.map(t => {
 const active = scan.scanType === t.id;
 return (
 <button
 key={t.id}
 onClick={() => choose(t.id)}
 className="w-full text-left rounded-xl p-5 border-2 transition bg-white"
 style={{
 borderColor: active ? '#36B49E' : '#e7e5e4',
 boxShadow: active ? '0 4px 12px -4px rgba(54, 180, 158, 0.30)' : 'none',
 }}
 >
 <div className="flex items-start justify-between gap-3 mb-2">
 <div className="font-bold text-lg text-stone-800">{t.title}</div>
 <div
 className="w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1"
 style={{
 borderColor: active ? '#36B49E' : '#d6d3d1',
 backgroundColor: active ? '#36B49E' : 'white',
 }}
 >
 {active && <Check size={14} color="white" strokeWidth={3} />}
 </div>
 </div>
 <p className="text-sm font-medium mb-3" style={{ color: active ? '#2A8C7B' : '#57534e' }}>{t.tagline}</p>
 <p className="text-sm text-stone-700 leading-relaxed mb-3">{t.description}</p>
 <ul className="space-y-1">
 {t.highlights.map((h, i) => (
 <li key={i} className="flex gap-2 text-xs text-stone-700">
 <span style={{ color: '#36B49E' }}>●</span>
 <span>{h}</span>
 </li>
 ))}
 </ul>
 </button>
 );
 })}
 </div>
 </div>
 );
}

function StepCompany({ scan, update }) {
 const c = scan.company;
 const set = (k, v) => update({ ...scan, company: { ...c, [k]: v } });
 return (
 <div className="space-y-5">
 <div>
 <h2 className="font-bold text-2xl text-stone-800">Bedrijfsgegevens</h2>
 <p className="text-stone-600 text-sm mt-1">Vul kort in met wie je vandaag praat.</p>
 </div>
 <Field label="Bedrijfsnaam">
 <Input value={c.name} onChange={e => set('name', e.target.value)} placeholder="Bijv. De Vries Metaal BV" />
 </Field>
 <Field label="Contactpersoon">
 <Input value={c.contact} onChange={e => set('contact', e.target.value)} placeholder="Naam + functie" />
 </Field>
 <Field label="Sector">
 <div className="flex flex-wrap gap-2">
 {SECTORS.map(s => (
 <Chip key={s} active={c.sector === s} onClick={() => set('sector', s)}>{s}</Chip>
 ))}
 </div>
 </Field>
 <Field label="Locatie">
 <Input value={c.location} onChange={e => set('location', e.target.value)} placeholder="Plaats" />
 </Field>
 <Field label="Aantal medewerkers">
 <Input value={c.employees} onChange={e => set('employees', e.target.value)} placeholder="Bijv. 45" inputMode="numeric" />
 </Field>
 <Field label="Bezoekdatum">
 <Input type="date" value={c.date} onChange={e => set('date', e.target.value)} />
 </Field>
 </div>
 );
}

/* ============================================================
 STAP 2 — Context (vóór de rondleiding)
 ============================================================ */

function StepContext({ scan, update }) {
 const ctx = scan.context;
 const set = (k, v) => update({ ...scan, context: { ...ctx, [k]: v } });

 const autoItems = ctx.automationItems || [];
 const goalItems = ctx.goalItems || [];
 const concernItems = ctx.concernItems || [];

 const toggleArr = (key, current, label) => {
 const next = current.includes(label) ? current.filter(x => x !== label) : [...current, label];
 set(key, next);
 };
 const setSingle = (key, value) => {
 // Tweede tik op zelfde optie deselecteert
 set(key, ctx[key] === value ? '' : value);
 };

 const sectorItems = AUTOMATION_BY_SECTOR[scan.company.sector] || [];

 return (
 <div className="space-y-6">
 <div>
 <h2 className="font-bold text-2xl text-stone-800">Context vóór de rondleiding</h2>
 <p className="text-stone-700 text-sm mt-1">Tik aan wat van toepassing is. Combineren mag, en je mag stappen overslaan.</p>
 </div>

 {/* ---- HUIDIGE AUTOMATISERING ---- */}
 <Field label="Huidige automatisering">
 {!scan.company.sector && (
 <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 mb-3 text-xs text-amber-900">
 Tip: kies eerst een sector bij stap 1 — dan zie je hier ook sector-specifieke opties.
 </div>
 )}
 <div className="space-y-3">
 <div>
 <div className="text-xs font-bold tracking-widest text-stone-600 uppercase mb-2">Algemeen</div>
 <div className="flex flex-wrap gap-2">
 {AUTOMATION_BASE.map(opt => (
 <Chip key={opt} active={autoItems.includes(opt)} onClick={() => toggleArr('automationItems', autoItems, opt)}>{opt}</Chip>
 ))}
 </div>
 </div>
 {sectorItems.length > 0 && (
 <div>
 <div className="text-xs font-bold tracking-widest text-stone-600 uppercase mb-2">
 Specifiek voor {scan.company.sector.toLowerCase()}
 </div>
 <div className="flex flex-wrap gap-2">
 {sectorItems.map(opt => (
 <Chip key={opt} active={autoItems.includes(opt)} onClick={() => toggleArr('automationItems', autoItems, opt)}>{opt}</Chip>
 ))}
 </div>
 </div>
 )}
 <ToelichtingVeld value={ctx.automation} onChange={v => set('automation', v)} placeholder="Bijv. eigen ontwikkelde machine, leverancier, leeftijd installatie..." />
 </div>
 </Field>

 {/* ---- DOELSTELLING ---- */}
 <Field label="Doelstelling" hint="Wat moet de inzet van robotica opleveren? Meerdere mag.">
 <div className="flex flex-wrap gap-2 mb-3">
 {GOAL_OPTIONS.map(opt => (
 <Chip key={opt} active={goalItems.includes(opt)} onClick={() => toggleArr('goalItems', goalItems, opt)}>{opt}</Chip>
 ))}
 </div>
 <ToelichtingVeld value={ctx.goal} onChange={v => set('goal', v)} placeholder="Specifieke doelstelling, KPI of wens..." />
 </Field>

 {/* ---- TIJDSLIJN ---- */}
 <Field label="Tijdslijn" hint="Wanneer willen ze stappen zetten? Eén keuze.">
 <div className="flex flex-wrap gap-2 mb-3">
 {TIMELINE_OPTIONS.map(opt => (
 <Chip key={opt} active={ctx.timeline === opt} onClick={() => setSingle('timeline', opt)}>{opt}</Chip>
 ))}
 </div>
 <ToelichtingVeld value={ctx.timelineNote} onChange={v => set('timelineNote', v)} placeholder="Specifieke datum, deadline, koppeling aan event..." />
 </Field>

 {/* ---- INVESTERINGSRUIMTE ---- */}
 <Field label="Investeringsruimte" hint="Indicatie voor pilot of eerste implementatie. Eén keuze.">
 <div className="flex flex-wrap gap-2 mb-3">
 {BUDGET_OPTIONS.map(opt => (
 <Chip key={opt} active={ctx.budget === opt} onClick={() => setSingle('budget', opt)}>{opt}</Chip>
 ))}
 </div>
 <ToelichtingVeld value={ctx.budgetNote} onChange={v => set('budgetNote', v)} placeholder="Specifiek bedrag, financieringsvorm, subsidie..." />
 </Field>

 {/* ---- ZORGEN / AANDACHTSPUNTEN ---- */}
 <Field label="Zorgen / aandachtspunten" hint="Wat houdt ze tegen of waar moet je rekening mee houden? Meerdere mag.">
 <div className="flex flex-wrap gap-2 mb-3">
 {CONCERN_OPTIONS.map(opt => (
 <Chip key={opt} active={concernItems.includes(opt)} onClick={() => toggleArr('concernItems', concernItems, opt)}>{opt}</Chip>
 ))}
 </div>
 <ToelichtingVeld value={ctx.concerns} onChange={v => set('concerns', v)} placeholder="Specifieke zorgen, persoonlijke situatie, eerdere ervaring..." />
 </Field>
 </div>
 );
}

/* Inklapbaar toelichting-veld dat alleen verschijnt als je 'em opent */
function ToelichtingVeld({ value, onChange, placeholder }) {
 const [open, setOpen] = useState(!!value);
 if (open) {
 return (
 <div className="relative">
 <TextArea
 rows={2}
 value={value || ''}
 onChange={e => onChange(e.target.value)}
 placeholder={placeholder}
 autoFocus
 />
 <button
 onClick={() => { onChange(''); setOpen(false); }}
 className="absolute top-2 right-2 text-xs text-stone-600 hover:text-stone-900"
 type="button"
 >
 verbergen
 </button>
 </div>
 );
 }
 return (
 <button
 type="button"
 onClick={() => setOpen(true)}
 className="text-sm font-semibold text-stone-700 hover:lp-accent flex items-center gap-1"
 >
 <Plus size={16} /> Toelichting toevoegen
 </button>
 );
}

/* ============================================================
 STAP 3 — Processen (lijst + editor)
 ============================================================ */

function StepProcesses({ scan, update }) {
 const [editing, setEditing] = useState(null);
 const [picking, setPicking] = useState(false);

 const sectorTemplates = PROCESS_TEMPLATES[scan.company.sector] || [];
 const allTemplates = [...sectorTemplates, ...PROCESS_TEMPLATES_GENERAL];

 const addFromTemplate = (template) => {
 const p = { ...emptyProcess(), name: template.name, traits: [...(template.traits || [])] };
 update({ ...scan, processes: [...scan.processes, p] });
 setPicking(false);
 setEditing(p.id);
 };
 const addCustom = () => {
 const p = emptyProcess();
 update({ ...scan, processes: [...scan.processes, p] });
 setPicking(false);
 setEditing(p.id);
 };
 const updateProcess = (id, fn) => {
 update({ ...scan, processes: scan.processes.map(p => p.id === id ? fn(p) : p) });
 };
 const deleteProcess = (id) => {
 if (!confirm('Dit proces verwijderen?')) return;
 update({ ...scan, processes: scan.processes.filter(p => p.id !== id) });
 };

 if (editing) {
 const proc = scan.processes.find(p => p.id === editing);
 if (!proc) { setEditing(null); return null; }
 return (
 <ProcessEditor
 process={proc}
 onChange={fn => updateProcess(editing, fn)}
 onDone={() => setEditing(null)}
 />
 );
 }

 if (picking) {
 return (
 <div className="space-y-5">
 <div className="flex items-start justify-between gap-3">
 <div>
 <h2 className="font-bold text-2xl text-stone-800">Wat zie je hier?</h2>
 <p className="text-stone-700 text-sm mt-1">Tik aan welk soort proces dit is. Naam en kenmerken worden alvast ingevuld — kun je daarna nog aanpassen.</p>
 </div>
 <button onClick={() => setPicking(false)} className="p-2 -mr-2 text-stone-600">
 <X size={24} />
 </button>
 </div>

 {sectorTemplates.length > 0 && (
 <div>
 <div className="text-xs font-bold tracking-widest text-stone-600 uppercase mb-2">
 Typisch voor {scan.company.sector?.toLowerCase() || 'deze sector'}
 </div>
 <div className="space-y-2">
 {sectorTemplates.map((t, i) => (
 <button
 key={i}
 onClick={() => addFromTemplate(t)}
 className="w-full text-left bg-white border-2 border-stone-200 rounded-lg px-4 py-3 lp-link transition flex items-center justify-between gap-3"
 >
 <span className="font-semibold text-stone-800">{t.name}</span>
 <ChevronRight size={18} className="text-stone-500 flex-shrink-0" />
 </button>
 ))}
 </div>
 </div>
 )}

 <div>
 <div className="text-xs font-bold tracking-widest text-stone-600 uppercase mb-2">Algemeen</div>
 <div className="space-y-2">
 {PROCESS_TEMPLATES_GENERAL.map((t, i) => (
 <button
 key={i}
 onClick={() => addFromTemplate(t)}
 className="w-full text-left bg-white border-2 border-stone-200 rounded-lg px-4 py-3 lp-link transition flex items-center justify-between gap-3"
 >
 <span className="font-semibold text-stone-800">{t.name}</span>
 <ChevronRight size={18} className="text-stone-500 flex-shrink-0" />
 </button>
 ))}
 </div>
 </div>

 <button
 onClick={addCustom}
 className="w-full text-left bg-white border-2 border-dashed border-stone-300 rounded-lg px-4 py-3 lp-link transition flex items-center justify-between gap-3"
 >
 <span className="font-semibold text-stone-700 flex items-center gap-2"><Edit3 size={16}/> Eigen proces — vrij invoeren</span>
 <ChevronRight size={18} className="text-stone-500 flex-shrink-0" />
 </button>
 </div>
 );
 }

 return (
 <div className="space-y-5">
 <div>
 <h2 className="font-bold text-2xl text-stone-800">Processen tijdens de rondleiding</h2>
 <p className="text-stone-700 text-sm mt-1">Voeg per stop een proces toe. Snelle keuze of zelf invoeren.</p>
 </div>

 {scan.processes.length === 0 ? (
 <div className="bg-white border-2 border-dashed border-stone-300 rounded-xl p-8 text-center">
 <p className="text-stone-600 text-sm">Nog geen processen toegevoegd.</p>
 </div>
 ) : (
 <div className="space-y-2">
 {scan.processes.map((p, i) => (
 <div key={p.id} className="bg-white rounded-xl p-4 border-2 border-stone-200">
 <div className="flex items-start gap-3">
 <div className="w-8 h-8 rounded-full lp-accent-bg text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
 {i + 1}
 </div>
 <div className="flex-1 min-w-0">
 <div className="font-bold text-stone-800">{p.name || 'Naamloos proces'}</div>
 <div className="text-xs text-stone-600 mt-0.5">
 {p.photos.length} foto{p.photos.length !== 1 ?"'s" : ''} • {p.traits.length} kenmerk{p.traits.length !== 1 ? 'en' : ''}
 </div>
 </div>
 <button onClick={() => setEditing(p.id)} className="p-2 text-stone-600 hover:lp-accent">
 <Edit3 size={18} />
 </button>
 <button onClick={() => deleteProcess(p.id)} className="p-2 text-stone-500 hover:text-red-600">
 <Trash2 size={18} />
 </button>
 </div>
 </div>
 ))}
 </div>
 )}

 <Btn onClick={() => setPicking(true)} variant="outline" icon={Plus} className="w-full">
 Proces toevoegen
 </Btn>
 </div>
 );
}

/* ----- Process Editor ----- */

function ProcessEditor({ process, onChange, onDone }) {
 const fileRef = useRef();
 const [showDesc, setShowDesc] = useState(!!process.description);
 const [showNotes, setShowNotes] = useState(!!process.notes);
 const set = (k, v) => onChange(p => ({ ...p, [k]: v }));
 const toggleTrait = (id) => {
 onChange(p => ({
 ...p,
 traits: p.traits.includes(id) ? p.traits.filter(t => t !== id) : [...p.traits, id]
 }));
 };

 const onPhotos = async (e) => {
 const files = Array.from(e.target.files || []);
 if (!files.length) return;
 const compressed = [];
 for (const f of files) {
 try { compressed.push(await compressImage(f)); }
 catch (err) { console.error(err); }
 }
 onChange(p => ({ ...p, photos: [...p.photos, ...compressed] }));
 e.target.value = '';
 };

 const removePhoto = (idx) => {
 onChange(p => ({ ...p, photos: p.photos.filter((_, i) => i !== idx) }));
 };

 return (
 <div className="space-y-5">
 <div className="flex items-start justify-between gap-3">
 <div>
 <h2 className="font-bold text-2xl text-stone-800">Proces bewerken</h2>
 <p className="text-stone-700 text-sm mt-1">Vul aan wat relevant is — niet alles is verplicht.</p>
 </div>
 <button onClick={onDone} className="p-2 -mr-2 text-stone-600">
 <X size={24} />
 </button>
 </div>

 <Field label="Naam van het proces">
 <Input value={process.name} onChange={e => set('name', e.target.value)} placeholder="Bijv. Pallets stapelen, orderpicken" autoFocus />
 </Field>

 <Field label="Foto's">
 <input
 ref={fileRef}
 type="file"
 accept="image/*"
 capture="environment"
 multiple
 onChange={onPhotos}
 className="hidden"
 />
 <div className="grid grid-cols-3 gap-2">
 {process.photos.map((src, i) => (
 <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-stone-200 bg-stone-100">
 <img src={src} alt="" className="w-full h-full object-cover" />
 <button
 onClick={() => removePhoto(i)}
 className="absolute top-1 right-1 w-6 h-6 rounded-full text-white flex items-center justify-center"
 style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
 aria-label="Verwijder"
 >
 <X size={14} />
 </button>
 </div>
 ))}
 <button
 onClick={() => fileRef.current?.click()}
 className="aspect-square rounded-lg border-2 border-dashed border-stone-300 flex flex-col items-center justify-center text-stone-600 lp-link transition"
 >
 <Camera size={20} />
 <span className="text-xs mt-1 font-medium">Foto</span>
 </button>
 </div>
 </Field>

 <Field label="Kenmerken" hint="Tik aan wat van toepassing is">
 <div className="flex flex-wrap gap-2">
 {TRAITS.map(t => (
 <Chip key={t.id} active={process.traits.includes(t.id)} onClick={() => toggleTrait(t.id)}>
 {t.label}
 </Chip>
 ))}
 </div>
 </Field>

 <div className="grid grid-cols-3 gap-3">
 <Field label="Mensen">
 <Input value={process.workers} onChange={e => set('workers', e.target.value)} inputMode="numeric" placeholder="2" />
 </Field>
 <Field label="Uur/dag">
 <Input value={process.hoursPerDay} onChange={e => set('hoursPerDay', e.target.value)} inputMode="decimal" placeholder="6" />
 </Field>
 <Field label="Dagen/wk">
 <Input value={process.daysPerWeek} onChange={e => set('daysPerWeek', e.target.value)} inputMode="numeric" placeholder="5" />
 </Field>
 </div>

 {/* Optionele beschrijving */}
 {showDesc ? (
 <Field label="Korte beschrijving">
 <div className="relative">
 <TextArea rows={2} value={process.description} onChange={e => set('description', e.target.value)} placeholder="Wat gebeurt hier? Hoe werkt het nu?" autoFocus />
 <button
 onClick={() => { set('description', ''); setShowDesc(false); }}
 className="absolute top-2 right-2 text-xs text-stone-600 hover:text-stone-900"
 >
 verbergen
 </button>
 </div>
 </Field>
 ) : (
 <button
 onClick={() => setShowDesc(true)}
 className="text-sm font-semibold text-stone-700 hover:lp-accent flex items-center gap-1"
 >
 <Plus size={16} /> Beschrijving toevoegen
 </button>
 )}

 {/* Optionele notities */}
 {showNotes ? (
 <Field label="Notities ter plaatse">
 <div className="relative">
 <TextArea rows={3} value={process.notes} onChange={e => set('notes', e.target.value)} placeholder="Wat zegt de directeur? Wat valt op?" autoFocus />
 <button
 onClick={() => { set('notes', ''); setShowNotes(false); }}
 className="absolute top-2 right-2 text-xs text-stone-600 hover:text-stone-900"
 >
 verbergen
 </button>
 </div>
 </Field>
 ) : (
 <button
 onClick={() => setShowNotes(true)}
 className="text-sm font-semibold text-stone-700 hover:lp-accent flex items-center gap-1"
 >
 <Plus size={16} /> Notitie toevoegen
 </button>
 )}

 <Btn onClick={onDone} variant="primary" icon={Check} className="w-full">
 Klaar met dit proces
 </Btn>
 </div>
 );
}

/* ============================================================
 STAP 4 — Analyse & Export
 ============================================================ */

function StepAnalyze({ scan, update, onClose }) {
 const [busy, setBusy] = useState(false);
 const [error, setError] = useState(null);
 const [progress, setProgress] = useState('');

 const run = async () => {
 setBusy(true); setError(null);
 try {
 const result = await generateAnalysis(scan, setProgress);
 const updated = { ...scan, analysis: result };
 update(updated);
 await saveScan(updated);
 } catch (e) {
 setError(e.code || e.message);
 } finally {
 setBusy(false);
 setProgress('');
 }
 };

 const a = scan.analysis;

 return (
 <div className="space-y-5">
 <div>
 <h2 className="font-bold text-2xl text-stone-800">AI-analyse & rapport</h2>
 <p className="text-stone-600 text-sm mt-1">Laat AI de processen scoren en exporteer naar Word.</p>
 </div>

 {!a && !busy && (
 <div className="bg-white border-2 border-stone-200 rounded-xl p-5">
 <div className="flex items-start gap-3">
 <Sparkles className="lp-accent flex-shrink-0 mt-1" size={20} />
 <div className="text-sm text-stone-700">
 <p className="font-semibold text-stone-800 mb-1">{scan.processes.length} proces{scan.processes.length !== 1 ? 'sen' : ''} gereed voor analyse</p>
 <p>De AI scoort elk proces op humanoid-readiness, suggereert het robottype, schat de ROI en geeft vervolgstappen.</p>
 </div>
 </div>
 <Btn onClick={run} variant="accent" icon={Sparkles} className="w-full mt-4" disabled={scan.processes.length === 0}>
 Analyse genereren
 </Btn>
 </div>
 )}

 {busy && (
 <div className="bg-white border-2 border-stone-200 rounded-xl p-8 text-center">
 <Loader2 className="mx-auto lp-accent animate-spin mb-4" size={32} />
 <p className="font-semibold text-stone-800">{progress || 'Bezig...'}</p>
 <p className="text-xs text-stone-500 mt-2">Dit duurt 10-30 seconden.</p>
 </div>
 )}

 {error === 'RATE_LIMIT' && (
 <div className="rounded-xl p-5" style={{ backgroundColor: '#FFF7E6', border: '2px solid #F59E0B' }}>
 <div className="flex items-start gap-3">
 <AlertCircle className="flex-shrink-0 mt-0.5" size={20} style={{ color: '#92400E' }} />
 <div className="text-sm" style={{ color: '#78350F' }}>
 <p className="font-bold mb-2 text-base">Even pauzeren — Claude-quotum bereikt</p>
 <p className="mb-2">De AI-analyse loopt via Claude.ai. Bij intensief gebruik raakt je dagelijkse quotum op. Dit is een platform-limiet, geen fout in de scan.</p>
 <p className="font-semibold mt-3 mb-1">Wat je kunt doen:</p>
 <ul className="list-disc ml-5 space-y-1">
 <li>Wacht 5-15 minuten en probeer opnieuw — alle data is bewaard</li>
 <li>Voor productie-gebruik: laat de tool deployen op een eigen domein (scan.lapento.nl) met eigen API-key — geen limieten meer</li>
 </ul>
 <Btn onClick={run} variant="outline" className="mt-3">Opnieuw proberen</Btn>
 </div>
 </div>
 </div>
 )}

 {error === 'OVERLOADED' && (
 <div className="rounded-xl p-5" style={{ backgroundColor: '#FFF7E6', border: '2px solid #F59E0B' }}>
 <div className="flex items-start gap-3">
 <AlertCircle className="flex-shrink-0 mt-0.5" size={20} style={{ color: '#92400E' }} />
 <div className="text-sm" style={{ color: '#78350F' }}>
 <p className="font-bold mb-2 text-base">Anthropic-servers druk</p>
 <p>De AI-servers zijn momenteel overbelast. Wacht een minuut en probeer opnieuw — je data is bewaard.</p>
 <Btn onClick={run} variant="outline" className="mt-3">Opnieuw proberen</Btn>
 </div>
 </div>
 </div>
 )}

 {error && error !== 'RATE_LIMIT' && error !== 'OVERLOADED' && (
 <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
 <div className="flex items-start gap-2">
 <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={18} />
 <div className="text-sm text-red-800">
 <p className="font-semibold mb-1">Er ging iets mis</p>
 <p>{error}</p>
 <Btn onClick={run} variant="outline" className="mt-3">Opnieuw proberen</Btn>
 </div>
 </div>
 </div>
 )}

 {a && (
 <>
 <div className="rounded-xl p-5" style={{ backgroundColor: '#1E4768', color: 'white' }}>
 <div className="text-xs font-bold tracking-widest mb-2" style={{ color: '#7CD4BD' }}>SAMENVATTING</div>
 <p className="text-sm leading-relaxed text-stone-100">{a.summary}</p>
 </div>

 {a.priorities?.length > 0 && (
 <div className="bg-white border-2 border-stone-200 rounded-xl p-5">
 <div className="text-xs font-bold tracking-widest text-stone-500 mb-3">TOP-3 PRIORITEITEN</div>
 <ol className="space-y-2">
 {a.priorities.map((p, i) => (
 <li key={i} className="flex gap-3">
 <span className="w-6 h-6 rounded-full lp-accent-bg text-white text-sm font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
 <span className="text-sm text-stone-800">{p}</span>
 </li>
 ))}
 </ol>
 </div>
 )}

 <OverallScore analysis={a} />

          <div className="space-y-3">
            <div className="text-xs font-bold tracking-widest text-stone-500">PROCESSEN</div>
{a.processes?.map((p, i) => (
 <div key={i} className="bg-white border-2 border-stone-200 rounded-xl p-4">
 <div className="font-bold text-stone-800 mb-3">{p.name}</div>
 <ScoreMeter score={p.score} />
 <div className="border-t border-stone-200 mt-3 pt-3">
    <div className="text-sm text-stone-700 space-y-1">
                  <div><span className="font-semibold">Type:</span> {p.robotType}</div>
                  <div><span className="font-semibold">ROI:</span> {p.roi}</div>
                </div>
                </div>
 </div>
 </div>
 ))}
 </div>

 {a.quickWins?.length > 0 && (
 <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-5">
 <div className="text-xs font-bold tracking-widest text-amber-800 mb-3">QUICK WINS — KOMENDE 6 MAANDEN</div>
 <ul className="space-y-2">
 {a.quickWins.map((q, i) => (
 <li key={i} className="flex gap-2 text-sm text-stone-800">
 <Check className="text-amber-700 flex-shrink-0 mt-0.5" size={16} />
 <span>{q}</span>
 </li>
 ))}
 </ul>
 </div>
 )}

 {scan.scanType === 'humanoid' && a.humanoidActions?.length > 0 && (
 <div className="rounded-xl p-5" style={{ backgroundColor: '#EAFFFA', border: '2px solid #36B49E' }}>
 <div className="text-xs font-bold tracking-widest mb-3" style={{ color: '#1E4768' }}>VOORBEREIDING OP HUMANOIDS — START VANDAAG</div>
 <ul className="space-y-3">
 {a.humanoidActions.map((act, i) => (
 <li key={i} className="flex gap-3 text-sm text-stone-800">
 <span
 className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
 style={{ backgroundColor: '#36B49E', color: 'white' }}
 >
 {i + 1}
 </span>
 <span className="leading-relaxed">{act}</span>
 </li>
 ))}
 </ul>
 </div>
 )}

 <Btn onClick={run} variant="ghost" icon={Sparkles} className="w-full">
 Analyse opnieuw genereren
 </Btn>
 </>
 )}

 {/* Altijd zichtbaar: download + share/mail werken ook zonder AI-analyse */}
 <ExportActions scan={scan} hasAnalysis={!!a} />
 </div>
 );
}

/* ============================================================
 EXPORT ACTIONS — echte anchor links + Web Share API
 (programmatic clicks worden geblokkeerd in artifact-iframes,
 daarom rendert dit echte <a> elementen waar de user op tikt)
 ============================================================ */
function ExportActions({ scan, hasAnalysis }) {
 const [exportUrl, setExportUrl] = useState('');
 const [shareError, setShareError] = useState('');
 const [shareBusy, setShareBusy] = useState(false);

 const filename = useMemo(() => buildScanFilename(scan), [scan]);

 // Genereer Word blob URL on-mount of als scan wijzigt
 useEffect(() => {
 const html = buildWordHtml(scan);
 const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
 const url = URL.createObjectURL(blob);
 setExportUrl(url);
 return () => URL.revokeObjectURL(url);
 }, [scan]);

 // Mailto URL met body — geen bijlage mogelijk via mailto, maar wel context
 const mailtoUrl = useMemo(() => {
 const company = scan.company.name || 'onbekend bedrijf';
 const sector = scan.company.sector || '-';
 const datum = fmtDate(scan.company.date) || '-';
 const type = scan.scanType === 'humanoid' ? 'Humanoid Readiness Scan' : 'Automatiseringsscan';
 const subject = `${type} - ${company}`;
 const body = `Hoi Thijs,

Concept-rapport van het bezoek aan ${company}.

Type: ${type}
Sector: ${sector}
Datum: ${datum}
Processen: ${scan.processes.length}
AI-analyse: ${hasAnalysis ? 'aanwezig' : 'nog niet uitgevoerd'}

Word-rapport: ${filename}
(eerst downloaden, dan via paperclip toevoegen — of gebruik de Delen-knop voor het iOS share-sheet met automatische bijlage)

Verstuurd vanuit Lapento Humanoid Readiness Scan.`;
 return `mailto:thijs@lapento.nl?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
 }, [scan, hasAnalysis, filename]);

 // Web Share API: opent op iOS direct het share-sheet MET het Word-bestand als bijlage
 // Werkt in iOS Safari, Android Chrome. Werkt niet op desktop browsers.
 const canUseShare = typeof navigator !== 'undefined' && navigator.canShare;

 const handleShare = async () => {
 setShareError('');
 setShareBusy(true);
 try {
 const html = buildWordHtml(scan);
 const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
 const file = new File([blob], filename, { type: 'application/msword' });

 if (navigator.canShare && navigator.canShare({ files: [file] })) {
 await navigator.share({
 files: [file],
 title: `${scan.scanType === 'humanoid' ? 'Humanoid' : 'Automatisering'}-Scan - ${scan.company.name || ''}`,
 text: 'Bezoekrapport vanuit Lapento Humanoid Readiness Scan.',
 });
 } else {
 setShareError('Delen-functie niet beschikbaar in deze browser. Gebruik de Download-knop.');
 }
 } catch (err) {
 if (err.name !== 'AbortError') {
 setShareError('Delen mislukt: ' + (err.message || 'onbekende fout'));
 }
 } finally {
 setShareBusy(false);
 }
 };

 return (
 <div className="mt-4 pt-6 border-t border-stone-200 space-y-3">
 <div className="text-xs font-bold tracking-widest text-stone-600 uppercase mb-1">
 Rapport {hasAnalysis ? '(met AI-analyse)' : '(zonder AI-analyse — alleen ingevulde data)'}
 </div>

 {/* Primaire actie op iPhone: share-sheet met automatische bijlage */}
 {canUseShare && (
 <button
 onClick={handleShare}
 disabled={shareBusy || !exportUrl}
 className="lp-btn-primary w-full font-bold text-base py-4 rounded-xl flex items-center justify-center gap-2"
 >
 <Share2 size={20} />
 {shareBusy ? 'Bezig...' : 'Delen / mailen (iPhone share-sheet)'}
 </button>
 )}

 {/* Echte anchor — geen JS-trigger, werkt wél in artifact iframe */}
 <a
 href={exportUrl}
 download={filename}
 className="lp-btn-outline w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-semibold no-underline"
 >
 <Download size={18} /> Word downloaden
 </a>

 <a
 href={mailtoUrl}
 className="lp-btn-outline w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-semibold no-underline"
 >
 <Mail size={18} /> Mail naar thijs@lapento.nl
 </a>

 {shareError && (
 <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">{shareError}</p>
 )}

 <div className="text-xs text-stone-700 leading-relaxed bg-stone-100 rounded-lg p-3 mt-2">
 <strong className="text-stone-800">Tip:</strong> {canUseShare
 ? 'Gebruik de bovenste knop op je iPhone — kies dan Mail in het share-sheet en het Word-bestand zit er automatisch bij. Tik thijs@lapento.nl in de Aan-regel of selecteer als contact.'
 : 'Download het bestand eerst, open dan de mail-knop en voeg het Word-document via paperclip toe.'}
 </div>
 </div>
 );
}

/* ============================================================
 SCAN WIZARD
 ============================================================ */

const STEPS = [
 { key: 'type', label: 'Type' },
 { key: 'company', label: 'Bedrijf' },
 { key: 'context', label: 'Context' },
 { key: 'processes', label: 'Processen' },
 { key: 'analyze', label: 'Analyse' },
];

function ScanWizard({ scan, setScan, onExit }) {
 const [step, setStep] = useState(0);

 // Auto-save bij elke wijziging — non-blocking
 const update = (newScan) => {
 setScan(newScan);
 saveScan(newScan).catch(() => {});
 };

 const canNext = () => {
 if (step === 0) return !!scan.scanType;
 if (step === 1) return scan.company.name && scan.company.sector;
 return true;
 };

 const nextLabel = () => {
 if (step === 0) return 'verder naar bedrijfsgegevens';
 if (step === 1) return 'verder naar context';
 if (step === 2) return 'verder naar processen';
 if (step === 3) return 'naar analyse';
 return 'klaar';
 };

 const goNext = () => {
 saveScan(scan).catch(() => {});
 if (step < STEPS.length - 1) setStep(step + 1);
 else onExit();
 };

 return (
 <div className="min-h-screen lp-bg">
 <header className="sticky top-0 z-10 lp-bg border-b border-stone-200">
 <div className="px-5 pt-4 pb-3 flex items-center justify-between">
 <button onClick={onExit} className="flex items-center gap-1 text-sm text-stone-600 -ml-1 hover:text-stone-900">
 <ArrowLeft size={18} /> Overzicht
 </button>
 <Brand />
 </div>
 <div className="px-5 pb-3">
 <StepBar step={step} total={STEPS.length} onJump={setStep} />
 <div className="flex justify-between mt-1.5 px-0.5">
 {STEPS.map((s, i) => (
 <button
 key={s.key}
 type="button"
 onClick={() => setStep(i)}
 className={`lp-step-btn text-xs font-bold tracking-widest uppercase ${i <= step ? 'text-stone-800' : 'text-stone-500'}`}
 >
 {s.label}
 </button>
 ))}
 </div>
 </div>
 </header>

 <main className="px-5 pt-6 pb-12 max-w-2xl mx-auto">
 {step === 0 && <StepType scan={scan} update={update} />}
 {step === 1 && <StepCompany scan={scan} update={update} />}
 {step === 2 && <StepContext scan={scan} update={update} />}
 {step === 3 && <StepProcesses scan={scan} update={update} />}
 {step === 4 && <StepAnalyze scan={scan} update={update} onClose={onExit} />}

 {/* Inline navigatie: altijd zichtbaar onderaan content */}
 <div className="mt-10 pt-6 border-t border-stone-200">
 {step === 0 && !canNext() && (
 <p className="text-xs text-stone-600 mb-3 flex items-center gap-1.5">
 <Info size={14} /> Kies eerst het type scan om verder te gaan.
 </p>
 )}
 {step === 1 && !canNext() && (
 <p className="text-xs text-stone-600 mb-3 flex items-center gap-1.5">
 <Info size={14} /> Vul minimaal bedrijfsnaam en sector in om verder te gaan.
 </p>
 )}
 <div className="flex flex-col gap-3">
 {step < STEPS.length - 1 && (
 <button
 onClick={goNext}
 disabled={!canNext()}
 className="lp-btn-primary w-full font-bold text-base py-4 rounded-xl flex items-center justify-center gap-2"
 >
 Opslaan & {nextLabel().toLowerCase()}
 <ChevronRight size={20} />
 </button>
 )}
 <div className="flex items-center gap-3">
 {step > 0 && (
 <button
 onClick={() => setStep(step - 1)}
 className="lp-btn-ghost flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg font-semibold"
 >
 <ChevronLeft size={18} /> Terug
 </button>
 )}
 <button
 onClick={onExit}
 className="lp-btn-ghost flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg font-semibold"
 >
 Pauzeer & ga naar overzicht
 </button>
 </div>
 </div>
 </div>
 </main>
 </div>
 );
}

/* ============================================================
 ROOT APP
 ============================================================ */


const APP_STYLES = `
 .lp-bg { background-color: #FAFAF7; }
 .lp-accent { color: #36B49E; }
 .lp-accent-bg { background-color: #36B49E; }
 .lp-accent-border { border-color: #36B49E; }
 .lp-accent-light { color: #7CD4BD; }
 .lp-input:focus { border-color: #36B49E; outline: none; }
 .lp-input-wrap:focus-within { /* placeholder for future */ }
 .lp-link:hover { border-color: #36B49E; }

 .lp-btn-primary {
 background-color: #36B49E;
 color: white;
 transition: background-color .15s, transform .1s;
 box-shadow: 0 4px 8px -1px rgba(54, 180, 158, 0.25);
 }
 .lp-btn-primary:hover:not(:disabled) { background-color: #2A8C7B; }
 .lp-btn-primary:active:not(:disabled) { transform: scale(0.98); }
 .lp-btn-primary:disabled {
 background-color: #d6d3d1;
 color: #78716c;
 box-shadow: none;
 cursor: not-allowed;
 }

 .lp-chip {
 padding: 0.5rem 0.75rem;
 border-radius: 9999px;
 font-size: 0.875rem;
 font-weight: 500;
 border: 2px solid #e7e5e4;
 background: white;
 color: #44403c;
 transition: all .15s;
 cursor: pointer;
 }
 .lp-chip:hover { border-color: #a8a29e; }
 .lp-chip-active {
 background-color: #36B49E;
 color: white;
 border-color: #36B49E;
 }
 .lp-chip-active:hover { background-color: #2A8C7B; border-color: #2A8C7B; }

 .lp-btn-secondary {
 background-color: #44403c;
 color: white;
 transition: background-color .15s, transform .1s;
 }
 .lp-btn-secondary:hover:not(:disabled) { background-color: #292524; }
 .lp-btn-secondary:active:not(:disabled) { transform: scale(0.98); }
 .lp-btn-secondary:disabled {
 background-color: #d6d3d1;
 color: #78716c;
 cursor: not-allowed;
 }

 .lp-btn-ghost {
 background-color: transparent;
 color: #44403c;
 transition: background-color .15s, color .15s;
 }
 .lp-btn-ghost:hover:not(:disabled) { background-color: #f5f5f4; color: #1c1917; }

 .lp-btn-outline {
 background-color: white;
 border: 2px solid #d6d3d1;
 color: #292524;
 transition: border-color .15s, background-color .15s;
 }
 .lp-btn-outline:hover:not(:disabled) {
 border-color: #78716c;
 background-color: #fafaf9;
 }

 .lp-btn-danger {
 background-color: white;
 border: 2px solid #fecaca;
 color: #b91c1c;
 transition: background-color .15s;
 }
 .lp-btn-danger:hover:not(:disabled) { background-color: #fef2f2; }

 .lp-step-btn {
 background: none;
 border: none;
 cursor: pointer;
 transition: color .15s, background-color .15s;
 padding: 4px 8px;
 margin: -4px -8px;
 border-radius: 6px;
 font: inherit;
 }
 .lp-step-btn:hover { color: #36B49E; background-color: #f5f0eb; }

 .lp-step-bar {
 background: none;
 border: none;
 cursor: pointer;
 padding: 8px 0;
 margin: -8px 0;
 flex: 1;
 display: block;
 }
 .lp-step-bar-inner {
 height: 6px;
 border-radius: 9999px;
 background-color: #e7e5e4;
 transition: background-color .15s;
 }
 .lp-step-bar-inner.is-done { background-color: #36B49E; }
 .lp-step-bar:hover .lp-step-bar-inner { background-color: #d6d3d1; }
 .lp-step-bar:hover .lp-step-bar-inner.is-done { background-color: #2A8C7B; }
`;

export default function App() {
 const [view, setView] = useState('home'); // home | scan
 const [scans, setScans] = useState([]);
 const [activeScan, setActiveScan] = useState(null);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 (async () => {
 try {
 const list = await loadAllScans();
 setScans(list);
 } catch (e) {
 console.warn('Load failed:', e);
 } finally {
 setLoading(false);
 }
 })();
 }, []);

 const refresh = async () => {
 try {
 const list = await loadAllScans();
 setScans(list);
 } catch {}
 };

 const onNew = () => {
 const s = emptyScan();
 setActiveScan(s);
 setView('scan');
 // Opslaan op de achtergrond, blokkeert UI niet
 saveScan(s).catch(() => {});
 };

 const onOpen = (s) => {
 setActiveScan(s);
 setView('scan');
 };

 const onDelete = async (id) => {
 await removeScan(id);
 refresh();
 };

 const onExit = () => {
 setView('home');
 if (activeScan) saveScan(activeScan).catch(() => {});
 refresh();
 setActiveScan(null);
 };

 if (loading) {
 return (
 <div className="min-h-screen lp-bg flex items-center justify-center">
 <Loader2 className="lp-accent animate-spin" size={28} />
 </div>
 );
 }

 return (
 <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont,"Segoe UI", system-ui, sans-serif' }}>
 <style>{APP_STYLES}</style>
 {view === 'home' && (
 <HomeView
 scans={scans}
 onNew={onNew}
 onOpen={onOpen}
 onDelete={onDelete}
 onExport={async () => {
 const n = await exportAllScans();
 alert(`${n} scan${n !== 1 ? 's' : ''} geëxporteerd.`);
 }}
 onImport={async (file) => {
 const n = await importScansFromFile(file);
 await refresh();
 return n;
 }}
 />
 )}
 {view === 'scan' && activeScan && (
 <ScanWizard scan={activeScan} setScan={setActiveScan} onExit={onExit} />
 )}
 </div>
 );
}
