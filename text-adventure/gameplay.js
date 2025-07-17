// --- Gameplay logic ---
import { render, renderStats, renderCharacterVisual, showFatalError, setSceneSafe } from './engine/engine.js';
import { mainLocations, cityMap, cityLayout, itemDefs, uniqueItems, subNames, scenes, itemHints, questDescriptions } from './story.js';
export let player = {
  hp: 20,
  maxHp: 20,
  credits: 10,
  inventory: [],
  vehicle: null,
  speed: 1,
  bodyParts: {
    head: { hp: 5, maxHp: 5, armor: 0 },
    torso: { hp: 8, maxHp: 8, armor: 0 },
    leftArm: { hp: 3, maxHp: 3, armor: 0 },
    rightArm: { hp: 3, maxHp: 3, armor: 0 },
    leftLeg: { hp: 3, maxHp: 3, armor: 0 },
    rightLeg: { hp: 3, maxHp: 3, armor: 0 }
  },
  stats: {
    strength: 1,
    agility: 1,
    technical: 1,
    charisma: 1,
    perception: 1
  }
};
export let state = { scene: "alley" };
export let factions = {
  syndicate: 0,
  corp: 0,
  hackers: 0,
  scavengers: 0,
  police: 0,
  citizens: 0,
  cult: 0,
  mercs: 0,
};
export function updateQuests() {
  quests.packageDelivery.active = player.inventory.includes("Mystery Package");
  quests.packageDelivery.complete = !player.inventory.includes("Mystery Package") && quests.packageDelivery.active;
  quests.dataHeist.active = player.inventory.includes("Data Chip");
  quests.dataHeist.complete = !player.inventory.includes("Data Chip") && quests.dataHeist.active;
  quests.rareChipTrade.active = player.inventory.includes("Rare Chip");
  quests.corpEspionage.active = player.inventory.includes("Luxury Store Key");
  quests.corpEspionage.complete = player.inventory.includes("Prototype Cyberware") && quests.corpEspionage.active;
}
export let quests = {
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
export function showCharacterCreator(onComplete) {
  // Remove any existing overlay
  let old = document.getElementById('char-creator-overlay');
  if (old) old.remove();

  const stats = ["strength", "agility", "technical", "charisma", "perception"];
  let points = 10;
  let values = { strength: 1, agility: 1, technical: 1, charisma: 1, perception: 1 };
  points -= 5;
  let appearance = {
    hair: 0,
    color: 0,
    face: 0
  };
  const hairStyles = ["Short", "Mohawk", "Long", "Shaved", "Cyber Dreads"];
  const colors = ["#0ff", "#f0f", "#ff0", "#0f0", "#f00", "#00f"];
  const faces = ["Serious", "Smirk", "Scarred", "Masked", "Augmented"];

  let overlay = document.createElement('div');
  overlay.id = 'char-creator-overlay';
  overlay.style.position = 'fixed';
  overlay.style.left = 0;
  overlay.style.top = 0;
  overlay.style.width = '100vw';
  overlay.style.height = '100vh';
  overlay.style.background = 'rgba(10,10,30,0.98)';
  overlay.style.zIndex = 9999;
  overlay.style.display = 'flex';
  overlay.style.flexDirection = 'column';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.fontFamily = 'Orbitron, monospace';
  overlay.innerHTML = `
    <div style="background:#111;border:2px solid #0ff;border-radius:16px;padding:32px;min-width:340px;box-shadow:0 0 32px #0ff8;">
      <h2 style="color:#0ff;text-align:center;">Character Creation</h2>
      <div id="char-creator-avatar" style="display:flex;justify-content:center;align-items:center;margin-bottom:16px;"></div>
      <div id="char-creator-appearance" style="margin-bottom:24px;text-align:center;"></div>
      <div id="char-creator-stats" style="margin-bottom:24px;"></div>
      <div style="text-align:center;margin-bottom:12px;color:#fff;">Points left: <span id="char-creator-points">${points}</span></div>
      <button id="char-creator-confirm" style="background:#0ff;color:#111;font-weight:bold;padding:8px 24px;border-radius:8px;border:none;font-size:1.1em;box-shadow:0 0 8px #0ff8;cursor:pointer;">Start Game</button>
    </div>
  `;
  document.body.appendChild(overlay);

  function updateAvatar() {
    const avatar = document.getElementById('char-creator-avatar');
    if (!avatar) return;
    const seed = `${hairStyles[appearance.hair]}-${colors[appearance.color]}-${faces[appearance.face]}`;
    if (window.avatars && window.avatars.createAvatar && window.style) {
      const svg = window.avatars.createAvatar(window.style, { seed });
      avatar.innerHTML = svg;
    } else {
      avatar.innerHTML = '<div style="width:80px;height:80px;background:#222;color:#0ff;display:flex;align-items:center;justify-content:center;">Loading...</div>';
    }
  }

  function updateAppearanceUI() {
    const el = document.getElementById('char-creator-appearance');
    if (!el) return;
    el.innerHTML = `
      <div style="margin-bottom:8px;">
        <b style="color:#0ff;">Hair:</b> <span>${hairStyles[appearance.hair]}</span>
        <button style="margin-left:8px;" id="hair-prev">&#8592;</button>
        <button id="hair-next">&#8594;</button>
      </div>
      <div style="margin-bottom:8px;">
        <b style="color:#0ff;">Color:</b> <span style="color:${colors[appearance.color]}">●</span>
        <button style="margin-left:8px;" id="color-prev">&#8592;</button>
        <button id="color-next">&#8594;</button>
      </div>
      <div>
        <b style="color:#0ff;">Face:</b> <span>${faces[appearance.face]}</span>
        <button style="margin-left:8px;" id="face-prev">&#8592;</button>
        <button id="face-next">&#8594;</button>
      </div>
    `;
    document.getElementById('hair-prev').onclick = () => { appearance.hair = (appearance.hair + hairStyles.length - 1) % hairStyles.length; updateAppearanceUI(); updateAvatar(); };
    document.getElementById('hair-next').onclick = () => { appearance.hair = (appearance.hair + 1) % hairStyles.length; updateAppearanceUI(); updateAvatar(); };
    document.getElementById('color-prev').onclick = () => { appearance.color = (appearance.color + colors.length - 1) % colors.length; updateAppearanceUI(); updateAvatar(); };
    document.getElementById('color-next').onclick = () => { appearance.color = (appearance.color + 1) % colors.length; updateAppearanceUI(); updateAvatar(); };
    document.getElementById('face-prev').onclick = () => { appearance.face = (appearance.face + faces.length - 1) % faces.length; updateAppearanceUI(); updateAvatar(); };
    document.getElementById('face-next').onclick = () => { appearance.face = (appearance.face + 1) % faces.length; updateAppearanceUI(); updateAvatar(); };
  }

  function updateStatsUI() {
    const el = document.getElementById('char-creator-stats');
    if (!el) return;
    el.innerHTML = stats.map(stat => `
      <div style="margin-bottom:4px;">
        <b style="color:#0ff;">${stat.charAt(0).toUpperCase()+stat.slice(1)}:</b> <span id="stat-val-${stat}">${values[stat]}</span>
        <button id="stat-inc-${stat}" ${(points<=0||values[stat]>=10)?'disabled':''}>+</button>
        <button id="stat-dec-${stat}" ${(values[stat]<=1)?'disabled':''}>-</button>
      </div>
    `).join('');
    stats.forEach(stat => {
      document.getElementById(`stat-inc-${stat}`).onclick = () => {
        if (points > 0 && values[stat] < 10) { values[stat]++; points--; updateStatsUI(); updatePoints(); }
      };
      document.getElementById(`stat-dec-${stat}`).onclick = () => {
        if (values[stat] > 1) { values[stat]--; points++; updateStatsUI(); updatePoints(); }
      };
    });
  }
  function updatePoints() {
    let el = document.getElementById('char-creator-points');
    if (el) el.textContent = points;
  }

  updateAvatar();
  updateAppearanceUI();
  updateStatsUI();
  updatePoints();

  document.getElementById('char-creator-confirm').onclick = () => {
    if (points > 0) {
      alert('Please assign all points before starting the game.');
      return;
    }
    overlay.remove();
    player.stats = {};
    stats.forEach(stat => {
      player.stats[stat] = Math.max(1, Math.min(10, values[stat] || 1));
    });
    player.appearance = {
      hair: appearance.hair,
      color: appearance.color,
      face: appearance.face,
      seed: `${hairStyles[appearance.hair]}-${colors[appearance.color]}-${faces[appearance.face]}`
    };
    if (typeof onComplete === 'function') onComplete();
    setTimeout(() => {
      if (player.appearance && player.appearance.seed) {
        const charDiv = document.getElementById('character-visual');
        if (charDiv) charDiv.innerHTML = getDiceBearSVG(player.appearance.seed);
      }
    }, 0);
  };
  setTimeout(() => {
    if (player.appearance && player.appearance.seed) {
      const charDiv = document.getElementById('character-visual');
      if (charDiv) charDiv.innerHTML = getDiceBearSVG(player.appearance.seed);
    }
  }, 0);
}
// ...existing code for inventory update, stat checks, and global variables...

// Example gameplay helper: update inventory visuals
export function updateInventoryVisual() {
  const invDiv = document.getElementById('inventory-visual');
  if (!invDiv) return;
  invDiv.innerHTML = player.inventory.map(item => `<div style="color:#0ff;margin-bottom:4px;">${item}</div>`).join('');
}

// Example stat check helper
export function statCheck(stat, value) {
  return (player.stats[stat] || 0) >= value;
}