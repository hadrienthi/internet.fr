#!/usr/bin/env node
/*
 * Internet.fr — script de build (Node.js natif, zéro dépendance)
 * ---------------------------------------------------------------
 *   node build.js
 *
 * 1. Lit donnees.json (source de vérité unique)
 * 2. Injecte les données dans templates/ (+ partiels)
 * 3. Génère le site complet dans docs/ :
 *      docs/index.html                     (accueil)
 *      docs/<slug>.html                    (1 fiche FAQ par question)
 *      docs/<theme>.html                   (1 hub par thématique)
 *      docs/assets/…                       (CSS + JS copiés)
 *      docs/sitemap.xml
 *
 * Syntaxe des templates :
 *   {{chemin.vers.valeur}}   → valeur échappée HTML
 *   {{{chemin}}}             → valeur brute (JSON, HTML)
 *   {{> nom}}                → inclusion de templates/partiels/nom.html
 *   <!--BEGIN nom--> … <!--END nom-->  → bloc répété pour chaque élément
 */

const fs = require('fs');
const path = require('path');

const RACINE = __dirname;
const TEMPLATES = path.join(RACINE, 'templates');
const PARTIELS = path.join(TEMPLATES, 'partiels');
const ASSETS = path.join(RACINE, 'assets');
const DIST = path.join(RACINE, 'docs');
const URL_PROD = 'https://internet.fr';

// ─── Helpers de rendu ───

function echapper(v) {
  return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function chercher(ctx, chemin) {
  return chemin.split('.').reduce((o, k) => (o == null ? undefined : o[k]), ctx);
}

// Inclusions {{> nom}} (récursif)
function inclurePartiels(tpl) {
  return tpl.replace(/\{\{>\s*([\w-]+)\s*\}\}/g, (_, nom) => {
    const fichier = path.join(PARTIELS, nom + '.html');
    if (!fs.existsSync(fichier)) throw new Error('Partiel introuvable : ' + nom);
    return inclurePartiels(fs.readFileSync(fichier, 'utf8'));
  });
}

// Blocs répétés <!--BEGIN nom--> … <!--END nom-->
function rendreBlocs(tpl, blocs) {
  return tpl.replace(/<!--BEGIN (\w+)-->([\s\S]*?)<!--END \1-->/g, (_, nom, corps) => {
    const items = blocs[nom];
    if (!items) return '';
    return items.map(item => rendreJetons(corps, item)).join('');
  });
}

// Jetons {{…}} et {{{…}}}
function rendreJetons(tpl, ctx) {
  tpl = tpl.replace(/\{\{\{([\w.]+)\}\}\}/g, (_, chemin) => {
    const v = chercher(ctx, chemin);
    return v == null ? '' : String(v);
  });
  return tpl.replace(/\{\{([\w.]+)\}\}/g, (_, chemin) => {
    const v = chercher(ctx, chemin);
    return v == null ? '' : echapper(v);
  });
}

function rendre(nomTemplate, ctx, blocs) {
  let tpl = fs.readFileSync(path.join(TEMPLATES, nomTemplate), 'utf8');
  tpl = inclurePartiels(tpl);
  tpl = rendreBlocs(tpl, blocs || {});
  return rendreJetons(tpl, ctx);
}

function ecrire(nomFichier, contenu) {
  fs.writeFileSync(path.join(DIST, nomFichier), contenu);
  console.log('  ✓ docs/' + nomFichier);
}

// ─── Build ───

const debut = Date.now();
const donnees = JSON.parse(fs.readFileSync(path.join(RACINE, 'donnees.json'), 'utf8'));
const { site, fiches, themes } = donnees;

// docs/ propre
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(path.join(DIST, 'assets'), { recursive: true });

// assets copiés tels quels
for (const f of fs.readdirSync(ASSETS)) {
  fs.copyFileSync(path.join(ASSETS, f), path.join(DIST, 'assets', f));
}
console.log('  ✓ docs/assets/ (' + fs.readdirSync(ASSETS).length + ' fichiers)');

// 1) Accueil
ecrire('index.html', rendre('accueil.html', {
  site,
  reseauJson: JSON.stringify(site.reseau),
  questionsParSlugJson: JSON.stringify(
    Object.fromEntries(Object.entries(fiches).map(([slug, f]) => [slug, f.q]))
  )
}, {
  dossier: Object.entries(themes).map(([id, t]) => ({
    id, titre: t.titre, slug: t.slug, stat: t.stat, href: id + '.html'
  })),
  question: Object.entries(fiches).map(([slug, f]) => ({
    slug, q: f.q, theme: f.theme, href: slug + '.html'
  }))
}));

// 2) Une fiche FAQ par question (le « piège SEO »)
for (const [slug, f] of Object.entries(fiches)) {
  ecrire(slug + '.html', rendre('fiche-faq.html', {
    site, slug,
    q: f.q, courte: f.courte, conclusion: f.conclusion, theme: f.theme,
    themeHref: f.themeId ? f.themeId + '.html' : 'index.html#questions'
  }, {
    etape: f.steps.map((s, i) => ({ num: i + 1, titre: s.titre, texte: s.texte })),
    liee: f.liees.map(s => ({ slug: s, q: fiches[s] ? fiches[s].q : s, href: s + '.html' }))
  }));
}

// 3) Un hub par thématique
for (const [id, t] of Object.entries(themes)) {
  const adjectif = t.titre === 'Email' ? 'email' : (t.titre === 'Adresse IP' ? 'adresse IP' : t.titre);
  ecrire(id + '.html', rendre('hub-thematique.html', {
    site, h1: t.h1, slug: t.slug, stat: t.stat, intro: t.intro,
    titre: t.titre, titreMinuscule: t.titre.toLowerCase(), adjectif
  }, {
    sujet: t.sujets.map(s => ({
      titre: s.titre, desc: s.desc,
      dataSlug: s.slug || '',
      tag: s.slug ? '/' + s.slug : '→ via l\u2019Expert (chat)',
      urlClasse: s.slug ? '' : 'chat',
      href: s.slug ? s.slug + '.html' : 'index.html?q=' + encodeURIComponent(s.titre)
    })),
    suggestion: t.sujets.slice(0, 3).map(s => ({ titre: s.titre }))
  }));
}

// 4) sitemap.xml
const urls = ['']
  .concat(Object.keys(fiches))
  .concat(Object.keys(themes))
  .map(u => '  <url><loc>' + URL_PROD + '/' + u + '</loc></url>')
  .join('\n');
ecrire('sitemap.xml',
  '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls + '\n</urlset>\n');

const nb = 1 + Object.keys(fiches).length + Object.keys(themes).length;
console.log('\nBuild terminé : ' + nb + ' pages générées en ' + (Date.now() - debut) + ' ms.');
