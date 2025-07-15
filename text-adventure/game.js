console.log("game.js loaded");

window.onerror = function (message, source, lineno, colno, error) {
  console.error(
    "Game error:",
    message,
    "at",
    source,
    lineno + ":" + colno,
    error
  );
};
// Map scene names to canvas coordinates for player dot
// Legacy areaPositions for reference (not used in main logic)
const areaPositions = {
  alley: { x: 200, y: 150 },
  market: { x: 80, y: 70 },
  club: { x: 320, y: 70 },
  plaza: { x: 80, y: 230 },
  docks: { x: 320, y: 230 },
  underground: { x: 40, y: 280 },
  rooftops: { x: 360, y: 40 },
  shop: { x: 200, y: 70 },
  cybercafe: { x: 200, y: 100 },
  performer: { x: 200, y: 130 },
  luxury_store: { x: 320, y: 100 },
  food_stall: { x: 80, y: 100 },
  boat_captain: { x: 360, y: 280 },
  outskirts: { x: 360, y: 150 },
  bunker: { x: 360, y: 180 },
  cyber_wolf: { x: 360, y: 200 },
  fisherman: { x: 320, y: 280 },
  dealer: { x: 80, y: 280 },
  container: { x: 120, y: 280 },
  mystery_box: { x: 160, y: 280 },
  terminal: { x: 120, y: 230 },
  figure: { x: 160, y: 230 },
};

// Update getPlayerCanvasPos to use areaPositions
function getPlayerCanvasPos() {
  console.debug("getPlayerCanvasPos called", state.scene);
  let pos = cityMap[state.scene];
  if (!pos) pos = { x: 200, y: 150 };
  return pos;
}
// Simple Text Adventure RPG
// 2D map grid for city layout
const mapGrid = [
  ["alley", "market", "club", "plaza", "docks"],
  ["underground", "black_market", "hacker_den", "locked_door", "rooftops"],
  ["food_stall", "cybercafe", "shop", "performer", "luxury_store"],
  ["boat_captain", "outskirts", "bunker", "cyber_wolf", "fisherman"],
  ["dealer", "container", "mystery_box", "terminal", "figure"],
];

// Faction reputation system
let player = {
  hp: 20,
  maxHp: 20,
  credits: 10,
  inventory: [],
  vehicle: null,
  speed: 1,
  x: 2,
  y: 2,
};
let state = { scene: "start" };
// Define city locations, types, and coordinates at top level
// 12 main locations, each with 5 sub-locations
const mainLocations = [
  "alley",
  "market",
  "club",
  "plaza",
  "docks",
  "rooftops",
  "underground",
  "cybercafe",
  "luxury_store",
  "outskirts",
  "bunker",
  "terminal",
];
const cityMap = {};
mainLocations.forEach((main, i) => {
  cityMap[main] = {
    x: 80 + (i % 4) * 100,
    y: 80 + Math.floor(i / 4) * 100,
    type: "main",
  };
  for (let j = 1; j <= 5; j++) {
    const sub = `${main}_sub${j}`;
    cityMap[sub] = {
      x: cityMap[main].x + j * 12,
      y: cityMap[main].y + j * 12,
      type: "sub",
      parent: main,
    };
  }
});

// 120 items with stat/appearance/task effects
const itemDefs = {};
const statTypes = [
  "hp",
  "maxHp",
  "speed",
  "credits",
  "strength",
  "hacking",
  "stealth",
  "reputation",
];
for (let i = 1; i <= 120; i++) {
  const stat = statTypes[i % statTypes.length];
  itemDefs[`Item${i}`] = {
    name: `Item${i}`,
    effect: function (player) {
      player[stat] = (player[stat] || 0) + ((i % 7) + 1);
    },
    appearance: `item${i}_sprite.png`,
    description: `A cyberpunk item that boosts your ${stat}.`,
    unlocks: i % 10 === 0 ? `task${i}` : null,
  };
}

