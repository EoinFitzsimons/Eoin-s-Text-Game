try {
console.debug('game.js loaded');
console.log('game.js loaded');
// Map scene names to canvas coordinates for player dot
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
    console.debug('getPlayerCanvasPos called', state.scene);
    let pos = areaPositions[state.scene];
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
    ["dealer", "container", "mystery_box", "terminal", "figure"]
];

// Faction reputation system
let factions = {
    syndicate: 0,
    corp: 0
    // ...other faction reputation values...
};

} catch (e) {
    console.error('Fatal error in game.js:', e);
}
// Quest system
let quests = {
    packageDelivery: { active: false, complete: false, desc: 'Deliver the Mystery Package to the docks or bunker.' },
    dataHeist: { active: false, complete: false, desc: 'Steal the Data Chip from the club and deliver it to the plaza figure.' },
    rareChipTrade: { active: false, complete: false, desc: 'Find a hacker interested in the Rare Chip.' }
};

function updateQuests() {
    // Package delivery quest
    if (player.inventory.includes('Mystery Package')) quests.packageDelivery.active = true;
    if (!player.inventory.includes('Mystery Package') && quests.packageDelivery.active) quests.packageDelivery.complete = true;
    // Data heist quest
    if (player.inventory.includes('Data Chip')) quests.dataHeist.active = true;
    if (!player.inventory.includes('Data Chip') && quests.dataHeist.active) quests.dataHeist.complete = true;
    // Rare chip quest
    if (player.inventory.includes('Rare Chip')) quests.rareChipTrade.active = true;
// New quest: Corporate Espionage
// quests.corpEspionage = { active: false, complete: false, desc: 'Infiltrate the luxury store and steal the prototype cyberware.' };
// Move this line after quests is defined below, or add it to the quests object directly.
    updateQuests();
    // Quest objectives panel
    let questPanel = document.getElementById('quest-panel');
    if (!questPanel) {
        questPanel = document.createElement('div');
        questPanel.id = 'quest-panel';
        questPanel.style.background = 'rgba(20,20,40,0.85)';
        questPanel.style.color = '#ff0';
        questPanel.style.fontFamily = 'Orbitron, Segoe UI, sans-serif';
        questPanel.style.fontWeight = 'bold';
        questPanel.style.padding = '10px 18px';
        questPanel.style.borderRadius = '10px';
        questPanel.style.margin = '12px 0';
        questPanel.style.boxShadow = '0 0 16px #ff0, 0 0 32px #f0f';
        document.getElementById('center-panel').insertBefore(questPanel, document.getElementById('story'));
    }
    let questHtml = '<h3 style="color:#ff0;margin:0 0 8px 0;">Quests</h3>';
    Object.entries(quests).forEach(([key, q]) => {
        if (q.active && !q.complete) questHtml += `<div style='margin-bottom:6px;'>${q.desc}</div>`;
        if (q.complete) questHtml += `<div style='margin-bottom:6px;color:#0f0;'>✔ ${q.desc}</div>`;
    });
    if (questHtml === '<h3 style="color:#ff0;margin:0 0 8px 0;">Quests</h3>') questHtml += '<div style="color:#888;">No active quests</div>';
    questPanel.innerHTML = questHtml;
// Item usage paths and hints
const itemHints = {
    'Nano-Medkit': 'Restores HP. Use from inventory.',
    'Energy Drink': 'Restores HP and increases speed. Use from inventory.',
    'Cyber Blade': 'Increases attack power in combat (gang, wolf).',
    'EMP Grenade': 'Disables drones. Use at rooftops or drone events.',
    'Stealth Cloak': 'Improves sneaking chances in club and plaza.',

    'Hacking Rig': 'Required to hack terminals and containers.',
    'Neural Booster': 'Needed for mainframe hack in plaza.',
    'Cyber Armor': 'Reduces damage in combat.',
    'Street Map': 'Reveals all locations on the map.',
    'VIP Pass': 'Board the corporate shuttle at the helipad.',
    'Augment Chip': 'Install at cyber-doctor or use from inventory for stat boost.',
    'Night Vision': 'See in the underground and locked door scenes.',
    'Jet Boots': 'Instant rooftop travel.',
    'Motorbike': 'Increases travel speed.',
    'Hovercar': 'Greatly increases travel speed.',
    'Wolf Pelt': 'Craft Cyber Armor from inventory.',
    'Fish Chip': 'Eat to restore HP.',
    'Drone Battery': 'Restores HP when used.',
    'Rare Chip': 'Trade at hacker den for credits or upgrade.',
    'Prototype Drone': 'May be useful for a quest or trade.',
    'Mystery Package': 'Deliver to docks or bunker for quest reward.',
    'Bunker Key': 'Unlocks the locked door in underground.',
    'Data Chip': 'Deliver to figure in plaza for credits.'
};

let player = {
    name: 'Runner',
    hp: 20,
    maxHp: 20,
    credits: 10,
    inventory: [],
    vehicle: null,
    speed: 1,
    x: 2, // Alley center
    y: 2
};

let state = {
    scene: 'start',
};

function randomInt(min, max) {
    console.debug('randomInt called', min, max);
    console.debug('updateQuests called');
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

const shopItems = [
    { name: "Nano-Medkit", price: 8, effect: () => { player.inventory.push("Nano-Medkit"); } },
    { name: "Energy Drink", price: 5, effect: () => { player.inventory.push("Energy Drink"); } },
    { name: "Cyber Blade", price: 15, effect: () => { player.inventory.push("Cyber Blade"); } },
    { name: "EMP Grenade", price: 12, effect: () => { player.inventory.push("EMP Grenade"); } },
    { name: "Stealth Cloak", price: 20, effect: () => { player.inventory.push("Stealth Cloak"); } },
    { name: "Hacking Rig", price: 25, effect: () => { player.inventory.push("Hacking Rig"); } },
    { name: "Neural Booster", price: 30, effect: () => { player.inventory.push("Neural Booster"); } },
    { name: "Cyber Armor", price: 40, effect: () => { player.inventory.push("Cyber Armor"); } },
    { name: "Street Map", price: 10, effect: () => { player.inventory.push("Street Map"); } },
    { name: "VIP Pass", price: 50, effect: () => { player.inventory.push("VIP Pass"); } },
    { name: "Augment Chip", price: 60, effect: () => { player.inventory.push("Augment Chip"); } },
    { name: "Night Vision", price: 20, effect: () => { player.inventory.push("Night Vision"); } },
    { name: "Jet Boots", price: 80, effect: () => { player.inventory.push("Jet Boots"); } },
    { name: "Motorbike", price: 100, effect: () => { player.inventory.push("Motorbike"); } },
    { name: "Hovercar", price: 200, effect: () => { player.inventory.push("Hovercar"); } }
];

const scenes = {
    start: {
        text: "You awaken in a neon-lit alley. The city hums with electricity. Paths lead north to the street market, east to a shadowy club, west to the corporate plaza, south to the docks, up to the rooftops, and down to the underground.",
        choices: [
            { text: "Attack again", next: () => player.hp <= 0 ? "game_over" : (state.gangHp <= 0 ? "gang_outcome" : "fight_gang") },
            { text: "Run", next: "club" }
        ]
    },
    gang_outcome: {
        text: "You defeat the gang and loot 20 credits!",
        choices: [ { text: "Continue", next: "club" } ]
    },
    sneak_gang: {
        text: () => {
            let successChance = player.inventory.includes("Stealth Cloak") ? 1 : randomInt(1, 3);
            if (successChance === 1) {
                player.inventory.push("Data Chip");
                return "You sneak past and steal a valuable Data Chip!";
            } else {
                player.hp = Math.max(0, player.hp - 10);
                return "You are spotted and attacked! Lose 10 HP.";
            }
        },
        choices: [ { text: "Continue", next: () => player.hp <= 0 ? "game_over" : "club" } ]
    },

    use_battery: {
        text: () => {
            if (player.inventory.includes("Drone Battery")) {
                player.hp = Math.min(player.maxHp, player.hp + 20);
                player.inventory = player.inventory.filter(i => i !== "Drone Battery");
                return "You use the Drone Battery and restore 20 HP.";
            }
            return "You have no Drone Battery.";
        },
        choices: [ { text: "Back", next: "start" } ]
    },
    use_pelt: {
        text: () => {
            if (player.inventory.includes("Wolf Pelt")) {
                player.inventory = player.inventory.filter(i => i !== "Wolf Pelt");
                player.inventory.push("Cyber Armor");
                return "You craft Cyber Armor from the Wolf Pelt!";
            }
            return "You have no Wolf Pelt.";
        },
        choices: [ { text: "Back", next: "start" } ]
    },
    use_medkit: {
        text: () => {
            if (player.inventory.includes("Nano-Medkit")) {
                player.hp = Math.min(player.maxHp, player.hp + 15);
                player.inventory = player.inventory.filter(i => i !== "Nano-Medkit");
                return "You use a Nano-Medkit and restore 15 HP.";
            }
            return "You have no Nano-Medkit.";
        },
        choices: [ { text: "Back", next: "start" } ]
    },
    use_drink: {
        text: () => {
            if (player.inventory.includes("Energy Drink")) {
                player.hp = Math.min(player.maxHp, player.hp + 5);
                player.speed += 1;
                player.inventory = player.inventory.filter(i => i !== "Energy Drink");
                return "You use an Energy Drink, restore 5 HP, and feel faster!";
            }
            return "You have no Energy Drink.";
        },
        choices: [ { text: "Back", next: "start" } ]
    },
    use_emp: {
        text: () => {
            if (player.inventory.includes("EMP Grenade")) {
                player.inventory = player.inventory.filter(i => i !== "EMP Grenade");
                player.hp = Math.min(player.maxHp, player.hp + 10);
                return "You use an EMP Grenade to disable a nearby drone and gain 10 HP from looting its battery. Drones in your current cell are disabled.";
            }
            return "You have no EMP Grenade.";
        },
        choices: [ { text: "Back", next: "start" } ]
    },
    use_cloak: {
        text: () => {
            if (player.inventory.includes("Stealth Cloak")) {
                player.speed += 1;
                return "You wear the Stealth Cloak. Sneaking and movement are easier!";
            }
            return "You have no Stealth Cloak.";
        },
        choices: [ { text: "Back", next: "start" } ]
    },
    use_hacking: {
        text: () => {
            if (player.inventory.includes("Hacking Rig")) {
                player.credits += 10;
                return "You use your Hacking Rig to steal 10 credits from a nearby terminal.";
            }
            return "You have no Hacking Rig.";
        },
        choices: [ { text: "Back", next: "start" } ]
    },
    use_booster: {
        text: () => {
            if (player.inventory.includes("Neural Booster")) {
                player.maxHp += 5;
                return "You use the Neural Booster. Max HP increased!";
            }
            return "You have no Neural Booster.";
        },
        choices: [ { text: "Back", next: "start" } ]
    },
    use_armor: {
        text: () => {
            if (player.inventory.includes("Cyber Armor")) {
                player.hp = Math.min(player.maxHp, player.hp + 10);
                return "You wear Cyber Armor. You feel protected and restore 10 HP.";
            }
            return "You have no Cyber Armor.";
        },
        choices: [ { text: "Back", next: "start" } ]
    },
    use_map: {
        text: () => {
            if (player.inventory.includes("Street Map")) {
                return "You study the Street Map. All locations are revealed on the grid.";
            }
            return "You have no Street Map.";
        },
        choices: [ { text: "Back", next: "start" } ]
    },
    use_vip: {
        text: () => {
            if (player.inventory.includes("VIP Pass")) {
                player.vehicle = "Hovercar";
                player.speed = 3;
                return "You use your VIP Pass and get access to a Hovercar!";
            }
            return "You have no VIP Pass.";
        },
        choices: [ { text: "Back", next: "start" } ]
    },
    use_augment: {
        text: () => {
            if (player.inventory.includes("Augment Chip")) {
                player.maxHp += 10;
                player.speed += 1;
                return "You install the Augment Chip. Max HP and speed increased!";
            }
            return "You have no Augment Chip.";
        },
        choices: [ { text: "Back", next: "start" } ]
    },
    use_nightvision: {
        text: () => {
            if (player.inventory.includes("Night Vision")) {
                return "You activate Night Vision. You can see in the dark underground!";
            }
            return "You have no Night Vision.";
        },
        choices: [ { text: "Back", next: "start" } ]
    },
    use_jetboots: {
        text: () => {
            if (player.inventory.includes("Jet Boots")) {
                player.vehicle = "Jet Boots";
                player.speed = 2;
                return "You put on Jet Boots. Rooftop travel is instant and movement speed increased!";
            }
            return "You have no Jet Boots.";
        },
        choices: [ { text: "Back", next: "start" } ]
    },
    use_motorbike: {
        text: () => {
            if (player.inventory.includes("Motorbike")) {
                player.vehicle = "Motorbike";
                player.speed = 2;
                return "You hop on your Motorbike. Travel speed increased!";
            }
            return "You have no Motorbike.";
        },
        choices: [ { text: "Back", next: "start" } ]
    },
    use_hovercar: {
        text: () => {
            if (player.inventory.includes("Hovercar")) {
                player.vehicle = "Hovercar";
                player.speed = 3;
                return "You enter your Hovercar. Travel speed greatly increased!";
            }
            return "You have no Hovercar.";
        },
        choices: [ { text: "Back", next: "start" } ]
    }
};

function render() {
    console.debug('render called', state.scene);
    let scene = scenes[state.scene];
    if (!scene) return;
    if (scene.effect) scene.effect();
    // Defensive: check all DOM elements before using
    const canvas = document.getElementById('map-canvas');
    if (!canvas) return;
    const storyElement = document.getElementById('story');
    const choicesElement = document.getElementById('choices');
    const statsElement = document.getElementById('stats');
    if (!storyElement || !choicesElement || !statsElement) return;
    // Enhanced bird's-eye city map with icons, colors, neon background
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Neon city background
    ctx.save();
    ctx.globalAlpha = 0.18;
    for (let i = 0; i < 8; i++) {
        ctx.beginPath();
        ctx.arc(200 + Math.sin(i)*120, 150 + Math.cos(i)*90, 80 + i*8, 0, 2*Math.PI);
        ctx.fillStyle = i%2 ? '#0ff' : '#f0f';
        ctx.shadowColor = i%2 ? '#0ff' : '#f0f';
        ctx.shadowBlur = 40;
        ctx.fill();
    }
    ctx.restore();
    // Define city locations, types, and coordinates
    const cityMap = {
        alley: { x: 200, y: 250, type: 'start' },
        market: { x: 80, y: 180, type: 'shop' },
        club: { x: 320, y: 180, type: 'danger' },
        plaza: { x: 200, y: 100, type: 'quest' },

        shop: { x: 120, y: 160, type: 'shop' },
        cybercafe: { x: 200, y: 160, type: 'shop' },
        performer: { x: 280, y: 160, type: 'special' },
        luxury_store: { x: 320, y: 100, type: 'shop' },
        food_stall: { x: 80, y: 120, type: 'shop' },
        boat_captain: { x: 320, y: 30, type: 'special' },
        outskirts: { x: 360, y: 250, type: 'danger' },
        bunker: { x: 360, y: 280, type: 'quest' },
        cyber_wolf: { x: 360, y: 200, type: 'danger' },
        fisherman: { x: 320, y: 280, type: 'special' },
        dealer: { x: 80, y: 280, type: 'danger' },
        container: { x: 120, y: 280, type: 'special' },
        mystery_box: { x: 160, y: 280, type: 'special' },
        terminal: { x: 120, y: 100, type: 'quest' },
        figure: { x: 160, y: 100, type: 'quest' }
    };
    // Draw roads (connections)
    const connections = [
        ['alley', 'market'], ['alley', 'club'], ['alley', 'plaza'], ['alley', 'docks'],
        ['market', 'shop'], ['market', 'food_stall'], ['market', 'cybercafe'], ['market', 'performer'],
        ['club', 'luxury_store'], ['club', 'performer'],
        ['plaza', 'terminal'], ['plaza', 'figure'], ['plaza', 'luxury_store'],
        ['docks', 'boat_captain'], ['docks', 'fisherman'], ['docks', 'dealer'], ['docks', 'container'], ['docks', 'mystery_box'],
        ['underground', 'market'], ['rooftops', 'club'], ['outskirts', 'bunker'], ['outskirts', 'cyber_wolf'],
        ['shop', 'cybercafe'], ['performer', 'luxury_store'], ['food_stall', 'market'],
        ['dealer', 'container'], ['container', 'mystery_box'], ['mystery_box', 'fisherman']
    ];
    ctx.save();
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 4;
    connections.forEach(([a, b]) => {
        const p1 = cityMap[a], p2 = cityMap[b];
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
    if (!window._playerAnim) window._playerAnim = { x: scenePos.x, y: scenePos.y };
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
        let isQuest = pos.type === 'quest';
        let fill, glow;
        if (pos.type === 'shop') { fill = '#0ff'; glow = '#0ff'; }
        else if (pos.type === 'danger') { fill = '#f00'; glow = '#f00'; }
        else if (pos.type === 'quest') { fill = '#ff0'; glow = '#ff0'; }
        else if (pos.type === 'special') { fill = '#0f0'; glow = '#0f0'; }
        else { fill = '#222'; glow = '#fff'; }
        // Icon shape by type
        if (pos.type === 'shop') {
            ctx.beginPath();
            ctx.rect(pos.x-14, pos.y-14, 28, 28);
        } else if (pos.type === 'danger') {
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, 18, 0, 2*Math.PI);
        } else if (pos.type === 'quest') {
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y-18);
            ctx.lineTo(pos.x+18, pos.y+18);
            ctx.lineTo(pos.x-18, pos.y+18);
            ctx.closePath();
        } else if (pos.type === 'special') {
            ctx.beginPath();
            ctx.ellipse(pos.x, pos.y, 18, 12, 0, 0, 2*Math.PI);
        } else {
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, 18, 0, 2*Math.PI);
        }
        ctx.fillStyle = loc === state.scene ? '#f0f' : fill;
        ctx.shadowColor = loc === state.scene ? '#f0f' : glow;
        ctx.shadowBlur = loc === state.scene ? 24 : (isQuest ? 18 : 12);
        ctx.globalAlpha = isQuest ? 0.95 : 0.85;
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = glow;
        ctx.stroke();
        // Draw icon (simple cyberpunk glyph)
        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.globalAlpha = 0.7;
        if (pos.type === 'shop') {
            ctx.beginPath(); ctx.moveTo(-8,0); ctx.lineTo(8,0); ctx.moveTo(0,-8); ctx.lineTo(0,8); ctx.strokeStyle='#fff'; ctx.lineWidth=2; ctx.stroke();
        } else if (pos.type === 'danger') {
            ctx.beginPath(); ctx.arc(0,0,6,0,2*Math.PI); ctx.strokeStyle='#fff'; ctx.lineWidth=2; ctx.stroke();
            ctx.beginPath(); ctx.moveTo(-8,-8); ctx.lineTo(8,8); ctx.moveTo(8,-8); ctx.lineTo(-8,8); ctx.strokeStyle='#fff'; ctx.lineWidth=1; ctx.stroke();
        } else if (pos.type === 'quest') {
            ctx.beginPath(); ctx.moveTo(0,-8); ctx.lineTo(8,8); ctx.lineTo(-8,8); ctx.closePath(); ctx.strokeStyle='#fff'; ctx.lineWidth=2; ctx.stroke();
        } else if (pos.type === 'special') {
            ctx.beginPath(); ctx.arc(0,0,8,0,2*Math.PI); ctx.strokeStyle='#fff'; ctx.lineWidth=2; ctx.stroke();
        }
        ctx.restore();
        // Location label
        ctx.font = 'bold 13px Orbitron, Segoe UI';
        ctx.fillStyle = '#fff';
        ctx.shadowColor = '#0ff';
        ctx.shadowBlur = 4;
        ctx.fillText(loc.replace(/_/g, ' '), pos.x - 28, pos.y - 24);
        ctx.restore();
    });
    // --- Draw animated player dot ---
    ctx.save();
    ctx.beginPath();
    ctx.arc(anim.x, anim.y, 12, 0, 2 * Math.PI);
    ctx.fillStyle = '#0ff';
    ctx.shadowColor = '#0ff';
    ctx.shadowBlur = 16;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#fff';
    ctx.stroke();
    ctx.restore();
    // --- Tooltips on hover ---
    canvas.onmousemove = function(e) {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        let found = null;
        Object.entries(cityMap).forEach(([loc, pos]) => {
            let dx = mx - pos.x, dy = my - pos.y;
            if (Math.sqrt(dx*dx+dy*dy) < 22) found = { loc, pos };
        });
        let tip = document.getElementById('map-tooltip');
        if (!tip) {
            tip = document.createElement('div');
            tip.id = 'map-tooltip';
            tip.style.position = 'absolute';
            tip.style.pointerEvents = 'none';
            tip.style.zIndex = 1000;
            tip.style.background = 'rgba(20,20,40,0.95)';
            tip.style.color = '#0ff';
            tip.style.fontFamily = 'Orbitron, Segoe UI, sans-serif';
            tip.style.fontWeight = 'bold';
            tip.style.padding = '8px 16px';
            tip.style.borderRadius = '10px';
            tip.style.boxShadow = '0 0 16px #0ff, 0 0 32px #f0f';
            document.body.appendChild(tip);
        }
        if (found) {
            tip.textContent = found.loc.replace(/_/g, ' ');
            tip.style.left = (e.clientX + 12) + 'px';
            tip.style.top = (e.clientY - 12) + 'px';
            tip.style.display = 'block';
        } else {
            tip.style.display = 'none';
        }
    };
    canvas.onmouseleave = function() {
        let tip = document.getElementById('map-tooltip');
        if (tip) tip.style.display = 'none';
    };
    // --- Animate ---
    if (anim.x !== target.x || anim.y !== target.y) setTimeout(render, 16);
    // Show story text
    storyElement.innerHTML = (typeof scene.text === 'function' ? scene.text() : scene.text);
    choicesElement.innerHTML = '';
    // Scene choices (inject stat-based options for plaza)
    let choices = [...scene.choices];
    if (state.scene === 'plaza' && character.hacking >= 2) {
        choices.push({ text: "Hack corporate server (Hacking 2+)", next: "hack_server" });
    }
    choices.forEach(choice => {
        if (!choice) return;
        if (choice.condition && !choice.condition()) return;
        const btn = document.createElement('button');
        btn.textContent = choice.text;
        btn.onclick = () => {
            state.scene = typeof choice.next === 'function' ? choice.next() : choice.next;
            render();
        };
        choicesElement.appendChild(btn);
    });
    // Vehicle display
    let vehicleText = player.vehicle ? `Vehicle: ${player.vehicle} (Speed: ${player.speed})` : 'On foot';
    statsElement.innerHTML = `HP: ${player.hp}/${player.maxHp} | Credits: ${player.credits} | ${vehicleText}`;

    // Inventory visual update with hint button
    const inventoryPanel = document.getElementById('inventory-visual');
    if (inventoryPanel) {
        inventoryPanel.innerHTML = '';
        if (player.inventory.length === 0) {
            inventoryPanel.innerHTML = '<span style="color:#888">Inventory empty</span>';
        } else {
            player.inventory.forEach(item => {
                const itemDiv = document.createElement('div');
                itemDiv.textContent = item;
                itemDiv.style.padding = '6px 12px';
                itemDiv.style.margin = '4px';
                itemDiv.style.background = 'linear-gradient(90deg,#0ff2,#f0f2)';
                itemDiv.style.color = '#222';
                itemDiv.style.borderRadius = '8px';
                itemDiv.style.fontFamily = 'Orbitron, Segoe UI, sans-serif';
                itemDiv.style.fontWeight = 'bold';
                itemDiv.style.boxShadow = '0 0 8px #0ff, 0 0 16px #f0f';
                // Add hint button
                const hintBtn = document.createElement('button');
                hintBtn.textContent = 'Get Hint';
                hintBtn.style.marginLeft = '12px';
                hintBtn.style.background = 'linear-gradient(90deg,#222 60%, #0ff2 100%)';
                hintBtn.style.color = '#0ff';
                hintBtn.style.border = '2px solid #0ff';
                hintBtn.style.borderRadius = '8px';
                hintBtn.style.fontFamily = 'Orbitron, Segoe UI, sans-serif';
                hintBtn.style.fontWeight = 'bold';
                hintBtn.style.cursor = 'pointer';
                hintBtn.onclick = () => {
                    alert(itemHints[item] || 'No hint available for this item.');
                };
                itemDiv.appendChild(hintBtn);
                inventoryPanel.appendChild(itemDiv);
            });
        }
    }

    if (player.hp <= 0 && state.scene !== 'game_over') {
        state.scene = 'game_over';
        render();
        return;
    }

    // Game over scene handling
    if (state.scene === 'game_over') {
        storyElement.innerHTML = '<span style="color:#f00;font-size:1.5em;text-shadow:0 0 8px #f00;">GAME OVER</span><br>You have died.';
        choicesElement.innerHTML = '';
        const restartBtn = document.createElement('button');
        restartBtn.textContent = 'Restart';
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
            state.scene = 'start';
            state.gangHp = 18;
            state.wolfHp = 20;
            render();
        };
        choicesElement.appendChild(restartBtn);
        statsElement.innerHTML = '';
        // Clear inventory visual
        const inventoryPanel = document.getElementById('inventory-visual');
        if (inventoryPanel) inventoryPanel.innerHTML = '';
        return;
    }
}
function movePlayer(dx, dy) {
    console.debug('movePlayer called', dx, dy);
    const newX = player.x + dx;
    const newY = player.y + dy;
    // Ensure player stays within bounds
    if (newX >= 0 && newX < mapGrid[0].length && newY >= 0 && newY < mapGrid.length) {
        player.x = newX;
        player.y = newY;
        // Optionally, update scene based on new location
        // Example: state.scene = mapGrid[newY][newX] || state.scene;
        // If you want to auto-change scene, uncomment above line
    }
    render();
}
window.movePlayer = movePlayer;
console.debug('movePlayer assigned to window');

// Initialize gang HP for combat
state.gangHp = 18;

    document.addEventListener('DOMContentLoaded', () => {
        try {
            render();
        } catch (e) {
            const story = document.getElementById('story');
            if (story) story.innerHTML = '<span style="color:#f00">Game failed to load: ' + e.message + '</span>';
        }
    });
    // Fallback for older browsers or if DOMContentLoaded fails
    window.onload = function() {
        try {
            render();
        } catch (e) {
            const story = document.getElementById('story');
            if (story) story.innerHTML = '<span style="color:#f00">Game failed to load: ' + e.message + '</span>';
        }
    };

}
