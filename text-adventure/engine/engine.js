import {
  player,
  state,
  updateQuests,
  showCharacterCreator,
} from "../gameplay.js";
import {
  mainLocations,
  cityMap,
  cityLayout,
  itemDefs,
  uniqueItems,
  subNames,
  scenes,
  itemHints,
  questDescriptions,
} from "../story.js";

// --- Expandable stubs for unused imports from story.js ---
export function useMainLocations() {
  return mainLocations;
}
export function useCityMap() {
  return cityMap;
}
export function useCityLayout() {
  return cityLayout;
}
export function useItemDefs() {
  return itemDefs;
}
export function useUniqueItems() {
  return uniqueItems;
}
export function useSubNames() {
  return subNames;
}
export function useScenes() {
  return scenes;
}
export function useItemHints() {
  return itemHints;
}
export function useQuestDescriptions() {
  return questDescriptions;
}
import { showModal, showNotification, animateButton } from "./ui.js";
import { drawCityMap, getLocationCoords, movePlayer } from "./map.js";
import { playSound, playMusic, stopMusic } from "./audio.js";
import { randomInt, clamp, formatText } from "./utils.js";
import { saveGame, loadGame, clearSave } from "./save.js";
import { addInputListeners, handleKeyPress } from "./input.js";
import { preloadImages, getAsset } from "./assets.js";

// --- Initialization logic moved from deprecated game.js ---
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

// --- Expandable stubs for unused imports ---
export function showSampleModal() {
  showModal(
    "Sample Modal",
    "This is a placeholder modal for future expansion."
  );
}

export function notifySampleEvent() {
  showNotification("Sample notification triggered.");
}

export function animateSampleButton(btn) {
  animateButton(btn);
}

export function drawSampleCityMap() {
  drawCityMap(cityLayout);
}

export function getSampleLocationCoords(location) {
  return getLocationCoords(location);
}

export function movePlayerSample(location) {
  movePlayer(location);
}

export function playSampleSound() {
  playSound("sample.mp3");
}

export function playSampleMusic() {
  playMusic("sample-music.mp3");
}

export function stopSampleMusic() {
  stopMusic();
}

export function getRandomSampleInt() {
  return randomInt(1, 10);
}

export function clampSampleValue(val) {
  return clamp(val, 0, 100);
}

export function formatSampleText(txt) {
  return formatText(txt);
}

export function saveSampleGame() {
  saveGame();
}

export function loadSampleGame() {
  loadGame();
}

export function clearSampleSave() {
  clearSave();
}

export function handleSampleKeyPress(e) {
  handleKeyPress(e);
}

export function preloadSampleImages(imgArr, cb) {
  preloadImages(imgArr, cb);
}

export function getSampleAsset(name) {
  return getAsset(name);
}

// Main entry point for ES6 modules
export function startGame() {
  try {
    showCharacterCreator(() => {
      render();
      addInputListeners();
      // Optionally preload assets, play music, etc.
      // preloadImages([...], () => {});
      // playMusic('assets/music.mp3');
    });
  } catch (e) {
    showFatalError("Failed to start character creator: " + e.message);
    console.error(e);
  }
}

window.addEventListener("DOMContentLoaded", () => {
  // Defensive: check for required DOM elements before starting
  const requiredIds = [
    "map-canvas",
    "story",
    "choices",
    "stats",
    "character-panel",
    "character-visual",
    "character-stats",
    "inventory-visual",
  ];
  let missing = requiredIds.filter((id) => !document.getElementById(id));
  if (missing.length) {
    showFatalError("Missing required UI elements: " + missing.join(", "));
    return;
  }
  try {
    startGame();
  } catch (e) {
    showFatalError("Game failed to start: " + e.message);
    console.error(e);
  }
});

// --- Helper: Validate and set scene safely ---
export function setSceneSafe(nextScene) {
  if (typeof nextScene === "function") nextScene = nextScene();
  if (nextScene && scenes[nextScene]) {
    state.scene = nextScene;
  } else {
    // fallback to alley or a safe default
    state.scene = "alley";
    console.warn("[SCENE] Invalid scene transition, falling back to alley.");
  }
}

