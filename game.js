/* Verge City — game engine: state, rendering, typewriter, save/load, input.
   Content lives in content.js; drawing in map.js; sound in audio.js. */
(function () {
  "use strict";

  const SAVE_KEY = "vergeCity.save.v1";
  const SAVE_VERSION = 1;
  const MAX_HP = 12;
  const START_CREDITS = 15;
  const STAT_POINTS = 5;
  const STAT_MAX = 4;
  const TYPE_INTERVAL_MS = 14;
  const TYPE_CHARS_PER_TICK = 2;

  const C = window.CONTENT;
  const $ = (id) => document.getElementById(id);

  /* ------------------------------------------------------------------ State */
  let s = null;            // the live game state (serialisable)
  let started = false;     // a run is in progress (title screen not showing)
  let actionDead = false;  // set when damage kills the player mid-action
  let typing = null;       // active typewriter job
  let toastTimer = null;

  function freshState(player) {
    return {
      version: SAVE_VERSION,
      player,
      scene: C.START_ROOM,
      ending: null,
      result: null,
      flags: {},
      heat: 0,
      turn: 0,
      factions: Object.fromEntries(Object.keys(C.FACTIONS).map((f) => [f, 0])),
      known: [...C.START_KNOWN],
      visited: [],
      journal: [],
      lastDistrict: null,
      lastDamage: null
    };
  }

  function currentRoom() {
    return C.ROOMS[s.scene] || C.ROOMS[C.START_ROOM];
  }

  /* ------------------------------------------------------------ Helper: G */
  const G = {
    get s() { return s; },
    has: (id) => s.player.inventory.includes(id),
    give(id) {
      if (!C.ITEMS[id]) { console.warn("Unknown item", id); return; }
      s.player.inventory.push(id);
      if (id === "street_map") G.learnAll();
      Sound.pickup();
    },
    take(id) {
      const i = s.player.inventory.indexOf(id);
      if (i >= 0) { s.player.inventory.splice(i, 1); Sound.drop(); }
    },
    stat: (name) => s.player.stats[name] || 0,
    bonus(name) {
      let v = G.stat(name);
      s.player.inventory.forEach((id) => {
        const b = C.ITEMS[id] && C.ITEMS[id].bonus;
        if (b && b[name]) v += b[name];
      });
      return v;
    },
    check: (name, difficulty) => G.bonus(name) >= difficulty,
    damage(n, why) {
      let dmg = n;
      if (G.has("vest")) dmg = Math.max(1, dmg - 1);
      s.player.hp = Math.max(0, s.player.hp - dmg);
      s.lastDamage = why || null;
      Sound.damage();
      flashDamage();
      if (s.player.hp <= 0) { actionDead = true; }
      return actionDead;
    },
    heal(n) {
      const before = s.player.hp;
      s.player.hp = Math.min(s.player.maxHp, s.player.hp + n);
      if (s.player.hp > before) Sound.heal();
    },
    credits(n) {
      s.player.credits = Math.max(0, s.player.credits + n);
      if (n !== 0) Sound.coins();
    },
    canPay: (n) => s.player.credits >= n,
    flag: (name) => s.flags[name],
    set(name, value) { s.flags[name] = value === undefined ? true : value; },
    rep(f, d) { if (f in s.factions) s.factions[f] += d; },
    repOf: (f) => s.factions[f] || 0,
    heat(d) { s.heat = Math.max(0, s.heat + d); },
    note(text) { s.journal.push(text); },
    rnd: (chance) => Math.random() < chance,
    say(text) { if (actionDead) return; s.result = text; },
    go(roomId, text) {
      if (actionDead) return;
      if (!C.ROOMS[roomId]) { console.warn("Unknown room", roomId); roomId = currentDistrictHub(); }
      s.scene = roomId;
      s.result = text || null;
      arrive(roomId);
    },
    end(id) {
      if (actionDead) return;
      const e = C.ENDINGS[id];
      if (!e) { console.warn("Unknown ending", id); return; }
      if (e.apply) e.apply(s);
      s.ending = id;
      s.result = null;
      Sound.success();
    },
    travelTo(district, text) {
      if (actionDead) return;
      travel(district, text);
    },
    learnDistrict(id) { if (C.DISTRICTS[id] && !s.known.includes(id)) s.known.push(id); },
    learnAll() { Object.keys(C.DISTRICTS).forEach((id) => G.learnDistrict(id)); }
  };
  window.G = G;

  function currentDistrictHub() {
    const room = currentRoom();
    return room.district || "alley";
  }

  function arrive(roomId) {
    const room = C.ROOMS[roomId];
    if (!room) return;
    const d = room.district;
    if (room.hub && d) {
      if (!s.visited.includes(d)) s.visited.push(d);
      G.learnDistrict(d);
      MapView.neighbours(d).forEach((n) => G.learnDistrict(n));
    }
  }

  function travel(district, text) {
    const from = currentDistrictHub();
    if (from !== district) s.lastDistrict = from;
    s.turn += 1;
    const def = C.DISTRICTS[district];
    const gated = def && def.gate ? def.gate(s) : null;
    /* a hot runner attracts the Watch on the way */
    if (s.heat >= 3 && !gated && district !== "plaza" && Math.random() < 0.45 && !s.flags.knowsPatrols) {
      s.flags.patrolReturn = district;
      s.scene = "plaza_patrol";
      s.result = (text ? text + "\n\n" : "") + "On the way, a Watch patrol steps out of a doorway and raises a scanner.";
      return;
    }
    s.scene = gated || district;
    s.result = text || null;
    arrive(s.scene);
  }

  /* ------------------------------------------------------------- Save/Load */
  function saveGame(silent) {
    if (!started || !s || s.ending) return false;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(s));
      if (!silent) toast("Saved.");
      return true;
    } catch (e) {
      if (!silent) toast("Could not save (storage unavailable).");
      return false;
    }
  }

  function loadSaved() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || data.version !== SAVE_VERSION || !data.player) return null;
      return data;
    } catch (e) { return null; }
  }

  function clearSave() {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
  }

  function hasSave() { return loadSaved() !== null; }

  function loadGame() {
    const data = loadSaved();
    if (!data) { toast("No save found."); return false; }
    s = data;
    started = true;
    hideOverlay();
    s.result = "Save loaded.";
    render();
    Sound.select();
    return true;
  }

  /* ---------------------------------------------------------------- Render */
  function render() {
    stopTyping();
    const room = currentRoom();
    const district = C.DISTRICTS[room.district] || { name: "" };

    $("location-line").innerHTML = s.ending
      ? `<b>ENDING</b> · turn ${s.turn}`
      : `<b>${esc(district.name.toUpperCase())}</b> · ${esc(room.name)} · turn ${s.turn}`;

    const segments = [];
    if (s.result) segments.push({ cls: "result", text: s.result });
    if (s.ending) {
      const e = C.ENDINGS[s.ending];
      segments.push({ cls: "ending-grade", text: `// ${e.title}\n\n` });
      segments.push({ cls: "", text: typeof e.text === "function" ? e.text(s) : e.text });
    } else {
      segments.push({ cls: "", text: typeof room.text === "function" ? room.text(s) : room.text });
    }

    const choices = buildChoices(room);
    renderChoices(choices);
    $("choices").classList.add("hidden");
    typewrite(segments, () => $("choices").classList.remove("hidden"));

    renderStatus();
    renderRunner();
    renderInventory();
    renderFactions();
    renderJournal();
    if (!s.ending) saveGame(true);
    else clearSave();
  }

  function buildChoices(room) {
    if (s.ending) {
      return [
        { label: "Play again", hint: "new runner", do: () => showCreator() },
        { label: "Title screen", do: () => showTitle() }
      ];
    }
    let list = [];
    try {
      list = (room.choices ? room.choices(s) : []).filter((c) => c && c.when !== false);
    } catch (e) {
      console.error("Choice error in", s.scene, e);
    }
    if (room.hub) {
      MapView.neighbours(room.district).forEach((n) => {
        if (!s.known.includes(n)) return;
        const def = C.DISTRICTS[n];
        const locked = def.locked && def.locked(s);
        list.push({
          label: `Travel to ${def.name}`,
          hint: locked ? "sealed" : "travel",
          travel: true,
          do: () => travel(n)
        });
      });
    }
    return list.slice(0, 9);
  }

  function renderChoices(choices) {
    const ol = $("choices");
    ol.innerHTML = "";
    choices.forEach((c, i) => {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.innerHTML = `<span class="key">${i + 1}</span><span class="label">${esc(c.label)}</span>${c.hint ? `<span class="hint">${esc(c.hint)}</span>` : ""}`;
      btn.addEventListener("click", () => choose(c));
      li.appendChild(btn);
      ol.appendChild(li);
    });
  }

  function choose(c) {
    if (!started) return;
    Sound.unlock();
    Sound.select();
    actionDead = false;
    s.result = null;
    try {
      c.do();
    } catch (e) {
      console.error("Action error", e);
      s.result = "Something glitches in the city's wiring. (" + e.message + ")";
    }
    if (actionDead) {
      actionDead = false;
      G.end("dead");
    }
    if (!started) return;
    render();
  }

  function renderStatus() {
    const p = s.player;
    const pct = Math.max(0, Math.min(100, (p.hp / p.maxHp) * 100));
    const fill = $("hp-fill");
    fill.style.width = pct + "%";
    fill.style.background = pct > 50 ? "var(--ok)" : pct > 25 ? "var(--item)" : "var(--warn)";
    $("hp-text").textContent = `${p.hp}/${p.maxHp}`;
    $("credits-text").textContent = p.credits;
    $("heat-text").textContent = "▮".repeat(s.heat) + "▯".repeat(Math.max(0, 5 - s.heat));
    $("turn-text").textContent = s.turn;
  }

  function renderRunner() {
    Portrait.drawPortrait($("portrait-canvas"), s.player.look);
    const rows = Object.entries(C.STATS).map(([k, def]) => {
      const base = G.stat(k), bonus = G.bonus(k) - base;
      const pips = "●".repeat(base) + "○".repeat(Math.max(0, STAT_MAX - base)) + (bonus ? `<span class="dim">+${bonus}</span>` : "");
      return `<div class="stat"><span>${def.label}</span><span class="pips">${pips}</span></div>`;
    });
    $("runner-stats").innerHTML = `<div class="name">${esc(s.player.name)}</div>${rows.join("")}`;
  }

  function renderInventory() {
    const ul = $("inventory");
    ul.innerHTML = "";
    if (!s.player.inventory.length) { ul.innerHTML = '<li class="empty">Pockets empty.</li>'; return; }
    s.player.inventory.forEach((id) => {
      const def = C.ITEMS[id] || { name: id, desc: "" };
      const li = document.createElement("li");
      li.innerHTML = `<div><span class="item-name">${esc(def.name)}</span><span class="item-desc">${esc(def.desc)}</span></div>`;
      if (def.use && !s.ending) {
        const btn = document.createElement("button");
        btn.textContent = "Use";
        btn.addEventListener("click", () => useItem(id));
        li.appendChild(btn);
      }
      ul.appendChild(li);
    });
  }

  function useItem(id) {
    const def = C.ITEMS[id];
    if (!def || !def.use) return;
    Sound.unlock();
    G.take(id);
    const text = def.use(G);
    s.result = text || `You use the ${def.name}.`;
    render();
  }

  function renderFactions() {
    const ul = $("factions");
    ul.innerHTML = Object.entries(C.FACTIONS).map(([k, name]) => {
      const v = s.factions[k] || 0;
      const cls = v > 0 ? "rep-pos" : v < 0 ? "rep-neg" : "dim";
      return `<li><span>${name}</span><span class="${cls}">${v > 0 ? "+" + v : v}</span></li>`;
    }).join("");
  }

  function renderJournal() {
    const ul = $("journal");
    if (!s.journal.length) { ul.innerHTML = '<li class="empty">Nothing yet.</li>'; return; }
    ul.innerHTML = s.journal.slice(-10).reverse().map((t) => `<li>${esc(t)}</li>`).join("");
  }

  /* ------------------------------------------------------------ Typewriter */
  function typewrite(segments, onDone) {
    const story = $("story");
    story.innerHTML = "";
    const cursor = document.createElement("span");
    cursor.className = "cursor";
    story.appendChild(cursor);

    let segIndex = 0, charIndex = 0, span = null, tickCount = 0;
    const job = { timer: null, done: false };

    function finish() {
      if (job.done) return;
      job.done = true;
      clearInterval(job.timer);
      story.innerHTML = "";
      segments.forEach((seg) => {
        const el = document.createElement("span");
        if (seg.cls) el.className = seg.cls;
        el.textContent = seg.text + (seg.cls === "result" ? "" : "");
        story.appendChild(el);
        if (seg.cls === "result") story.appendChild(document.createTextNode("\n"));
      });
      story.appendChild(cursor);
      typing = null;
      onDone();
    }
    job.finish = finish;

    function step() {
      for (let n = 0; n < TYPE_CHARS_PER_TICK; n++) {
        if (segIndex >= segments.length) { finish(); return; }
        const seg = segments[segIndex];
        if (!span) {
          span = document.createElement("span");
          if (seg.cls) span.className = seg.cls;
          story.insertBefore(span, cursor);
        }
        if (charIndex < seg.text.length) {
          span.textContent += seg.text[charIndex++];
          if (++tickCount % 3 === 0 && seg.text[charIndex - 1] !== " ") Sound.tick();
        } else {
          if (seg.cls === "result") story.insertBefore(document.createTextNode("\n"), cursor);
          segIndex++; charIndex = 0; span = null;
        }
      }
    }
    job.timer = setInterval(step, TYPE_INTERVAL_MS);
    typing = job;
  }

  function stopTyping() {
    if (typing) { clearInterval(typing.timer); typing = null; }
  }

  function skipTyping() {
    if (typing) { typing.finish(); return true; }
    return false;
  }

  /* --------------------------------------------------------------- Overlay */
  function showOverlay(html) {
    $("overlay-box").innerHTML = html;
    $("overlay").classList.remove("hidden");
  }
  function hideOverlay() { $("overlay").classList.add("hidden"); }
  function overlayOpen() { return !$("overlay").classList.contains("hidden"); }

  function logoSVG() {
    /* Title art: a skyline, a rain-streaked grid and the title, all inline SVG. */
    const towers = [[10, 70], [40, 40], [70, 55], [95, 25], [130, 60], [160, 35], [200, 50], [235, 20], [270, 45], [300, 65], [330, 30], [370, 55], [400, 40], [440, 60], [470, 28], [510, 50], [550, 38], [590, 62]];
    let rects = "";
    towers.forEach(([x, h], i) => {
      const w = 22 + (i % 3) * 6;
      rects += `<rect x="${x}" y="${120 - h}" width="${w}" height="${h}" fill="#071a1f" stroke="#27e7ff" stroke-opacity="0.6"/>`;
      for (let wy = 128 - h; wy < 112; wy += 9) {
        for (let wx = x + 4; wx < x + w - 4; wx += 7) {
          if ((wx * 7 + wy * 13 + i) % 5 < 2) rects += `<rect x="${wx}" y="${wy}" width="3" height="4" fill="${(wx + wy) % 11 < 4 ? "#ff5fa8" : "#27e7ff"}" opacity="0.8"/>`;
        }
      }
    });
    return `<svg class="title-logo" viewBox="0 0 620 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Verge City">
      <defs>
        <filter id="glow"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#030a0c"/><stop offset="1" stop-color="#0b2a30"/></linearGradient>
      </defs>
      <rect width="620" height="200" fill="url(#sky)"/>
      ${Array.from({ length: 30 }, (_, i) => `<line x1="${i * 21 + 5}" y1="0" x2="${i * 21 - 10}" y2="120" stroke="#27e7ff" stroke-opacity="0.08"/>`).join("")}
      ${rects}
      <rect x="0" y="120" width="620" height="80" fill="#040c0e"/>
      <line x1="0" y1="120.5" x2="620" y2="120.5" stroke="#27e7ff" stroke-opacity="0.5"/>
      <text x="310" y="168" text-anchor="middle" font-family="Cascadia Mono, Fira Mono, DejaVu Sans Mono, Menlo, Consolas, monospace" font-size="46" font-weight="bold" letter-spacing="10" fill="#27e7ff" filter="url(#glow)">VERGE CITY</text>
      <text x="310" y="190" text-anchor="middle" font-family="Cascadia Mono, Fira Mono, DejaVu Sans Mono, Menlo, Consolas, monospace" font-size="11" letter-spacing="4" fill="#4f8f97">A TERMINAL TEXT ADVENTURE</text>
    </svg>`;
  }

  function showTitle() {
    started = false;
    stopTyping();
    const save = loadSaved();
    const saveLine = save ? `${esc(save.player.name)} · turn ${save.turn} · ${esc((C.DISTRICTS[(C.ROOMS[save.scene] || {}).district] || {}).name || "")}` : "no save";
    showOverlay(`
      ${logoSVG()}
      <div class="title-tag">ONE NIGHT · ONE CASE · SEVEN WAYS OUT</div>
      <div class="menu">
        <button id="t-new">New run</button>
        <button id="t-continue" ${save ? "" : "disabled"}>Continue <span class="sub">${saveLine}</span></button>
        <button id="t-help">How to play</button>
        <button id="t-sound">Sound: ${Sound.muted ? "off" : "on"}</button>
      </div>
      <div class="overlay-foot">Everything on screen is drawn in code and every sound is synthesised. Press a key or click to begin.</div>
    `);
    $("t-new").addEventListener("click", () => { Sound.unlock(); Sound.select(); showCreator(); });
    $("t-continue").addEventListener("click", () => { Sound.unlock(); loadGame(); });
    $("t-help").addEventListener("click", () => { Sound.unlock(); Sound.select(); showHelp(() => showTitle()); });
    $("t-sound").addEventListener("click", () => { Sound.unlock(); Sound.toggleMute(); updateMuteButton(); $("t-sound").textContent = `Sound: ${Sound.muted ? "off" : "on"}`; });
    $("t-new").focus();
  }

  function showHelp(back) {
    showOverlay(`
      <h2>// HOW TO PLAY</h2>
      <p>Verge City is a text adventure. Read the screen, pick a choice, live with it. A courier has died in front of you with a sealed case, and the Syndicate, Helix Corp, the Collective and the City Watch would all like a word.</p>
      <p><b>Choices</b> are numbered. Click them or press <kbd>1</kbd>–<kbd>9</kbd>. Many show a requirement such as <i>Muscle 2/3</i>: your current value against what is needed. Items in your pockets add to those values, so a Neon Blade makes you a better fighter and a Holo Cloak a better sneak.</p>
      <p><b>Text</b> types itself out. Press <kbd>Space</kbd>, <kbd>Enter</kbd> or click the story to skip to the end.</p>
      <p><b>Travel</b> from a district hub using the travel choices or by clicking a lit district on the map. Sealed districts need a key, a hack or a change in the city's power.</p>
      <p><b>Heat</b> is how interested the City Watch is in you. Keep it low or expect to be stopped and searched.</p>
      <p><b>Save</b> with <kbd>S</kbd> or the Save button; the game also saves itself after every choice. <kbd>L</kbd> loads. <kbd>M</kbd> mutes the synthesised sound. <kbd>Esc</kbd> returns to this menu.</p>
      <p>There are seven endings. Some pay. Some do not.</p>
      <div class="creator-actions"><button id="h-back">Back</button></div>
    `);
    $("h-back").addEventListener("click", () => { Sound.select(); back(); });
    $("h-back").focus();
  }

  /* ----------------------------------------------------- Character creator */
  const NAMES = ["Nyx", "Kade", "Sorrel", "Juno", "Vesper", "Rill", "Ash", "Tamsin", "Orin", "Lux"];

  function showCreator() {
    started = false;
    stopTyping();
    const draft = {
      name: NAMES[Math.floor(Math.random() * NAMES.length)],
      stats: { muscle: 1, reflex: 1, tech: 1, charm: 1 },
      look: { hair: 0, hairColour: 1, eyes: 1, skin: 1, jacket: 0 }
    };
    const pointsLeft = () => STAT_POINTS - Object.values(draft.stats).reduce((a, b) => a + b, 0) + 4;

    function body() {
      const statRows = Object.entries(C.STATS).map(([k, def]) => `
        <div class="row" title="${esc(def.blurb)}">
          <label>${def.label}</label>
          <span class="pips">${"●".repeat(draft.stats[k])}${"○".repeat(STAT_MAX - draft.stats[k])}</span>
          <button data-stat="${k}" data-d="-1" ${draft.stats[k] <= 1 ? "disabled" : ""}>−</button>
          <button data-stat="${k}" data-d="1" ${draft.stats[k] >= STAT_MAX || pointsLeft() <= 0 ? "disabled" : ""}>+</button>
          <span class="dim" style="font-size:0.8em">${esc(def.blurb)}</span>
        </div>`).join("");
      const lookRow = (key, label, value) => `
        <div class="row"><label>${label}</label><button data-look="${key}" data-d="-1">◀</button><span class="val">${esc(value)}</span><button data-look="${key}" data-d="1">▶</button></div>`;
      return `
        <h2>// NEW RUNNER</h2>
        <div class="creator">
          <div>
            <canvas id="creator-portrait" width="180" height="180"></canvas>
            <div class="creator-actions" style="justify-content:flex-start"><button id="c-shuffle" class="small">Shuffle look</button></div>
          </div>
          <div>
            <div class="row"><label>Name</label><input id="c-name" type="text" maxlength="18" value="${esc(draft.name)}"></div>
            ${lookRow("hair", "Hair", Portrait.HAIR[draft.look.hair])}
            ${lookRow("hairColour", "Dye", ["Black", "Cyan", "Magenta", "Amber", "White"][draft.look.hairColour])}
            ${lookRow("eyes", "Eyes", Portrait.EYES[draft.look.eyes])}
            ${lookRow("skin", "Skin", ["Pale", "Olive", "Tan", "Dark", "Chrome"][draft.look.skin])}
            ${lookRow("jacket", "Jacket", ["Teal", "Plum", "Ochre", "Moss", "Slate"][draft.look.jacket])}
            <div class="points">Points to spend: ${pointsLeft()}</div>
            <p class="blurb">Every stat starts at 1 and tops out at ${STAT_MAX}. Items add to them later. A specialist opens doors a generalist cannot; a generalist survives more surprises.</p>
            ${statRows}
          </div>
        </div>
        <div class="creator-actions">
          <button id="c-back">Back</button>
          <button id="c-start" ${pointsLeft() > 0 ? "disabled" : ""}>Step into the rain</button>
        </div>`;
    }

    function paint() {
      showOverlay(body());
      Portrait.drawPortrait($("creator-portrait"), draft.look);
      $("overlay-box").querySelectorAll("button[data-stat]").forEach((b) => b.addEventListener("click", () => {
        draft.stats[b.dataset.stat] += Number(b.dataset.d);
        Sound.select(); paint();
      }));
      $("overlay-box").querySelectorAll("button[data-look]").forEach((b) => b.addEventListener("click", () => {
        const key = b.dataset.look;
        const sizes = { hair: Portrait.HAIR.length, hairColour: Portrait.HAIR_COLOURS.length, eyes: Portrait.EYES.length, skin: Portrait.SKINS.length, jacket: Portrait.JACKETS.length };
        draft.look[key] = (draft.look[key] + Number(b.dataset.d) + sizes[key]) % sizes[key];
        draft.name = $("c-name").value;
        Sound.tick(); paint();
      }));
      $("c-shuffle").addEventListener("click", () => {
        draft.look = { hair: rnd(Portrait.HAIR.length), hairColour: rnd(Portrait.HAIR_COLOURS.length), eyes: rnd(Portrait.EYES.length), skin: rnd(Portrait.SKINS.length), jacket: rnd(Portrait.JACKETS.length) };
        draft.name = $("c-name").value;
        Sound.select(); paint();
      });
      $("c-name").addEventListener("input", (e) => { draft.name = e.target.value; });
      $("c-back").addEventListener("click", () => { Sound.select(); showTitle(); });
      $("c-start").addEventListener("click", () => {
        draft.name = ($("c-name").value || "Runner").trim().slice(0, 18) || "Runner";
        startRun(draft);
      });
    }
    paint();
  }

  function rnd(n) { return Math.floor(Math.random() * n); }

  function startRun(draft) {
    s = freshState({
      name: draft.name,
      stats: { ...draft.stats },
      look: { ...draft.look },
      hp: MAX_HP,
      maxHp: MAX_HP,
      credits: START_CREDITS,
      inventory: []
    });
    started = true;
    hideOverlay();
    Sound.success();
    render();
  }

  /* ------------------------------------------------------------------ Input */
  function onKey(e) {
    if (e.target && e.target.tagName === "INPUT") return;
    const k = e.key;
    if (overlayOpen()) {
      if (k === "Escape" && started) { hideOverlay(); e.preventDefault(); }
      return;
    }
    if (!started) return;
    if (k === " " || k === "Enter") {
      if (skipTyping()) e.preventDefault();
      return;
    }
    if (k === "m" || k === "M") { Sound.unlock(); Sound.toggleMute(); updateMuteButton(); return; }
    if (k === "s" || k === "S") { saveGame(false); return; }
    if (k === "l" || k === "L") { loadGame(); return; }
    if (k === "Escape") { showTitle(); return; }
    if (k >= "1" && k <= "9") {
      if (typing) { skipTyping(); }
      const btns = $("choices").querySelectorAll("button");
      const btn = btns[Number(k) - 1];
      if (btn) btn.click();
    }
  }

  function updateMuteButton() {
    $("btn-mute").textContent = `Sound: ${Sound.muted ? "off" : "on"}`;
  }

  function toast(msg) {
    const line = $("hint-line");
    line.dataset.default = line.dataset.default || line.innerHTML;
    line.textContent = msg;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { line.innerHTML = line.dataset.default; }, 1800);
  }

  function flashDamage() {
    const crt = $("crt");
    crt.style.transition = "none";
    crt.style.boxShadow = "inset 0 0 120px rgba(255, 95, 168, 0.55)";
    setTimeout(() => { crt.style.transition = "box-shadow 0.5s"; crt.style.boxShadow = "none"; }, 60);
  }

  function esc(str) {
    return String(str).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  }

  /* -------------------------------------------------------------- Map loop */
  function mapLoop(time) {
    if (started && s) {
      const room = currentRoom();
      const view = {
        time,
        current: room.district,
        known: new Set(s.known),
        visited: new Set(s.visited),
        locked: new Set(Object.keys(C.DISTRICTS).filter((id) => C.DISTRICTS[id].locked && C.DISTRICTS[id].locked(s)))
      };
      MapView.drawMap($("map-canvas"), view);
    }
    requestAnimationFrame(mapLoop);
  }

  function onMapClick(e) {
    if (!started || !s || s.ending) return;
    const room = currentRoom();
    if (!room.hub) { toast("Finish what you are doing here before travelling."); return; }
    const hit = MapView.hitTest($("map-canvas"), e.clientX, e.clientY, new Set(s.known));
    if (!hit || hit === room.district) return;
    if (!MapView.neighbours(room.district).includes(hit)) { toast("No direct route. Travel district by district."); return; }
    Sound.unlock(); Sound.select();
    actionDead = false;
    travel(hit);
    render();
  }

  /* ------------------------------------------------------------------- Boot */
  function boot() {
    document.addEventListener("keydown", onKey);
    $("story").addEventListener("click", () => skipTyping());
    $("btn-save").addEventListener("click", () => { Sound.unlock(); if (saveGame(false)) Sound.select(); });
    $("btn-load").addEventListener("click", () => { Sound.unlock(); loadGame(); });
    $("btn-mute").addEventListener("click", () => { Sound.unlock(); Sound.toggleMute(); updateMuteButton(); });
    $("btn-menu").addEventListener("click", () => { Sound.unlock(); Sound.select(); showTitle(); });
    $("map-canvas").addEventListener("click", onMapClick);
    updateMuteButton();
    const blank = $("map-canvas");
    MapView.drawMap(blank, { time: 0, current: null, known: new Set(), visited: new Set(), locked: new Set() });
    showTitle();
    requestAnimationFrame(mapLoop);
  }

  window.addEventListener("error", (e) => {
    console.error("Verge City error:", e.message);
    const story = $("story");
    if (story && !started) story.textContent = "The terminal failed to initialise: " + e.message;
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
