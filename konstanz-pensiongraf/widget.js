/*! Direktbucher-Widget v1.0 | Vanilla JS, keine Abhaengigkeiten, defer-tauglich
 *  Kein Cookie, kein localStorage, kein Fingerprinting. Nur sessionStorage. */
(function () {
  'use strict';

  /* ==== CONFIG ==== Pro Hotel anpassen, darunter bleibt alles unveraendert. */

  var CONFIG = {
    hotelName: 'Hotel Pension Graf',

    primaryColor: '#116dff',  // Pension-Graf-Blau
    textColor: '#14213d',

    headline: 'Direkt anfragen statt Umwege',
    benefitText: 'Ihr Zimmerwunsch geht direkt an die Pension.',

    // Bild oben in der Karte, optional. Leer = kein Bild.
    imageUrl: 'img/graf-04.jpg',

    promoCode: '',
    promoHint: '',

    ctaLabel: 'ZIMMER DIREKT ANFRAGEN',
    bookingUrl: '#anfragen',

    logoUrl: 'img/graf-logo.png',              // optional

    // URL-Fragmente, auf denen nichts erscheint
    excludedPaths: ['/buchen', '/booking', '/reservier', '/danke', '/thank', '/warenkorb'],

    enableEmailCapture: false, // Version 1: aus lassen
    privacyUrl: 'datenschutz.html',

    WEBHOOK_URL: ''           // optional, leer = keine Messung
  };

  // Feineinstellung der Ausloeser, normalerweise unveraendert (ms/px)
  var TUNING = { armDelayMs: 5000, dwellMs: 45000, dwellDepth: 0.5, downBefore: 300, upDistance: 400, upWindowMs: 600 };

  /* ==== ENDE CONFIG ==== */

  var KEY = 'pensiongraf_dbw_seen', ui = null, isOpen = false, fired = false, lastFocus = null, prevOv = '';

  function seen() { try { return sessionStorage.getItem(KEY) === '1'; } catch (e) { return false; } }
  function markSeen() { try { sessionStorage.setItem(KEY, '1'); } catch (e) {} }

  function excluded() {
    var here = (location.pathname + location.search).toLowerCase();
    return CONFIG.excludedPaths.some(function (f) {
      f = String(f || '').toLowerCase();
      return f && here.indexOf(f) !== -1;
    });
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; });
  }

  // Kontrastfarbe zur Hotelfarbe
  function onPrimary(hex) {
    var h = String(hex || '').replace('#', '');
    if (h.length === 3) h = h.replace(/./g, '$&$&');
    var n = parseInt(h, 16);
    if (h.length !== 6 || isNaN(n)) return '#fff';
    return 0.299 * (n >> 16 & 255) + 0.587 * (n >> 8 & 255) + 0.114 * (n & 255) > 165 ? '#111' : '#fff';
  }

  function isTouch() { return !!(window.matchMedia && matchMedia('(hover: none)').matches); }

  // gemeinsamer Eingang aller Ausloeser, max. einmal pro Sitzung
  function fire(reason) {
    if (fired || isOpen || seen()) return;
    fired = true;
    markSeen();
    openOverlay(reason);
  }

  // Desktop: Maus verlaesst das Viewport nach oben
  function armExitIntent() {
    function onOut(e) {
      if (e.relatedTarget || e.clientY > 4) return;  // nur echtes Verlassen
      document.removeEventListener('mouseout', onOut);
      fire('exit_intent');
    }
    document.addEventListener('mouseout', onOut);
  }

  // Mobil: schnell hoch nach runter, oder Verweildauer bei halber Tiefe
  function armMobile() {
    var lastY = pageYOffset, down = 0, up = 0, upStart = 0, maxDepth = 0, dwell = false, tick = false;

    function stop() { removeEventListener('scroll', onScroll); }

    function onScroll() {
      if (tick) return;
      tick = true;
      requestAnimationFrame(function () {
        tick = false;
        var y = pageYOffset, dy = y - lastY, now = Date.now();
        var d = Math.min(1, (y + innerHeight) / (document.documentElement.scrollHeight || 1));
        lastY = y;
        if (d > maxDepth) maxDepth = d;

        if (dy > 0) { down += dy; up = 0; upStart = 0; }
        else if (dy < 0) {
          if (!upStart || now - upStart > TUNING.upWindowMs) { upStart = now; up = 0; }
          up -= dy;
          if (down >= TUNING.downBefore && up >= TUNING.upDistance) { stop(); fire('fast_scroll_up'); return; }
        }
        if (dwell && maxDepth >= TUNING.dwellDepth) { stop(); fire('dwell'); }
      });
    }

    addEventListener('scroll', onScroll, { passive: true });
    setTimeout(function () {
      dwell = true;
      if (maxDepth >= TUNING.dwellDepth) { stop(); fire('dwell'); }
    }, TUNING.dwellMs);
  }

  function styles() {
    return `
.dbw-ov{position:absolute;top:0;right:0;bottom:0;left:0;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(15,15,15,.55);opacity:0;transition:opacity .18s}
.dbw-ov.dbw-vis{opacity:1}
.dbw-card{position:relative;width:100%;max-width:392px;max-height:90vh;overflow:hidden auto;padding:24px;background:#fff;border-radius:18px;text-align:center;color:var(--dbw-text);font:400 15px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;box-shadow:0 24px 60px rgba(40,16,16,.34);transform:translateY(14px) scale(.98);transition:transform .18s}
.dbw-card,.dbw-card *{box-sizing:border-box;font-family:inherit}
.dbw-ov.dbw-vis .dbw-card{transform:none}
.dbw-x{position:absolute;z-index:2;top:12px;right:12px;width:34px;height:34px;padding:0;border:0;background:rgba(255,255,255,.9);color:#2a2a2a;font-size:22px;line-height:1;border-radius:50%;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.18)}
.dbw-img{display:block;width:calc(100% + 48px);margin:-24px -24px 20px;height:188px;object-fit:cover}
.dbw-logo{display:block;max-height:46px;max-width:60%;margin:0 auto 14px}
.dbw-h{margin:0 0 6px;font-size:25px;line-height:1.18;font-weight:750;letter-spacing:-.01em}
.dbw-b{margin:0 0 20px;font-size:15px;opacity:.82}
.dbw-code{display:flex;gap:8px;margin:0 0 8px}
.dbw-val{flex:1;display:flex;align-items:center;justify-content:center;min-height:54px;padding:6px 10px;border:2px dashed var(--dbw-primary);border-radius:10px;background:#fbfbfb;color:var(--dbw-primary);font-size:24px;font-weight:700;letter-spacing:.1em}
.dbw-copy,.dbw-send{border:1px solid #dadada;border-radius:10px;background:#fff;color:var(--dbw-text);font-size:14px;font-weight:600;cursor:pointer}
.dbw-copy{flex:0 0 auto;min-height:54px;padding:0 14px;display:flex;align-items:center;gap:7px}
.dbw-ico{position:relative;display:inline-block;width:11px;height:11px}
.dbw-ico:before,.dbw-ico:after{content:'';position:absolute;width:8px;height:8px;border:1.5px solid currentColor;border-radius:2px}
.dbw-ico:before{top:0;left:3px}
.dbw-ico:after{bottom:0;left:0;background:#fff}
.dbw-hint{margin:0 0 10px;font-size:12.5px;color:#6d6d6d}
.dbw-status{margin:0 0 12px;min-height:17px;font-size:13px;font-weight:600;color:var(--dbw-primary)}
.dbw-cta{display:block;width:100%;min-height:54px;padding:16px;border:0;border-radius:10px;background:var(--dbw-primary);color:var(--dbw-on);font-size:16px;font-weight:700;text-decoration:none;cursor:pointer}
.dbw-mail{margin:16px 0 0;padding-top:16px;border-top:1px solid #ececec;text-align:left}
.dbw-lbl{display:block;margin:0 0 6px;font-size:13px;font-weight:600}
.dbw-in{width:100%;min-height:48px;padding:10px 12px;border:1px solid #cfcfcf;border-radius:9px;background:#fff;color:var(--dbw-text);font-size:16px}
.dbw-chk{display:flex;gap:8px;margin:10px 0;font-size:12px;color:#5c5c5c}
.dbw-chk input{flex:0 0 auto;width:18px;height:18px;margin:1px 0 0}
.dbw-chk a{color:var(--dbw-primary)}
.dbw-send{width:100%;min-height:48px;color:var(--dbw-primary);border-color:var(--dbw-primary);font-size:15px}
.dbw-cta:hover{filter:brightness(1.1)}
.dbw-card :focus-visible{outline:3px solid var(--dbw-primary);outline-offset:2px}
@media (max-width:400px){.dbw-code{flex-direction:column}.dbw-h{font-size:20px}}`;
  }

  function markup() {
    var logo = CONFIG.logoUrl ? `<img class="dbw-logo" src="${esc(CONFIG.logoUrl)}" alt="${esc(CONFIG.hotelName)}">` : '';
    var bild = CONFIG.imageUrl ? `<img class="dbw-img" src="${esc(CONFIG.imageUrl)}" alt="" aria-hidden="true">` : '';
    var code = CONFIG.promoCode ? `<div class="dbw-code"><div class="dbw-val">${esc(CONFIG.promoCode)}</div>
<button class="dbw-copy" type="button"><i class="dbw-ico" aria-hidden="true"></i><span>Code kopieren</span></button></div>
<p class="dbw-hint">${esc(CONFIG.promoHint)}</p>
<p class="dbw-status" role="status"></p>` : '<p class="dbw-status" role="status"></p>';
    var mail = CONFIG.enableEmailCapture ? `<form class="dbw-mail" novalidate>
<label class="dbw-lbl" for="dbw-mail-in">Code per E-Mail erhalten</label>
<input class="dbw-in" id="dbw-mail-in" type="email" inputmode="email" autocomplete="email" placeholder="ihre.adresse@beispiel.de">
<label class="dbw-chk"><input type="checkbox" id="dbw-consent"><span>Ich möchte den Code per E-Mail erhalten. Meine Adresse wird nur dafür verwendet. Hinweise in der <a href="${esc(CONFIG.privacyUrl)}" target="_blank" rel="noopener">Datenschutzerklärung</a>.</span></label>
<button class="dbw-send" type="submit">Code zuschicken</button></form>` : '';

    return `<div class="dbw-ov">
<div class="dbw-card" role="dialog" aria-modal="true" aria-labelledby="dbw-h" aria-describedby="dbw-b">
<button class="dbw-x" type="button" aria-label="Hinweis schließen">&times;</button>
${bild}${logo}<h2 class="dbw-h" id="dbw-h">${esc(CONFIG.headline)}</h2>
<p class="dbw-b" id="dbw-b">${esc(CONFIG.benefitText)}</p>
${code}
<a class="dbw-cta" href="${esc(CONFIG.bookingUrl)}">${esc(CONFIG.ctaLabel)}</a>
${mail}</div></div>`;
  }

  function build() {
    var host = document.createElement('div');
    // gegen fremdes CSS (auch !important) absichern
    'position:fixed;top:0;left:0;right:0;bottom:0;margin:0;padding:0;border:0;display:block;z-index:2147483000'
      .split(';').forEach(function (d) { d = d.split(':'); host.style.setProperty(d[0], d[1], 'important'); });
    host.style.setProperty('--dbw-primary', CONFIG.primaryColor);
    host.style.setProperty('--dbw-text', CONFIG.textColor);
    host.style.setProperty('--dbw-on', onPrimary(CONFIG.primaryColor));
    host.setAttribute('data-direktbucher', '');

    // Shadow DOM als Standard, dbw-Praefix als Fallback fuer alte Engines
    var root = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;
    var st = document.createElement('style'), wrap = document.createElement('div');
    st.textContent = styles();
    wrap.innerHTML = markup();
    root.appendChild(st);
    root.appendChild(wrap.firstChild);
    (document.body || document.documentElement).appendChild(host);

    var q = function (s) { return root.querySelector(s); };
    ui = { host: host, root: root, ov: q('.dbw-ov'), card: q('.dbw-card'), x: q('.dbw-x'),
      copy: q('.dbw-copy'), status: q('.dbw-status'), cta: q('.dbw-cta'), form: q('.dbw-mail') };
    bind();
  }

  function setStatus(t) { if (ui) ui.status.textContent = t || ''; }

  function focusables() {
    return Array.prototype.filter.call(ui.card.querySelectorAll('button,a[href],input,[tabindex]:not([tabindex="-1"])'),
      function (el) { return !el.disabled && el.getClientRects().length; });
  }

  function bind() {
    ui.x.addEventListener('click', function () { closeOverlay('x'); });
    ui.ov.addEventListener('mousedown', function (e) {
      if (e.target === ui.ov) closeOverlay('backdrop');  // nur Hintergrundklick
    });
    ui.cta.addEventListener('click', function () { track('cta_click'); closeOverlay('cta'); });
    if (ui.copy) ui.copy.addEventListener('click', copyCode);
    if (ui.form) ui.form.addEventListener('submit', submitEmail);

    ui.card.addEventListener('keydown', function (e) {   // Fokusfalle
      if (e.key !== 'Tab') return;
      var f = focusables();
      if (!f.length) return;
      var i = f.indexOf(ui.root.activeElement || document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    });
  }

  function copyCode() {
    var code = CONFIG.promoCode, txt = ui.copy.querySelector('span');
    function done(ok) {
      setStatus(ok ? 'Code kopiert' : 'Bitte den Code von Hand notieren');
      if (!ok) return;
      txt.textContent = 'Kopiert';
      setTimeout(function () { if (ui) txt.textContent = 'Code kopieren'; }, 2200);
      track('code_copied');
    }
    if (navigator.clipboard && navigator.clipboard.writeText && isSecureContext) {
      navigator.clipboard.writeText(code).then(function () { done(true); }, function () { done(legacyCopy(code)); });
    } else done(legacyCopy(code));
  }

  function legacyCopy(text) {
    var ta = document.createElement('textarea'), ok = false;
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:0;left:-9999px;opacity:0';
    document.body.appendChild(ta);
    try { ta.select(); ta.setSelectionRange(0, text.length); ok = document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
    return ok;
  }

  function submitEmail(e) {
    e.preventDefault();
    var mail = ui.root.querySelector('#dbw-mail-in').value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail)) return setStatus('Bitte eine gültige E-Mail-Adresse eingeben');
    if (!ui.root.querySelector('#dbw-consent').checked) return setStatus('Bitte die Einwilligung bestätigen');
    if (!CONFIG.WEBHOOK_URL) return setStatus('Der Versand ist noch nicht eingerichtet');
    setStatus('Wird gesendet');
    send({ event: 'email_signup', email: mail, consent: true }).then(
      function () { setStatus('Der Code ist unterwegs'); },
      function () { setStatus('Das hat gerade nicht geklappt'); });
  }

  function previewUnlocked() { return document.body.classList.contains('entsperrt'); }

  function openOverlay(reason) {
    if (!previewUnlocked() || isOpen) return;
    if (!ui) build();
    isOpen = true;
    lastFocus = document.activeElement;
    prevOv = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ui.host.style.setProperty('display', 'block', 'important');
    requestAnimationFrame(function () { if (ui) ui.ov.classList.add('dbw-vis'); });
    ui.x.focus();
    track('impression', { trigger: reason || 'manual' });
  }

  function closeOverlay(via) {
    if (!isOpen || !ui) return;
    isOpen = false;
    ui.ov.classList.remove('dbw-vis');
    document.body.style.overflow = prevOv;
    setTimeout(function () { if (!isOpen && ui) ui.host.style.setProperty('display', 'none', 'important'); }, 200);
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) {} }
    track('close', { via: via || 'unknown' });
  }

  // Escape auch dann, wenn der Fokus die Karte verlassen hat
  document.addEventListener('keydown', function (e) {
    if (isOpen && (e.key === 'Escape' || e.keyCode === 27)) closeOverlay('escape');
  });

  function send(p) {
    p.ts = new Date().toISOString();
    p.hotel = CONFIG.hotelName;
    p.url = location.origin + location.pathname;  // ohne Query-String (oft Buchungsdaten)
    return fetch(CONFIG.WEBHOOK_URL, {
      method: 'POST', mode: 'no-cors', keepalive: true,
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify(p)
    });
  }

  function track(type, extra) {
    if (!CONFIG.WEBHOOK_URL) return;
    try {
      var p = { event: type };
      for (var k in extra) p[k] = extra[k];
      send(p)['catch'](function () {});  // kein Fehler in der Konsole
    } catch (e) {}
  }

  var initialized = false;

  function init() {
    if (window.top !== window.self || initialized) return;  // nicht in fremden iframes
    if (!previewUnlocked()) {
      document.addEventListener('preview:unlocked', init, { once: true });
      return;
    }
    initialized = true;
    if (excluded() || seen()) return;
    setTimeout(function () { isTouch() ? armMobile() : armExitIntent(); }, TUNING.armDelayMs);
  }

  window.Direktbucher = {  // einziger globaler Eintrag
    config: CONFIG,
    open: function () { openOverlay('manual'); },  // ignoriert das Sitzungslimit
    close: function () { closeOverlay('api'); },
    reset: function () { fired = false; try { sessionStorage.removeItem(KEY); } catch (e) {} }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