// --- Render Stats (only show valid stats) ---
export function renderStats() {
  const statsDiv = document.getElementById("character-stats");
  if (!statsDiv) return;
  let html = '<h3 style="color:#0ff;margin-bottom:4px;">Body Health</h3>';
  html += `<div>Head: ${player.bodyParts.head.hp}/${
    player.bodyParts.head.maxHp
  } (Armor: ${player.bodyParts.head.armor || 0})</div>`;
  html += `<div>Torso: ${player.bodyParts.torso.hp}/${
    player.bodyParts.torso.maxHp
  } (Armor: ${player.bodyParts.torso.armor || 0})</div>`;
  html += `<div>Left Arm: ${player.bodyParts.leftArm.hp}/${
    player.bodyParts.leftArm.maxHp
  } (Armor: ${player.bodyParts.leftArm.armor || 0})</div>`;
  html += `<div>Right Arm: ${player.bodyParts.rightArm.hp}/${
    player.bodyParts.rightArm.maxHp
  } (Armor: ${player.bodyParts.rightArm.armor || 0})</div>`;
  html += `<div>Left Leg: ${player.bodyParts.leftLeg.hp}/${
    player.bodyParts.leftLeg.maxHp
  } (Armor: ${player.bodyParts.leftLeg.armor || 0})</div>`;
  html += `<div>Right Leg: ${player.bodyParts.rightLeg.hp}/${
    player.bodyParts.rightLeg.maxHp
  } (Armor: ${player.bodyParts.rightLeg.armor || 0})</div>`;
  html += '<h3 style="color:#0ff;margin:8px 0 4px 0;">Stats</h3>';
  const statList = [
    "strength",
    "agility",
    "technical",
    "charisma",
    "perception",
  ];
  for (const stat of statList) {
    html += `<div>${stat.charAt(0).toUpperCase() + stat.slice(1)}: ${
      player.stats[stat] || 1
    }</div>`;
  }
  statsDiv.innerHTML = html;
}

// --- DiceBear Avatar Helpers (global scope) ---
export function getDiceBearSVG(seed) {
  // Use DiceBear pixel-art style (window.pixelArt from CDN)
  if (window.avatars && window.pixelArt) {
    // Generate SVG and increase its size
    let svg = window.avatars.createAvatar(window.pixelArt, { seed });
    // Enlarge SVG by changing width/height attributes (default is 64)
    svg = svg.replace("<svg", '<svg width="180" height="180"');
    return svg;
  }
  return '<div style="width:180px;height:180px;background:#222;color:#0ff;display:flex;align-items:center;justify-content:center;">Loading...</div>';
}

export function renderCharacterVisual() {
  const charDiv = document.getElementById("character-visual");
  if (!charDiv) return;
  let seed = player.appearance && player.appearance.seed;
  // Defensive: check for undefined variables before using them
  if (
    !seed &&
    typeof appearance !== "undefined" &&
    typeof hairStyles !== "undefined" &&
    typeof colors !== "undefined" &&
    typeof faces !== "undefined" &&
    appearance.hair !== undefined &&
    appearance.color !== undefined &&
    appearance.face !== undefined
  ) {
    seed = `${hairStyles[appearance.hair]}-${colors[appearance.color]}-${
      faces[appearance.face]
    }`;
  }
  if (seed) {
    charDiv.innerHTML = getDiceBearSVG(seed);
  } else {
    charDiv.innerHTML = "";
  }
}

