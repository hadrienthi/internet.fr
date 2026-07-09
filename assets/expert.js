// Internet.fr — L'Expert Internet (chat + bandeau réseau + tunnel SEO ?q=)
// Vanilla JS, aucun framework. Chargé par toutes les pages ; les fonctions
// spécifiques au chat ne s'activent que si les éléments existent.

(function () {
  'use strict';

  // ─── Bandeau réseau : compte-à-rebours du débit (seule API réelle du site) ───
  // En production, remplacer mesureDebit() par l'appel à la vraie API de test.
  var DEBIT_CIBLE = window.__DONNEES_RESEAU__ ? window.__DONNEES_RESEAU__.debitMbps : 487;

  function mesureDebit() {
    var el = document.querySelector('[data-debit]');
    if (!el) return;
    var n = 0;
    var timer = setInterval(function () {
      n += Math.ceil((DEBIT_CIBLE - n) / 6) + Math.floor(Math.random() * 30);
      if (n >= DEBIT_CIBLE) { n = DEBIT_CIBLE; clearInterval(timer); }
      el.textContent = n + ' Mbps';
    }, 90);
  }

  document.querySelectorAll('[data-relancer]').forEach(function (btn) {
    btn.addEventListener('click', mesureDebit);
  });
  mesureDebit();

  // ─── Chat (uniquement si la page contient le module) ───
  var zone = document.querySelector('[data-chat-messages]');
  var champ = document.querySelector('[data-chat-input]');
  var envoyer = document.querySelector('[data-chat-send]');
  if (!zone || !champ) return;

  var REPONSES = {
    'lent': "Trois causes fréquentes : le Wi-Fi (trop loin de la box, canal saturé), la box elle-même, ou une limitation de votre offre.\n1. Testez en filaire ou près de la box.\n2. Redémarrez la box 30 secondes.\n3. Comparez le résultat du bandeau réseau (en haut de page) à votre abonnement.\nDites-moi votre débit mesuré et je vous aide à interpréter.",
    'pirat': "Vérifions ensemble. Votre adresse apparaît-elle dans une fuite de données connue ? Donnez-moi votre domaine de messagerie (jamais le mot de passe !) et je vous explique comment vérifier avec Have I Been Pwned, puis sécuriser votre compte : mot de passe unique + double authentification.",
    'qr': "Ouvrez l'appareil photo de votre téléphone et visez le code : une notification apparaît. Avant d'ouvrir le lien, vérifiez que le domaine correspond bien au site attendu. Un QR code collé par-dessus un autre est un signal d'arnaque — décrivez-moi la situation et je vous guide.",
    'vpn': "Un VPN chiffre votre connexion et masque votre IP : indispensable sur les Wi-Fi publics, utile pour la confidentialité. Mais il ne bloque ni virus ni phishing. Dites-moi votre usage (voyage, télétravail, streaming ?) et je vous aide à choisir.",
    'domaine': "Pas besoin d'outil WHOIS ici : je vous explique directement. Chaque domaine a une fiche publique (titulaire — souvent masqué pour les particuliers en France —, bureau d'enregistrement, dates). Donnez-moi le domaine qui vous intéresse et je vous dis comment lire sa fiche, en langage clair.",
    'ip': "Votre IP publique est affichée dans le bandeau réseau, tout en haut de la page. Pour l'IP locale : Paramètres → Réseau sur ordinateur, Réglages → Wi-Fi sur mobile. Que cherchez-vous à faire avec cette adresse ? Je vous guide.",
    'wi-fi': "Votre appareil est bien connecté à la box, mais la box n'accède plus au réseau.\n1. Vérifiez le voyant « Internet » de votre box.\n2. Redémarrez-la 30 secondes.\n3. Si le voyant reste rouge, c'est probablement côté opérateur.\nJe vous détaille chaque étape si besoin.",
    'ssl': "Bonne nouvelle : même sans page dédiée, je maîtrise le sujet. Un certificat SSL/TLS chiffre les échanges entre votre navigateur et un site (le cadenas dans la barre d'adresse). Dites-moi ce que vous cherchez à faire — vérifier un site, installer un certificat, comprendre une erreur — et je vous guide pas à pas.",
    'heberg': "Même sans page dédiée, je vous réponds volontiers. L'hébergement web, c'est l'ordinateur toujours allumé qui stocke votre site. Mutualisé, VPS, cloud : dites-moi votre projet et votre budget, je vous aide à choisir."
  };

  function bulle(role, texte) {
    var m = document.createElement('div');
    m.className = 'message ' + (role === 'user' ? 'utilisateur' : 'bot');
    var b = document.createElement('div');
    b.className = 'bulle';
    b.textContent = texte;
    m.appendChild(b);
    zone.appendChild(m);
    return b;
  }

  function repondre(texte) {
    var frappe = document.createElement('div');
    frappe.className = 'message bot';
    frappe.innerHTML = '<div class="frappe"><span></span><span></span><span></span></div>';
    zone.appendChild(frappe);
    setTimeout(function () {
      frappe.remove();
      var b = bulle('bot', '');
      var i = 0;
      var timer = setInterval(function () {
        i = Math.min(texte.length, i + 3);
        b.textContent = texte.slice(0, i);
        if (i >= texte.length) clearInterval(timer);
      }, 14);
    }, 700);
  }

  function poser(question) {
    if (!question || !question.trim()) return;
    bulle('user', question);
    champ.value = '';
    var q = question.toLowerCase();
    var texte = null;
    if (q.indexOf('mbps') !== -1 || q.indexOf('normal') !== -1) {
      texte = DEBIT_CIBLE + " Mbps, c'est un très bon débit : la plupart des offres fibre délivrent entre 300 Mbps et 1 Gbps. Streaming 4K, visioconférence et jeux en ligne fonctionneront sans limite perceptible. Si votre offre annonce davantage, testez en filaire pour éliminer le Wi-Fi.";
    } else {
      var cles = ['ssl', 'heberg', 'domaine', 'lent', 'pirat', 'qr', 'vpn', 'wi-fi', 'ip'];
      for (var k = 0; k < cles.length; k++) {
        if (q.indexOf(cles[k]) !== -1) { texte = REPONSES[cles[k]]; break; }
      }
    }
    if (!texte) texte = "Bonne question ! Dans la version finale, je m'appuie sur les 4 416 questions réelles collectées et une IA spécialisée pour vous répondre précisément, avec des étapes concrètes et des liens vers les pages dédiées d'Internet.fr.";
    repondre(texte);
  }

  if (envoyer) envoyer.addEventListener('click', function () { poser(champ.value); });
  champ.addEventListener('keydown', function (e) { if (e.key === 'Enter') poser(champ.value); });
  document.querySelectorAll('[data-chat-suggestion]').forEach(function (btn) {
    btn.addEventListener('click', function () { poser(btn.textContent); });
  });
  document.querySelectorAll('[data-prefill]').forEach(function (el) {
    el.addEventListener('click', function (e) {
      e.preventDefault();
      champ.value = el.getAttribute('data-prefill');
      document.getElementById('expert').scrollIntoView({ behavior: 'smooth', block: 'start' });
      champ.focus({ preventScroll: true });
    });
  });
  var boutonDebit = document.querySelector('[data-ask-debit]');
  if (boutonDebit) boutonDebit.addEventListener('click', function (e) {
    e.preventDefault();
    document.getElementById('expert').scrollIntoView({ behavior: 'smooth', block: 'start' });
    poser(DEBIT_CIBLE + ' Mbps en fibre, est-ce un bon débit ?');
  });

  // ─── Tunnel SEO : ?q=slug-ou-question → injection + scroll fluide + focus ───
  var params = new URLSearchParams(window.location.search);
  var q = params.get('q');
  if (q) {
    var question = decodeURIComponent(q).replace(/-/g, ' ');
    var table = window.__QUESTIONS_PAR_SLUG__ || {};
    if (table[q]) question = table[q];
    setTimeout(function () {
      var expert = document.getElementById('expert');
      if (expert) expert.scrollIntoView({ behavior: 'smooth', block: 'start' });
      champ.focus({ preventScroll: true });
      poser(question);
    }, 400);
  }
})();
