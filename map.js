/* Verge City — canvas drawing for the district map and the runner portrait.
   Nothing here loads an image: every pixel is drawn with the 2D canvas API. */
(function () {
  const COLOUR = {
    grid: "rgba(39, 231, 255, 0.07)",
    edge: "rgba(39, 231, 255, 0.28)",
    edgeOpen: "rgba(39, 231, 255, 0.75)",
    node: "#0b2a30",
    nodeVisited: "#0f4a52",
    nodeLocked: "#2a0f1e",
    stroke: "#27e7ff",
    strokeLocked: "#ff5fa8",
    text: "#b9f1f7",
    dim: "#4f8f97",
    player: "#ffc857"
  };

  /* Hand-placed layout: the river runs across the lower right, the corporate towers sit top right. */
  const LAYOUT = {
    alley:        { x: 60,  y: 215, label: "Alley" },
    market:       { x: 118, y: 128, label: "Market" },
    cybercafe:    { x: 165, y: 92,  label: "Cybercafé" },
    plaza:        { x: 200, y: 170, label: "Plaza" },
    club:         { x: 268, y: 112, label: "Club Static" },
    rooftops:     { x: 210, y: 28,  label: "Rooftops" },
    luxury_store: { x: 298, y: 44,  label: "Helix Showroom" },
    docks:        { x: 282, y: 232, label: "Docks" },
    outskirts:    { x: 310, y: 160, label: "Outskirts" },
    terminal:     { x: 190, y: 258, label: "Rail Terminal" },
    underground:  { x: 95,  y: 275, label: "Underground" },
    bunker:       { x: 58,  y: 70,  label: "Bunker" }
  };

  const EDGES = [
    ["alley", "market"], ["alley", "plaza"], ["alley", "underground"],
    ["market", "cybercafe"], ["market", "plaza"],
    ["plaza", "club"], ["plaza", "terminal"], ["plaza", "docks"],
    ["club", "rooftops"], ["club", "luxury_store"], ["club", "outskirts"],
    ["cybercafe", "rooftops"], ["cybercafe", "bunker"],
    ["docks", "outskirts"], ["docks", "terminal"],
    ["underground", "terminal"], ["underground", "bunker"],
    ["luxury_store", "outskirts"], ["rooftops", "luxury_store"]
  ];

  function neighbours(id) {
    const out = [];
    EDGES.forEach(([a, b]) => {
      if (a === id) out.push(b);
      else if (b === id) out.push(a);
    });
    return out;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* The river and the shoreline, drawn as a soft band behind the nodes. */
  function drawWater(ctx, w, h, t) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(w * 0.62, h);
    ctx.bezierCurveTo(w * 0.70, h * 0.72, w * 0.86, h * 0.68, w, h * 0.52);
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fillStyle = "rgba(39, 231, 255, 0.05)";
    ctx.fill();
    ctx.strokeStyle = "rgba(39, 231, 255, 0.25)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      const off = i * 9 + ((t / 400) % 9);
      ctx.moveTo(w * 0.62 + off * 0.6, h);
      ctx.bezierCurveTo(w * 0.70 + off, h * 0.72 + off, w * 0.86 + off, h * 0.68 + off, w, h * 0.52 + off);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawMap(canvas, view) {
    const ctx = canvas.getContext("2d");
    const w = canvas.width, h = canvas.height;
    const t = view.time || 0;
    ctx.clearRect(0, 0, w, h);

    ctx.strokeStyle = COLOUR.grid;
    ctx.lineWidth = 1;
    for (let x = 0; x <= w; x += 20) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y <= h; y += 20) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    drawWater(ctx, w, h, t);

    const known = view.known;
    const here = view.current;

    EDGES.forEach(([a, b]) => {
      if (!known.has(a) && !known.has(b)) return;
      const pa = LAYOUT[a], pb = LAYOUT[b];
      const open = a === here || b === here;
      ctx.save();
      ctx.strokeStyle = open ? COLOUR.edgeOpen : COLOUR.edge;
      ctx.lineWidth = open ? 2 : 1;
      if (open) ctx.setLineDash([6, 4]), ctx.lineDashOffset = -(t / 40) % 10;
      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
      ctx.stroke();
      ctx.restore();
    });

    Object.entries(LAYOUT).forEach(([id, p]) => {
      if (!known.has(id)) return;
      const visited = view.visited.has(id);
      const locked = view.locked.has(id);
      const isHere = id === here;
      ctx.save();
      ctx.shadowColor = locked ? COLOUR.strokeLocked : COLOUR.stroke;
      ctx.shadowBlur = isHere ? 18 : 6;
      roundRect(ctx, p.x - 11, p.y - 11, 22, 22, 4);
      ctx.fillStyle = locked ? COLOUR.nodeLocked : visited ? COLOUR.nodeVisited : COLOUR.node;
      ctx.fill();
      ctx.lineWidth = isHere ? 2 : 1;
      ctx.strokeStyle = locked ? COLOUR.strokeLocked : COLOUR.stroke;
      ctx.stroke();
      ctx.restore();

      /* district glyphs: a tiny icon per district type */
      ctx.save();
      ctx.strokeStyle = locked ? COLOUR.strokeLocked : COLOUR.stroke;
      ctx.fillStyle = ctx.strokeStyle;
      ctx.lineWidth = 1.2;
      ctx.translate(p.x, p.y);
      glyph(ctx, id);
      ctx.restore();

      ctx.font = `${isHere ? "bold " : ""}10px ${getComputedStyle(canvas).fontFamily}`;
      ctx.fillStyle = isHere ? COLOUR.text : COLOUR.dim;
      ctx.textAlign = "center";
      const label = p.label.toUpperCase();
      const ly = p.y < 50 ? p.y + 24 : p.y - 17;
      ctx.fillText(label, p.x, ly);
    });

    /* the runner: a pulsing ring around the current district */
    if (LAYOUT[here]) {
      const p = LAYOUT[here];
      const pulse = 14 + Math.sin(t / 250) * 3;
      ctx.save();
      ctx.strokeStyle = COLOUR.player;
      ctx.lineWidth = 1.5;
      ctx.shadowColor = COLOUR.player;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(p.x, p.y, pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    /* compass and scale in the corner */
    ctx.save();
    ctx.fillStyle = COLOUR.dim;
    ctx.font = `9px ${getComputedStyle(canvas).fontFamily}`;
    ctx.textAlign = "left";
    ctx.fillText("N", 8, 14);
    ctx.beginPath(); ctx.moveTo(11, 18); ctx.lineTo(11, 36); ctx.strokeStyle = COLOUR.dim; ctx.stroke();
    ctx.textAlign = "right";
    ctx.fillText("VERGE CITY · TRANSIT GRID", w - 8, h - 8);
    ctx.restore();
  }

  function glyph(ctx, id) {
    ctx.beginPath();
    switch (id) {
      case "alley": ctx.moveTo(-5, 5); ctx.lineTo(-2, -5); ctx.lineTo(2, -5); ctx.lineTo(5, 5); break;
      case "market": ctx.moveTo(-6, -2); ctx.lineTo(6, -2); ctx.lineTo(4, 5); ctx.lineTo(-4, 5); ctx.closePath(); ctx.moveTo(-6, -2); ctx.lineTo(-4, -6); ctx.lineTo(4, -6); ctx.lineTo(6, -2); break;
      case "cybercafe": ctx.rect(-6, -4, 12, 7); ctx.moveTo(-3, 6); ctx.lineTo(3, 6); break;
      case "plaza": ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.moveTo(0, -5); ctx.lineTo(0, 5); ctx.moveTo(-5, 0); ctx.lineTo(5, 0); break;
      case "club": ctx.moveTo(-3, 4); ctx.lineTo(-3, -4); ctx.lineTo(4, -6); ctx.lineTo(4, 2); ctx.moveTo(-3, 4); ctx.arc(-4, 4, 1.5, 0, Math.PI * 2); break;
      case "rooftops": ctx.moveTo(-6, 5); ctx.lineTo(-6, -1); ctx.lineTo(-2, -1); ctx.lineTo(-2, -5); ctx.lineTo(2, -5); ctx.lineTo(2, 1); ctx.lineTo(6, 1); ctx.lineTo(6, 5); break;
      case "luxury_store": ctx.moveTo(-5, 5); ctx.lineTo(-5, -5); ctx.lineTo(5, -5); ctx.lineTo(5, 5); ctx.moveTo(-2, 5); ctx.lineTo(-2, -1); ctx.lineTo(2, -1); ctx.lineTo(2, 5); break;
      case "docks": ctx.moveTo(-6, 2); ctx.lineTo(6, 2); ctx.lineTo(4, 5); ctx.lineTo(-4, 5); ctx.closePath(); ctx.moveTo(0, 2); ctx.lineTo(0, -6); ctx.moveTo(-4, -4); ctx.lineTo(4, -4); break;
      case "outskirts": ctx.moveTo(-6, 4); ctx.lineTo(-2, -3); ctx.lineTo(1, 1); ctx.lineTo(3, -2); ctx.lineTo(6, 4); break;
      case "terminal": ctx.rect(-6, -3, 12, 6); ctx.moveTo(-4, 3); ctx.lineTo(-5, 6); ctx.moveTo(4, 3); ctx.lineTo(5, 6); break;
      case "underground": ctx.arc(0, 1, 5, Math.PI, 0); ctx.moveTo(-5, 1); ctx.lineTo(-5, 5); ctx.moveTo(5, 1); ctx.lineTo(5, 5); break;
      case "bunker": ctx.moveTo(-6, 5); ctx.lineTo(-6, -1); ctx.lineTo(0, -6); ctx.lineTo(6, -1); ctx.lineTo(6, 5); ctx.closePath(); break;
      default: ctx.arc(0, 0, 3, 0, Math.PI * 2);
    }
    ctx.stroke();
  }

  function hitTest(canvas, clientX, clientY, known) {
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width, sy = canvas.height / rect.height;
    const mx = (clientX - rect.left) * sx, my = (clientY - rect.top) * sy;
    let hit = null;
    Object.entries(LAYOUT).forEach(([id, p]) => {
      if (!known.has(id)) return;
      if (Math.abs(mx - p.x) <= 14 && Math.abs(my - p.y) <= 14) hit = id;
    });
    return hit;
  }

  /* --- Portrait --------------------------------------------------------- */
  const HAIR = ["Cropped", "Mohawk", "Long", "Shaved", "Dreads"];
  const EYES = ["Bare eyes", "Visor", "Mono-lens", "Goggles"];
  const JACKETS = ["#1b6f7a", "#7a1b5e", "#7a5a1b", "#2d7a1b", "#4a4a5e"];
  const SKINS = ["#f1c7a8", "#c98f63", "#8d5a3b", "#5a3a28", "#d8dde6"];
  const HAIR_COLOURS = ["#1a1a22", "#27e7ff", "#ff5fa8", "#ffc857", "#f4f4f4"];

  function drawPortrait(canvas, look) {
    const ctx = canvas.getContext("2d");
    const w = canvas.width, h = canvas.height;
    const s = w / 120;
    ctx.save();
    ctx.scale(s, s);
    ctx.clearRect(0, 0, 120, 120);

    /* neon backdrop stripes */
    ctx.fillStyle = "#030a0c";
    ctx.fillRect(0, 0, 120, 120);
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = i % 2 ? "rgba(39,231,255,0.05)" : "rgba(255,95,168,0.05)";
      ctx.fillRect(0, i * 20, 120, 10);
    }

    const skin = SKINS[look.skin % SKINS.length];
    const jacket = JACKETS[look.jacket % JACKETS.length];
    const hairColour = HAIR_COLOURS[look.hairColour % HAIR_COLOURS.length];

    /* jacket and shoulders */
    ctx.fillStyle = jacket;
    ctx.beginPath();
    ctx.moveTo(14, 120); ctx.lineTo(22, 86); ctx.lineTo(48, 78); ctx.lineTo(72, 78); ctx.lineTo(98, 86); ctx.lineTo(106, 120);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.18)"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(48, 78); ctx.lineTo(52, 120); ctx.moveTo(72, 78); ctx.lineTo(68, 120); ctx.stroke();
    /* collar glow strip */
    ctx.strokeStyle = "#27e7ff"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(40, 82); ctx.lineTo(48, 94); ctx.lineTo(60, 86); ctx.lineTo(72, 94); ctx.lineTo(80, 82); ctx.stroke();

    /* neck */
    ctx.fillStyle = skin;
    ctx.fillRect(52, 66, 16, 16);

    /* head */
    ctx.beginPath();
    ctx.moveTo(40, 36);
    ctx.quadraticCurveTo(40, 18, 60, 18);
    ctx.quadraticCurveTo(80, 18, 80, 36);
    ctx.lineTo(79, 56);
    ctx.quadraticCurveTo(76, 72, 60, 74);
    ctx.quadraticCurveTo(44, 72, 41, 56);
    ctx.closePath();
    ctx.fill();

    /* hair */
    ctx.fillStyle = hairColour;
    switch (HAIR[look.hair % HAIR.length]) {
      case "Cropped":
        ctx.beginPath(); ctx.moveTo(39, 36); ctx.quadraticCurveTo(40, 14, 60, 14); ctx.quadraticCurveTo(80, 14, 81, 36); ctx.lineTo(78, 30); ctx.quadraticCurveTo(60, 24, 42, 30); ctx.closePath(); ctx.fill();
        break;
      case "Mohawk":
        ctx.beginPath(); ctx.moveTo(54, 22); ctx.lineTo(60, 2); ctx.lineTo(66, 22); ctx.closePath(); ctx.fill();
        ctx.fillRect(56, 14, 8, 10);
        break;
      case "Long":
        ctx.beginPath(); ctx.moveTo(38, 36); ctx.quadraticCurveTo(40, 14, 60, 14); ctx.quadraticCurveTo(80, 14, 82, 36); ctx.lineTo(86, 84); ctx.lineTo(76, 84); ctx.lineTo(78, 40); ctx.quadraticCurveTo(60, 30, 42, 40); ctx.lineTo(44, 84); ctx.lineTo(34, 84); ctx.closePath(); ctx.fill();
        break;
      case "Shaved":
        ctx.strokeStyle = hairColour; ctx.lineWidth = 1;
        for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(44 + i * 8, 22); ctx.lineTo(44 + i * 8, 20); ctx.stroke(); }
        break;
      case "Dreads":
        for (let i = 0; i < 7; i++) {
          const x = 40 + i * 6.6;
          ctx.beginPath(); ctx.moveTo(x, 24); ctx.lineTo(x - 4, 60 + (i % 3) * 8); ctx.lineWidth = 4; ctx.strokeStyle = hairColour; ctx.stroke();
        }
        ctx.beginPath(); ctx.moveTo(39, 34); ctx.quadraticCurveTo(40, 14, 60, 14); ctx.quadraticCurveTo(80, 14, 81, 34); ctx.quadraticCurveTo(60, 26, 39, 34); ctx.fill();
        break;
    }

    /* eyes or eyewear */
    switch (EYES[look.eyes % EYES.length]) {
      case "Bare eyes":
        ctx.fillStyle = "#0b0b10";
        ctx.fillRect(49, 42, 6, 3); ctx.fillRect(65, 42, 6, 3);
        ctx.fillStyle = "#27e7ff"; ctx.fillRect(51, 43, 2, 1); ctx.fillRect(67, 43, 2, 1);
        break;
      case "Visor":
        ctx.fillStyle = "#0b0b10"; ctx.fillRect(43, 39, 34, 9);
        const grad = ctx.createLinearGradient(43, 0, 77, 0);
        grad.addColorStop(0, "#ff5fa8"); grad.addColorStop(1, "#27e7ff");
        ctx.fillStyle = grad; ctx.fillRect(45, 41, 30, 5);
        break;
      case "Mono-lens":
        ctx.fillStyle = "#0b0b10"; ctx.fillRect(49, 42, 6, 3);
        ctx.beginPath(); ctx.arc(68, 43, 6, 0, Math.PI * 2); ctx.fillStyle = "#101418"; ctx.fill();
        ctx.beginPath(); ctx.arc(68, 43, 3, 0, Math.PI * 2); ctx.fillStyle = "#ff5fa8"; ctx.fill();
        break;
      case "Goggles":
        ctx.fillStyle = "#1a1a22"; ctx.fillRect(42, 37, 36, 12);
        ctx.fillStyle = "#ffc857";
        ctx.beginPath(); ctx.arc(52, 43, 4.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(68, 43, 4.5, 0, Math.PI * 2); ctx.fill();
        break;
    }

    /* nose and mouth */
    ctx.strokeStyle = "rgba(0,0,0,0.35)"; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(60, 48); ctx.lineTo(58, 56); ctx.lineTo(61, 57); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(54, 64); ctx.quadraticCurveTo(60, 66 + (look.hair % 2), 66, 64); ctx.stroke();

    /* cheek implant line */
    ctx.strokeStyle = "#27e7ff"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(74, 52); ctx.lineTo(70, 60); ctx.stroke();

    /* frame */
    ctx.strokeStyle = "rgba(39,231,255,0.35)";
    ctx.strokeRect(0.5, 0.5, 119, 119);
    ctx.restore();
  }

  window.MapView = { LAYOUT, EDGES, neighbours, drawMap, hitTest };
  window.Portrait = { HAIR, EYES, JACKETS, SKINS, HAIR_COLOURS, drawPortrait };
})();
