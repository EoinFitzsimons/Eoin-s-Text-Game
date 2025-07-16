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
  x: 2,
  y: 2,
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
    hacking: 1,
    stealth: 1,
    reputation: 0
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
  scenes[main] = {
    text: `You arrive at the ${main}. What will you do?`,
    choices: [
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
    if (main === "alley" && j === 1) {
      gameplayText = "A gang member blocks your way. Test your strength (5+) to intimidate.";
      choices = [
        {
          text: "Intimidate (Strength 5+)",
          condition: () => (player.strength || 0) >= 5,
          action: () => {
            player.credits += 10;
            alert("You scare them off and find 10 credits!");
            render();
          }
        },
        { text: "Return to main location", next: main }
      ];
    } else if (main === "market" && j === 2) {
      gameplayText = "A vendor offers a rare item for 15 credits.";
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
        { text: "Return to main location", next: main }
      ];
    } else if (main === "club" && j === 3) {
      gameplayText = "You spot a Data Chip on the bar, but the bartender is watching.";
      choices = [
        {
          text: "Steal Data Chip (Stealth 6+)",
          condition: () => (player.stealth || 0) >= 6,
          action: () => {
            player.inventory.push("Data Chip");
            alert("You swipe the Data Chip!");
            render();
          }
        },
        { text: "Return to main location", next: main }
      ];
    } else if (main === "plaza" && j === 4) {
      gameplayText = "A performer offers to boost your reputation for 5 credits.";
      choices = [
        {
          text: "Pay 5 credits for rep boost",
          condition: () => player.credits >= 5,
          action: () => {
            player.credits -= 5;
            player.reputation = (player.reputation || 0) + 2;
            alert("Your reputation increases!");
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
      // Default: find an item
      let idx = j + mainLocations.indexOf(main) * 10;
      if (idx < 1) idx = 1;
      if (idx > 120) idx = 120;
      gameplayText = `You find an item: Item${idx}.`;
      const itemName = `Item${idx}`;
      choices = [];
      if (!player.inventory.includes(itemName)) {
        choices.push({
          text: `Pick up Item${idx}`,
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
  } else if (mainLoc) {
    // Draw sub-locations for the current main location
    showSubs.forEach((sub, idx) => {
      const pos = cityMap[sub];
      ctx.save();
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 18, 0, 2 * Math.PI);
      ctx.fillStyle = sub === state.scene ? "#f0f" : "#0ff";
      ctx.shadowColor = sub === state.scene ? "#f0f" : "#0ff";
      ctx.shadowBlur = sub === state.scene ? 24 : 12;
      ctx.globalAlpha = 0.92;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#fff";
      ctx.stroke();
      // Sub-location icon
      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.moveTo(-8, 0);
      ctx.lineTo(8, 0);
      ctx.moveTo(0, -8);
      ctx.lineTo(0, 8);
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
      // Sub-location label
      ctx.font = "bold 13px Orbitron, Segoe UI";
      ctx.fillStyle = "#fff";
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
