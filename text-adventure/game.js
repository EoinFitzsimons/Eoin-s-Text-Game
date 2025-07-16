// --- Helper: Validate and set scene safely ---
function setSceneSafe(nextScene) {
  if (typeof nextScene === 'function') nextScene = nextScene();
  if (nextScene && scenes[nextScene]) {
    state.scene = nextScene;
  } else {
    // fallback to alley or a safe default
    state.scene = 'alley';
    console.warn('[SCENE] Invalid scene transition, falling back to alley.');
  }
}
// --- Render Stats (only show valid stats) ---
function renderStats() {
  const statsDiv = document.getElementById('character-stats');
  if (!statsDiv) return;
  let html = '<h3 style="color:#0ff;margin-bottom:4px;">Body Health</h3>';
  html += `<div>Head: ${player.bodyParts.head.hp}/${player.bodyParts.head.maxHp} (Armor: ${player.bodyParts.head.armor||0})</div>`;
  html += `<div>Torso: ${player.bodyParts.torso.hp}/${player.bodyParts.torso.maxHp} (Armor: ${player.bodyParts.torso.armor||0})</div>`;
  html += `<div>Left Arm: ${player.bodyParts.leftArm.hp}/${player.bodyParts.leftArm.maxHp} (Armor: ${player.bodyParts.leftArm.armor||0})</div>`;
  html += `<div>Right Arm: ${player.bodyParts.rightArm.hp}/${player.bodyParts.rightArm.maxHp} (Armor: ${player.bodyParts.rightArm.armor||0})</div>`;
  html += `<div>Left Leg: ${player.bodyParts.leftLeg.hp}/${player.bodyParts.leftLeg.maxHp} (Armor: ${player.bodyParts.leftLeg.armor||0})</div>`;
  html += `<div>Right Leg: ${player.bodyParts.rightLeg.hp}/${player.bodyParts.rightLeg.maxHp} (Armor: ${player.bodyParts.rightLeg.armor||0})</div>`;
  html += '<h3 style="color:#0ff;margin:8px 0 4px 0;">Stats</h3>';
  const statList = ["strength", "agility", "technical", "charisma", "perception"];
  for (const stat of statList) {
    html += `<div>${stat.charAt(0).toUpperCase()+stat.slice(1)}: ${player.stats[stat]||1}</div>`;
  }
  statsDiv.innerHTML = html;
}
// --- DiceBear Avatar Helpers (global scope) ---
function getDiceBearSVG(seed) {
  // Use DiceBear pixel-art style (window.pixelArt from CDN)
  if (window.avatars && window.pixelArt) {
    // Generate SVG and increase its size
    let svg = window.avatars.createAvatar(window.pixelArt, { seed });
    // Enlarge SVG by changing width/height attributes (default is 64)
    svg = svg.replace('<svg', '<svg width="180" height="180"');
    return svg;
  }
  return '<div style="width:180px;height:180px;background:#222;color:#0ff;display:flex;align-items:center;justify-content:center;">Loading...</div>';
}

function renderCharacterVisual() {
  const charDiv = document.getElementById('character-visual');
  if (!charDiv) return;
  let seed = player.appearance && player.appearance.seed;
  if (!seed && typeof appearance !== 'undefined') {
    seed = `${hairStyles[appearance.hair]}-${colors[appearance.color]}-${faces[appearance.face]}`;
  }
  if (seed) {
    charDiv.innerHTML = getDiceBearSVG(seed);
  } else {
    charDiv.innerHTML = '';
  }
}
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