export function showFatalError(msg) {
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

// --- Engine logic ---
export function render() {
  updateQuests();
  let scene = scenes[state.scene];
  if (!scene) {
    scene = {
      text: `You wander into an undefined part of the city. It's eerily quiet.`,
      choices: [{ text: "Return to alley", next: "alley" }],
    };
  }
  if (scene && typeof scene.effect === "function") {
    try {
      scene.effect();
    } catch (e) {
      console.error("Error in scene.effect:", e);
    }
  }
  let animPos = cityMap[state.scene];
  if (animPos) {
    window._playerAnim = { x: animPos.x, y: animPos.y };
  }
  // Defensive: check all DOM elements before using
  const canvas = document.getElementById("map-canvas");
  const storyElement = document.getElementById("story");
  const choicesElement = document.getElementById("choices");
  const statsElement = document.getElementById("stats");
  let charPanel = document.getElementById("character-panel");
  if (!charPanel) {
    charPanel = document.createElement("div");
    charPanel.id = "character-panel";
    charPanel.style.margin = "18px 0 0 0";
    charPanel.style.padding = "16px";
    charPanel.style.background =
      "linear-gradient(90deg,#181828 60%,#0ff2 100%)";
    charPanel.style.borderRadius = "12px";
    charPanel.style.boxShadow = "0 0 12px #0ff, 0 0 24px #f0f";
    charPanel.style.fontFamily = "Orbitron, Segoe UI, sans-serif";
    charPanel.style.fontWeight = "bold";
    charPanel.style.color = "#fff";
    // Defensive: get player stats and body parts
    const bp = player.bodyParts;
    const stat = player.stats;
    charPanel.innerHTML = `
    <div style="display:flex;flex-wrap:wrap;gap:18px;align-items:flex-start;">
      <div style="min-width:160px;">
        <span style='font-size:1.1em;color:#0ff;'>Body Health</span><br>
        <span>Head: <span style='color:#f0f'>${bp.head.hp}</span>/${
      bp.head.maxHp
    } (Armor: ${bp.head.armor || 0})</span><br>
        <span>Torso: <span style='color:#f0f'>${bp.torso.hp}</span>/${
      bp.torso.maxHp
    } (Armor: ${bp.torso.armor || 0})</span><br>
        <span>Left Arm: <span style='color:#f0f'>${bp.leftArm.hp}</span>/${
      bp.leftArm.maxHp
    } (Armor: ${bp.leftArm.armor || 0})</span><br>
        <span>Right Arm: <span style='color:#f0f'>${bp.rightArm.hp}</span>/${
      bp.rightArm.maxHp
    } (Armor: ${bp.rightArm.armor || 0})</span><br>
        <span>Left Leg: <span style='color:#f0f'>${bp.leftLeg.hp}</span>/${
      bp.leftLeg.maxHp
    } (Armor: ${bp.leftLeg.armor || 0})</span><br>
        <span>Right Leg: <span style='color:#f0f'>${bp.rightLeg.hp}</span>/${
      bp.rightLeg.maxHp
    } (Armor: ${bp.rightLeg.armor || 0})</span>
      </div>
      <div style="min-width:120px;">
        <span style='font-size:1.1em;color:#0ff;'>Stats</span><br>
        <span>Strength: <span style='color:#f0f'>${
          stat.strength || 1
        }</span></span><br>
        <span>Agility: <span style='color:#f0f'>${
          stat.agility || 1
        }</span></span><br>
        <span>Technical: <span style='color:#f0f'>${
          stat.technical || 1
        }</span></span><br>
        <span>Charisma: <span style='color:#f0f'>${
          stat.charisma || 1
        }</span></span><br>
        <span>Perception: <span style='color:#f0f'>${
          stat.perception || 1
        }</span></span>
      </div>
    </div>
  `;
    if (!canvas || !storyElement || !choicesElement || !statsElement) {
      if (storyElement) {
        storyElement.innerHTML =
          '<span style="color:#f00">Game failed to load: missing UI element</span>';
      }
      return;
    }
    // --- City Map Redesign ---
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.globalAlpha = 0.13;
    for (let gx = 0; gx <= 400; gx += 40) {
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, 300);
      ctx.strokeStyle = "#0ff2";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    for (let gy = 0; gy <= 300; gy += 30) {
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(400, gy);
      ctx.strokeStyle = "#0ff2";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    ctx.restore();
    let showMain = true;
    let showSubs = [];
    let mainLoc = null;
    if (mainLocations.includes(state.scene)) {
      showMain = false;
      mainLoc = state.scene;
      for (let j = 1; j <= 5; j++) {
        showSubs.push(`${mainLoc}_sub${j}`);
      }
    }
    if (showMain) {
      mainLocations.forEach((loc) => {
        const pos = cityMap[loc];
        ctx.save();
        ctx.beginPath();
        ctx.rect(pos.x - 22, pos.y - 22, 44, 44);
        ctx.fillStyle = loc === state.scene ? "#f0f" : "#222";
        ctx.shadowColor = loc === state.scene ? "#f0f" : "#0ff";
        ctx.shadowBlur = loc === state.scene ? 24 : 12;
        ctx.globalAlpha = 0.92;
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = "#0ff";
        ctx.stroke();
        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, 2 * Math.PI);
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
        ctx.font = "bold 14px Orbitron, Segoe UI";
        ctx.fillStyle = "#fff";
        ctx.shadowColor = "#0ff";
        ctx.shadowBlur = 4;
        ctx.fillText(loc.replace(/_/g, " "), pos.x - 28, pos.y + 32);
        ctx.restore();
      });
    }
  }
}
