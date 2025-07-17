// --- Story content ---
import { player, state } from './gameplay.js';
import { render } from './engine/engine.js';
export const mainLocations = [
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
export const cityMap = {};
export const cityLayout = {
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
export const itemDefs = {};
// --- FULL UNIQUE ITEM DEFINITIONS ---
export const uniqueItems = [
  { name: "Neon Blade", description: "A glowing monomolecular blade. Boosts strength.", effect: p => p.strength = (p.strength||0)+2 },
  { name: "Holo Cloak", description: "A shimmering cloak that bends light. Boosts stealth.", effect: p => p.stealth = (p.stealth||0)+2 },
  { name: "Data Spike", description: "A hacking tool for breaking into terminals. Boosts hacking.", effect: p => p.hacking = (p.hacking||0)+2 },
  { name: "Stim Patch", description: "A quick-heal patch. Restores 5 HP.", effect: p => p.hp = Math.min(p.maxHp, (p.hp||0)+5) },
  { name: "Credit Chit", description: "A digital wallet loaded with credits.", effect: p => p.credits = (p.credits||0)+20 },
  // ...add all other item definitions here, as in the original game.js...
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
export const subNames = {
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
export let scenes = {};
// --- SCENE GENERATION LOGIC ---
mainLocations.forEach((main) => {
  // All references to player, state, render now use imported modules
  let mainBranches = [];
  if (main === "alley") {
    mainBranches = [
      // ...existing alley branches...
    ];
  } else if (main === "market") {
    mainBranches = [
      {
        text: `Visit the Black Market (Charisma 3+ or Credit Chit)\nThe market is a maze of neon stalls and shouting vendors. The Black Market glows in a hidden corner, guarded by a cyborg merchant.`,
        condition: () => player.stats.charisma >= 3 || player.inventory.includes("Credit Chit"),
        action: () => {
          player.inventory.push("EMP Grenade");
          alert("You charm the merchant or flash your Credit Chit. You acquire an EMP Grenade!");
          render();
        }
      },
      {
        text: `Steal from a vendor (Stealth 4+ or Holo Cloak)`,
        condition: () => player.stats.stealth >= 4 || player.inventory.includes("Holo Cloak"),
        action: () => {
          player.credits += 25;
          alert("You slip through the crowd and snatch a credstick. +25 credits!");
          render();
        }
      }
    ];
  } else if (main === "club") {
    mainBranches = [
      {
        text: `Hack the DJ Booth (Technical 4+ or Data Spike)`,
        condition: () => player.stats.technical >= 4 || player.inventory.includes("Data Spike"),
        action: () => {
          player.inventory.push("VIP Pass");
          alert("You hack the sound system and impress the crowd. You receive a VIP Pass!");
          render();
        }
      },
      {
        text: `Dance Off (Agility 4+)`,
        condition: () => player.stats.agility >= 4,
        action: () => {
          player.stats.reputation = (player.stats.reputation || 0) + 2;
          alert("You win the dance off! Reputation +2.");
          render();
        }
      }
    ];
  } else if (main === "plaza") {
    mainBranches = [
      {
        text: `Talk to the Info Terminal (Technical 3+)`,
        condition: () => player.stats.technical >= 3,
        action: () => {
          player.inventory.push("Encrypted Drive");
          alert("The Info Terminal gives you an Encrypted Drive for your skills.");
          render();
        }
      },
      {
        text: `Street Performer Challenge (Charisma 4+ or Synth Ale)`,
        condition: () => player.stats.charisma >= 4 || player.inventory.includes("Synth Ale"),
        action: () => {
          player.stats.reputation = (player.stats.reputation || 0) + 1;
          alert("You impress the crowd or bribe the performer. Reputation +1.");
          render();
        }
      }
    ];
  } else if (main === "docks") {
    mainBranches = [
      {
        text: `Sneak onto a boat (Stealth 4+ or Holo Cloak)`,
        condition: () => player.stats.stealth >= 4 || player.inventory.includes("Holo Cloak"),
        action: () => {
          player.inventory.push("Rare Chip");
          alert("You sneak aboard and find a Rare Chip!");
          render();
        }
      },
      {
        text: `Bribe the dockmaster (Credits 20+)`,
        condition: () => player.credits >= 20,
        action: () => {
          player.credits -= 20;
          player.inventory.push("Energy Cell");
          alert("You bribe the dockmaster and receive an Energy Cell.");
          render();
        }
      }
    ];
  }
  // ...repeat for all main locations: market, club, plaza, docks, rooftops, underground, cybercafe, luxury_store, outskirts, bunker, terminal...
  scenes[main] = {
    text: `You arrive at the ${main}. What will you do?`,
    choices: [
      ...mainBranches,
      ...Array(5).fill(0).map((_, i) => ({
        text: `Explore ${subNames[main][i] || `sub-location ${i + 1}`}`,
        next: `${main}_sub${i + 1}`,
      })),
      { text: "Return to alley", next: "alley" },
    ],
  };
  for (let j = 1; j <= 5; j++) {
    const sub = `${main}_sub${j}`;
    const subName = subNames[main][j - 1] || `Sector ${j}`;
    let gameplayText = "";
    let choices = [];
    // Example: alley sub-location 1
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
    }
    // Market sub-location 1
    if (main === "market" && j === 1) {
      gameplayText = "A shady dealer offers you a mysterious chip.";
      choices = [
        {
          text: "Buy chip (Credits 15+)",
          condition: () => player.credits >= 15,
          action: () => {
            player.credits -= 15;
            player.inventory.push("Rare Chip");
            alert("You buy the Rare Chip.");
            render();
          }
        },
        { text: "Refuse", next: main }
      ];
    }
    // Club sub-location 1
    if (main === "club" && j === 1) {
      gameplayText = "A bouncer blocks the VIP Lounge.";
      choices = [
        {
          text: "Show VIP Pass",
          condition: () => player.inventory.includes("VIP Pass"),
          action: () => {
            player.stats.reputation = (player.stats.reputation || 0) + 1;
            alert("You enter the VIP Lounge. Reputation +1.");
            render();
          }
        },
        { text: "Leave", next: main }
      ];
    }
    // Plaza sub-location 1
    if (main === "plaza" && j === 1) {
      gameplayText = "A street vendor sells Synth Ale.";
      choices = [
        {
          text: "Buy Synth Ale (Credits 5+)",
          condition: () => player.credits >= 5,
          action: () => {
            player.credits -= 5;
            player.inventory.push("Synth Ale");
            alert("You buy Synth Ale.");
            render();
          }
        },
        { text: "Decline", next: main }
      ];
    }
    // Docks sub-location 1
    if (main === "docks" && j === 1) {
      gameplayText = "A smuggler offers to sell you an Energy Cell.";
      choices = [
        {
          text: "Buy Energy Cell (Credits 10+)",
          condition: () => player.credits >= 10,
          action: () => {
            player.credits -= 10;
            player.inventory.push("Energy Cell");
            alert("You buy an Energy Cell.");
            render();
          }
        },
        { text: "Walk away", next: main }
      ];
    }
    // ...repeat for all sub-locations and main locations, with full gameplay and branching...
    scenes[sub] = {
      text: `${subName}: ${gameplayText}`,
      choices
    };
  }
});
// --- Story logic ---
export const itemHints = {
  "Neon Blade": "Can be used to intimidate or defeat gang members in the alley.",
  "Holo Cloak": "Lets you sneak past enemies and avoid detection in dark areas.",
  "Data Spike": "Required for hacking terminals and bypassing security.",
  "Stim Patch": "Restores health instantly. Useful after combat.",
  "Credit Chit": "Spend at shops or bribe NPCs for information or access.",
  "Rare Chip": "Needed for a hacker quest. Seek out the underground or cybercafe.",
  "Prototype Cyberware": "Can be installed for stat boosts. Needed for corp espionage quest.",
  "EMP Grenade": "Disables electronics. Useful in market, club, or luxury_store.",
  "Encrypted Drive": "Deliver to plaza for a quest reward.",
  "Synth Ale": "Give to street performer in plaza for charisma boost.",
  "VIP Pass": "Grants access to club VIP area and special events.",
  "Drone Parts": "Combine with Rare Chip for crafting AI Drone.",
  "AI Core": "Needed for advanced hacking quests.",
  "Security Badge": "Bypass security doors in luxury_store and terminal.",
  "Energy Cell": "Power up certain cyberware and vehicles.",
  // ...add hints for all other items as needed...
};

// --- Quest descriptions ---
export const questDescriptions = {
  packageDelivery: "Deliver the Mystery Package to the docks or bunker.",
  dataHeist: "Steal the Data Chip from the club and deliver it to the plaza figure.",
  rareChipTrade: "Find a hacker interested in the Rare Chip.",
  corpEspionage: "Infiltrate the luxury store and steal the prototype cyberware.",
};

// --- Scene branching and sub-location gameplay ---
mainLocations.forEach((main) => {
  let mainBranches = [];
  if (main === "alley") {
    mainBranches = [
      {
        text: `Confront the gang (Strength 4+ or Neon Blade)\nYou step into the neon-lit alley, boots splashing in puddles of oil and rain. The gang blocks your path, their faces obscured by flickering holomasks. One cracks his knuckles, another twirls a glowing chain. The air is thick with tension and the distant hum of city drones. You can smell synth-ale and ozone. A rat scurries past your foot. The gang leader grins, revealing gold-plated teeth. "This is our turf, choom. Pay up or bleed out." You clench your fists, feeling the weight of your cybernetic enhancements. The alley narrows behind you, escape impossible. A flicker of movement catches your eye—a hidden camera, recording everything. The gang's laughter echoes off the graffiti-stained walls. You sense a test of strength, reputation, and nerve. The city watches. Will you stand tall or back down? The rain intensifies, washing neon colors down the walls. Your heart pounds. The gang closes in, ready for a show.`,
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
        text: `Sneak past the gang (Agility 3+ or Holo Cloak)\nYou press yourself against the cold, damp wall, blending into the shadows. The gang is distracted, arguing over loot. Your Holo Cloak shimmers, distorting your outline. You time your movements with the flicker of neon signs and the rumble of passing hovercars. A cat yowls, masking your footsteps. You slip behind a dumpster, heart racing. The gang's lookout glances your way, but your agility and tech keep you hidden. You spot a discarded datachip glinting in the trash. The alley seems to stretch forever, every step a risk. You hear a snippet of conversation—something about a big job at the docks. The city smells of rain and burnt circuits. You reach the far end, unseen.`,
        condition: () => player.stats.agility >= 3 || player.inventory.includes("Holo Cloak"),
        action: () => {
          alert(`You move like a ghost, unseen and unheard. As you pass, you overhear a secret code: 9X-ALPHA. You pocket an Encrypted Code from the trash. The gang never knew you were there.`);
          player.inventory.push("Encrypted Code");
          render();
        }
      },
      {
        text: `Hack the alley cameras (Technical 3+ or Data Spike)\nYou kneel beside a rusted access panel, tools at the ready. The rain sparks against exposed wires. You jack in, your neural interface flooding with data. The city's security grid pulses beneath your fingertips. You bypass firewalls, reroute power, and disable the alley's cameras. The gang is oblivious, their crimes unrecorded. You spot a hidden cache icon blinking on your HUD. The system offers up secrets: gang hideouts, police patrols, and a stash nearby. Your technical skill is your weapon. The city is a puzzle, and you hold the key.`,
        condition: () => player.stats.technical >= 3 || player.inventory.includes("Data Spike"),
        action: () => {
          alert(`You disable the cameras, erasing all evidence. A hidden panel slides open, revealing a cache of supplies. You gain a Hidden Cache. The city rewards the clever.`);
          player.inventory.push("Hidden Cache");
          render();
        }
      }
    ];
  }
  // ...repeat for all main locations: market, club, plaza, docks, rooftops, underground, cybercafe, luxury_store, outskirts, bunker, terminal, with full branching and narrative...
  scenes[main] = {
    text: `You arrive at the ${main}. What will you do?`,
    choices: [
      ...mainBranches,
      ...Array(5).fill(0).map((_, i) => ({
        text: `Explore ${subNames[main][i] || `sub-location ${i + 1}`}`,
        next: `${main}_sub${i + 1}`,
      })),
      { text: "Return to alley", next: "alley" },
    ],
  };
  for (let j = 1; j <= 5; j++) {
    const sub = `${main}_sub${j}`;
    const subName = subNames[main][j - 1] || `Sector ${j}`;
    let gameplayText = "";
    let choices = [];
    // Example: alley sub-location 1
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
    }
    // ...repeat for all sub-locations and main locations, with full gameplay and branching...
    scenes[sub] = {
      text: `${subName}: ${gameplayText}`,
      choices
    };
  }
});
