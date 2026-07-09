# Internet.fr — Architecture industrialisée (SSG)

Séparation stricte fond / forme / build. Ajoutez 10 000 entrées dans `donnees.json`
ou changez une couleur dans un template : `node build.js` reconstruit tout le site en quelques millisecondes.

## Structure

```
donnees.json              ← SOURCE DE VÉRITÉ UNIQUE (questions, réponses, thématiques, slugs)
templates/
  accueil.html            ← gabarit de la page d'accueil
  fiche-faq.html          ← gabarit « piège SEO » (1 page générée par question)
  hub-thematique.html     ← gabarit hub (1 page générée par thématique)
  partiels/
    bandeau-reseau.html   ← bandeau débit/IP/FAI (en tête, toutes pages)
    entete.html           ← header + navigation
    mascotte.html         ← robot .FR
    chat.html             ← module « L'Expert Internet »
    cta-expert.html       ← CTA « Votre problème persiste ? »
    pied.html             ← footer
assets/
  styles.css              ← toute la direction artistique (variables CSS en tête de fichier)
  expert.js               ← chat, bandeau réseau, tunnel SEO ?q=
build.js                  ← script de génération (Node.js natif, zéro dépendance)
docs/                     ← SITE GÉNÉRÉ (ne jamais éditer à la main)
```

## Utilisation

```bash
node build.js
```

Génère dans `docs/` : `index.html`, une page par fiche (`pourquoi-mon-internet-est-lent.html`…),
une page par hub (`email.html`, `qr-code.html`, `vpn.html`, `adresse-ip.html`), `assets/`, `sitemap.xml`.

Servir localement : `npx serve docs` (ou tout serveur statique). Déploiement : GitHub Pages : Settings → Pages → Deploy from a branch → main → /docs.

## Syntaxe des templates

- `{{chemin.valeur}}` — insertion échappée
- `{{{chemin}}}` — insertion brute (JSON)
- `{{> nom}}` — inclusion d'un partiel
- `<!--BEGIN nom--> … <!--END nom-->` — bloc répété (grilles, étapes)

## Règles éditoriales encodées

- Chaque entrée de `fiches` = 1 URL sémantique indexable, H1 = question exacte, réponse courte (featured snippet), étapes, conclusion, CTA → `index.html?q=<slug>` (chat pré-rempli + lancé + focus).
- Sujets `slug: null` dans les hubs = pas de page : routés vers le chat (règle SSL / hébergement / WHOIS).
- Le bandeau réseau (débit, IP, FAI) est la seule API réelle ; brancher la vraie mesure dans `assets/expert.js` (`mesureDebit`).

## Production

En prod, réécrire `<slug>.html` → `/<slug>` (Vercel `cleanUrls: true`, ou règle de réécriture GitHub Pages/nginx). Le sitemap est déjà écrit avec les URLs propres.