let factions = {
  syndicate: 0, // Street gang
  corp: 0, // Megacorporation
  hackers: 0, // Hacker collective
  scavengers: 0, // Tech scavengers
  police: 0, // City police
  citizens: 0, // General population
  cult: 0, // Cyber-cult
  mercs: 0, // Mercenaries
};
// Quest system
function updateQuests() {
  // Example quest logic
  quests.packageDelivery.active = player.inventory.includes("Mystery Package");
  quests.packageDelivery.complete =
    !player.inventory.includes("Mystery Package") &&
    quests.packageDelivery.active;
  quests.dataHeist.active = player.inventory.includes("Data Chip");
  quests.dataHeist.complete =
    !player.inventory.includes("Data Chip") && quests.dataHeist.active;
  quests.rareChipTrade.active = player.inventory.includes("Rare Chip");
  quests.corpEspionage.active = player.inventory.includes("Luxury Store Key");
  quests.corpEspionage.complete =
    player.inventory.includes("Prototype Cyberware") &&
    quests.corpEspionage.active;
}
let quests = {
  packageDelivery: {
    active: false,
    complete: false,
    desc: "Deliver the Mystery Package to the docks or bunker.",
    reward: () => {
      player.credits += 30;
      factions.citizens += 2;
    },
  },
  dataHeist: {
    active: false,
    complete: false,
    desc: "Steal the Data Chip from the club and deliver it to the plaza figure.",
    reward: () => {
      player.credits += 50;
      factions.hackers += 3;
    },
  },
  rareChipTrade: {
    active: false,
    complete: false,
    desc: "Find a hacker interested in the Rare Chip.",
    reward: () => {
      player.credits += 40;
      factions.hackers += 2;
    },
  },
  corpEspionage: {
    active: false,
    complete: false,
    desc: "Infiltrate the luxury store and steal the prototype cyberware.",
    reward: () => {
      player.inventory.push("Prototype Cyberware");
    },
  },
};

// Generate scenes for all main and sub locations
let scenes = {};
mainLocations.forEach((main) => {
  scenes[main] = {
    text: `You arrive at the ${main}. What will you do?`,
    choices: [
      ...Array(5)
        .fill(0)
        .map((_, i) => ({
          text: `Explore sub-location ${i + 1}`,
          next: `${main}_sub${i + 1}`,
        })),
      { text: "Check inventory", action: () => render() },
      { text: "Return to alley", next: "alley" },
    ],
  };
  for (let j = 1; j <= 5; j++) {
    const sub = `${main}_sub${j}`;
    scenes[sub] = {
      text: `You are at ${main}'s sub-location ${j}. You find an item!`,
      choices: [
        {
          text: (() => {
            let idx = j + mainLocations.indexOf(main) * 10;
            if (idx < 1) idx = 1;
            if (idx > 120) idx = 120;
            return `Pick up Item${idx}`;
          })(),
          action: () => {
            let idx = j + mainLocations.indexOf(main) * 10;
            if (idx < 1) idx = 1;
            if (idx > 120) idx = 120;
            const itemName = `Item${idx}`;
            if (!player.inventory.includes(itemName) && itemDefs[itemName]) {
              player.inventory.push(itemName);
              if (
                itemDefs[itemName] &&
                typeof itemDefs[itemName].effect === "function"
              ) {
                try {
                  itemDefs[itemName].effect(player);
                } catch (e) {
                  console.error("Error applying item effect:", itemName, e);
                }
              }
            }
            render();
          },
        },
        { text: "Return to main location", next: main },
      ],
    };
  }
});