// Faction reputation system
let player = {
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
let state = { scene: "alley" };
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
// Hand-crafted, winding city layout for more organic feel
const cityLayout = {
  alley: { x: 60, y: 220 },
  market: { x: 120, y: 120 },
  club: { x: 320, y: 80 },
  plaza: { x: 220, y: 180 },
  docks: { x: 340, y: 260 },
  rooftops: { x: 260, y: 40 },
  underground: { x: 80, y: 270 },
  cybercafe: { x: 180, y: 110 },
  luxury_store: { x: 370, y: 130 },
  outskirts: { x: 390, y: 200 },
  bunker: { x: 60, y: 60 },
  terminal: { x: 200, y: 260 }
};
Object.entries(cityLayout).forEach(([main, pos]) => {
  cityMap[main] = { ...pos, type: "main" };
  // Sub-locations spiral or arc around their main
  for (let j = 1; j <= 5; j++) {
    const angle = (Math.PI * 2 * j) / 5 + (main.charCodeAt(0) % 10) * 0.2;
    const radius = 28 + 12 * (j % 2);
    const sub = `${main}_sub${j}`;
    cityMap[sub] = {
      x: pos.x + Math.cos(angle) * radius,
      y: pos.y + Math.sin(angle) * radius,
      type: "sub",
      parent: main
    };
  }
});

// 120 unique cyberpunk items with names, descriptions, and effects
const itemDefs = {};
const uniqueItems = [
  { name: "Neon Blade", description: "A glowing monomolecular blade. Boosts strength.", effect: p => p.strength = (p.strength||0)+2 },
  { name: "Holo Cloak", description: "A shimmering cloak that bends light. Boosts stealth.", effect: p => p.stealth = (p.stealth||0)+2 },
  { name: "Data Spike", description: "A hacking tool for breaking into terminals. Boosts hacking.", effect: p => p.hacking = (p.hacking||0)+2 },
  { name: "Stim Patch", description: "A quick-heal patch. Restores 5 HP.", effect: p => p.hp = Math.min(p.maxHp, (p.hp||0)+5) },
  { name: "Credit Chit", description: "A digital wallet loaded with credits.", effect: p => p.credits = (p.credits||0)+20 },
  { name: "EMP Grenade", description: "Disables electronics in a small radius. Useful for certain quests.", effect: p => {} },
  { name: "Rare Chip", description: "A mysterious microchip. Needed for a quest.", effect: p => {} },
  { name: "Prototype Cyberware", description: "Experimental cybernetic upgrade. Boosts max HP.", effect: p => p.maxHp = (p.maxHp||0)+3 },
  { name: "Nano Medkit", description: "Advanced medical kit. Fully restores HP.", effect: p => p.hp = p.maxHp },
  { name: "Street Map", description: "A digital map of the city. Reveals hidden locations.", effect: p => {} },
  { name: "Plasma Pistol", description: "A compact energy weapon. Boosts strength.", effect: p => p.strength = (p.strength||0)+1 },
  { name: "Camo Visor", description: "Augmented reality visor. Boosts stealth.", effect: p => p.stealth = (p.stealth||0)+1 },
  { name: "Encrypted Drive", description: "Contains valuable data. Needed for a quest.", effect: p => {} },
  { name: "Hacker's Deck", description: "Portable hacking rig. Boosts hacking.", effect: p => p.hacking = (p.hacking||0)+1 },
  { name: "Synth Ale", description: "Popular club drink. Restores 2 HP.", effect: p => p.hp = Math.min(p.maxHp, (p.hp||0)+2) },
  { name: "VIP Pass", description: "Grants access to exclusive areas.", effect: p => {} },
  { name: "Drone Parts", description: "Components for building a drone. Needed for crafting.", effect: p => {} },
  { name: "AI Core", description: "Artificial intelligence module. Needed for a quest.", effect: p => {} },
  { name: "Security Badge", description: "Lets you bypass some security doors.", effect: p => {} },
  { name: "Energy Cell", description: "Powers high-tech gear. Needed for some items.", effect: p => {} },
  { name: "Optic Enhancer", description: "Cybernetic eye upgrade. Boosts accuracy.", effect: p => p.stats.strength = (p.stats.strength||0)+1 },
  { name: "Reflex Booster", description: "Neural implant for faster reactions. Boosts stealth.", effect: p => p.stats.stealth = (p.stats.stealth||0)+1 },
  { name: "Memory Crystal", description: "Stores encrypted memories. Needed for a quest.", effect: p => {} },
  { name: "Street Doc's Kit", description: "Medical supplies from a street doctor. Restores 3 HP.", effect: p => p.hp = Math.min(p.maxHp, (p.hp||0)+3) },
  { name: "Smartgun Chip", description: "Chip for smart weapons. Boosts strength.", effect: p => p.stats.strength = (p.stats.strength||0)+1 },
  { name: "Cortex Jack", description: "Neural interface for hacking. Boosts hacking.", effect: p => p.stats.hacking = (p.stats.hacking||0)+1 },
  { name: "Stealth Boots", description: "Silent cybernetic boots. Boosts stealth.", effect: p => p.stats.stealth = (p.stats.stealth||0)+1 },
  { name: "Reputation Badge", description: "Symbol of street cred. Boosts reputation.", effect: p => p.stats.reputation = (p.stats.reputation||0)+2 },
  { name: "Encrypted Keycard", description: "Opens secure doors. Needed for a quest.", effect: p => {} },
  { name: "Nanofiber Vest", description: "Lightweight armor vest. Adds 1 armor to torso.", effect: p => p.bodyParts.torso.armor += 1 },
  { name: "Shock Gloves", description: "Electrified gloves. Boosts strength.", effect: p => p.stats.strength = (p.stats.strength||0)+1 },
  { name: "Cranial Shield", description: "Protective head implant. Adds 1 armor to head.", effect: p => p.bodyParts.head.armor += 1 },
  { name: "Leg Servos", description: "Hydraulic leg upgrades. Boosts speed.", effect: p => p.speed = (p.speed||1)+1 },
  { name: "Wrist Laser", description: "Hidden laser weapon. Boosts strength.", effect: p => p.stats.strength = (p.stats.strength||0)+1 },
  { name: "Hacker's Patch", description: "Software patch for hacking. Boosts hacking.", effect: p => p.stats.hacking = (p.stats.hacking||0)+1 },
  { name: "Stealth Field", description: "Personal stealth generator. Boosts stealth.", effect: p => p.stats.stealth = (p.stats.stealth||0)+2 },
  { name: "Reputation Chip", description: "Implant that broadcasts your rep. Boosts reputation.", effect: p => p.stats.reputation = (p.stats.reputation||0)+1 },
  { name: "Combat Stims", description: "Drugs that boost combat ability. Restores 4 HP.", effect: p => p.hp = Math.min(p.maxHp, (p.hp||0)+4) },
  { name: "Encrypted Tablet", description: "Tablet with secret data. Needed for a quest.", effect: p => {} },
  { name: "Nano Armor", description: "Self-repairing armor. Adds 1 armor to all body parts.", effect: p => { Object.values(p.bodyParts).forEach(bp=>bp.armor+=1); } },
  { name: "Cybernetic Arm", description: "Robotic arm. Adds 1 armor to right arm.", effect: p => p.bodyParts.rightArm.armor += 1 },
  { name: "Cybernetic Leg", description: "Robotic leg. Adds 1 armor to right leg.", effect: p => p.bodyParts.rightLeg.armor += 1 },
  { name: "EMP Mine", description: "Explosive for disabling electronics. Needed for a quest.", effect: p => {} },
  { name: "Street Scanner", description: "Scans for hidden threats. Boosts stealth.", effect: p => p.stats.stealth = (p.stats.stealth||0)+1 },
  { name: "Neural Uplink", description: "Direct brain-to-net connection. Boosts hacking.", effect: p => p.stats.hacking = (p.stats.hacking||0)+2 },
  { name: "Muscle Weave", description: "Synthetic muscle fibers. Boosts strength.", effect: p => p.stats.strength = (p.stats.strength||0)+2 },
  { name: "Reputation Medal", description: "Award for heroic deeds. Boosts reputation.", effect: p => p.stats.reputation = (p.stats.reputation||0)+3 },
  { name: "Nano Injector", description: "Injects healing nanobots. Restores 6 HP.", effect: p => p.hp = Math.min(p.maxHp, (p.hp||0)+6) },
  { name: "Encrypted Phone", description: "Secure comms device. Needed for a quest.", effect: p => {} },
  { name: "Smart Contacts", description: "Augmented reality contacts. Boosts hacking.", effect: p => p.stats.hacking = (p.stats.hacking||0)+1 },
  { name: "Stealth Suit", description: "Full-body stealth suit. Boosts stealth.", effect: p => p.stats.stealth = (p.stats.stealth||0)+2 },
  { name: "Reputation Ring", description: "Ring that marks you as a fixer. Boosts reputation.", effect: p => p.stats.reputation = (p.stats.reputation||0)+1 },
  { name: "Combat Drugs", description: "Illicit drugs for combat. Restores 3 HP.", effect: p => p.hp = Math.min(p.maxHp, (p.hp||0)+3) },
  { name: "Encrypted Badge", description: "Badge for secret society. Needed for a quest.", effect: p => {} },
  { name: "Nano Shield", description: "Personal energy shield. Adds 2 armor to torso.", effect: p => p.bodyParts.torso.armor += 2 },
  { name: "Cybernetic Spine", description: "Reinforced spine. Adds 1 armor to torso.", effect: p => p.bodyParts.torso.armor += 1 },
  { name: "Neural Booster", description: "Boosts all mental stats.", effect: p => { p.stats.hacking++; p.stats.stealth++; } },
  { name: "Street Medallion", description: "Symbol of street loyalty. Boosts reputation.", effect: p => p.stats.reputation = (p.stats.reputation||0)+1 },
  { name: "Nano Bandages", description: "Quick healing for wounds. Restores 2 HP.", effect: p => p.hp = Math.min(p.maxHp, (p.hp||0)+2) },
  { name: "Encrypted Chip", description: "Chip with secret data. Needed for a quest.", effect: p => {} },
  { name: "Combat Exosuit", description: "Powered exoskeleton. Adds 2 armor to all body parts.", effect: p => { Object.values(p.bodyParts).forEach(bp=>bp.armor+=2); } },
  { name: "Neural Firewall", description: "Protects against hacking. Boosts hacking.", effect: p => p.stats.hacking = (p.stats.hacking||0)+1 },
  { name: "Stealth Module", description: "Implant for silent movement. Boosts stealth.", effect: p => p.stats.stealth = (p.stats.stealth||0)+1 },
  { name: "Reputation Patch", description: "Temporary rep boost. Boosts reputation.", effect: p => p.stats.reputation = (p.stats.reputation||0)+1 },
  { name: "Combat Helmet", description: "Armored helmet. Adds 2 armor to head.", effect: p => p.bodyParts.head.armor += 2 },
  { name: "Nano Repair Kit", description: "Repairs cybernetic damage. Restores 4 HP.", effect: p => p.hp = Math.min(p.maxHp, (p.hp||0)+4) },
  { name: "Encrypted USB", description: "USB stick with secret files. Needed for a quest.", effect: p => {} },
  { name: "Smartwatch", description: "Tracks your vitals. Boosts stealth.", effect: p => p.stats.stealth = (p.stats.stealth||0)+1 },
  { name: "Cybernetic Heart", description: "Reinforced heart. Boosts max HP.", effect: p => p.maxHp = (p.maxHp||0)+2 },
  { name: "EMP Shield", description: "Protects against EMPs. Adds 1 armor to all body parts.", effect: p => { Object.values(p.bodyParts).forEach(bp=>bp.armor+=1); } },
  { name: "Neural Recorder", description: "Records everything you see. Needed for a quest.", effect: p => {} },
  { name: "Street Fixer's Card", description: "Contact info for a fixer. Boosts reputation.", effect: p => p.stats.reputation = (p.stats.reputation||0)+1 },
  { name: "Nano Tonic", description: "Restores 1 HP.", effect: p => p.hp = Math.min(p.maxHp, (p.hp||0)+1) },
  { name: "Encrypted Wallet", description: "Wallet with hidden credits. +10 credits.", effect: p => p.credits = (p.credits||0)+10 },
  { name: "Combat Boots", description: "Armored boots. Adds 1 armor to both legs.", effect: p => { p.bodyParts.leftLeg.armor += 1; p.bodyParts.rightLeg.armor += 1; } },
  { name: "Neural Dampener", description: "Reduces pain. Boosts max HP.", effect: p => p.maxHp = (p.maxHp||0)+1 },
  { name: "Street Vendor's Pass", description: "Lets you trade in the market. Boosts reputation.", effect: p => p.stats.reputation = (p.stats.reputation||0)+1 },
  { name: "Nano Syringe", description: "Injects healing nanites. Restores 2 HP.", effect: p => p.hp = Math.min(p.maxHp, (p.hp||0)+2) },
  { name: "Encrypted Earpiece", description: "Secure comms. Needed for a quest.", effect: p => {} },
  { name: "Combat Visor", description: "HUD for targeting. Boosts strength.", effect: p => p.stats.strength = (p.stats.strength||0)+1 },
  { name: "Nano Plating", description: "Extra armor for all body parts. Adds 1 armor.", effect: p => { Object.values(p.bodyParts).forEach(bp=>bp.armor+=1); } },
  { name: "Neural Chip", description: "Implant for faster thinking. Boosts hacking.", effect: p => p.stats.hacking = (p.stats.hacking||0)+1 },
  { name: "Street Badge", description: "Badge of honor. Boosts reputation.", effect: p => p.stats.reputation = (p.stats.reputation||0)+1 },
  { name: "Nano Medallion", description: "Symbol of healing. Restores 2 HP.", effect: p => p.hp = Math.min(p.maxHp, (p.hp||0)+2) },
  { name: "Encrypted Glasses", description: "AR glasses with secret overlays. Needed for a quest.", effect: p => {} },
  { name: "Combat Patch", description: "Temporary combat boost. Restores 2 HP.", effect: p => p.hp = Math.min(p.maxHp, (p.hp||0)+2) },
  { name: "Nano Gloves", description: "Armored gloves. Adds 1 armor to both arms.", effect: p => { p.bodyParts.leftArm.armor += 1; p.bodyParts.rightArm.armor += 1; } },
  { name: "Neural Medkit", description: "Heals cybernetic injuries. Restores 3 HP.", effect: p => p.hp = Math.min(p.maxHp, (p.hp||0)+3) },
  { name: "Street Hacker's Card", description: "Contact info for a hacker. Boosts hacking.", effect: p => p.stats.hacking = (p.stats.hacking||0)+1 },
  { name: "Nano Injector Pro", description: "Advanced healing nanites. Restores 5 HP.", effect: p => p.hp = Math.min(p.maxHp, (p.hp||0)+5) },
  { name: "Encrypted Watch", description: "Tracks secret meetings. Needed for a quest.", effect: p => {} },
  { name: "Combat Harness", description: "Distributes armor to all body parts. Adds 1 armor.", effect: p => { Object.values(p.bodyParts).forEach(bp=>bp.armor+=1); } },
  { name: "Nano Mask", description: "Protects against toxins. Adds 1 armor to head.", effect: p => p.bodyParts.head.armor += 1 },
  { name: "Neural Patch", description: "Boosts all stats by 1.", effect: p => { p.stats.strength++; p.stats.hacking++; p.stats.stealth++; p.stats.reputation++; } },
  { name: "Street Fixer's Badge", description: "Badge of a street fixer. Boosts reputation.", effect: p => p.stats.reputation = (p.stats.reputation||0)+1 },
  { name: "Nano Shield Pro", description: "Advanced energy shield. Adds 2 armor to all body parts.", effect: p => { Object.values(p.bodyParts).forEach(bp=>bp.armor+=2); } },
  { name: "Encrypted Pendant", description: "Pendant with secret data. Needed for a quest.", effect: p => {} },
  { name: "Combat Medkit", description: "Heals wounds in battle. Restores 4 HP.", effect: p => p.hp = Math.min(p.maxHp, (p.hp||0)+4) },
  { name: "Nano Boots", description: "Armored boots. Adds 1 armor to both legs.", effect: p => { p.bodyParts.leftLeg.armor += 1; p.bodyParts.rightLeg.armor += 1; } },
  { name: "Neural Scanner", description: "Scans for threats. Boosts stealth.", effect: p => p.stats.stealth = (p.stats.stealth||0)+1 },
  { name: "Street Medkit", description: "Basic medkit. Restores 2 HP.", effect: p => p.hp = Math.min(p.maxHp, (p.hp||0)+2) },
  { name: "Nano Patch", description: "Quick healing patch. Restores 1 HP.", effect: p => p.hp = Math.min(p.maxHp, (p.hp||0)+1) },
  { name: "Encrypted Coin", description: "Coin with secret code. Needed for a quest.", effect: p => {} },
  { name: "Combat Mask", description: "Protects face. Adds 1 armor to head.", effect: p => p.bodyParts.head.armor += 1 },
  { name: "Nano Visor", description: "HUD for targeting. Boosts strength.", effect: p => p.stats.strength = (p.stats.strength||0)+1 },
  { name: "Neural Medallion", description: "Symbol of mental strength. Boosts hacking.", effect: p => p.stats.hacking = (p.stats.hacking||0)+1 },
  { name: "Street Patch", description: "Temporary street cred. Boosts reputation.", effect: p => p.stats.reputation = (p.stats.reputation||0)+1 },
  { name: "Nano Harness", description: "Distributes armor to all body parts. Adds 1 armor.", effect: p => { Object.values(p.bodyParts).forEach(bp=>bp.armor+=1); } },
  { name: "Encrypted Locket", description: "Locket with secret data. Needed for a quest.", effect: p => {} },
  { name: "Combat Injector", description: "Injects combat drugs. Restores 3 HP.", effect: p => p.hp = Math.min(p.maxHp, (p.hp||0)+3) },
  { name: "Nano Ring", description: "Symbol of healing. Restores 1 HP.", effect: p => p.hp = Math.min(p.maxHp, (p.hp||0)+1) },
  { name: "Neural Patch Pro", description: "Boosts all stats by 2.", effect: p => { p.stats.strength+=2; p.stats.hacking+=2; p.stats.stealth+=2; p.stats.reputation+=2; } },
  { name: "Street Scanner Pro", description: "Advanced scanner. Boosts stealth.", effect: p => p.stats.stealth = (p.stats.stealth||0)+2 },
  { name: "Nano Medkit Pro", description: "Advanced medkit. Restores 6 HP.", effect: p => p.hp = Math.min(p.maxHp, (p.hp||0)+6) },
  { name: "Encrypted Bracelet", description: "Bracelet with secret data. Needed for a quest.", effect: p => {} },
  { name: "Combat Chip", description: "Chip for combat AI. Boosts strength.", effect: p => p.stats.strength = (p.stats.strength||0)+2 },
  { name: "Nano Patch Pro", description: "Quick healing patch. Restores 2 HP.", effect: p => p.hp = Math.min(p.maxHp, (p.hp||0)+2) },
  { name: "Neural Patch Ultra", description: "Boosts all stats by 3.", effect: p => { p.stats.strength+=3; p.stats.hacking+=3; p.stats.stealth+=3; p.stats.reputation+=3; } },
  { name: "Street Badge Pro", description: "Badge of honor. Boosts reputation.", effect: p => p.stats.reputation = (p.stats.reputation||0)+2 },
  { name: "Nano Medallion Pro", description: "Symbol of healing. Restores 3 HP.", effect: p => p.hp = Math.min(p.maxHp, (p.hp||0)+3) },
  { name: "Encrypted Ring", description: "Ring with secret data. Needed for a quest.", effect: p => {} },
  { name: "Combat Patch Pro", description: "Temporary combat boost. Restores 3 HP.", effect: p => p.hp = Math.min(p.maxHp, (p.hp||0)+3) },
  { name: "Nano Gloves Pro", description: "Armored gloves. Adds 2 armor to both arms.", effect: p => { p.bodyParts.leftArm.armor += 2; p.bodyParts.rightArm.armor += 2; } },
  { name: "Neural Medkit Pro", description: "Heals cybernetic injuries. Restores 5 HP.", effect: p => p.hp = Math.min(p.maxHp, (p.hp||0)+5) },
  { name: "Street Hacker's Card Pro", description: "Contact info for a hacker. Boosts hacking.", effect: p => p.stats.hacking = (p.stats.hacking||0)+2 },
  { name: "Nano Injector Ultra", description: "Advanced healing nanites. Restores 8 HP.", effect: p => p.hp = Math.min(p.maxHp, (p.hp||0)+8) },
  { name: "Encrypted Watch Pro", description: "Tracks secret meetings. Needed for a quest.", effect: p => {} },
  { name: "Combat Harness Pro", description: "Distributes armor to all body parts. Adds 2 armor.", effect: p => { Object.values(p.bodyParts).forEach(bp=>bp.armor+=2); } },
  { name: "Nano Mask Pro", description: "Protects against toxins. Adds 2 armor to head.", effect: p => p.bodyParts.head.armor += 2 },
  { name: "Neural Patch Ultra Pro", description: "Boosts all stats by 4.", effect: p => { p.stats.strength+=4; p.stats.hacking+=4; p.stats.stealth+=4; p.stats.reputation+=4; } },
  { name: "Street Fixer's Badge Pro", description: "Badge of a street fixer. Boosts reputation.", effect: p => p.stats.reputation = (p.stats.reputation||0)+2 },
  { name: "Nano Shield Ultra", description: "Advanced energy shield. Adds 3 armor to all body parts.", effect: p => { Object.values(p.bodyParts).forEach(bp=>bp.armor+=3); } },
  { name: "Encrypted Pendant Pro", description: "Pendant with secret data. Needed for a quest.", effect: p => {} },
  { name: "Combat Medkit Pro", description: "Heals wounds in battle. Restores 6 HP.", effect: p => p.hp = Math.min(p.maxHp, (p.hp||0)+6) },
  { name: "Nano Boots Pro", description: "Armored boots. Adds 2 armor to both legs.", effect: p => { p.bodyParts.leftLeg.armor += 2; p.bodyParts.rightLeg.armor += 2; } },
  { name: "Neural Scanner Pro", description: "Scans for threats. Boosts stealth.", effect: p => p.stats.stealth = (p.stats.stealth||0)+2 },
  { name: "Street Medkit Pro", description: "Basic medkit. Restores 4 HP.", effect: p => p.hp = Math.min(p.maxHp, (p.hp||0)+4) },
  { name: "Nano Patch Ultra", description: "Quick healing patch. Restores 3 HP.", effect: p => p.hp = Math.min(p.maxHp, (p.hp||0)+3) },
  { name: "Encrypted Coin Pro", description: "Coin with secret code. Needed for a quest.", effect: p => {} },
  { name: "Combat Mask Pro", description: "Protects face. Adds 2 armor to head.", effect: p => p.bodyParts.head.armor += 2 },
  { name: "Nano Visor Pro", description: "HUD for targeting. Boosts strength.", effect: p => p.stats.strength = (p.stats.strength||0)+2 },
  { name: "Neural Medallion Pro", description: "Symbol of mental strength. Boosts hacking.", effect: p => p.stats.hacking = (p.stats.hacking||0)+2 },
  { name: "Street Patch Pro", description: "Temporary street cred. Boosts reputation.", effect: p => p.stats.reputation = (p.stats.reputation||0)+2 },
  { name: "Nano Harness Pro", description: "Distributes armor to all body parts. Adds 2 armor.", effect: p => { Object.values(p.bodyParts).forEach(bp=>bp.armor+=2); } },
  { name: "Encrypted Locket Pro", description: "Locket with secret data. Needed for a quest.", effect: p => {} },
  { name: "Combat Injector Pro", description: "Injects combat drugs. Restores 5 HP.", effect: p => p.hp = Math.min(p.maxHp, (p.hp||0)+5) },
  { name: "Nano Ring Pro", description: "Symbol of healing. Restores 2 HP.", effect: p => p.hp = Math.min(p.maxHp, (p.hp||0)+2) },
  { name: "Neural Patch Ultra Ultra", description: "Boosts all stats by 5.", effect: p => { p.stats.strength+=5; p.stats.hacking+=5; p.stats.stealth+=5; p.stats.reputation+=5; } },
  { name: "Street Scanner Ultra", description: "Advanced scanner. Boosts stealth.", effect: p => p.stats.stealth = (p.stats.stealth||0)+3 },
  { name: "Nano Medkit Ultra", description: "Advanced medkit. Restores 8 HP.", effect: p => p.hp = Math.min(p.maxHp, (p.hp||0)+8) },
  { name: "Encrypted Bracelet Pro", description: "Bracelet with secret data. Needed for a quest.", effect: p => {} },
  { name: "Combat Chip Pro", description: "Chip for combat AI. Boosts strength.", effect: p => p.stats.strength = (p.stats.strength||0)+3 },
  { name: "Nano Patch Ultra Pro", description: "Quick healing patch. Restores 4 HP.", effect: p => p.hp = Math.min(p.maxHp, (p.hp||0)+4) },
  { name: "Neural Patch Ultra Ultra Pro", description: "Boosts all stats by 6.", effect: p => { p.stats.strength+=6; p.stats.hacking+=6; p.stats.stealth+=6; p.stats.reputation+=6; } },
  { name: "Street Badge Ultra", description: "Badge of honor. Boosts reputation.", effect: p => p.stats.reputation = (p.stats.reputation||0)+3 },
  { name: "Nano Medallion Ultra", description: "Symbol of healing. Restores 4 HP.", effect: p => p.hp = Math.min(p.maxHp, (p.hp||0)+4) },
  { name: "Encrypted Ring Pro", description: "Ring with secret data. Needed for a quest.", effect: p => {} },
  { name: "Combat Patch Ultra", description: "Temporary combat boost. Restores 4 HP.", effect: p => p.hp = Math.min(p.maxHp, (p.hp||0)+4) },
  { name: "Nano Gloves Ultra", description: "Armored gloves. Adds 3 armor to both arms.", effect: p => { p.bodyParts.leftArm.armor += 3; p.bodyParts.rightArm.armor += 3; } },
  { name: "Neural Medkit Ultra", description: "Heals cybernetic injuries. Restores 7 HP.", effect: p => p.hp = Math.min(p.maxHp, (p.hp||0)+7) },
  { name: "Street Hacker's Card Ultra", description: "Contact info for a hacker. Boosts hacking.", effect: p => p.stats.hacking = (p.stats.hacking||0)+3 },
  { name: "Nano Injector Ultra Pro", description: "Advanced healing nanites. Restores 10 HP.", effect: p => p.hp = Math.min(p.maxHp, (p.hp||0)+10) },
  { name: "Encrypted Watch Ultra", description: "Tracks secret meetings. Needed for a quest.", effect: p => {} },
  { name: "Combat Harness Ultra", description: "Distributes armor to all body parts. Adds 3 armor.", effect: p => { Object.values(p.bodyParts).forEach(bp=>bp.armor+=3); } },
  { name: "Nano Mask Ultra", description: "Protects against toxins. Adds 3 armor to head.", effect: p => p.bodyParts.head.armor += 3 },
  { name: "Neural Patch Ultra Ultra Ultra", description: "Boosts all stats by 7.", effect: p => { p.stats.strength+=7; p.stats.hacking+=7; p.stats.stealth+=7; p.stats.reputation+=7; } },
  { name: "Street Fixer's Badge Ultra", description: "Badge of a street fixer. Boosts reputation.", effect: p => p.stats.reputation = (p.stats.reputation||0)+3 },
  { name: "Nano Shield Ultra Pro", description: "Advanced energy shield. Adds 4 armor to all body parts.", effect: p => { Object.values(p.bodyParts).forEach(bp=>bp.armor+=4); } },
  { name: "Encrypted Pendant Ultra", description: "Pendant with secret data. Needed for a quest.", effect: p => {} },
  { name: "Combat Medkit Ultra", description: "Heals wounds in battle. Restores 8 HP.", effect: p => p.hp = Math.min(p.maxHp, (p.hp||0)+8) },
  { name: "Nano Boots Ultra", description: "Armored boots. Adds 3 armor to both legs.", effect: p => { p.bodyParts.leftLeg.armor += 3; p.bodyParts.rightLeg.armor += 3; } },
  { name: "Neural Scanner Ultra", description: "Scans for threats. Boosts stealth.", effect: p => p.stats.stealth = (p.stats.stealth||0)+3 },
  { name: "Street Medkit Ultra", description: "Basic medkit. Restores 6 HP.", effect: p => p.hp = Math.min(p.maxHp, (p.hp||0)+6) },
  { name: "Nano Patch Ultra Ultra", description: "Quick healing patch. Restores 5 HP.", effect: p => p.hp = Math.min(p.maxHp, (p.hp||0)+5) },
  { name: "Encrypted Coin Ultra", description: "Coin with secret code. Needed for a quest.", effect: p => {} },
  { name: "Combat Mask Ultra", description: "Protects face. Adds 3 armor to head.", effect: p => p.bodyParts.head.armor += 3 },
  { name: "Nano Visor Ultra", description: "HUD for targeting. Boosts strength.", effect: p => p.stats.strength = (p.stats.strength||0)+3 },
  { name: "Neural Medallion Ultra", description: "Symbol of mental strength. Boosts hacking.", effect: p => p.stats.hacking = (p.stats.hacking||0)+3 },
  { name: "Street Patch Ultra", description: "Temporary street cred. Boosts reputation.", effect: p => p.stats.reputation = (p.stats.reputation||0)+3 },
  { name: "Nano Harness Ultra", description: "Distributes armor to all body parts. Adds 3 armor.", effect: p => { Object.values(p.bodyParts).forEach(bp=>bp.armor+=3); } },
  { name: "Encrypted Locket Ultra", description: "Locket with secret data. Needed for a quest.", effect: p => {} },
  { name: "Combat Injector Ultra", description: "Injects combat drugs. Restores 7 HP.", effect: p => p.hp = Math.min(p.maxHp, (p.hp||0)+7) },
  { name: "Nano Ring Ultra", description: "Symbol of healing. Restores 3 HP.", effect: p => p.hp = Math.min(p.maxHp, (p.hp||0)+3) }
];
uniqueItems.forEach((item, i) => {
  itemDefs[`Item${i+1}`] = {
    name: item.name,
    description: item.description,
    effect: item.effect,
    appearance: `item${i+1}_sprite.png`,
    unlocks: undefined
  };
});

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
const subNames = {
  alley: ["Graffiti Tunnel", "Neon Dumpster", "Street Vendor", "Shady Nook", "Back Gate"],
  market: ["Holo-Kiosk", "Spice Stall", "Junk Dealer", "Food Cart", "Black Market"],
  club: ["VIP Lounge", "Dance Floor", "Bar Counter", "DJ Booth", "Security Room"],
  plaza: ["Fountain", "Statue", "Info Terminal", "Bench Row", "Street Performer"],
  docks: ["Cargo Hold", "Fisher's Pier", "Boat Rental", "Smuggler's Shed", "Waterfront"],
  rooftops: ["Helipad", "Solar Array", "Sky Garden", "Old Antenna", "Hidden Loft"],
  underground: ["Maintenance Tunnel", "Old Subway", "Power Node", "Secret Den", "Flooded Chamber"],
  cybercafe: ["VR Booth", "Server Closet", "Snack Bar", "Arcade Corner", "Restroom"],
  luxury_store: ["Showroom", "Security Office", "Changing Room", "Manager's Suite", "Storage Vault"],
  outskirts: ["Abandoned Car", "Dusty Path", "Old Billboard", "Checkpoint", "Makeshift Camp"],
  bunker: ["Blast Door", "Control Room", "Dormitory", "Armory", "Mess Hall"],
  terminal: ["Ticket Counter", "Waiting Area", "Lost & Found", "Restroom", "Security Desk"]
};
mainLocations.forEach((main) => {
  // Complex branching for main locations
  let mainBranches = [];
  if (main === "alley") {
    mainBranches = [
      {
        text: `Confront the gang (Strength 4+ or Neon Blade)
You step into the neon-lit alley, boots splashing in puddles of oil and rain. The gang blocks your path, their faces obscured by flickering holomasks. One cracks his knuckles, another twirls a glowing chain. The air is thick with tension and the distant hum of city drones. You can smell synth-ale and ozone. A rat scurries past your foot. The gang leader grins, revealing gold-plated teeth. "This is our turf, choom. Pay up or bleed out." You clench your fists, feeling the weight of your cybernetic enhancements. The alley narrows behind you, escape impossible. A flicker of movement catches your eye—a hidden camera, recording everything. The gang's laughter echoes off the graffiti-stained walls. You sense a test of strength, reputation, and nerve. The city watches. Will you stand tall or back down? The rain intensifies, washing neon colors down the walls. Your heart pounds. The gang closes in, ready for a show.`,
        condition: () => player.stats.strength >= 4 || player.inventory.includes("Neon Blade"),
        action: () => {
          if (player.stats.strength >= 4) {
            player.credits += 20;
            alert(`You unleash your power, cybernetic muscles surging. The gang is caught off guard as you send their leader sprawling. The others scatter, leaving behind a stash of stolen credits. You loot 20 credits and your reputation grows. The city whispers your name.`);
          } else {
            player.credits += 10;
            alert(`You draw your Neon Blade, its glow cutting through the darkness. The gang recoils in fear, recognizing the weapon. They flee, dropping a credstick in their haste. You gain 10 credits. The alley is yours, for now.`);
          }
          render();
        }
      },
      {
        text: `Sneak past the gang (Agility 3+ or Holo Cloak)
You press yourself against the cold, damp wall, blending into the shadows. The gang is distracted, arguing over loot. Your Holo Cloak shimmers, distorting your outline. You time your movements with the flicker of neon signs and the rumble of passing hovercars. A cat yowls, masking your footsteps. You slip behind a dumpster, heart racing. The gang's lookout glances your way, but your agility and tech keep you hidden. You spot a discarded datachip glinting in the trash. The alley seems to stretch forever, every step a risk. You hear a snippet of conversation—something about a big job at the docks. The city smells of rain and burnt circuits. You reach the far end, unseen.`,
        condition: () => player.stats.agility >= 3 || player.inventory.includes("Holo Cloak"),
        action: () => {
          alert(`You move like a ghost, unseen and unheard. As you pass, you overhear a secret code: 9X-ALPHA. You pocket an Encrypted Code from the trash. The gang never knew you were there.`);
          player.inventory.push("Encrypted Code");
          render();
        }
      },
      {
        text: `Hack the alley cameras (Technical 3+ or Data Spike)
You kneel beside a rusted access panel, tools at the ready. The rain sparks against exposed wires. You jack in, your neural interface flooding with data. The city's security grid pulses beneath your fingertips. You bypass firewalls, reroute power, and disable the alley's cameras. The gang is oblivious, their crimes unrecorded. You spot a hidden cache icon blinking on your HUD. The system offers up secrets: gang hideouts, police patrols, and a stash nearby. Your technical skill is your weapon. The city is a puzzle, and you hold the key.`,
        condition: () => player.stats.technical >= 3 || player.inventory.includes("Data Spike"),
        action: () => {
          alert(`You disable the cameras, erasing all evidence. A hidden panel slides open, revealing a cache of supplies. You gain a Hidden Cache. The city rewards the clever.`);
          player.inventory.push("Hidden Cache");
          render();
        }
      }
    ];
  } else if (main === "market") {
    mainBranches = [
      {
        text: `Trade with the black market (Charisma 2+ or Reputation Badge)
The market is a labyrinth of neon stalls, each one hawking wares both legal and forbidden. Holo-signs flicker overhead, advertising everything from synth-spices to illegal cyberware. The air is thick with the scent of fried noodles, ozone, and desperation. You weave through the crowd, past a street musician playing a digital shamisen. In a shadowy alcove, a black market dealer eyes you warily. His fingers drum on a crate of EMP grenades. "You got the creds or the rep?" he asks, voice modulated by a cheap voice-changer. A drone buzzes overhead, scanning for trouble. The dealer's bodyguard, a towering cyborg, cracks his knuckles. You flash your Reputation Badge, or maybe just your winning smile. The dealer grins, revealing a gold tooth. "Alright, choom. For you, a special deal." The transaction is quick, hands never quite touching. You feel the weight of the city watching.`,
        condition: () => player.stats.charisma >= 2 || player.inventory.includes("Reputation Badge"),
        action: () => {
          player.inventory.push("EMP Grenade");
          alert(`You gain the trust of the black market. The dealer slips you an EMP Grenade, wrapped in a synth-leather pouch. "Use it wisely," he whispers. The city just got a little more dangerous.`);
          render();
        }
      },
      {
        text: `Steal from a vendor (Agility 4+)
You move through the market like a shadow, eyes scanning for opportunity. A vendor is distracted, arguing with a customer over the price of a fake memory crystal. You slip behind the stall, fingers nimble and quick. The crowd is a living shield, hiding your movements. You spot a credstick half-hidden beneath a pile of knockoff cyberdecks. The vendor's back is turned, his attention on the shouting match. You time your move perfectly, snatching the credstick and melting back into the throng. The city is a game, and you just scored a win.`,
        condition: () => player.stats.agility >= 4,
        action: () => {
          player.credits += 15;
          alert(`You steal 15 credits from a distracted vendor. The credstick is warm in your hand, and you vanish into the crowd before anyone notices. The market's chaos is your ally.`);
          render();
        }
      },
      {
        text: `Buy rare cyberware (Credits 30+)
You approach a stall draped in shimmering fabric, guarded by a pair of silent drones. The merchant, a woman with chrome-plated eyes, sizes you up. "Looking for something special?" she asks. You nod, sliding 30 credits across the counter. She produces a case, opening it to reveal Prototype Cyberware gleaming in the neon light. The transaction is smooth, professional. You feel the weight of the new tech in your hands. The merchant leans in, whispering, "This will change your life, for better or worse." You pocket the cyberware, feeling the city shift around you.`,
        condition: () => player.credits >= 30,
        action: () => {
          player.credits -= 30;
          player.inventory.push("Prototype Cyberware");
          alert(`You purchase Prototype Cyberware! The merchant's eyes flash with approval. "May your upgrades serve you well," she says. The city is full of possibilities.`);
          render();
        }
      }
    ];
  } else if (main === "club") {
    mainBranches = [
      {
        text: `Bribe the bartender (Credits 10+)
The club pulses with synth beats, the floor vibrating beneath your feet. Holo-lights paint the crowd in shifting patterns of blue and magenta. The bartender, a grizzled ex-merc with a cybernetic arm, polishes a glass behind the bar. You slide up, catching his eye. "Looking for something special?" he asks, voice barely audible over the music. You flash a credstick, and he nods, sliding you a drink laced with nanites. The crowd is a sea of dancers, lost in the rhythm. A VIP area glows behind a velvet rope, guarded by a pair of augmented bouncers. The bartender leans in, whispering about a data deal going down in the back room. You feel the weight of the city's secrets pressing in. The air smells of ozone, sweat, and expensive perfume. You know a bribe here can open doors—or get you in trouble.`,
        condition: () => player.credits >= 10,
        action: () => {
          player.credits -= 10;
          player.inventory.push("Encrypted Drive");
          alert(`The bartender slips you an Encrypted Drive under the counter. "Don't say I never did you a favor," he mutters. You pocket the drive, feeling eyes on your back as you melt into the crowd.`);
          render();
        }
      },
      {
        text: `Dance for info (Agility 2+)
You step onto the dance floor, letting the music take control. The crowd parts as you move, your agility and style drawing admiring glances. Neon tattoos pulse in time with the beat. A mysterious figure watches from the shadows, their gaze lingering on you. You spin, leap, and slide, every move a statement. The DJ nods in approval, dropping a track just for you. The crowd cheers, and someone slips you a coded message. You catch snippets of conversation—rumors of a big job, a stolen AI, a gang war brewing. The city speaks in rhythm and code. You leave the floor breathless, charisma burning bright.`,
        condition: () => player.stats.agility >= 2,
        action: () => {
          player.stats.charisma += 1;
          alert(`Your moves impress the crowd. Someone whispers a tip in your ear, and your Charisma increases by 1. The club is your stage tonight.`);
          render();
        }
      },
      {
        text: `Hack the DJ booth (Technical 4+)
You slip behind the DJ booth, dodging cables and security drones. The DJ, lost in the music, doesn't notice as you jack into the sound system. Your interface floods with encrypted files and playlists. You bypass the firewalls, injecting your own track into the mix. The crowd goes wild as your signature sound takes over. In the chaos, you access a hidden directory—VIP Passes, encrypted messages, and a list of high rollers. You snag a VIP Pass, slipping it into your pocket as the DJ finally notices. "Nice work," he says, grinning. "You ever need a gig, let me know." The city rewards the bold and the clever.`,
        condition: () => player.stats.technical >= 4,
        action: () => {
          player.inventory.push("VIP Pass");
          alert(`You hack the playlist and get a VIP Pass! The DJ gives you a nod of respect. The club's secrets are now yours to explore.`);
          render();
        }
      }
    ];
  } else if (main === "plaza") {
    mainBranches = [
      {
        text: `Help the street performer (Give Synth Ale)
The plaza is alive with color and sound. Holo-billboards tower overhead, advertising the latest cyberware and synth-pop stars. A street performer juggles glowing orbs, his movements fluid and mesmerizing. The crowd is a mix of locals, tourists, and off-duty corp security. Vendors shout over the din, selling everything from neon noodles to black market chips. The air is thick with the scent of fried food and ozone. You spot a group of kids watching the performer, eyes wide with wonder. The performer stumbles, clearly exhausted. You remember the Synth Ale in your pack. The city is a stage, and every act has its price.`,
        condition: () => player.inventory.includes("Synth Ale"),
        action: () => {
          player.inventory = player.inventory.filter(i => i !== "Synth Ale");
          player.stats.charisma += 2;
          alert(`The performer gratefully accepts your Synth Ale, taking a long drink. His energy returns, and the crowd erupts in applause. "Thank you, friend," he whispers. "Charisma +2!" The city rewards kindness.`);
          render();
        }
      },
      {
        text: `Hack the info terminal (Technical 5+)
You approach the info terminal, its screen flickering with static. You jack in, your neural interface buzzing. Layers of corporate security try to block you, but your skills are sharper. You bypass firewalls, decrypt files, and access hidden city records. The terminal reveals secrets: police patrols, gang movements, and a list of VIPs. You download the data onto an Encrypted Tablet. The city is an open book for those who know how to read it.`,
        condition: () => player.stats.technical >= 5,
        action: () => {
          player.inventory.push("Encrypted Tablet");
          alert(`You download secret data onto an Encrypted Tablet. The city’s secrets are now at your fingertips. Use them wisely.`);
          render();
        }
      },
      {
        text: `Intimidate the crowd (Strength 5+)
You stand tall in the center of the plaza, your presence impossible to ignore. The crowd senses your strength, parting as you approach. You glare at a group of street punks, and they back away, dropping a credstick in their haste. Vendors lower their prices, hoping to avoid your wrath. The city respects power, and today, you are the strongest.`,
        condition: () => player.stats.strength >= 5,
        action: () => {
          player.credits += 25;
          alert(`You shake down the crowd for 25 credits. The city bows to strength, but remember: every action has consequences.`);
          render();
        }
      }
    ];
  }
  // Add default explore sub-locations and return
  scenes[main] = {
    text: `You arrive at the ${main}. What will you do?`,
    choices: [
      ...mainBranches,
      ...Array(5)
        .fill(0)
        .map((_, i) => ({
          text: `Explore ${subNames[main][i] || `sub-location ${i + 1}`}`,
          next: `${main}_sub${i + 1}`,
        })),
      { text: "Return to alley", next: "alley" },
    ],
  };
  // Thematic sub-location names and gameplay for each main location
  // ...existing code...
  for (let j = 1; j <= 5; j++) {
    const sub = `${main}_sub${j}`;
    const subName = subNames[main][j - 1] || `Sector ${j}`;
    // Add simple gameplay: random event, stat check, or item
    let gameplayText = "";
    let choices = [];
    // Branching sub-location stories and item effects
    if (main === "alley" && j === 1) {
      gameplayText = "A gang member blocks your way. You can fight, sneak, or bribe.";
      choices = [
        {
          text: "Fight (Strength 5+ or Neon Blade)",
          condition: () => player.stats.strength >= 5 || player.inventory.includes("Neon Blade"),
          action: () => {
            player.credits += 15;
            alert("You defeat the gang member and find 15 credits!");
            render();
          }
        },
        {
          text: "Sneak (Agility 4+ or Holo Cloak)",
          condition: () => player.stats.agility >= 4 || player.inventory.includes("Holo Cloak"),
          action: () => {
            player.inventory.push("Encrypted Code");
            alert("You sneak by and find an Encrypted Code.");
            render();
          }
        },
        {
          text: "Bribe (Credits 10+)",
          condition: () => player.credits >= 10,
          action: () => {
            player.credits -= 10;
            player.stats.charisma += 1;
            alert("The gang lets you pass. Charisma +1.");
            render();
          }
        },
        { text: "Return to main location", next: main }
      ];
    } else if (main === "market" && j === 2) {
      gameplayText = "A vendor offers a rare item, but you can also try to hack or steal it.";
      choices = [
        {
          text: "Buy Rare Chip (15 credits)",
          condition: () => player.credits >= 15,
          action: () => {
            player.credits -= 15;
            player.inventory.push("Rare Chip");
            alert("You bought a Rare Chip!");
            render();
          }
        },
        {
          text: "Hack the vendor (Technical 4+ or Data Spike)",
          condition: () => player.stats.technical >= 4 || player.inventory.includes("Data Spike"),
          action: () => {
            player.inventory.push("Encrypted Keycard");
            alert("You hack the vendor and get an Encrypted Keycard!");
            render();
          }
        },
        {
          text: "Steal (Agility 5+)",
          condition: () => player.stats.agility >= 5,
          action: () => {
            player.inventory.push("EMP Grenade");
            alert("You steal an EMP Grenade!");
            render();
          }
        },
        { text: "Return to main location", next: main }
      ];
    } else if (main === "club" && j === 3) {
      gameplayText = "You spot a Data Chip on the bar, but the bartender is watching. You can distract, hack, or sneak.";
      choices = [
        {
          text: "Distract bartender (Charisma 3+)",
          condition: () => player.stats.charisma >= 3,
          action: () => {
            player.inventory.push("Data Chip");
            alert("You distract the bartender and grab the Data Chip!");
            render();
          }
        },
        {
          text: "Hack security (Technical 6+)",
          condition: () => player.stats.technical >= 6,
          action: () => {
            player.inventory.push("Encrypted Drive");
            alert("You hack the security and get an Encrypted Drive!");
            render();
          }
        },
        {
          text: "Sneak (Agility 6+)",
          condition: () => player.stats.agility >= 6,
          action: () => {
            player.inventory.push("Data Chip");
            alert("You swipe the Data Chip!");
            render();
          }
        },
        { text: "Return to main location", next: main }
      ];
    } else if (main === "plaza" && j === 4) {
      gameplayText = "A performer offers to boost your charisma for 5 credits, or you can hack the crowd or perform yourself.";
      choices = [
        {
          text: "Pay 5 credits for charisma boost",
          condition: () => player.credits >= 5,
          action: () => {
            player.credits -= 5;
            player.stats.charisma += 2;
            alert("Your charisma increases!");
            render();
          }
        },
        {
          text: "Hack the crowd (Technical 5+)",
          condition: () => player.stats.technical >= 5,
          action: () => {
            player.inventory.push("Encrypted Tablet");
            alert("You hack the crowd's AR and get an Encrypted Tablet!");
            render();
          }
        },
        {
          text: "Perform (Agility 4+)",
          condition: () => player.stats.agility >= 4,
          action: () => {
            player.stats.charisma += 1;
            alert("Your performance is a hit! Charisma +1.");
            render();
          }
        },
        { text: "Return to main location", next: main }
      ];
    } else if (main === "docks" && j === 5) {
      gameplayText = "A smuggler offers you a ride to the outskirts for 8 credits.";
      choices = [
        {
          text: "Take ride to outskirts (8 credits)",
          condition: () => player.credits >= 8,
          action: () => {
            player.credits -= 8;
            state.scene = "outskirts";
            alert("You travel to the outskirts!");
            render();
          }
        },
        { text: "Return to main location", next: main }
      ];
    } else {
      // Default: find an item, but add branching if item is special
      let idx = j + mainLocations.indexOf(main) * 10;
      if (idx < 1) idx = 1;
      if (idx > 120) idx = 120;
      const itemName = `Item${idx}`;
      gameplayText = `You find an item: ${itemDefs[itemName]?.name || itemName}.`;
      choices = [];
      // Branch: if item is a medkit, offer to use immediately
      if (itemDefs[itemName]?.name?.toLowerCase().includes("medkit")) {
        choices.push({
          text: `Use ${itemDefs[itemName].name} now`,
          action: () => {
            itemDefs[itemName].effect(player);
            alert(`You use the ${itemDefs[itemName].name}.`);
            render();
          }
        });
      }
      // Branch: if item is a hacking tool, offer to hack something
      if (itemDefs[itemName]?.name?.toLowerCase().includes("hack") || itemDefs[itemName]?.name?.toLowerCase().includes("deck")) {
        choices.push({
          text: `Hack a nearby terminal with ${itemDefs[itemName].name}`,
          action: () => {
            player.stats.technical += 1;
            alert("You hack a terminal and boost your technical stat!");
            render();
          }
        });
      }
      // Default: pick up item
      if (!player.inventory.includes(itemName)) {
        choices.push({
          text: `Pick up ${itemDefs[itemName]?.name || itemName}`,
          action: () => {
            if (itemDefs[itemName]) {
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
            // Force inventory panel update immediately
            const inventoryPanel = document.getElementById("inventory-visual");
            if (inventoryPanel) {
              inventoryPanel.innerHTML = "";
              player.inventory.forEach((itemKey) => {
                const def = itemDefs[itemKey] || {};
                const itemDiv = document.createElement("div");
                itemDiv.innerHTML = `<b>${def.name || itemKey}</b><br><span style='font-size:0.9em;color:#444'>${def.description || ""}</span>`;
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
                  alert(itemHints[itemKey] || "No hint available for this item.");
                };
                itemDiv.appendChild(hintBtn);
                inventoryPanel.appendChild(itemDiv);
              });
            }
            state.scene = main;
            render();
          }
        });
      }
      choices.push({ text: "Return to main location", next: main });
    }
    scenes[sub] = {
      text: `${subName}: ${gameplayText}`,
      choices
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
        { text: "Return to alley", next: "alley" }
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
  let charPanel = document.getElementById("character-panel");
  if (!charPanel) {
    charPanel = document.createElement("div");
    charPanel.id = "character-panel";
    charPanel.style.margin = "18px 0 0 0";
    charPanel.style.padding = "16px";
    charPanel.style.background = "linear-gradient(90deg,#181828 60%,#0ff2 100%)";
    charPanel.style.borderRadius = "12px";
    charPanel.style.boxShadow = "0 0 12px #0ff, 0 0 24px #f0f";
    charPanel.style.fontFamily = "Orbitron, Segoe UI, sans-serif";
    charPanel.style.fontWeight = "bold";
    charPanel.style.color = "#fff";
    charPanel.style.maxWidth = "420px";
    charPanel.style.fontSize = "1em";
    canvas.parentNode.insertBefore(charPanel, canvas.nextSibling);
  }
  // Character menu content
  let bp = player.bodyParts;
  let stat = player.stats;
  charPanel.innerHTML = `
    <div style="display:flex;flex-wrap:wrap;gap:18px;align-items:flex-start;">
      <div style="min-width:160px;">
        <span style='font-size:1.1em;color:#0ff;'>Body Health</span><br>
        <span>Head: <span style='color:#f0f'>${bp.head.hp}</span>/${bp.head.maxHp} (Armor: ${bp.head.armor})</span><br>
        <span>Torso: <span style='color:#f0f'>${bp.torso.hp}</span>/${bp.torso.maxHp} (Armor: ${bp.torso.armor})</span><br>
        <span>Left Arm: <span style='color:#f0f'>${bp.leftArm.hp}</span>/${bp.leftArm.maxHp} (Armor: ${bp.leftArm.armor})</span><br>
        <span>Right Arm: <span style='color:#f0f'>${bp.rightArm.hp}</span>/${bp.rightArm.maxHp} (Armor: ${bp.rightArm.armor})</span><br>
        <span>Left Leg: <span style='color:#f0f'>${bp.leftLeg.hp}</span>/${bp.leftLeg.maxHp} (Armor: ${bp.leftLeg.armor})</span><br>
        <span>Right Leg: <span style='color:#f0f'>${bp.rightLeg.hp}</span>/${bp.rightLeg.maxHp} (Armor: ${bp.rightLeg.armor})</span>
      </div>
      <div style="min-width:120px;">
        <span style='font-size:1.1em;color:#0ff;'>Stats</span><br>
        <span>Strength: <span style='color:#f0f'>${stat.strength}</span></span><br>
        <span>Hacking: <span style='color:#f0f'>${stat.hacking}</span></span><br>
        <span>Stealth: <span style='color:#f0f'>${stat.stealth}</span></span><br>
        <span>Reputation: <span style='color:#f0f'>${stat.reputation}</span></span>
      </div>
    </div>
  `;
  if (!canvas || !storyElement || !choicesElement || !statsElement) {
    console.log("[DEBUG] Missing UI element(s)");
    if (storyElement) {
      storyElement.innerHTML =
        '<span style="color:#f00">Game failed to load: missing UI element</span>';
    }
    return;
  }
  console.log("[DEBUG] All UI elements found");
  // --- City Map Redesign ---
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  console.log("[DEBUG] Canvas cleared");
  // Draw city grid background
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

  // Determine which locations to show
  let showMain = true;
  let showSubs = [];
  let mainLoc = null;
  if (mainLocations.includes(state.scene)) {
    // In a main location: show only its sub-locations
    showMain = false;
    mainLoc = state.scene;
    for (let j = 1; j <= 5; j++) {
      showSubs.push(`${mainLoc}_sub${j}`);
    }
  }

  // Draw main locations as city blocks
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
      // Draw city block icon
      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, 2 * Math.PI);
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
      // Location label
      ctx.font = "bold 14px Orbitron, Segoe UI";
      ctx.fillStyle = "#fff";
      ctx.shadowColor = "#0ff";
      ctx.shadowBlur = 4;
      ctx.fillText(loc.replace(/_/g, " "), pos.x - 28, pos.y + 32);
      ctx.restore();
    });
  } else if (main === "docks") {
    mainBranches = [
      {
        text: `Sneak onto a cargo ship (Agility 4+)
The docks are a maze of shipping containers, cranes, and flickering floodlights. The air is thick with the scent of salt, oil, and ozone. Cargo ships from distant megacities unload their goods under the watchful eyes of corp security. You move like a shadow, slipping between crates and dodging patrols. The sound of waves mixes with the hum of engines. You spot a crate marked with a strange symbol—inside, something glints. The city’s underbelly is alive with secrets, and tonight, you’re a ghost among thieves.`,
        condition: () => player.stats.agility >= 4,
        action: () => {
          player.inventory.push("Rare Chip");
          alert(`You find a Rare Chip hidden in a crate! The docks are full of surprises for those quick enough to seize them.`);
          render();
        }
      },
      {
        text: `Bribe a dockworker (Credits 15+)
You approach a dockworker, his face half-hidden by a battered cap. He eyes you warily, then glances at your credstick. "Looking for a ride?" he asks. You nod, sliding him the credits. He leads you to a small boat, its engine purring softly. "Keep your head down," he warns. The city’s waterways are full of danger—and opportunity.`,
        condition: () => player.credits >= 15,
        action: () => {
          player.credits -= 15;
          player.inventory.push("Boat Rental");
          alert(`You rent a boat for a secret job. The dockworker disappears into the night, and you set off across the water, the city lights fading behind you.`);
          render();
        }
      },
      {
        text: `Fight off smugglers (Strength 5+)
A group of smugglers unloads crates under the cover of darkness. You step out of the shadows, fists clenched. The leader sneers, drawing a plasma knife. The fight is brutal, but your strength prevails. The smugglers flee, leaving behind a stash of credits. The city rewards the bold.`,
        condition: () => player.stats.strength >= 5,
        action: () => {
          player.credits += 20;
          alert(`You defeat the smugglers and find 20 credits. The docks are a little safer tonight—thanks to you.`);
          render();
        }
      }
    ];
      ctx.shadowColor = "#0ff";
      ctx.shadowBlur = 4;
      ctx.fillText(sub.replace(/_/g, " "), pos.x - 28, pos.y + 28);
      ctx.restore();
    });
    // Draw the main location as a highlighted block
    const pos = cityMap[mainLoc];
    ctx.save();
    ctx.beginPath();
    ctx.rect(pos.x - 22, pos.y - 22, 44, 44);
    ctx.fillStyle = "#f0f";
    ctx.shadowColor = "#f0f";
    ctx.shadowBlur = 24;
    ctx.globalAlpha = 0.5;
    ctx.fill();
    ctx.restore();
  }

  // --- Draw animated player dot ---
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
  storyElement.innerHTML = typeof scene.text === "function" ? scene.text() : scene.text;
  // Render stats panel in character panel
  renderStats();
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
      setSceneSafe(choice.next);
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
      player.inventory.forEach((itemKey) => {
        const def = itemDefs[itemKey] || {};
        const itemDiv = document.createElement("div");
        itemDiv.innerHTML = `<b>${def.name || itemKey}</b><br><span style='font-size:0.9em;color:#444'>${def.description || ""}</span>`;
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
          alert(itemHints[itemKey] || "No hint available for this item.");
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


function showCharacterCreator(onComplete) {
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
    // Use DiceBear Avatars (pixel-art style) for a stylized character
    // We'll use a seed based on the appearance choices for consistency
    const seed = `${hairStyles[appearance.hair]}-${colors[appearance.color]}-${faces[appearance.face]}`;
    if (window.avatars && window.avatars.createAvatar && window.style) {
      const svg = window.avatars.createAvatar(window.style, { seed });
      avatar.innerHTML = svg;
    } else {
      // Fallback: show loading or a placeholder
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
    // Add listeners
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
    // Ensure all stats are present and clamped between 1 and 10
    player.stats = {};
    stats.forEach(stat => {
      player.stats[stat] = Math.max(1, Math.min(10, values[stat] || 1));
    });
    // Save appearance as indices and as a seed for DiceBear
    player.appearance = {
      hair: appearance.hair,
      color: appearance.color,
      face: appearance.face,
      seed: `${hairStyles[appearance.hair]}-${colors[appearance.color]}-${faces[appearance.face]}`
    };
    if (typeof onComplete === 'function') onComplete();
    // Render avatar in main game UI
    setTimeout(renderCharacterVisual, 0);
  };

  // Show avatar in main game UI if returning to creator
  setTimeout(renderCharacterVisual, 0);

// Make DiceBear helpers available globally
}


document.addEventListener("DOMContentLoaded", () => {
  showCharacterCreator(() => {
    try {
      render();
      // Show avatar in main game UI after creation
      setTimeout(() => {
        if (player.appearance && player.appearance.seed) {
          const charDiv = document.getElementById('character-visual');
          if (charDiv) charDiv.innerHTML = getDiceBearSVG(player.appearance.seed);
        }
      }, 0);
    } catch (e) {
      showFatalError("Game failed to load: " + e.message);
    }
  });
});
