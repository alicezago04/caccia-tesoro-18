/* =====================================================================
   CACCIA AL TESORO · 18 ANNI — Motore di gioco (mondo esplorabile)
   Tutto è guidato da config.js. Qui c'è la logica; non serve modificarlo.

   L'eroina CAMMINA nel mondo (frecce/WASD da tastiera, oppure i pulsanti
   a schermo ◀ ▶ ⤴ E su telefono/tablet). Avvicinandosi agli oggetti
   compare "Interagisci [E]": premendo si apre la sfida. Superata la sfida
   si sblocca un PASSAGGIO luminoso verso la zona successiva.
   ===================================================================== */
(() => {
  "use strict";

  /* ----------------------------- UTILITÀ ---------------------------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const randInt = (n) => Math.floor(Math.random() * n);
  const loadImage = (src) => new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => rej(new Error("img: " + src));
    im.src = src;
  });
  // Colore medio della fascia alta dell'immagine: per fondere i bordi (cielo).
  function sampleTopColor(img) {
    try {
      const c = document.createElement("canvas");
      c.width = 1; c.height = 1;
      const cx = c.getContext("2d");
      cx.drawImage(img, 0, 0, img.naturalWidth, Math.max(1, Math.round(img.naturalHeight * 0.08)), 0, 0, 1, 1);
      const d = cx.getImageData(0, 0, 1, 1).data;
      return `rgb(${d[0]},${d[1]},${d[2]})`;
    } catch { return null; }
  }

  function el(tag, opts = {}, ...children) {
    const node = document.createElement(tag);
    if (opts.class) node.className = opts.class;
    if (opts.html != null) node.innerHTML = opts.html;
    if (opts.text != null) node.textContent = opts.text;
    if (opts.attrs) for (const [k, v] of Object.entries(opts.attrs)) node.setAttribute(k, v);
    if (opts.style) for (const [k, v] of Object.entries(opts.style)) {
      if (k.startsWith("--")) node.style.setProperty(k, v);
      else node.style[k] = v;
    }
    if (opts.on) for (const [k, v] of Object.entries(opts.on)) node.addEventListener(k, v);
    for (const c of children) node.append(c?.nodeType ? c : document.createTextNode(c ?? ""));
    return node;
  }

  /* ------------------------------ AUDIO ----------------------------- */
  const Sound = (() => {
    let ctx, master, muted = false, musicEl = null;
    const ensure = () => {
      if (!ctx) {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        master = ctx.createGain();
        master.gain.value = 0.5;
        master.connect(ctx.destination);
      }
      if (ctx.state === "suspended") ctx.resume();
    };
    const tone = (freq, dur = 0.15, type = "sine", vol = 0.4, when = 0) => {
      if (muted) return;
      ensure();
      const t = ctx.currentTime + when;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(master);
      o.start(t);
      o.stop(t + dur + 0.02);
    };
    const melody = (notes, type = "triangle") =>
      notes.forEach(([f, d], i) => tone(f, d, type, 0.35, i * 0.12));

    return {
      unlock: () => ensure(),
      click: () => tone(420, 0.08, "triangle", 0.3),
      step: () => tone(220, 0.05, "sine", 0.12),
      jump: () => { tone(380, 0.12, "square", 0.18); tone(560, 0.1, "square", 0.16, 0.06); },
      correct: () => melody([[523, 0.12], [659, 0.12], [784, 0.18]]),
      wrong: () => { tone(180, 0.18, "sawtooth", 0.3); tone(140, 0.22, "sawtooth", 0.3, 0.08); },
      reward: () => melody([[523, 0.12], [659, 0.12], [784, 0.12], [1046, 0.28]]),
      gate: () => { tone(120, 0.6, "sawtooth", 0.25); melody([[330, 0.2], [392, 0.2], [523, 0.4]]); },
      portal: () => melody([[660, 0.1], [880, 0.1], [1175, 0.2]], "sine"),
      win: () => melody([[523, 0.16], [587, 0.16], [659, 0.16], [784, 0.16], [880, 0.18], [1046, 0.4]]),
      pop: () => tone(660, 0.1, "sine", 0.3),
      music(src) {
        if (!src) return;
        musicEl = new Audio(src);
        musicEl.loop = true; musicEl.volume = 0.32; musicEl.muted = muted;
        musicEl.play().catch(() => {});
      },
    };
  })();

  /* ----------------------------- CONFETTI --------------------------- */
  const Confetti = (() => {
    const cv = $("#confetti");
    const ctx = cv.getContext("2d");
    let bits = [], raf, W, H, running = false;
    const COLORS = ["#e0457b", "#ffd34e", "#4cc77c", "#5bb8ff", "#ff8a5c", "#b06bff"];
    return {
      burst() {
        cv.classList.remove("hidden");
        W = cv.width = innerWidth; H = cv.height = innerHeight;
        bits = Array.from({ length: 160 }, () => ({
          x: W / 2 + (Math.random() - 0.5) * 80, y: H / 3,
          vx: (Math.random() - 0.5) * 12, vy: -6 - Math.random() * 9,
          g: 0.22 + Math.random() * 0.12, size: 6 + Math.random() * 7,
          color: COLORS[randInt(COLORS.length)], rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.3,
        }));
        if (!running) { running = true; loop(); }
        function loop() {
          ctx.clearRect(0, 0, W, H);
          let alive = false;
          for (const b of bits) {
            b.vy += b.g; b.x += b.vx; b.y += b.vy; b.rot += b.vr;
            if (b.y < H + 30) alive = true;
            ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.rot);
            ctx.fillStyle = b.color; ctx.fillRect(-b.size / 2, -b.size / 2, b.size, b.size * 0.6);
            ctx.restore();
          }
          if (alive) raf = requestAnimationFrame(loop);
          else { running = false; cancelAnimationFrame(raf); }
        }
      },
    };
  })();

  /* ------------------------------ AVATAR ---------------------------- */
  function avatarSVG({ full = false } = {}) {
    const s = CONFIG.sister;
    const face = s.facePhoto
      ? `<defs><clipPath id="fc"><circle cx="60" cy="52" r="26"/></clipPath></defs>
         <image href="${s.facePhoto}" x="34" y="26" width="52" height="52"
                clip-path="url(#fc)" preserveAspectRatio="xMidYMid slice"/>`
      : `<circle cx="60" cy="54" r="26" fill="${s.skinColor}"/>
         <circle cx="51" cy="52" r="3.2" fill="#3a2a2a"/>
         <circle cx="69" cy="52" r="3.2" fill="#3a2a2a"/>
         <circle cx="49" cy="59" r="3.5" fill="#ff9bb0" opacity=".6"/>
         <circle cx="71" cy="59" r="3.5" fill="#ff9bb0" opacity=".6"/>
         <path d="M53 62 q7 7 14 0" stroke="#a85b5b" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
    const hair = `
      <path d="M32 56 q-2 -34 28 -36 q30 2 28 36 q-6 -16 -28 -16 q-22 0 -28 16Z" fill="${s.hairColor}"/>
      <path d="M34 50 q-4 18 2 30 q-12 -8 -6 -30Z" fill="${s.hairColor}"/>
      <path d="M86 50 q4 18 -2 30 q12 -8 6 -30Z" fill="${s.hairColor}"/>`;
    const bow = `
      <path d="M60 26 l-12 -7 v14 Z" fill="${s.dressAccent}"/>
      <path d="M60 26 l12 -7 v14 Z" fill="${s.dressAccent}"/>
      <circle cx="60" cy="26" r="4" fill="${s.dressAccent}"/>`;
    if (!full) {
      return `<svg viewBox="20 16 80 80" xmlns="http://www.w3.org/2000/svg">${hair}${face}${bow}</svg>`;
    }
    return `<svg viewBox="0 0 120 180" xmlns="http://www.w3.org/2000/svg" class="hero-vec">
      <rect x="50" y="138" width="8" height="26" rx="4" fill="${s.skinColor}"/>
      <rect x="62" y="138" width="8" height="26" rx="4" fill="${s.skinColor}"/>
      <ellipse cx="54" cy="166" rx="9" ry="5" fill="${s.dressAccent}"/>
      <ellipse cx="66" cy="166" rx="9" ry="5" fill="${s.dressAccent}"/>
      <path d="M60 80 L86 146 Q60 156 34 146 Z" fill="${s.dressColor}"/>
      <path d="M60 80 L86 146 Q60 156 34 146 Z" fill="rgba(255,255,255,.12)"/>
      <rect x="34" y="138" width="52" height="8" rx="4" fill="${s.dressAccent}" opacity=".85"/>
      <rect x="30" y="88" width="8" height="34" rx="4" fill="${s.skinColor}" transform="rotate(12 34 88)"/>
      <rect x="82" y="88" width="8" height="34" rx="4" fill="${s.skinColor}" transform="rotate(-12 86 88)"/>
      ${hair}${face}${bow}
    </svg>`;
  }

  // Restituisce lo sprite PNG personalizzato se presente, altrimenti l'avatar disegnato.
  function avatarMarkup(full = true) {
    if (CONFIG.sister.sprite) return `<img class="sprite-img" src="${CONFIG.sister.sprite}" alt="">`;
    return avatarSVG({ full });
  }

  /* ------------------------ IMMAGINE-RICORDO ------------------------ */
  function fallbackMemoryImage() {
    const name = CONFIG.sister.name;
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="600" height="600">
        <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#ffd1e8"/><stop offset="1" stop-color="#b59bff"/>
        </linearGradient></defs>
        <rect width="600" height="600" fill="url(#g)"/>
        <text x="300" y="150" font-size="120" text-anchor="middle" fill="#ffffff" opacity="0.85"></text>
        <text x="300" y="330" font-family="Baloo 2, sans-serif" font-size="74" font-weight="800" fill="#fff" text-anchor="middle">${name}</text>
        <text x="300" y="430" font-family="Baloo 2, sans-serif" font-size="150" font-weight="800" fill="#fff" text-anchor="middle">18</text>
        <text x="300" y="520" font-family="Quicksand, sans-serif" font-size="40" fill="#fff" text-anchor="middle">un ricordo speciale</text>
      </svg>`;
    return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
  }

  /* ------------------------------- STATO ---------------------------- */
  const ZONES = [
    { n: 1, name: "Radura dei Ricordi", icon: "" },
    { n: 2, name: "Ponte dei Quiz", icon: "" },
    { n: 3, name: "Grotte Misteriose", icon: "" },
    { n: 4, name: CONFIG.zone4.castleName, icon: "" },
    { n: 5, name: "Sala della Cassaforte", icon: "" },
  ];
  const State = { current: 1, inventory: [] };

  // Immagini ritagliate dai fogli (un unico portale per tutte le zone)
  const PORTAL_IMG = "assets/images/portals/portal.png";
  const TILE_IMG = [
    "assets/images/obj/mem_18.png", "assets/images/obj/mem_wheel.png",
    "assets/images/obj/mem_wine.png", "assets/images/obj/mem_swim.png",
  ];
  const OBJ_IMG = {
    lantern: "assets/images/obj/lantern.png", dial: "assets/images/obj/dial.png",
    gift: "assets/images/obj/gift.png", key: "assets/images/obj/key.png",
  };

  /* --------------------------- HUD / MAPPA -------------------------- */
  function renderHero() {
    const sp = CONFIG.sister.sprites;
    const src = (sp && sp.idle) || CONFIG.sister.sprite;
    $("#hud-avatar").innerHTML = src ? `<img class="sprite-img" src="${src}" alt="">` : avatarMarkup(false);
    $("#hud-name").textContent = `${CONFIG.sister.name} ${CONFIG.sister.title}`;
  }
  function renderMinimap() {
    const list = $("#minimap-list");
    if (!list) return; // mini-mappa compatta: nessuna lista da popolare
    list.innerHTML = "";
    for (const z of ZONES) {
      const done = z.n < State.current, cur = z.n === State.current;
      const li = el("li", { class: done ? "done" : cur ? "current" : "" });
      li.append(el("span", { class: "pin", text: done ? "✓" : String(z.n) }), z.name);
      list.append(li);
    }
  }
  function renderInventory() {
    const slots = $("#inv-slots");
    slots.innerHTML = "";
    for (let i = 0; i < 3; i++) {
      const item = State.inventory[i];
      const slot = el("div", { class: "inv-slot" + (item ? " filled" : "") });
      if (item) {
        slot.append(item.img
          ? el("img", { class: "inv-img", attrs: { src: item.img, alt: "" } })
          : el("span", { text: item.icon }));
        slot.append(el("span", { class: "inv-name", text: item.name }));
      }
      slots.append(slot);
    }
  }
  function addItem(item) {
    if (State.inventory.some((x) => x.id === item.id)) return;
    State.inventory.push(item);
    renderInventory();
    Sound.reward();
    toast(`Hai ottenuto: ${item.name}!`);
  }
  const hasItem = (id) => State.inventory.some((x) => x.id === id);

  /* ------------------------------ TOAST ----------------------------- */
  let toastTimer;
  function toast(msg, ms = 2400) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.remove("hidden");
    requestAnimationFrame(() => t.classList.add("show"));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      t.classList.remove("show");
      setTimeout(() => t.classList.add("hidden"), 320);
    }, ms);
  }

  /* ===================================================================
     IL MONDO ESPLORABILE
     =================================================================== */
  const SPEED = 330, GRAVITY = 2300, JUMP_V = 830, RANGE = 120, ENTER_DIST = 56;

  const World = (() => {
    const scene = $("#scene");
    let raf, lastTs = 0;
    let def, layerScenery, layerMain, ground, hero, heroInner, portalEl, portalPrompt, caveDark;
    let objects = [];
    let paused = false, transitioning = false;
    let avatarX = 0, vx = 0, jumpY = 0, vy = 0, grounded = true, facing = 1, cam = 0;
    let portalActive = false, activeTarget = null;
    let stepTimer = 0;
    let worldW = 1700, groundH = 120, exitX = 1500; // risolti per zona in build()
    let worldOffsetX = 0; // centratura orizzontale quando la scena sta tutta a schermo
    let heroImg = null, heroSprites = null, walkAcc = 0, walkToggle = false;
    let poseOverride = null, poseUntil = 0, nowMs = 0; // pose temporanee su eventi
    let interacting = false; // evita ri-attivazioni multiple dell'auto-interazione
    const input = { left: false, right: false };

    async function build(zoneDef) {
      def = zoneDef;
      scene.classList.add("world-mode");
      scene.innerHTML = "";

      // Sfondo personalizzato (immagine) per questa zona?
      const bgSrc = (CONFIG.backgrounds || {})[def.n];
      let bgEl = null;
      worldW = def.worldW;
      groundH = def.groundH;
      exitX = def.exitX;
      worldOffsetX = 0;
      let spawn = def.spawnX;
      let focusX = null;
      let heroH = null;
      let skyColor = null;

      if (bgSrc) {
        const sceneH = scene.clientHeight || 480;
        const sceneW = scene.clientWidth || 800;
        try {
          const img = await loadImage(bgSrc);
          skyColor = sampleTopColor(img);
          const aspect = img.naturalWidth / img.naturalHeight;
          // Mostra l'INTERA scena, senza scorrimento: immagine adattata ("contain")
          let dispW, dispH;
          if (sceneW / sceneH <= aspect) { dispW = sceneW; dispH = sceneW / aspect; }
          else { dispH = sceneH; dispW = sceneH * aspect; }
          dispW = Math.round(dispW); dispH = Math.round(dispH);
          worldW = dispW;
          worldOffsetX = Math.max(0, Math.round((sceneW - dispW) / 2));
          bgEl = el("div", { class: "layer layer-bg", style: {
            backgroundImage: `url("${bgSrc}")`,
            backgroundSize: "100% 100%", backgroundRepeat: "no-repeat",
            top: "auto", right: "auto", bottom: "0", left: "0",
            width: "100%", height: dispH + "px",
          } });
          // il terreno è una FRAZIONE dell'altezza dell'immagine mostrata
          const gl = (CONFIG.groundLevel || {})[def.n];
          groundH = Math.round((gl != null ? gl : 0.08) * dispH);
          spawn = Math.round(0.12 * worldW);
          focusX = Math.round((def.bgFocus != null ? def.bgFocus : 0.5) * worldW);
          exitX = Math.round((def.bgExit != null ? def.bgExit : 0.86) * worldW);
          heroH = Math.round(0.36 * dispH); // avatar proporzionato all'immagine
        } catch {
          // se l'immagine non si carica, si torna alla grafica generata
          bgEl = null; worldW = def.worldW; groundH = def.groundH; exitX = def.exitX; worldOffsetX = 0;
        }
      }

      scene.style.setProperty("--worldW", worldW + "px");
      scene.style.setProperty("--groundH", groundH + "px");
      scene.style.setProperty("--ground-color", def.groundColor);
      scene.style.setProperty("--ground-edge", def.groundEdge);
      // bordi che si fondono col cielo dell'immagine (o scuri se non campionabile)
      scene.style.background = bgEl ? (skyColor || "#15111f") : "";
      // larghezza della banda laterale: sposta l'UI DENTRO l'immagine
      $("#game").style.setProperty("--frameX", (bgEl ? worldOffsetX : 0) + "px");

      layerScenery = el("div", { class: "layer layer-scenery" });
      layerMain = el("div", { class: "layer layer-main" });

      if (bgEl) {
        layerMain.append(bgEl); // l'immagine include sfondo e terreno
      } else {
        ground = el("div", { class: "ground" });
        layerMain.append(ground);
        for (const d of def.scenery || []) {
          layerScenery.append(el("div", {
            class: "deco-item",
            style: { left: d.x + "px", fontSize: (d.s || 3) + "rem", bottom: (d.bottom != null ? d.bottom : groundH) + "px", opacity: d.o != null ? d.o : 1 },
            text: d.e,
          }));
        }
      }

      // oggetti interattivi. Con sfondo dipinto, il soggetto è già disegnato:
      // mostriamo un segnalino luminoso () al punto giusto invece di un'emoji.
      objects = (def.objects || []).map((o) => {
        const ox = bgEl ? focusX : o.x;
        const marker = !!bgEl;
        const elObject = el("div", { class: "world-object" + (marker ? " marker" : ""), style: { left: ox + "px", "--art-size": (marker ? 2.6 : (o.size || 4.2)) + "rem" } });
        const art = marker
          ? el("img", { class: "obj-art obj-gift", attrs: { src: OBJ_IMG.gift, alt: "" } })
          : el("div", { class: "obj-art", text: o.art });
        const base = el("div", { class: "obj-base" });
        const prompt = el("div", {
          class: "obj-prompt", style: { display: "none" },
          html: `${o.label}`,
        });
        elObject.append(prompt, art, base);
        layerMain.append(elObject);
        const rec = { def: o, x: ox, kind: o.kind, reward: o.reward, done: false, elObject, art, prompt };
        // Click sul segnalino per entrare nella sfida (bisogna essere vicini)
        elObject.addEventListener("click", () => {
          if (rec.done || paused || transitioning) return;
          if (Math.abs(avatarX - rec.x) < RANGE) startChallenge(rec);
          else toast("Avvicinati con le frecce, poi tocca il segnalino!");
        });
        return rec;
      });

      // Portale del Reame: sempre visibile ma "dormiente"; si attiva dopo la sfida.
      if (def.next) {
        portalEl = el("div", { class: "portal has-img dormant", style: { left: exitX + "px" } });
        portalPrompt = el("div", { class: "obj-prompt", style: { display: "none" }, html: "Risolvi la sfida" });
        const pimg = el("img", { class: "portal-img", attrs: { src: PORTAL_IMG, alt: "" } });
        if (heroH) pimg.style.height = Math.round(heroH * 1.0) + "px";
        portalEl.append(portalPrompt, pimg);
        portalEl.addEventListener("click", () => {
          if (transitioning) return;
          if (portalActive && Math.abs(avatarX - exitX) < RANGE) goNext();
          else if (!portalActive) toast("Risolvi prima la sfida di questa zona!");
        });
        layerMain.append(portalEl);
      } else { portalEl = null; portalPrompt = null; }

      // eroina (sprite animati se presenti, altrimenti avatar disegnato)
      hero = el("div", { class: "hero-world idle" });
      if (heroH) hero.style.height = heroH + "px";
      heroSprites = (CONFIG.sister.sprites && CONFIG.sister.sprites.idle) ? CONFIG.sister.sprites : null;
      if (heroSprites) {
        hero.classList.add("sprite-mode");
        heroImg = el("img", { class: "hero-sprite-img", attrs: { src: heroSprites.idle, alt: "" } });
        heroInner = el("div", { class: "hero-inner" }, heroImg);
      } else {
        heroImg = null;
        heroInner = el("div", { class: "hero-inner", html: avatarMarkup(true) });
      }
      hero.append(heroInner);
      layerMain.append(hero);

      scene.append(layerScenery, layerMain);

      if (def.dark && !bgEl) {
        caveDark = el("div", { attrs: { id: "cave-dark" } });
        scene.append(caveDark);
      } else caveDark = null;

      // stato iniziale
      avatarX = spawn; vx = 0; jumpY = 0; vy = 0; grounded = true; facing = 1; cam = 0;
      portalActive = false; activeTarget = null; paused = false; transitioning = false; lastTs = 0;
      walkAcc = 0; walkToggle = false; interacting = false;
    }

    function openPortal() {
      if (!portalEl) return;
      portalActive = true;
      portalEl.classList.remove("dormant");
      portalEl.classList.add("open");
      if (portalPrompt) portalPrompt.innerHTML = "Prosegui";
      Sound.portal();
      toast("Il portale si è attivato! Attraversalo per proseguire.", 3000);
    }

    function startChallenge(obj) {
      if (interacting || transitioning) return;
      interacting = true;
      const done = (close) => {
        completeObject(obj); close(); interacting = false;
        if (obj.reward) playPose("pickup", 1400); // posa "raccolta oggetto"
      };
      switch (obj.kind) {
        case "puzzle": openOverlay((body, close) => challengePuzzle(body, () => done(close))); break;
        case "quiz": openOverlay((body, close) => challengeQuiz(body, () => done(close))); break;
        case "memory": openOverlay((body, close) => challengeMemory(body, () => done(close))); break;
        case "gate": handleGate(obj); break;
        case "safe": openOverlay((body, close) => challengeSafe(body, () => { close(); finale(); })); break;
      }
    }

    async function handleGate(obj) {
      if (!hasItem("key")) { Sound.wrong(); toast("Il cancello è chiuso… ti serve la Chiave Dorata! "); interacting = false; return; }
      Sound.gate();
      obj.art.textContent = "";
      obj.prompt.style.display = "none";
      toast("Usi la Chiave Dorata… il cancello si apre con un cigolio! ");
      await wait(700);
      completeObject(obj);
      interacting = false;
    }

    function completeObject(obj) {
      obj.done = true;
      obj.elObject.classList.remove("near");
      obj.elObject.classList.add("done");
      obj.prompt.style.display = "none";
      if (obj.kind === "memory") obj.art.textContent = ""; // forziere aperto
      if (obj.reward) {
        addItem(obj.reward);
        if (obj.reward.id === "map") $("#minimap").classList.remove("hidden");
      }
      openPortal();
    }

    function goNext() {
      if (transitioning || !def.next) return;
      transitioning = true;
      Sound.portal();
      goToZone(def.next);
    }

    function tryInteract() {
      if (paused || transitioning || !activeTarget) return;
      if (activeTarget.isPortal) goNext();
      else startChallenge(activeTarget);
    }

    function jump() {
      if (paused || transitioning || !grounded) return;
      vy = JUMP_V; grounded = false; Sound.jump();
    }

    function update(dt) {
      vx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      avatarX = clamp(avatarX + vx * SPEED * dt, 70, worldW - 70);
      if (vx > 0) facing = 1; else if (vx < 0) facing = -1;

      if (!grounded) {
        jumpY += vy * dt; vy -= GRAVITY * dt;
        if (jumpY <= 0) { jumpY = 0; vy = 0; grounded = true; }
      }

      // passo sonoro + alternanza pose di camminata
      if (vx !== 0 && grounded) {
        stepTimer -= dt;
        if (stepTimer <= 0) { Sound.step(); stepTimer = 0.3; }
        walkAcc += dt;
        if (walkAcc > 0.16) { walkAcc = 0; walkToggle = !walkToggle; }
      } else { stepTimer = 0; walkAcc = 0; walkToggle = false; }

      const viewW = scene.clientWidth;
      cam = clamp(avatarX - viewW / 2, 0, Math.max(0, worldW - viewW));

      // bersaglio più vicino (oggetto non risolto o portale attivo)
      let best = null, bestD = Infinity;
      for (const o of objects) {
        if (o.done) continue;
        const d = Math.abs(avatarX - o.x);
        if (d < RANGE && d < bestD) { best = o; bestD = d; }
      }
      activeTarget = best;

      // Entra camminando nel portale solo se è attivo (sfida risolta)
      if (portalActive && Math.abs(avatarX - exitX) < ENTER_DIST && !transitioning) goNext();
    }

    function render() {
      layerMain.style.transform = `translateX(${worldOffsetX - cam}px)`;
      layerScenery.style.transform = `translateX(${worldOffsetX - cam * 0.55}px)`;

      hero.style.left = avatarX + "px";
      hero.style.bottom = (groundH + jumpY) + "px";
      hero.style.transform = `translateX(-50%) scaleX(${facing})`;
      const moving = vx !== 0 && grounded;
      hero.classList.toggle("walking", moving);
      hero.classList.toggle("idle", !moving);
      if (heroImg && heroSprites) {
        let src;
        if (poseOverride && nowMs < poseUntil && grounded && !moving) {
          src = heroSprites[poseOverride] || heroSprites.idle;
        } else if (!grounded) {
          src = heroSprites.jump || heroSprites.idle;
        } else if (moving) {
          src = walkToggle ? (heroSprites.walkB || heroSprites.idle) : (heroSprites.walkA || heroSprites.idle);
        } else if (activeTarget && heroSprites.interact) {
          src = heroSprites.interact; // indica l'oggetto con cui interagire
        } else {
          src = heroSprites.idle;
        }
        if (heroImg.getAttribute("src") !== src) heroImg.setAttribute("src", src);
      }

      // prompt e evidenziazione
      for (const o of objects) {
        const on = o === activeTarget;
        o.elObject.classList.toggle("near", on && !o.done);
        if (!o.done) o.prompt.style.display = on ? "" : "none";
      }
      // prompt del portale quando sei vicino (testo secondo lo stato)
      if (portalEl) portalPrompt.style.display = Math.abs(avatarX - exitX) < RANGE ? "" : "none";

      // alone della lanterna nella grotta
      if (caveDark) {
        const sx = avatarX - cam;
        const sy = scene.clientHeight - groundH - 80;
        caveDark.style.setProperty("--lx", sx + "px");
        caveDark.style.setProperty("--ly", sy + "px");
        caveDark.style.setProperty("--lr", "190px");
      }
    }

    function playPose(name, ms) {
      if (heroSprites && heroSprites[name]) { poseOverride = name; poseUntil = nowMs + ms; }
    }

    function frame(ts) {
      raf = requestAnimationFrame(frame);
      nowMs = ts;
      if (paused) { lastTs = ts; return; }
      if (!lastTs) lastTs = ts;
      let dt = (ts - lastTs) / 1000; lastTs = ts;
      dt = Math.min(dt, 0.05);
      update(dt); render();
    }

    return {
      async enter(zoneDef) {
        cancelAnimationFrame(raf);
        await build(zoneDef);
        render();
        $("#touch-controls").classList.remove("hidden");
        raf = requestAnimationFrame(frame);
      },
      stop() { cancelAnimationFrame(raf); },
      pause() { paused = true; },
      resume() { paused = false; lastTs = 0; },
      tryInteract, jump, input,
      setLeft: (v) => (input.left = v),
      setRight: (v) => (input.right = v),
    };
  })();

  /* ------------------------------ SCENE ----------------------------- */
  const sceneEl = $("#scene");
  async function goToZone(n) {
    State.current = n;
    sceneEl.classList.add("leaving");
    await wait(420);
    const stage = $("#stage");
    stage.className = "";
    stage.classList.add("zone-" + n);
    const zone = ZONES.find((z) => z.n === n);
    $("#hud-zone-name").textContent = zone ? zone.name : "";
    renderMinimap();
    await World.enter(WORLD[n]);
    sceneEl.classList.remove("leaving");
  }

  /* --------------------------- OVERLAY MODALE ----------------------- */
  function openOverlay(builder) {
    World.pause();
    const back = el("div", { class: "overlay-modal" });
    document.body.append(back);
    const close = () => { back.remove(); World.resume(); };
    builder(back, close);
  }

  /* --------------------------- MAPPA DEL PERCORSO ------------------- */
  let mapOpen = false;
  function openMap() {
    if (mapOpen) return;
    mapOpen = true;
    Sound.click();
    World.pause();
    const back = el("div", { class: "overlay-modal" });
    const close = () => { back.remove(); mapOpen = false; World.resume(); };

    const panel = el("div", { class: "panel map-panel" });
    panel.append(el("h2", { text: "Il Percorso del Reame" }));
    const mapPose = CONFIG.sister.sprites && CONFIG.sister.sprites.map;
    if (mapPose) panel.append(el("img", { class: "map-hero", attrs: { src: mapPose, alt: "" } }));

    const here = ZONES.find((z) => z.n === State.current);

    // Se c'è un'immagine della mappa, mostriamo quella.
    if (CONFIG.mapImage) {
      panel.append(
        el("img", { class: "map-image", attrs: { src: CONFIG.mapImage, alt: "Mappa del percorso" } }),
        el("p", { class: "map-here", html: `Sei qui: <b>${here ? here.name : ""}</b>` }),
        el("button", { class: "btn", style: { marginTop: "10px" }, text: "Continua l'avventura", on: { click: close } })
      );
      back.append(panel);
      back.addEventListener("click", (e) => { if (e.target === back) close(); });
      document.body.append(back);
      return;
    }

    const path = el("div", { class: "map-path" });

    ZONES.forEach((z, idx) => {
      const done = z.n < State.current, cur = z.n === State.current;
      const node = el("div", { class: "map-node " + (done ? "done" : cur ? "current" : "locked") });
      const icon = el("div", { class: "map-icon", text: done ? "✓" : String(z.n) });
      const info = el("div", { class: "map-info" });
      info.append(el("div", { class: "map-name", text: `${z.n}. ${z.name}` }));
      const reward = WORLD[z.n].objects?.[0]?.reward;
      const status = done ? "Completata" : cur ? "Sei qui" : "Ancora bloccata";
      info.append(el("div", { class: "map-status", text: status }));
      if (reward && (done || cur)) info.append(el("div", { class: "map-reward", text: `Premio: ${reward.name}` }));
      node.append(icon, info);
      path.append(node);
      if (idx < ZONES.length - 1) path.append(el("div", { class: "map-link " + (done ? "done" : "") }));
    });

    panel.append(path);
    panel.append(el("button", { class: "btn", style: { marginTop: "8px" }, text: "Continua l'avventura", on: { click: close } }));
    back.append(panel);
    back.addEventListener("click", (e) => { if (e.target === back) close(); });
    document.body.append(back);
  }

  /* ===================================================================
     LE SFIDE (si aprono in una finestra; chiamano onSolved al successo)
     =================================================================== */

  /* --- Zona 1: puzzle a incastro --- */
  function challengePuzzle(root, onSolved) {
    const cfg = CONFIG.zone1;
    const pieces = clamp(Math.round(cfg.pieces || 6), 4, 24);
    const src = cfg.puzzleImage || fallbackMemoryImage();

    const panel = el("div", { class: "panel" });
    panel.append(
      el("h2", { text: "La Radura dei Ricordi" }),
      el("p", { class: "lead", html: "Ricomponi il ricordo per ottenere la <b>" + cfg.reward + "</b>.<br>Trascina le tessere al loro posto." })
    );
    const wrap = el("div", { class: "puzzle-wrap" });
    panel.append(wrap);
    root.append(panel);

    // carica l'immagine per conoscere le proporzioni, poi costruisce il tabellone
    const probe = new Image();
    probe.onload = () => build(probe.naturalWidth / probe.naturalHeight);
    probe.onerror = () => build(1);
    probe.src = src;

    function build(aspect) {
      // griglia: scegli la coppia cols×rows (con cols*rows = pieces) che rende
      // le tessere più vicine possibile a un quadrato, seguendo le proporzioni della foto
      let cols = 1, rows = pieces, bestDiff = Infinity;
      for (let c = 1; c <= pieces; c++) {
        if (pieces % c) continue;
        const r = pieces / c;
        const diff = Math.abs(c / r - aspect);
        if (diff < bestDiff) { bestDiff = diff; cols = c; rows = r; }
      }
      const nPieces = cols * rows;
      // tabellone che mantiene le proporzioni della foto, entro lo spazio disponibile
      const maxW = clamp(Math.min(innerWidth * 0.6, 300), 150, 320);
      const maxH = clamp(Math.min(innerHeight * 0.42, 360), 190, 420);
      let boardW = maxW, boardH = boardW / aspect;
      if (boardH > maxH) { boardH = maxH; boardW = boardH * aspect; }
      const pieceW = Math.floor(boardW / cols), pieceH = Math.floor(boardH / rows);
      boardW = pieceW * cols; boardH = pieceH * rows;

      const board = el("div", { class: "puzzle-board", style: { gridTemplateColumns: `repeat(${cols}, ${pieceW}px)`, width: boardW + 16 + "px" } });
      const tray = el("div", { class: "puzzle-tray" });
      const slots = [];
      for (let i = 0; i < nPieces; i++) {
        const slot = el("div", { class: "puzzle-slot", style: { width: pieceW + "px", height: pieceH + "px" } });
        slot.dataset.index = i; slots.push(slot); board.append(slot);
      }
      shuffle([...Array(nPieces).keys()]).forEach((correct) => {
        const col = correct % cols, row = Math.floor(correct / cols);
        const p = el("div", { class: "puzzle-piece", style: {
          width: pieceW + "px", height: pieceH + "px",
          backgroundImage: `url("${src}")`, backgroundSize: `${boardW}px ${boardH}px`,
          backgroundPosition: `-${col * pieceW}px -${row * pieceH}px`,
        } });
        p.dataset.correct = correct;
        enableDrag(p);
        tray.append(p);
      });
      wrap.append(board, tray);

    let drag = null;
    function enableDrag(piece) {
      piece.addEventListener("pointerdown", (e) => {
        if (piece.classList.contains("placed-locked")) return;
        e.preventDefault(); Sound.click();
        const rect = piece.getBoundingClientRect();
        drag = { piece, offX: e.clientX - rect.left, offY: e.clientY - rect.top, home: piece.parentElement };
        piece.classList.add("dragging");
        Object.assign(piece.style, { position: "fixed", zIndex: 999, pointerEvents: "none" });
        moveDrag(e);
        document.addEventListener("pointermove", moveDrag);
        document.addEventListener("pointerup", dropDrag);
      });
    }
    function moveDrag(e) {
      if (!drag) return;
      drag.piece.style.left = e.clientX - drag.offX + "px";
      drag.piece.style.top = e.clientY - drag.offY + "px";
      const hit = slotUnder(e.clientX, e.clientY);
      slots.forEach((s) => s.classList.toggle("over", s === hit));
    }
    function dropDrag(e) {
      if (!drag) return;
      document.removeEventListener("pointermove", moveDrag);
      document.removeEventListener("pointerup", dropDrag);
      const { piece, home } = drag;
      const hit = slotUnder(e.clientX, e.clientY);
      slots.forEach((s) => s.classList.remove("over"));
      piece.classList.remove("dragging");
      Object.assign(piece.style, { position: "", left: "", top: "", zIndex: "", pointerEvents: "" });
      drag = null;
      if (hit) {
        const occupant = hit.querySelector(".puzzle-piece");
        if (occupant && occupant !== piece) (home.classList.contains("puzzle-slot") ? home : tray).append(occupant);
        hit.append(piece);
      } else home.append(piece);
      check();
    }
    function slotUnder(x, y) {
      return slots.find((s) => {
        const r = s.getBoundingClientRect();
        return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
      }) || null;
    }
    function check() {
      const solved = slots.every((s) => {
        const p = s.querySelector(".puzzle-piece");
        return p && Number(p.dataset.correct) === Number(s.dataset.index);
      });
      if (solved) {
        Sound.win();
        slots.forEach((s) => s.querySelector(".puzzle-piece")?.classList.add("placed", "placed-locked"));
        panel.append(el("p", { class: "lead", style: { marginTop: "14px", color: "#7a3fb0", fontWeight: "700" }, text: "Ricordo ricomposto!" }));
        setTimeout(onSolved, 1000);
      }
    }
    }
  }

  /* --- Zona 2: quiz --- */
  function challengeQuiz(root, onSolved) {
    const cfg = CONFIG.zone2;
    const NEED = 3;
    let streak = 0, qIndex = 0;
    const panel = el("div", { class: "panel" });
    const guardian = el("div", { class: "quiz-guardian", text: "" });
    const progress = el("div", { class: "quiz-progress" });
    const dots = Array.from({ length: NEED }, () => el("span", { class: "quiz-dot" }));
    dots.forEach((d) => progress.append(d));
    panel.append(
      el("h2", { text: "Il Ponte dei Quiz" }), guardian,
      el("p", { class: "lead", html: `<b>${cfg.guardianName}</b> ti sbarra la strada.<br>Rispondi giusto <b>${NEED} volte di fila</b> per avere la <b>${cfg.reward}</b>.` }),
      progress
    );
    const qBox = el("div");
    panel.append(qBox);
    root.append(panel);

    function nextQuestion() {
      const q = cfg.questions[qIndex % cfg.questions.length];
      qBox.innerHTML = "";
      qBox.append(el("p", { class: "quiz-q", text: q.q }));
      const opts = el("div", { class: "quiz-options" });
      q.options.forEach((text, i) => opts.append(el("button", { class: "quiz-opt", text, on: { click: (e) => answer(e.currentTarget, i, q, opts) } })));
      qBox.append(opts);
    }
    function answer(btn, i, q, opts) {
      $$(".quiz-opt", opts).forEach((b) => (b.disabled = true));
      if (i === q.answer) {
        btn.classList.add("correct"); Sound.correct();
        dots[streak]?.classList.add("ok"); streak++; qIndex++;
        if (streak >= NEED) return win();
        setTimeout(nextQuestion, 650);
      } else {
        btn.classList.add("wrong"); Sound.wrong();
        opts.querySelectorAll(".quiz-opt")[q.answer].classList.add("correct");
        dots.forEach((d) => d.classList.remove("ok"));
        toast("Ops! La sequenza riparte da capo ");
        streak = 0; qIndex++;
        setTimeout(nextQuestion, 1100);
      }
    }
    function win() {
      guardian.textContent = "";
      qBox.innerHTML = "";
      qBox.append(el("p", { class: "quiz-q", style: { color: "#7a3fb0" }, text: `${cfg.guardianName}: "Puoi passare, eroina!"` }));
      setTimeout(onSolved, 1200);
    }
    nextQuestion();
  }

  /* --- Zona 3: memoria a sequenza (tessere immagine) --- */
  function challengeMemory(root, onSolved) {
    const cfg = CONFIG.zone3;
    const TILES = TILE_IMG; // 18, volante, vino, costume
    let round = 0, sequence = [], playerPos = 0, accepting = false;

    const panel = el("div", { class: "panel cave-panel" });
    panel.append(
      el("h2", { text: "Il Forziere delle Grotte" }),
      el("p", { class: "lead", html: `Osserva la sequenza delle tessere e ripetila<br>per trovare la <b>${cfg.reward}</b>.` })
    );
    const grid = el("div", { class: "memory-grid mem4" });
    const cells = TILES.map((src, i) => {
      const c = el("button", { class: "memory-cell tile", style: { backgroundImage: `url("${src}")` } });
      c.addEventListener("click", () => onClick(i, c));
      grid.append(c);
      return c;
    });
    const meter = el("div", { class: "lantern-meter" });
    panel.append(grid, meter);
    root.append(panel);

    const updateMeter = () => (meter.textContent = `Prova ${Math.min(round + 1, cfg.rounds)} di ${cfg.rounds}`);
    async function flash(i, ms = 420) { cells[i].classList.add("lit"); Sound.pop(); await wait(ms); cells[i].classList.remove("lit"); await wait(150); }
    async function play() { accepting = false; updateMeter(); await wait(550); for (const i of sequence) await flash(i); accepting = true; playerPos = 0; }
    function startRound() {
      const len = cfg.startLength + round;
      sequence = Array.from({ length: len }, () => randInt(TILES.length));
      play();
    }
    async function onClick(i, cell) {
      if (!accepting) return;
      cell.classList.add("lit"); Sound.pop();
      setTimeout(() => cell.classList.remove("lit"), 200);
      if (i === sequence[playerPos]) {
        playerPos++;
        if (playerPos === sequence.length) {
          accepting = false; round++; Sound.correct();
          if (round >= cfg.rounds) return win();
          toast("Perfetto! Sequenza più lunga in arrivo… ");
          await wait(900); startRound();
        }
      } else {
        accepting = false; Sound.wrong();
        toast("Quasi! Riguarda la sequenza ");
        await wait(900); play();
      }
    }
    function win() {
      Sound.win();
      panel.append(el("p", { class: "lead", style: { marginTop: "12px", color: "#7a3fb0", fontWeight: "700" }, html: "Il forziere si apre… c'è la <b>Chiave Dorata</b>!" }));
      setTimeout(onSolved, 1100);
    }
    startRound();
  }

  /* --- Zona 5: cassaforte --- */
  function challengeSafe(root, onSolved) {
    const cfg = CONFIG.zone5;
    const code = String(cfg.safeCode);
    let entered = "";
    const panel = el("div", { class: "panel" });
    panel.append(
      el("h2", { text: "La Cassaforte" }),
      el("img", { class: "safe-dial", attrs: { src: OBJ_IMG.dial, alt: "" } }),
      el("p", { class: "lead", html: "Inserisci il codice per aprirla." })
    );
    const display = el("div", { class: "safe-display" });
    const renderDisplay = () => (display.textContent = entered.padEnd(code.length, "•"));
    renderDisplay();
    panel.append(display);
    const keypad = el("div", { class: "keypad" });
    ["1", "2", "3", "4", "5", "6", "7", "8", "9", "del", "0", "ok"].forEach((label) => {
      const cls = label === "ok" ? "key key-ok" : label === "del" ? "key key-del" : "key";
      const txt = label === "ok" ? "✓" : label === "del" ? "⌫" : label;
      keypad.append(el("button", { class: cls, text: txt, on: { click: () => press(label) } }));
    });
    panel.append(keypad, el("p", { class: "safe-hint", html: "Indizio: " + cfg.hint }));
    root.append(panel);

    function press(label) {
      display.classList.remove("error");
      if (label === "del") { entered = entered.slice(0, -1); Sound.click(); }
      else if (label === "ok") return submit();
      else if (entered.length < code.length) {
        entered += label; Sound.click();
        if (entered.length === code.length) return setTimeout(submit, 250);
      }
      renderDisplay();
    }
    function submit() {
      if (entered === code) { Sound.win(); onSolved(); }
      else {
        Sound.wrong(); display.classList.add("error"); display.textContent = "ERRORE";
        toast("Codice sbagliato… riprova! ");
        entered = ""; setTimeout(renderDisplay, 900);
      }
    }
  }

  /* ------------------------------ FINALE ---------------------------- */
  function finale() {
    World.stop();
    $("#touch-controls").classList.add("hidden");
    $("#minimap").querySelectorAll("li").forEach((li) => li.classList.add("done"));
    Sound.win();
    Confetti.burst();
    const cfg = CONFIG.zone5;
    const back = el("div", { class: "overlay-modal finale-screen" });
    if (CONFIG.finaleImage) back.style.backgroundImage = `url("${CONFIG.finaleImage}")`;

    const wrap = el("div", { class: "panel finale-wrap" });
    const closeBtn = el("button", { class: "finale-close", text: "✕", attrs: { title: "Chiudi il messaggio" } });
    const revealBtn = el("button", { class: "btn", style: { marginTop: "8px" }, text: "Apri il regalo " });
    const celebrate = CONFIG.sister.sprites && CONFIG.sister.sprites.celebrate;
    wrap.append(
      closeBtn,
      el("h2", { class: "finale-title", text: "Hai aperto la cassaforte!" }),
      ...(celebrate ? [el("img", { class: "finale-hero", attrs: { src: celebrate, alt: "" } })] : []),
      el("p", { class: "finale-msg", style: { marginTop: "6px" }, text: `Bravissima ${CONFIG.sister.name}! Hai superato tutte le prove.` }),
      revealBtn
    );
    // pulsante per riaprire la pergamena dopo averla chiusa
    const reopen = el("button", { class: "btn finale-reopen hidden", text: "Rivedi il messaggio" });

    back.append(wrap, reopen);
    document.body.append(back);

    closeBtn.addEventListener("click", () => {
      Sound.click(); wrap.classList.add("hidden"); reopen.classList.remove("hidden");
    });
    reopen.addEventListener("click", () => {
      Sound.click(); wrap.classList.remove("hidden"); reopen.classList.add("hidden");
    });

    revealBtn.addEventListener("click", () => {
      Sound.reward(); Confetti.burst(); revealBtn.remove();
      wrap.append(
        el("p", { class: "finale-msg", html: cfg.finalMessage }),
        el("div", { class: "gift-clue", text: cfg.giftClue }),
        el("p", { class: "finale-msg", style: { fontSize: ".95rem", opacity: ".85" }, text: "Ti voglio bene, Ali" })
      );
    });
  }

  /* ---------------------------- UTILITÀ VARIE ----------------------- */
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) { const j = randInt(i + 1);[arr[i], arr[j]] = [arr[j], arr[i]]; }
    if (arr.every((v, i) => v === i) && arr.length > 1)[arr[0], arr[1]] = [arr[1], arr[0]];
    return arr;
  }

  /* ===================================================================
     LAYOUT DELLE ZONE (il mondo da esplorare)
     =================================================================== */
  const WORLD = {
    1: {
      n: 1, worldW: 1700, groundH: 130, groundColor: "#5fae57", groundEdge: "#84c977",
      spawnX: 150, exitX: 1560, next: 2,
      objects: [{ kind: "puzzle", x: 820, art: "", size: 5, label: "Esamina il ricordo", reward: { id: "map", name: CONFIG.zone1.reward, icon: "", img: "assets/images/obj/map_icon.png" } }],
    },
    2: {
      n: 2, worldW: 1700, groundH: 120, groundColor: "#9c6b39", groundEdge: "#b98a52",
      bgFocus: 0.65, bgExit: 0.42, spawnX: 150, exitX: 1560, next: 3,
      objects: [{ kind: "quiz", x: 850, art: "", size: 5.5, label: "Parla con il guardiano", reward: { id: "lantern", name: CONFIG.zone2.reward, icon: "", img: OBJ_IMG.lantern } }],
    },
    3: {
      n: 3, worldW: 1700, groundH: 120, groundColor: "#2c2740", groundEdge: "#3a3358", dark: true,
      spawnX: 150, exitX: 1560, next: 4,
      objects: [{ kind: "memory", x: 900, art: "", size: 5, label: "Apri il pacco", reward: { id: "key", name: CONFIG.zone3.reward, icon: "", img: OBJ_IMG.key } }],
    },
    4: {
      n: 4, worldW: 1600, groundH: 120, groundColor: "#5a3f7a", groundEdge: "#6f4f93",
      spawnX: 150, exitX: 1460, next: 5,
      objects: [{ kind: "gate", x: 1000, art: "", size: 6, label: "Usa la Chiave Dorata" }],
    },
    5: {
      n: 5, worldW: 1500, groundH: 120, groundColor: "#7a2f5a", groundEdge: "#9a3f72",
      spawnX: 150, exitX: 1400, next: null,
      objects: [{ kind: "safe", x: 760, art: "", size: 5.5, label: "Apri la cassaforte" }],
    },
  };

  /* ------------------------------- AVVIO ---------------------------- */
  function bindControls() {
    $("#btn-help").addEventListener("click", () => {
      const tips = {
        1: "Usa le frecce per camminare. Raggiungi la freccia sul quadro: il puzzle parte da solo!",
        2: "Cammina fino al guardiano: parte il quiz. Rispondi giusto 3 volte di fila.",
        3: "Raggiungi il forziere e ripeti la sequenza delle tessere.",
        4: "Cammina fino al cancello: la Chiave Dorata viene usata da sola.",
        5: "Raggiungi la cassaforte e inserisci il codice dell'indizio.",
      };
      toast(tips[State.current] || "Cammina con le frecce e raggiungi i segnalini!", 4200);
    });

    // Tocca la mini-mappa per vedere il percorso completo
    $("#minimap").addEventListener("click", openMap);

    // Tastiera
    addEventListener("keydown", (e) => {
      // Sulla schermata iniziale: INVIO o Spazio avviano il gioco
      if (!$("#start-screen").classList.contains("hidden")) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); startGame(); }
        return;
      }
      switch (e.key) {
        case "ArrowLeft": case "a": case "A": World.setLeft(true); e.preventDefault(); break;
        case "ArrowRight": case "d": case "D": World.setRight(true); e.preventDefault(); break;
        case "ArrowUp": case "w": case "W": case " ": World.jump(); e.preventDefault(); break;
        case "e": case "E": case "Enter": World.tryInteract(); break;
      }
    });
    addEventListener("keyup", (e) => {
      if (["ArrowLeft", "a", "A"].includes(e.key)) World.setLeft(false);
      if (["ArrowRight", "d", "D"].includes(e.key)) World.setRight(false);
    });

    // Pulsanti a schermo (tocco)
    const hold = (btn, on, off) => {
      const start = (e) => { e.preventDefault(); btn.classList.add("held"); on(); };
      const end = () => { btn.classList.remove("held"); off(); };
      btn.addEventListener("pointerdown", start);
      btn.addEventListener("pointerup", end);
      btn.addEventListener("pointerleave", end);
      btn.addEventListener("pointercancel", end);
    };
    $$("#touch-controls .tc-btn").forEach((btn) => {
      const dir = btn.dataset.dir;
      if (dir === "left") hold(btn, () => World.setLeft(true), () => World.setLeft(false));
      else if (dir === "right") hold(btn, () => World.setRight(true), () => World.setRight(false));
      else if (dir === "up") btn.addEventListener("pointerdown", (e) => { e.preventDefault(); World.jump(); });
      // "giù": nessuna azione (d-pad completo per estetica)
    });
  }

  let started = false;
  function startGame() {
    if (started) return;
    started = true;
    Sound.unlock();
    Sound.music(CONFIG.music);
    $("#start-screen").classList.add("hidden");
    $("#game").classList.remove("hidden");
    renderHero(); renderInventory(); renderMinimap();
    goToZone(1);
  }

  // Pre-carica gli sprite dell'avatar (leggeri) e la mappa. Sfondi: per zona.
  function preloadAssets() {
    const sp = CONFIG.sister.sprites || {};
    const arrows = ["up", "down", "left", "right"].map((d) => `assets/images/arrows/${d}.png`);
    const srcs = [
      ...Object.values(sp), CONFIG.mapImage,
      PORTAL_IMG, ...TILE_IMG, ...Object.values(OBJ_IMG), ...arrows,
    ].filter(Boolean);
    srcs.forEach((s) => loadImage(s).catch(() => {}));
  }

  function init() {
    document.title = `Caccia al Tesoro · ${CONFIG.sister.name}`;
    if (CONFIG.pixelArt) document.body.classList.add("pixel-art");
    bindControls();
    preloadAssets();

    const ss = $("#start-screen");
    if (CONFIG.startImage) {
      // Schermata titolo a tutto schermo (l'immagine dice già "premi invio")
      ss.classList.add("image-start");
      ss.style.backgroundImage = `url("${CONFIG.startImage}")`;
      ss.innerHTML = "";
      ss.addEventListener("click", startGame);
    } else {
      $("#start-name").textContent = `${CONFIG.sister.name} ${CONFIG.sister.title}`;
      $("#btn-start")?.addEventListener("click", startGame);
    }
    document.addEventListener("pointerdown", () => Sound.unlock(), { once: true });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