function render() {
  const prevScene = window._prevScene || null;
  updateQuests();
  let scene = scenes[state.scene];
  if (!scene) {
    console.error(`[RENDER] Invalid scene: ${state.scene}, reverting to fallback`);
    // Fallback scene definition
    scene = {
      text: `You wander into an undefined part of the city. It's eerily quiet.`,
      choices: [
        { text: "Return to alley", next: "alley" },
        { text: "Check inventory", action: () => render() }
      ]
    };
    // Optionally reset to a known scene
    // state.scene = "alley";
  }
  if (scene && typeof scene.effect === 'function') {
    try {
      scene.effect();
    } catch (e) {
      console.error('Error in scene.effect:', e);
    }
  }
  // Reset player animation position if scene changed
  let animPos = cityMap[state.scene];
  if (animPos) {
    window._playerAnim = { x: animPos.x, y: animPos.y };
  }
  // Log all game state details
  console.debug(`[RENDER] Scene: ${state.scene} (Prev: ${prevScene})`);
  console.debug(
    `[PLAYER] Pos: (${player.x},${player.y}) | HP: ${player.hp}/${
      player.maxHp
    } | Credits: ${player.credits} | Vehicle: ${
      player.vehicle || "On foot"
    } | Speed: ${player.speed}`
  );
  console.debug(`[PLAYER] Inventory: ${JSON.stringify(player.inventory)}`);
  // Quests
  Object.entries(quests).forEach(([q, obj]) => {
    console.debug(
      `[QUEST] ${q}: active=${obj.active}, complete=${obj.complete}, desc="${obj.desc}"`
    );
  });
  // Factions
  Object.entries(factions).forEach(([f, val]) => {
    console.debug(`[FACTION] ${f}: ${val}`);
  });
  // Choices
  if (scene && Array.isArray(scene.choices) && scene.choices.length) {
    console.debug(
      `[CHOICES] Available: ${scene.choices.map((c) => c.text).join(", ")}`
    );
  } else {
    console.debug(`[CHOICES] None available`);
  }
  // Track inventory changes
  if (!window._prevInventory) window._prevInventory = [];
  const invDiff = player.inventory.filter(
    (i) => !window._prevInventory.includes(i)
  );
  if (invDiff.length) {
    console.debug(`[INVENTORY] Added: ${JSON.stringify(invDiff)}`);
  }
  const invLost = window._prevInventory.filter(
    (i) => !player.inventory.includes(i)
  );
  if (invLost.length) {
    console.debug(`[INVENTORY] Removed: ${JSON.stringify(invLost)}`);
  }
  window._prevInventory = [...player.inventory];
  window._prevScene = state.scene;
  // Defensive: check all DOM elements before using
  const canvas = document.getElementById("map-canvas");
  const storyElement = document.getElementById("story");
  const choicesElement = document.getElementById("choices");
  const statsElement = document.getElementById("stats");
  if (!canvas || !storyElement || !choicesElement || !statsElement) {
    console.log("[DEBUG] Missing UI element(s)");
    if (storyElement) {
      storyElement.innerHTML =
        '<span style="color:#f00">Game failed to load: missing UI element</span>';
    }
    return;
  }
  console.log("[DEBUG] All UI elements found");
  // Enhanced bird's-eye city map with icons, colors, neon background
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  console.log("[DEBUG] Canvas cleared");
  // Neon city background
  ctx.save();
  ctx.globalAlpha = 0.18;
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    ctx.arc(
      200 + Math.sin(i) * 120,
      150 + Math.cos(i) * 90,
      80 + i * 8,
      0,
      2 * Math.PI
    );
    ctx.fillStyle = i % 2 ? "#0ff" : "#f0f";
    ctx.shadowColor = i % 2 ? "#0ff" : "#f0f";
    ctx.shadowBlur = 40;
    ctx.fill();
  }
  ctx.restore();
  // Draw roads (connections)
  const connections = [
    ["alley", "market"],
    ["alley", "club"],
    ["alley", "plaza"],
    ["alley", "docks"],
    ["market", "shop"],
    ["market", "food_stall"],
    ["market", "cybercafe"],
    ["market", "performer"],
    ["club", "luxury_store"],
    ["club", "performer"],
    ["plaza", "terminal"],
    ["plaza", "figure"],
    ["plaza", "luxury_store"],
    ["docks", "boat_captain"],
    ["docks", "fisherman"],
    ["docks", "dealer"],
    ["docks", "container"],
    ["docks", "mystery_box"],
    ["underground", "market"],
    ["rooftops", "club"],
    ["outskirts", "bunker"],
    ["outskirts", "cyber_wolf"],
    ["shop", "cybercafe"],
    ["performer", "luxury_store"],
    ["food_stall", "market"],
    ["dealer", "container"],
    ["container", "mystery_box"],
    ["mystery_box", "fisherman"],
  ];
  ctx.save();
  ctx.strokeStyle = "#444";
  ctx.lineWidth = 4;
  connections.forEach(([a, b]) => {
    const p1 = cityMap[a],
      p2 = cityMap[b];
    if (p1 && p2) {
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
  });
  ctx.restore();
  // --- Animated player movement ---
  let defaultPos = { x: 200, y: 150 };
  let scenePos = cityMap[state.scene] || defaultPos;
  if (!window._playerAnim)
    window._playerAnim = { x: scenePos.x, y: scenePos.y };
  let target = scenePos;
  let anim = window._playerAnim;
  // Animate position towards target
  anim.x += (target.x - anim.x) * 0.3;
  anim.y += (target.y - anim.y) * 0.3;
  if (Math.abs(anim.x - target.x) < 1) anim.x = target.x;
  if (Math.abs(anim.y - target.y) < 1) anim.y = target.y;
  // --- Draw locations with icons, colors, and quest highlighting ---
  Object.entries(cityMap).forEach(([loc, pos]) => {
    ctx.save();
    // Highlight quest objectives
    let isQuest = pos.type === "quest";
    let fill, glow;
    if (pos.type === "shop") {
      fill = "#0ff";
      glow = "#0ff";
    } else if (pos.type === "danger") {
      fill = "#f00";
      glow = "#f00";
    } else if (pos.type === "quest") {
      fill = "#ff0";
      glow = "#ff0";
    } else if (pos.type === "special") {
      fill = "#0f0";
      glow = "#0f0";
    } else {
      fill = "#222";
      glow = "#fff";
    }
    // Icon shape by type
    if (pos.type === "shop") {
      ctx.beginPath();
      ctx.rect(pos.x - 14, pos.y - 14, 28, 28);
    } else if (pos.type === "danger") {
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 18, 0, 2 * Math.PI);
    } else if (pos.type === "quest") {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y - 18);
      ctx.lineTo(pos.x + 18, pos.y + 18);
      ctx.lineTo(pos.x - 18, pos.y + 18);
      ctx.closePath();
    } else if (pos.type === "special") {
      ctx.beginPath();
      ctx.ellipse(pos.x, pos.y, 18, 12, 0, 0, 2 * Math.PI);
    } else {
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 18, 0, 2 * Math.PI);
    }
    ctx.fillStyle = loc === state.scene ? "#f0f" : fill;
    ctx.shadowColor = loc === state.scene ? "#f0f" : glow;
    ctx.shadowBlur = loc === state.scene ? 24 : isQuest ? 18 : 12;
    ctx.globalAlpha = isQuest ? 0.95 : 0.85;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = glow;
    ctx.stroke();
    // Draw icon (simple cyberpunk glyph)
    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.globalAlpha = 0.7;
    if (pos.type === "shop") {
      ctx.beginPath();
      ctx.moveTo(-8, 0);
      ctx.lineTo(8, 0);
      ctx.moveTo(0, -8);
      ctx.lineTo(0, 8);
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.stroke();
    } else if (pos.type === "danger") {
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, 2 * Math.PI);
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-8, -8);
      ctx.lineTo(8, 8);
      ctx.moveTo(8, -8);
      ctx.lineTo(-8, 8);
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1;
      ctx.stroke();
    } else if (pos.type === "quest") {
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(8, 8);
      ctx.lineTo(-8, 8);
      ctx.closePath();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.stroke();
    } else if (pos.type === "special") {
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, 2 * Math.PI);
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.restore();
    // Location label
    ctx.font = "bold 13px Orbitron, Segoe UI";
    ctx.fillStyle = "#fff";
    ctx.shadowColor = "#0ff";
    ctx.shadowBlur = 4;
    ctx.fillText(loc.replace(/_/g, " "), pos.x - 28, pos.y - 24);
    ctx.restore();
  });
  // --- Draw animated player dot ---
  ctx.save();
  ctx.beginPath();
  ctx.arc(anim.x, anim.y, 12, 0, 2 * Math.PI);
  ctx.fillStyle = "#0ff";
  ctx.shadowColor = "#0ff";
  ctx.shadowBlur = 16;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#fff";
  ctx.stroke();
  ctx.restore();
  // --- Tooltips on hover ---
  canvas.onmousemove = function (e) {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    let found = null;
    Object.entries(cityMap).forEach(([loc, pos]) => {
      let dx = mx - pos.x,
        dy = my - pos.y;
      if (Math.sqrt(dx * dx + dy * dy) < 22) found = { loc, pos };
    });
    let tip = document.getElementById("map-tooltip");
    if (!tip) {
      tip = document.createElement("div");
      tip.id = "map-tooltip";
      tip.style.position = "absolute";
      tip.style.pointerEvents = "none";
      tip.style.zIndex = 1000;
      tip.style.background = "rgba(20,20,40,0.95)";
      tip.style.color = "#0ff";
      tip.style.fontFamily = "Orbitron, Segoe UI, sans-serif";
      tip.style.fontWeight = "bold";
      tip.style.padding = "8px 16px";
      tip.style.borderRadius = "10px";
      tip.style.boxShadow = "0 0 16px #0ff, 0 0 32px #f0f";
      document.body.appendChild(tip);
    }
    if (found) {
      tip.textContent = found.loc.replace(/_/g, " ");
      tip.style.left = e.clientX + 12 + "px";
      tip.style.top = e.clientY - 12 + "px";
      tip.style.display = "block";
    } else {
      tip.style.display = "none";
    }
  };
  canvas.onmouseleave = function () {
    let tip = document.getElementById("map-tooltip");
    if (tip) tip.style.display = "none";
  };
  // --- Animate ---
  if (anim.x !== target.x || anim.y !== target.y) setTimeout(render, 16);
  // Show story text
  storyElement.innerHTML =
    typeof scene.text === "function" ? scene.text() : scene.text;
  console.log("[DEBUG] Story updated");
  choicesElement.innerHTML = "";
  console.log("[DEBUG] Choices cleared");
  // Scene choices
  let choices = [...scene.choices];
  choices.forEach((choice) => {
    if (!choice) return;
    if (choice.condition && !choice.condition()) return;
    const btn = document.createElement("button");
    btn.textContent = choice.text;
    btn.onclick = () => {
      state.scene =
        typeof choice.next === "function" ? choice.next() : choice.next;
      render();
    };
    choicesElement.appendChild(btn);
  });
  // Vehicle display
  let vehicleText = player.vehicle
    ? `Vehicle: ${player.vehicle} (Speed: ${player.speed})`
    : "On foot";
  statsElement.innerHTML = `HP: ${player.hp}/${player.maxHp} | Credits: ${player.credits} | ${vehicleText}`;
  console.log("[DEBUG] Stats updated");

  // Inventory visual update with hint button
  const inventoryPanel = document.getElementById("inventory-visual");
  if (inventoryPanel) {
    inventoryPanel.innerHTML = "";
    if (player.inventory.length === 0) {
      inventoryPanel.innerHTML =
        '<span style="color:#888">Inventory empty</span>';
    } else {
      player.inventory.forEach((item) => {
        const itemDiv = document.createElement("div");
        itemDiv.textContent = item;
        itemDiv.style.padding = "6px 12px";
        itemDiv.style.margin = "4px";
        itemDiv.style.background = "linear-gradient(90deg,#0ff2,#f0f2)";
        itemDiv.style.color = "#222";
        itemDiv.style.borderRadius = "8px";
        itemDiv.style.fontFamily = "Orbitron, Segoe UI, sans-serif";
        itemDiv.style.fontWeight = "bold";
        itemDiv.style.boxShadow = "0 0 8px #0ff, 0 0 16px #f0f";
        // Add hint button
        const hintBtn = document.createElement("button");
        hintBtn.textContent = "Get Hint";
        hintBtn.style.marginLeft = "12px";
        hintBtn.style.background =
          "linear-gradient(90deg,#222 60%, #0ff2 100%)";
        hintBtn.style.color = "#0ff";
        hintBtn.style.border = "2px solid #0ff";
        hintBtn.style.borderRadius = "8px";
        hintBtn.style.fontFamily = "Orbitron, Segoe UI, sans-serif";
        hintBtn.style.fontWeight = "bold";
        hintBtn.style.cursor = "pointer";
        hintBtn.onclick = () => {
          alert(itemHints[item] || "No hint available for this item.");
        };
        itemDiv.appendChild(hintBtn);
        inventoryPanel.appendChild(itemDiv);
      });
    }
  }

  if (player.hp <= 0 && state.scene !== "game_over") {
    state.scene = "game_over";
    render();
    return;
  }

  // Game over scene handling
  if (state.scene === "game_over") {
    storyElement.innerHTML =
      '<span style="color:#f00;font-size:1.5em;text-shadow:0 0 8px #f00;">GAME OVER</span><br>You have died.';
    choicesElement.innerHTML = "";
    const restartBtn = document.createElement("button");
    restartBtn.textContent = "Restart";
    restartBtn.onclick = () => {
      // Reset player and state
      player.hp = 20;
      player.maxHp = 20;
      player.credits = 10;
      player.inventory = [];
      player.vehicle = null;
      player.speed = 1;
      player.x = 2;
      player.y = 2;
      state.scene = "start";
      state.gangHp = 18;
      state.wolfHp = 20;
      render();
    };
    choicesElement.appendChild(restartBtn);
    statsElement.innerHTML = "";
    // Clear inventory visual
    const inventoryPanel = document.getElementById("inventory-visual");
    if (inventoryPanel) inventoryPanel.innerHTML = "";
    return;
  }
}
function movePlayer(dx, dy) {
  console.debug("movePlayer called", dx, dy);
  const newX = player.x + dx;
  const newY = player.y + dy;
  // Ensure player stays within bounds
  if (
    newX >= 0 &&
    newX < mapGrid[0].length &&
    newY >= 0 &&
    newY < mapGrid.length
  ) {
    player.x = newX;
    player.y = newY;
  }
  render();
}
window.movePlayer = movePlayer;
console.debug("movePlayer assigned to window");

// Initialize gang HP for combat
state.gangHp = 18;

function showFatalError(msg) {
  let story = document.getElementById("story");
  if (story) {
    story.innerHTML =
      '<span style="color:#f00;font-size:1.2em;">' + msg + "</span>";
  } else {
    // If #story is missing, add a visible error to the body
    let errDiv = document.createElement("div");
    errDiv.style.color = "#f00";
    errDiv.style.fontSize = "1.2em";
    errDiv.style.background = "#222";
    errDiv.style.padding = "24px";
    errDiv.style.textAlign = "center";
    errDiv.textContent = msg;
    document.body.appendChild(errDiv);
  }
}
document.addEventListener("DOMContentLoaded", () => {
  try {
    render();
  } catch (e) {
    showFatalError("Game failed to load: " + e.message);
  }
});
window.onload = function () {
  try {
    render();
  } catch (e) {
    showFatalError("Game failed to load: " + e.message);
  }
};

// Ensure game always initializes
try {
  render();
} catch (e) {
  showFatalError("Game failed to load: " + e.message);
}
