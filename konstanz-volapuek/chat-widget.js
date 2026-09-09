/* ============================================================
   HOTELFREUNDE, KI-Rezeption
   Selbst-enthaltenes Chat-Widget, keine Abhängigkeiten.

   Einbinden mit einer Zeile:
   <script src="chat-widget.js" defer></script>

   Alles Anpassbare steht im CONFIG-Block direkt darunter.
   ============================================================ */

(function () {
  "use strict";

  /* ---------- CONFIG, das hier wird pro Hotel angepasst ---------- */
  const CONFIG = {
    // Die Webhook-URL aus n8n. Im Test die Test-URL, live die Production-URL.
    webhookUrl: "https://n8n.srv1156975.hstgr.cloud/webhook/hotel-chat",

    hotelName: "Hotel Volapük",

    // Farben aus dem Volapük-Branding: Rot wie im Original-Logo.
    primary: "#b30101",
    primaryText: "#ffffff",
    accent: "#8a0202",

    // Text im geschlossenen Zustand, erscheint als kleine Sprechblase
    teaser: "Fragen zum Hotel Volapük? Ich antworte sofort.",

    // Erste Nachricht im geöffneten Fenster
    greeting:
      "Guten Tag, ich bin die digitale Rezeption vom Hotel Volapük. " +
      "Was möchten Sie wissen?",

    // Vorschläge unter der Begrüßung. Leeres Array blendet sie aus.
    // Sie senken die Hemmschwelle massiv, drei bis vier sind ideal.
    quickReplies: [
      "Ab wann kann ich einchecken?",
      "Sind Parkplätze inklusive?",
      "Wie weit ist es zur Insel Mainau?",
      "Ist die Sauna für Gäste frei?"
    ],

    // Fällt der Webhook aus, sieht der Gast das hier
    errorText:
      "Da ist gerade etwas schiefgelaufen. Rufen Sie uns gern direkt an unter " +
      "+49 7531 94400, wir helfen Ihnen sofort weiter.",

    // Sekunden, nach denen die Teaser-Blase von selbst erscheint. 0 = nie.
    teaserDelay: 9,

    position: "right" // "right" oder "left"
  };

  /* ---------- Ab hier muss normalerweise nichts geändert werden ---------- */

  // Zweimal einbinden soll nichts kaputt machen
  if (window.__hfChatGeladen) return;
  window.__hfChatGeladen = true;

  const SESSION_KEY = "hf-chat-session";
  const SEITE = CONFIG.position === "left" ? "left" : "right";

  // Gesprächsfaden. Bleibt für die Dauer des Besuchs bestehen, danach weg.
  function sessionId() {
    let id;
    try {
      id = sessionStorage.getItem(SESSION_KEY);
      if (!id) {
        id = "s_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
        sessionStorage.setItem(SESSION_KEY, id);
      }
    } catch (e) {
      // Privater Modus oder Cookies blockiert: dann eben ohne Verlauf
      id = "s_fluechtig_" + Date.now().toString(36);
    }
    return id;
  }

  const host = document.createElement("div");
  host.setAttribute("data-hf-chat", "");
  // Shadow DOM, damit fremdes CSS der Hotelseite nicht reinfunkt
  // und unser CSS dort auch nichts zerschießt
  const wurzel = host.attachShadow({ mode: "open" });
  document.body.appendChild(host);

  wurzel.innerHTML = `
    <style>
      :host { all: initial; }
      * { box-sizing: border-box; }

      .huelle {
        position: fixed;
        bottom: 20px;
        ${SEITE}: 20px;
        z-index: 2147483000;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        font-size: 15px;
        line-height: 1.5;
      }

      /* ---- Knopf ---- */
      .knopf {
        width: 60px; height: 60px;
        border-radius: 50%;
        border: none;
        background: ${CONFIG.primary};
        color: ${CONFIG.primaryText};
        cursor: pointer;
        display: grid; place-items: center;
        box-shadow: 0 6px 24px rgba(0,0,0,.22);
        transition: transform .2s cubic-bezier(.2,.7,.3,1), box-shadow .2s;
      }
      .knopf:hover { transform: translateY(-2px); box-shadow: 0 10px 30px rgba(0,0,0,.28); }
      .knopf:focus-visible { outline: 3px solid ${CONFIG.accent}; outline-offset: 3px; }
      .knopf svg { width: 26px; height: 26px; }
      .knopf .schliessen { display: none; }
      .huelle.offen .knopf .oeffnen { display: none; }
      .huelle.offen .knopf .schliessen { display: block; }

      /* ---- Teaser ---- */
      .teaser {
        position: absolute;
        bottom: 72px; ${SEITE}: 0;
        width: max-content; max-width: 240px;
        background: #fff; color: #1a1a1a;
        padding: 12px 14px;
        border-radius: 14px;
        box-shadow: 0 6px 24px rgba(0,0,0,.16);
        opacity: 0; transform: translateY(8px);
        pointer-events: none;
        transition: opacity .3s, transform .3s;
        font-size: 14px;
      }
      .teaser.sichtbar { opacity: 1; transform: none; pointer-events: auto; }
      .huelle.offen .teaser { display: none; }
      .teaser-zu {
        position: absolute; top: -8px; ${SEITE}: -8px;
        width: 22px; height: 22px; border-radius: 50%;
        border: none; background: #e8e8e8; color: #555;
        cursor: pointer; font-size: 14px; line-height: 1;
        display: grid; place-items: center;
      }

      /* ---- Fenster ---- */
      .fenster {
        position: absolute;
        bottom: 76px; ${SEITE}: 0;
        width: 370px; height: 540px; max-height: calc(100vh - 120px);
        background: #fff;
        border-radius: 16px;
        box-shadow: 0 12px 48px rgba(0,0,0,.24);
        display: flex; flex-direction: column;
        overflow: hidden;
        opacity: 0; transform: translateY(12px) scale(.98);
        pointer-events: none;
        transition: opacity .22s, transform .22s cubic-bezier(.2,.7,.3,1);
      }
      .huelle.offen .fenster { opacity: 1; transform: none; pointer-events: auto; }

      .kopf {
        background: ${CONFIG.primary}; color: ${CONFIG.primaryText};
        padding: 16px 18px;
        display: flex; align-items: center; gap: 10px;
        flex: none;
      }
      .kopf .punkt {
        width: 8px; height: 8px; border-radius: 50%;
        background: #4ade80; flex: none;
      }
      .kopf b { font-size: 15px; font-weight: 600; }
      .kopf span { font-size: 12px; opacity: .75; display: block; font-weight: 400; }

      .verlauf {
        flex: 1; overflow-y: auto;
        padding: 18px 16px;
        display: flex; flex-direction: column; gap: 12px;
        background: #f7f7f5;
        overscroll-behavior: contain;
      }

      .blase {
        max-width: 82%;
        padding: 11px 14px;
        border-radius: 16px;
        white-space: pre-wrap; word-wrap: break-word;
      }
      .blase.bot {
        align-self: flex-start;
        background: #fff; color: #1a1a1a;
        border-bottom-left-radius: 5px;
        box-shadow: 0 1px 3px rgba(0,0,0,.07);
      }
      .blase.gast {
        align-self: flex-end;
        background: ${CONFIG.primary}; color: ${CONFIG.primaryText};
        border-bottom-right-radius: 5px;
      }
      .blase.fehler { background: #fdecea; color: #8a1c12; align-self: flex-start; }

      .vorschlaege { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 2px; }
      .vorschlag {
        background: #fff; border: 1px solid #dcdcd6;
        color: #333; border-radius: 999px;
        padding: 8px 13px; font-size: 13.5px; cursor: pointer;
        font-family: inherit;
        transition: border-color .15s, color .15s;
      }
      .vorschlag:hover { border-color: ${CONFIG.primary}; color: ${CONFIG.primary}; }

      .tippt { display: flex; gap: 4px; padding: 13px 15px; }
      .tippt i {
        width: 7px; height: 7px; border-radius: 50%; background: #b9b9b2;
        animation: huepf 1.3s infinite;
      }
      .tippt i:nth-child(2) { animation-delay: .18s; }
      .tippt i:nth-child(3) { animation-delay: .36s; }
      @keyframes huepf { 0%,60%,100% { transform: none; opacity:.5 } 30% { transform: translateY(-5px); opacity:1 } }

      .eingabe {
        flex: none;
        border-top: 1px solid #e8e8e2;
        padding: 10px 12px;
        display: flex; gap: 8px; align-items: flex-end;
        background: #fff;
      }
      .eingabe textarea {
        flex: 1; resize: none; border: none; outline: none;
        font: inherit; color: #1a1a1a;
        max-height: 110px; padding: 9px 4px;
        background: transparent;
      }
      .senden {
        width: 38px; height: 38px; flex: none;
        border: none; border-radius: 50%;
        background: ${CONFIG.primary}; color: ${CONFIG.primaryText};
        cursor: pointer; display: grid; place-items: center;
        transition: opacity .15s;
      }
      .senden:disabled { opacity: .35; cursor: default; }
      .senden svg { width: 17px; height: 17px; }

      .fuss {
        text-align: center; font-size: 11px; color: #9a9a92;
        padding: 0 0 9px; background: #fff; flex: none;
      }

      /* ---- Mobil ---- */
      @media (max-width: 480px) {
        .huelle { bottom: 14px; ${SEITE}: 14px; }
        .fenster {
          position: fixed;
          inset: 0;
          width: 100%; height: 100%; max-height: none;
          border-radius: 0;
        }
        .teaser { max-width: 200px; }
      }

      @media (prefers-reduced-motion: reduce) {
        * { transition: none !important; animation: none !important; }
      }
    </style>

    <div class="huelle" part="huelle">
      <div class="teaser" id="teaser">
        <button class="teaser-zu" id="teaserZu" aria-label="Hinweis schließen">×</button>
        ${CONFIG.teaser}
      </div>

      <div class="fenster" id="fenster" role="dialog" aria-modal="false" aria-label="Chat mit der Rezeption">
        <div class="kopf">
          <span class="punkt"></span>
          <div>
            <b>${CONFIG.hotelName}</b>
            <span>Antwortet sofort, rund um die Uhr</span>
          </div>
        </div>

        <div class="verlauf" id="verlauf" aria-live="polite"></div>

        <div class="eingabe">
          <textarea id="feld" rows="1" placeholder="Ihre Frage..." aria-label="Ihre Frage"></textarea>
          <button class="senden" id="senden" aria-label="Senden" disabled>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z"/>
            </svg>
          </button>
        </div>
        <div class="fuss">Digitale Rezeption von HOTELFREUNDE</div>
      </div>

      <button class="knopf" id="knopf" aria-label="Chat öffnen">
        <svg class="oeffnen" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.9 8.9 0 0 1-4-.9L3 21l1.9-4.9A8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5z"/>
        </svg>
        <svg class="schliessen" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round">
          <path d="M18 6 6 18M6 6l12 12"/>
        </svg>
      </button>
    </div>
  `;

  const $ = (id) => wurzel.getElementById(id);
  const huelle = wurzel.querySelector(".huelle");
  const verlauf = $("verlauf");
  const feld = $("feld");
  const sendenBtn = $("senden");
  const teaser = $("teaser");

  let offen = false;
  let laeuft = false;
  let begruesst = false;

  function blase(text, wer) {
    const el = document.createElement("div");
    el.className = "blase " + wer;
    el.textContent = text;
    verlauf.appendChild(el);
    verlauf.scrollTop = verlauf.scrollHeight;
    return el;
  }

  function vorschlaegeZeigen() {
    if (!CONFIG.quickReplies.length) return;
    const box = document.createElement("div");
    box.className = "vorschlaege";
    CONFIG.quickReplies.forEach((frage) => {
      const b = document.createElement("button");
      b.className = "vorschlag";
      b.textContent = frage;
      b.addEventListener("click", () => {
        box.remove();
        senden(frage);
      });
      box.appendChild(b);
    });
    verlauf.appendChild(box);
    verlauf.scrollTop = verlauf.scrollHeight;
  }

  function tipptAn() {
    const el = document.createElement("div");
    el.className = "blase bot tippt";
    el.innerHTML = "<i></i><i></i><i></i>";
    verlauf.appendChild(el);
    verlauf.scrollTop = verlauf.scrollHeight;
    return el;
  }

  async function senden(text) {
    if (laeuft || !text.trim()) return;
    laeuft = true;
    sendenBtn.disabled = true;

    blase(text, "gast");
    feld.value = "";
    feld.style.height = "auto";

    const punkte = tipptAn();

    try {
      const antwort = await fetch(CONFIG.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          sessionId: sessionId(),
          hotel: CONFIG.hotelName,
          seite: location.href
        })
      });

      if (!antwort.ok) throw new Error("HTTP " + antwort.status);

      const daten = await antwort.json();
      punkte.remove();

      // n8n kann je nach Aufbau unterschiedlich antworten, wir nehmen was da ist
      const text_ =
        daten.reply || daten.output || daten.text || daten.antwort ||
        (typeof daten === "string" ? daten : null);

      if (!text_) throw new Error("Leere Antwort");
      blase(text_, "bot");
    } catch (e) {
      punkte.remove();
      blase(CONFIG.errorText, "fehler");
      console.warn("[HF-Chat]", e);
    } finally {
      laeuft = false;
      sendenBtn.disabled = !feld.value.trim();
      feld.focus();
    }
  }

  function umschalten() {
    offen = !offen;
    huelle.classList.toggle("offen", offen);
    $("knopf").setAttribute("aria-label", offen ? "Chat schließen" : "Chat öffnen");
    teaser.classList.remove("sichtbar");

    if (offen && !begruesst) {
      begruesst = true;
      setTimeout(() => {
        blase(CONFIG.greeting, "bot");
        setTimeout(vorschlaegeZeigen, 300);
      }, 250);
    }
    if (offen) setTimeout(() => feld.focus(), 300);
  }

  $("knopf").addEventListener("click", umschalten);
  teaser.addEventListener("click", (e) => {
    if (e.target.id !== "teaserZu") umschalten();
  });
  $("teaserZu").addEventListener("click", (e) => {
    e.stopPropagation();
    teaser.classList.remove("sichtbar");
  });

  feld.addEventListener("input", () => {
    sendenBtn.disabled = !feld.value.trim() || laeuft;
    feld.style.height = "auto";
    feld.style.height = Math.min(feld.scrollHeight, 110) + "px";
  });

  feld.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      senden(feld.value);
    }
  });

  sendenBtn.addEventListener("click", () => senden(feld.value));

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && offen) umschalten();
  });

  if (CONFIG.teaserDelay > 0) {
    setTimeout(() => {
      if (!offen) teaser.classList.add("sichtbar");
    }, CONFIG.teaserDelay * 1000);
  }
})();
