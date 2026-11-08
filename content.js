/* Verge City — rooms, items, districts and endings.
   Everything in this file is data plus small handlers; the engine in game.js exposes the
   helper object `G` (has, give, take, check, damage, heal, credits, flag, set, rep, heat,
   note, say, go, rnd, end) which these handlers call. */
(function () {
  const STATS = {
    muscle: { label: "Muscle", blurb: "Fighting, forcing doors, carrying the day." },
    reflex: { label: "Reflex", blurb: "Sneaking, running, catching things before they fall." },
    tech:   { label: "Tech",   blurb: "Hacking terminals, rewiring breakers, reading encrypted data." },
    charm:  { label: "Charm",  blurb: "Talking your way past people who would rather you did not." }
  };

  /* Items. `bonus` adds to a stat during checks; `use` is a consumable action from the inventory. */
  const ITEMS = {
    lockbox:    { name: "Sealed Lockbox", desc: "Matte black, warm to the touch. Someone died carrying it." },
    stim:       { name: "Stim Patch", desc: "Restores 5 HP.", use: (G) => { G.heal(5); return "The patch hisses against your neck. The pain recedes."; } },
    synth_ale:  { name: "Synth Ale", desc: "Restores 2 HP. Someone in the Plaza might want it more.", use: (G) => { G.heal(2); return "Sweet, fizzy, faintly electrical. You feel a little better."; } },
    noodles:    { name: "Hot Noodles", desc: "Restores 3 HP.", use: (G) => { G.heal(3); return "Still hot. Nothing in this city tastes as honest."; } },
    neon_blade: { name: "Neon Blade", desc: "+2 Muscle in fights.", bonus: { muscle: 2 } },
    holo_cloak: { name: "Holo Cloak", desc: "+2 Reflex when sneaking.", bonus: { reflex: 2 } },
    data_spike: { name: "Data Spike", desc: "+2 Tech when hacking.", bonus: { tech: 2 } },
    emp:        { name: "EMP Grenade", desc: "Kills electronics in a ten-metre radius. One use." },
    vip_pass:   { name: "VIP Pass", desc: "Club Static lets holders straight in." },
    badge:      { name: "Helix Security Badge", desc: "Opens Helix doors. Smile at the cameras." },
    keycard:    { name: "Encrypted Keycard", desc: "Someone's lift key. The Rooftops lift, you suspect." },
    data_chip:  { name: "Static's Data Chip", desc: "Lifted from the bar at Club Static. The Collective would pay to read it." },
    rare_chip:  { name: "Rare Chip", desc: "Pre-Collapse silicon. Scavengers value it above credits." },
    drive:      { name: "Encrypted Drive", desc: "Helix internal files. Leverage, if you can find the right person." },
    boat_pass:  { name: "Boat Pass", desc: "One crossing to the Outskirts." },
    rail_ticket:{ name: "Rail Ticket", desc: "One seat on the night train out of Verge City." },
    proto:      { name: "Prototype Cyberware", desc: "Install for +4 max HP.", use: (G) => { G.s.player.maxHp += 4; G.heal(4); return "The implant settles under your skin with a click you feel in your teeth. You are harder to kill now."; } },
    street_map: { name: "Street Map", desc: "Every district, lit on your map." },
    vest:       { name: "Nano-weave Vest", desc: "Every hit does 1 less damage." },
    credstick:  { name: "Credstick", desc: "Someone else's savings. Cash in for 20 credits.", use: (G) => { G.credits(20); return "The credstick empties into your account with a cheerful chime."; } }
  };

  const FACTIONS = {
    syndicate: "Syndicate",
    helix: "Helix Corp",
    collective: "The Collective",
    watch: "City Watch",
    citizens: "Citizens"
  };

  /* Districts: the hub room shares the district id. `gate` returns a room to visit before the hub
     until the district is unlocked. `locked` controls the map colour. */
  const DISTRICTS = {
    alley:        { name: "Rain Alley" },
    market:       { name: "Night Market" },
    cybercafe:    { name: "Cybercafé Lumen" },
    plaza:        { name: "Civic Plaza" },
    club:         { name: "Club Static", gate: (s) => (s.flags.clubAccess ? null : "club_door") },
    rooftops:     { name: "The Rooftops", gate: (s) => (s.flags.roofAccess ? null : "roof_lift"), locked: (s) => !s.flags.roofAccess },
    luxury_store: { name: "Helix Showroom", gate: (s) => (s.flags.helixAccess ? null : "helix_door"), locked: (s) => !s.flags.helixAccess },
    docks:        { name: "The Docks" },
    outskirts:    { name: "The Outskirts" },
    terminal:     { name: "Rail Terminal" },
    underground:  { name: "The Underground" },
    bunker:       { name: "The Bunker", gate: (s) => (s.flags.bunkerOpen ? null : "bunker_door"), locked: (s) => !s.flags.bunkerOpen }
  };

  const START_KNOWN = ["alley", "market", "plaza", "underground"];

  const R = {};

  /* ------------------------------------------------------------------ Intro */
  R.intro = {
    district: "alley", name: "Rain Alley",
    text: (s) => `Rain. The kind that never quite stops in Verge City, that smells of coolant and hot pavement.

You are ${s.player.name}, a runner with a reputation that fits in a pocket and ${s.player.credits} credits that fit in a smaller one. You have been waiting in this alley for forty minutes for a courier who is now ten minutes late.

Then the courier arrives, at speed, on his back. Someone has put three rounds through his jacket. He skids to a stop against the dumpster beside you, and the matte black case cuffed to his wrist clatters on the wet concrete.

"Docks," he says, blood in the word. "Kestrel. Don't open it." His eyes stay open. His hand does not.

Somewhere above, a drone changes course.`,
    choices: () => [
      { label: "Kneel beside the body", do: () => G.go("alley_body") },
      { label: "Walk away quickly", hint: "the Watch will be here soon", do: () => { G.set("refused"); G.note("Left a dead courier and his case in Rain Alley."); G.go("alley", "You keep your hands in your pockets and your eyes on the pavement. Whatever that case is, it is somebody else's problem now. Probably."); } }
    ]
  };

  R.alley_body = {
    district: "alley", name: "Rain Alley — the courier",
    text: `The courier's cuff has a cheap mag-lock; the case is heavier than it looks and faintly warm. There is a Syndicate tattoo under his collar, fresh enough to still be pink at the edges.

His jacket pockets bulge. The drone overhead has definitely noticed you.`,
    choices: (s) => [
      { label: "Take the lockbox", hint: "start the job", when: !s.flags.lockboxTaken, do: () => {
          G.set("lockboxTaken"); G.give("lockbox"); G.heat(1);
          G.note("Took a Syndicate lockbox from a dying courier. Deliver to Kestrel at the Docks. Do not open it.");
          G.say("The cuff pops. The case is yours, along with whatever killed him for it. The drone drops lower, recording.");
        } },
      { label: "Search his pockets", when: !s.flags.courierSearched, do: () => {
          G.set("courierSearched"); G.give("stim"); G.credits(6);
          G.say("A Stim Patch, six credits, and a club flyer for somewhere called Static with a name scrawled on the back: MARA.");
          G.note("The courier carried a flyer for Club Static with the name MARA on it.");
        } },
      { label: "Close his eyes and go", do: () => G.go("alley", s.flags.lockboxTaken ? "You step out of the alley carrying a dead man's job." : "You step out of the alley lighter than you could have been.") }
    ]
  };

  /* ------------------------------------------------------------------ Alley */
  R.alley = {
    district: "alley", hub: true, name: "Rain Alley",
    text: (s) => {
      let t = "Rain Alley is the seam between the Market and the Underground: graffiti, dumpsters, one working streetlight.";
      if (s.flags.lockboxTaken && !s.flags.courierGone) t += " The courier's body has already gone; the Syndicate collects its own.";
      if (s.flags.gangDone) t += " The Chrome Dogs have moved on from the back gate, leaving a few cigarette butts and a stronger smell of ozone.";
      else t += " Near the back gate, three figures in matching jackets are pretending not to watch you. Chrome Dogs, the local Syndicate crew.";
      t += " A rusted camera housing on the wall still blinks.";
      return t;
    },
    choices: (s) => [
      { label: "Deal with the Chrome Dogs", when: !s.flags.gangDone, do: () => G.go("alley_gang") },
      { label: "Look at the camera housing", when: !s.flags.camerasDone, do: () => G.go("alley_cameras") }
    ]
  };

  R.alley_gang = {
    district: "alley", name: "Rain Alley — back gate",
    text: (s) => `The tallest Chrome Dog steps into your path. His jaw is plated and his eyes are a cheap aftermarket red. "Toll's ten credits, runner." ${s.flags.lockboxTaken ? "His eyes drop to the case. \"Or whatever's in that.\"" : ""}

The other two shift to block the gate. A rat watches from the dumpster with professional interest.`,
    choices: (s) => [
      { label: "Fight them", hint: `Muscle ${G.bonus("muscle")}/3${G.has("neon_blade") ? " · Neon Blade" : ""}`, do: () => {
          if (G.check("muscle", 3)) {
            G.set("gangDone"); G.credits(12); G.rep("syndicate", -1); G.heat(1);
            G.note("Beat the Chrome Dogs at the alley gate.");
            G.go("alley", "The plated one swings first and widest. You step inside it and the fight is over before the other two decide whether to join in. You take twelve credits from his jacket. The camera on the wall saw all of it.");
          } else {
            G.damage(4, "a plated fist");
            G.go("alley", "The plated one is faster than he looks. You come to against the dumpster with the taste of copper in your mouth. The Chrome Dogs are laughing. They have not taken anything; this was a lesson, not a robbery.");
          }
        } },
      { label: "Slip past them", hint: `Reflex ${G.bonus("reflex")}/3${G.has("holo_cloak") ? " · Holo Cloak" : ""}`, do: () => {
          if (G.check("reflex", 3)) {
            G.set("gangDone"); G.give("keycard");
            G.note("Overheard the Chrome Dogs: Kestrel has a buyer lined up at the Docks. Found a keycard in the trash.");
            G.go("alley", "You wait for the streetlight to stutter and move with it. Passing the dumpster you hear them: \"Kestrel's got a buyer at the Docks tonight, Helix money.\" Something glints in the trash as you pass: an encrypted keycard on a lanyard, stamped with a rooftop lift logo.");
          } else {
            G.damage(2, "a thrown bottle"); G.heat(0);
            G.go("alley", "A bottle catches you above the ear as you break for the gate. You get through, but they know your face now, and they are still between you and that gate.");
          }
        } },
      { label: "Pay the toll (10 credits)", when: G.canPay(10), do: () => {
          G.credits(-10); G.set("gangDone"); G.rep("syndicate", 1);
          G.go("alley", "Ten credits change hands. The plated one nods like you have passed a test. \"Smart. Kestrel likes smart.\" They drift away from the gate.");
        } },
      { label: "Talk them down", hint: `Charm ${G.bonus("charm")}/3`, do: () => {
          if (G.check("charm", 3)) {
            G.set("gangDone"); G.rep("syndicate", 1); G.set("knowsBuyer");
            G.note("Learned from the Chrome Dogs that Kestrel is waiting at the Docks for the case.");
            G.go("alley", "You tell them you are running a job for Kestrel and would hate to explain why you were late. The name does its work. \"Docks,\" the plated one says, suddenly helpful. \"Cargo hold three. Don't keep her waiting.\"");
          } else {
            G.go("alley", "\"Kestrel?\" he repeats, and the other two laugh. \"Everybody knows Kestrel. Ten credits, runner.\" You back off before it becomes something else.");
          }
        } },
      { label: "Back away", do: () => G.go("alley") }
    ]
  };

  R.alley_cameras = {
    district: "alley", name: "Rain Alley — camera housing",
    text: `The housing is old Watch hardware, the kind the city stopped maintaining and never got round to removing. Its service port still has a cover. Behind it, a thread of green light says something inside is awake.`,
    choices: () => [
      { label: "Jack in and wipe the footage", hint: `Tech ${G.bonus("tech")}/3${G.has("data_spike") ? " · Data Spike" : ""}`, do: () => {
          if (G.check("tech", 3)) {
            G.set("camerasDone"); G.s.heat = 0; G.learnDistrict("bunker");
            G.note("Wiped the alley cameras. Their feed went to a 'BUNKER NODE' in the north west.");
            G.go("alley", "The firmware is older than you are. You delete the last hour and, while you are in there, follow the feed upstream. It does not go to the Watch. It goes to a node tagged BUNKER, out past the Cybercafé. Your map updates. Whatever heat you had, it just evaporated.");
          } else {
            G.set("camerasDone"); G.damage(2, "a security discharge"); G.heat(1);
            G.go("alley", "Something in the housing bites back: a capacitor discharge up your arm. The light goes red. If anyone was watching, they are definitely watching now.");
          }
        } },
      { label: "Smash it", hint: `Muscle ${G.bonus("muscle")}/2`, do: () => {
          G.set("camerasDone");
          if (G.check("muscle", 2)) { G.heat(1); G.go("alley", "The housing comes off the wall in two pieces. Satisfying, loud, and the drone overhead almost certainly logged it."); }
          else { G.damage(1, "the housing's edge"); G.go("alley", "You skin your knuckles on the bracket. The camera keeps blinking, a little smugly."); }
        } },
      { label: "Leave it", do: () => G.go("alley") }
    ]
  };

  /* ----------------------------------------------------------------- Market */
  R.market = {
    district: "market", hub: true, name: "Night Market",
    text: "The Night Market never closes, it just changes what it is selling. Steam from the noodle carts fogs the holo-signs. A junk dealer is arguing with a drone about the price of its own propellers. In a tarpaulin alcove at the back, a man with a voice modulator watches who comes and goes.",
    choices: (s) => [
      { label: "Junk dealer's stall", do: () => G.go("market_junk") },
      { label: "Noodle cart", do: () => G.go("market_food") },
      { label: "The alcove at the back", hint: "black market", do: () => G.go("market_black") }
    ]
  };

  R.market_junk = {
    district: "market", name: "Night Market — Dez's Junk",
    text: (s) => `Dez sells anything that has ever had a battery in it. "Runner! You look like someone with a problem that money could fix." ${s.flags.boughtMap ? "" : "A folded Street Map is pinned to the awning, hand-annotated."}`,
    choices: (s) => [
      { label: "Buy Stim Patch (7 credits)", when: G.canPay(7), do: () => { G.credits(-7); G.give("stim"); G.say("\"Good for what ails you, mostly.\""); } },
      { label: "Buy Data Spike (14 credits)", when: G.canPay(14) && !G.has("data_spike"), do: () => { G.credits(-14); G.give("data_spike"); G.say("\"Military surplus. Well, surplus to someone's military.\" The spike hums when you hold it near a terminal."); } },
      { label: "Buy Street Map (5 credits)", when: G.canPay(5) && !s.flags.boughtMap, do: () => { G.credits(-5); G.set("boughtMap"); G.give("street_map"); G.learnAll(); G.say("Every district in Verge City lights up on your map, including two Dez has circled in red: the Helix Showroom and something north west marked BUNKER."); } },
      { label: "Sell Rare Chip (25 credits)", when: G.has("rare_chip"), do: () => { G.take("rare_chip"); G.credits(25); G.say("Dez whistles at the chip and pays without haggling, which tells you it was worth more."); } },
      { label: "Sell Encrypted Keycard (8 credits)", when: G.has("keycard"), do: () => { G.take("keycard"); G.credits(8); G.say("\"Lift key? Rooftops lift. Shame, I'd have liked to know what's up there.\""); } },
      { label: "Back to the market", do: () => G.go("market") }
    ]
  };

  R.market_food = {
    district: "market", name: "Night Market — noodle cart",
    text: "The noodle cart is run by a woman called Auntie by people who are not related to her. Her broth could strip paint and probably has.",
    choices: (s) => [
      { label: "Eat a bowl now (3 credits)", hint: "+3 HP", when: G.canPay(3), do: () => { G.credits(-3); G.heal(3); G.say("You eat standing up in the rain. It is the best thing that has happened to you today."); } },
      { label: "Buy a bowl for later (3 credits)", when: G.canPay(3), do: () => { G.credits(-3); G.give("noodles"); G.say("Auntie seals the bowl with a strip of foil and a look that says eat it soon."); } },
      { label: "Ask what she has heard", when: !s.flags.auntieRumour, do: () => {
          G.set("auntieRumour"); G.set("knowsBuyer"); G.learnDistrict("docks");
          G.note("Auntie says the Syndicate has had Cargo Hold Three at the Docks under guard all day.");
          G.say("\"Syndicate's been sitting on Cargo Hold Three at the Docks since dawn. Kestrel herself. Whatever they're waiting for, they're nervous about it.\" She tops up your broth for free.");
        } },
      { label: "Back to the market", do: () => G.go("market") }
    ]
  };

  R.market_black = {
    district: "market", name: "Night Market — the alcove",
    text: (s) => {
      if (s.flags.blackMarketIn) return "The modulated man calls himself Ferret. His crate has a false bottom and the false bottom has a false bottom.";
      return "The modulated man looks you up and down. \"Alcove's for friends of the Syndicate. Are you a friend, or are you lost?\"";
    },
    choices: (s) => {
      if (!s.flags.blackMarketIn) {
        return [
          { label: "Mention Kestrel", hint: G.repOf("syndicate") > 0 ? "Syndicate standing" : `Charm ${G.bonus("charm")}/3`, do: () => {
              if (G.repOf("syndicate") > 0 || G.check("charm", 3)) { G.set("blackMarketIn"); G.say("\"Then you're a friend.\" The tarpaulin lifts."); }
              else { G.go("market", "\"Everybody mentions Kestrel.\" The tarpaulin stays down."); }
            } },
          { label: "Leave it", do: () => G.go("market") }
        ];
      }
      return [
        { label: "Buy EMP Grenade (18 credits)", when: G.canPay(18) && !G.has("emp"), do: () => { G.credits(-18); G.give("emp"); G.say("\"Pull, throw, close your eyes. Anything with a chip inside ten metres takes a nap.\""); } },
        { label: "Buy Holo Cloak (24 credits)", when: G.canPay(24) && !G.has("holo_cloak"), do: () => { G.credits(-24); G.give("holo_cloak"); G.say("The cloak settles over your shoulders and your outline goes soft at the edges, like a bad signal."); } },
        { label: "Buy Neon Blade (30 credits)", when: G.canPay(30) && !G.has("neon_blade"), do: () => { G.credits(-30); G.give("neon_blade"); G.say("Monomolecular edge, cyan glow. Ferret handles it like it might cut the air."); } },
        { label: "Back to the market", do: () => G.go("market") }
      ];
    }
  };

  /* ------------------------------------------------------------------ Plaza */
  R.plaza = {
    district: "plaza", hub: true, name: "Civic Plaza",
    text: (s) => `Civic Plaza is where the city pretends to be civic. A fountain that has not run in years, a statue of a founder nobody remembers, and a bank of public info terminals that mostly show adverts. A street performer juggles light.${s.heat >= 2 ? " A Watch patrol is working the far side of the square, scanning faces." : ""}`,
    choices: (s) => [
      { label: "Public info terminal", do: () => G.go("plaza_terminal") },
      { label: "The street performer", do: () => G.go("plaza_performer") },
      { label: "Approach the Watch patrol", when: s.heat >= 2, hint: "clear your name, or try to", do: () => { G.set("patrolReturn", "plaza"); G.go("plaza_patrol"); } }
    ]
  };

  R.plaza_terminal = {
    district: "plaza", name: "Civic Plaza — info terminal",
    text: (s) => s.flags.terminalHacked
      ? "The terminal shows the transit map now, with one extra layer you added yourself."
      : "The terminal cycles through adverts for Helix Biotech ('Your Tomorrow, Installed Today') and a Watch recruitment film. The maintenance port is behind a plastic flap held on with tape.",
    choices: (s) => [
      { label: "Hack the city records", hint: `Tech ${G.bonus("tech")}/3${G.has("data_spike") ? " · Data Spike" : ""}`, when: !s.flags.terminalHacked, do: () => {
          if (G.check("tech", 3)) {
            G.set("terminalHacked"); G.learnAll();
            if (G.has("lockbox")) {
              G.set("knowsContents");
              G.note("City manifests list the lockbox as HELIX PROPERTY: 'cognition core, prototype, unlicensed'. The Syndicate stole it.");
              G.go("plaza", "You go through the adverts into the transit grid and from there into the Watch's incident log. Every district lights up on your map. And there, in tonight's reports: a Helix Biotech shipment hijacked at the Rail Terminal. Item: one cognition core, prototype, unlicensed. Dimensions match the warm black case you are carrying. You are holding a stolen mind.");
            } else {
              G.go("plaza", "You go through the adverts into the transit grid. Every district in Verge City lights up on your map, including two the public layer never shows.");
            }
          } else {
            G.set("terminalHacked"); G.damage(2, "a terminal counter-shock"); G.heat(1);
            G.go("plaza", "The terminal was waiting for someone to try. A counter-shock throws you back a step and a very polite recorded voice informs you that the incident has been logged.");
          }
        } },
      { label: "Pay for a transit map (4 credits)", when: G.canPay(4) && !G.has("street_map"), do: () => { G.credits(-4); G.give("street_map"); G.learnAll(); G.say("The public layer only, but it is enough: every district appears on your map."); } },
      { label: "Back to the plaza", do: () => G.go("plaza") }
    ]
  };

  R.plaza_performer = {
    district: "plaza", name: "Civic Plaza — the performer",
    text: (s) => s.flags.performerHelped
      ? "The performer is Tam. Tam is juggling again, with a little more energy than before, and nods when you pass."
      : "The performer keeps four orbs of light in the air with a lazy grace that is clearly costing them. Up close they look exhausted and thirsty. A hat on the ground holds three credits and a button.",
    choices: (s) => [
      { label: "Give them your Synth Ale", when: G.has("synth_ale") && !s.flags.performerHelped, do: () => {
          G.take("synth_ale"); G.set("performerHelped"); G.s.player.stats.charm += 1; G.rep("citizens", 1);
          G.note("Gave Tam the performer a drink. Charm +1.");
          G.say("They drink the whole thing without putting the orbs down, then teach you the trick: it is all in how you hold people's attention. Charm +1.");
        } },
      { label: "Drop 5 credits in the hat", when: G.canPay(5) && !s.flags.performerHelped, do: () => {
          G.credits(-5); G.set("performerHelped"); G.rep("citizens", 1);
          G.say("\"Generous. Kestrel at the Docks is less generous, if that's where you're headed. Count the credits twice.\"");
          G.set("knowsBuyer");
        } },
      { label: "Perform alongside them", hint: `Charm ${G.bonus("charm")}/3`, when: !s.flags.performed, do: () => {
          G.set("performed");
          if (G.check("charm", 3)) { G.credits(9); G.rep("citizens", 1); G.say("You cannot juggle, but you can talk, and the crowd that gathers for your patter stays for their orbs. You split nine credits."); }
          else { G.say("You drop an orb. It is made of light and breaks anyway. The crowd finds this very funny."); }
        } },
      { label: "Back to the plaza", do: () => G.go("plaza") }
    ]
  };

  R.plaza_patrol = {
    district: "plaza", name: "City Watch patrol",
    text: (s) => `Two Watch officers in grey rain capes, one with a face scanner already raised. "Evening. Hands where the drone can see them." The scanner's light crawls over your face. Your heat level is ${s.heat}.${G.has("lockbox") ? " One of them is looking at the case." : ""}`,
    choices: (s) => [
      { label: "Comply with the scan", hint: s.heat >= 4 ? "high heat: expect trouble" : "pay a fine, lose the heat", do: () => {
          const back = s.flags.patrolReturn || "plaza";
          if (s.heat >= 4) {
            if (G.has("lockbox")) {
              G.take("lockbox"); G.set("lockboxLost"); G.s.heat = 0; G.rep("watch", -1); G.rep("syndicate", -2);
              G.note("The Watch confiscated the lockbox. Kestrel will not be pleased.");
              G.go(back, "The scanner finds enough. They take the case 'into evidence' and let you go with a warning that sounds like a threat. The Syndicate is going to hear about this.");
            } else {
              const fine = Math.min(s.player.credits, 15); G.credits(-fine); G.s.heat = 0;
              G.go(back, `They find enough to fine you ${fine} credits and not enough to arrest you. The heat clears, which is more than you can say for your account.`);
            }
          } else {
            const fine = Math.min(s.player.credits, s.heat * 3); G.credits(-fine); G.s.heat = 0; G.rep("watch", 1);
            G.go(back, `"Public order infraction." A fine of ${fine} credits and a long look. Your record is clean again.`);
          }
        } },
      { label: "Bribe them (8 credits)", when: G.canPay(8), do: () => {
          const back = s.flags.patrolReturn || "plaza";
          G.credits(-8); G.s.heat = Math.max(0, s.heat - 2); G.rep("watch", -1);
          G.go(back, "The scanner develops a fault. Eight credits worth of fault. \"Move along.\"");
        } },
      { label: "Run", hint: `Reflex ${G.bonus("reflex")}/4${G.has("holo_cloak") ? " · Holo Cloak" : ""}`, do: () => {
          const back = s.flags.patrolReturn || "plaza";
          if (G.check("reflex", 4)) { G.s.heat = Math.max(0, s.heat - 1); G.go(back, "You are through the fountain's dry basin and into the crowd before the drone finishes turning. They lose you. Mostly."); }
          else { G.damage(3, "a shock baton"); G.heat(1); G.go(back, "The baton catches your shoulder and the world goes white for a second. You get away, but with a new entry on your record and a limp."); }
        } },
      { label: "Throw the EMP Grenade", when: G.has("emp"), do: () => {
          const back = s.flags.patrolReturn || "plaza";
          G.take("emp"); G.s.heat = 0; G.rep("watch", -2);
          G.go(back, "Pull, throw, eyes shut. The scanner, the drone, the officers' capes' heaters and every streetlight in the square die together. In the dark you walk away. Whoever you were, the Watch no longer has a record of it.");
        } }
    ]
  };

  /* ------------------------------------------------------------------- Club */
  R.club_door = {
    district: "club", name: "Club Static — the door",
    text: "Club Static's door is a slab of brushed steel pulsing faintly with the bass behind it. The bouncer has shoulders like a sofa and a scanner on his wrist. \"Members, VIPs, and people with ten credits.\"",
    choices: (s) => [
      { label: "Show the VIP Pass", when: G.has("vip_pass"), do: () => { G.set("clubAccess"); G.go("club", "He scans the pass and his whole posture changes. \"Enjoy your evening.\" The steel slab slides aside."); } },
      { label: "Pay the cover (10 credits)", when: G.canPay(10), do: () => { G.credits(-10); G.set("clubAccess"); G.go("club", "Ten credits and a stamp on your wrist that glows faintly. You are in."); } },
      { label: "Say Mara is expecting you", hint: s.flags.courierSearched ? "you have her name" : `Charm ${G.bonus("charm")}/4`, do: () => {
          if (s.flags.courierSearched || G.check("charm", 4)) { G.set("clubAccess"); G.go("club", "\"Mara.\" He says it into his collar, waits, then steps aside without another word."); }
          else { G.go("plaza", "\"Mara's expecting a lot of people tonight.\" He does not move. You take the hint back to the Plaza."); }
        } },
      { label: "Push past him", hint: `Muscle ${G.bonus("muscle")}/4`, do: () => {
          if (G.check("muscle", 4)) { G.set("clubAccess"); G.heat(1); G.rep("syndicate", -1); G.go("club", "You put a shoulder into him and he goes over like a sofa would. Inside, nobody has noticed. Outside, the door camera has."); }
          else { G.damage(3, "the bouncer"); G.go("plaza", "He does not even step back. One hand, flat, and you are sitting in the gutter outside with the bass thudding through the pavement."); }
        } },
      { label: "Back to the plaza", do: () => G.go("plaza") }
    ]
  };

  R.club = {
    district: "club", hub: true, name: "Club Static — the floor",
    text: "Inside, Static is all strobe and sub-bass. The dance floor heaves. Along the back wall, a long bar glows under the bottles; a fixer in a red coat holds court at the end of it. The DJ booth is a glass cube above the floor. A door marked SECURITY sits half-hidden behind a speaker stack.",
    choices: () => [
      { label: "The bar, and the fixer in red", do: () => G.go("club_bar") },
      { label: "The DJ booth", do: () => G.go("club_dj") },
      { label: "The security door", do: () => G.go("club_security") }
    ]
  };

  R.club_bar = {
    district: "club", name: "Club Static — the bar",
    text: (s) => {
      let t = "Mara has the kind of face that has heard every story and bought none of them. She does not stand. \"Runner. Sit. Drink.\"";
      if (!s.flags.maraTalked) t += " Beside her glass, unattended, sits a data chip on a coaster.";
      else if (!G.has("data_chip") && !s.flags.chipGone) t += " The data chip is still on its coaster. Mara is pretending not to guard it.";
      return t;
    },
    choices: (s) => [
      { label: "Ask Mara about the job", when: !s.flags.maraTalked, do: () => {
          G.set("maraTalked"); G.set("knowsBuyer"); G.learnDistrict("docks"); G.learnDistrict("rooftops");
          G.note("Mara: Kestrel is at Cargo Hold Three. The Collective on the Rooftops would pay to know what is in the case. Helix wants it back.");
          G.say("\"The courier was mine. The job was Kestrel's. The case is Helix's, which is why everyone is so twitchy.\" She turns her glass. \"Kestrel's at Cargo Hold Three on the Docks. If you'd rather not hand a stolen mind to the Syndicate, the Collective on the Rooftops would love to look inside it. And Helix would pay a great deal to pretend tonight never happened.\" She lets that sit. \"Your choice. It usually is.\"");
        } },
      { label: "Buy a Synth Ale (4 credits)", when: G.canPay(4), do: () => { G.credits(-4); G.give("synth_ale"); G.say("Blue, fizzing, slightly alive."); } },
      { label: "Palm the data chip", hint: `Reflex ${G.bonus("reflex")}/3${G.has("holo_cloak") ? " · Holo Cloak" : ""}`, when: !G.has("data_chip") && !s.flags.chipGone, do: () => {
          if (G.check("reflex", 3)) { G.give("data_chip"); G.set("chipGone"); G.note("Lifted a data chip from Mara's coaster."); G.say("The chip is in your sleeve between one strobe and the next. Mara does not look up."); }
          else { G.set("chipGone"); G.damage(3, "a bouncer's elbow"); G.heat(1); G.rep("syndicate", -1); G.go("plaza", "Mara's hand closes on your wrist with surprising strength. \"No.\" A bouncer materialises at your shoulder and a moment later you are learning what the pavement outside tastes like. The chip is gone from the coaster when you look back."); }
        } },
      { label: "Distract her and take it", hint: `Charm ${G.bonus("charm")}/3`, when: !G.has("data_chip") && !s.flags.chipGone, do: () => {
          if (G.check("charm", 3)) { G.give("data_chip"); G.set("chipGone"); G.note("Talked Mara into looking the other way and took her data chip."); G.say("You tell her a story about the courier's last words that is mostly true. While she is looking at your face and not her coaster, the chip goes into your pocket. She may have let it."); }
          else { G.set("chipGone"); G.say("Mara listens to your story, smiles thinly, and pockets the chip herself. \"Nice try.\""); }
        } },
      { label: "Back to the floor", do: () => G.go("club") }
    ]
  };

  R.club_dj = {
    district: "club", name: "Club Static — DJ booth",
    text: (s) => s.flags.djDone ? "The DJ gives you a nod from behind the glass. Your track is still in the rotation." : "The DJ is lost in a set, headphones on, back to the booth door. The mixing deck is networked to everything in the building: lights, locks, the bar tabs.",
    choices: (s) => [
      { label: "Jack into the deck", hint: `Tech ${G.bonus("tech")}/3${G.has("data_spike") ? " · Data Spike" : ""}`, when: !s.flags.djDone, do: () => {
          G.set("djDone");
          if (G.check("tech", 3)) {
            G.credits(15); G.rep("syndicate", 1);
            if (!G.has("keycard")) { G.give("keycard"); G.say("You slide your own track into the set and, while the floor loses its mind, settle a few bar tabs into your own account: fifteen credits. The DJ turns, sees, and grins. \"Keep it.\" He tosses you a lift keycard from the booth drawer. \"Rooftops. Tell Sable I sent you.\""); }
            else { G.say("You slide your own track into the set and, while the floor loses its mind, settle a few bar tabs into your own account: fifteen credits. The DJ turns, sees, and grins. \"Keep it.\""); }
            G.note("The DJ at Static is a friend now. Sable runs the Collective on the Rooftops.");
          } else {
            G.heat(1); G.go("club", "The deck fights you and the set dies mid-drop. Three hundred people turn to look at the booth. You leave while the DJ is still finding words.");
          }
        } },
      { label: "Back to the floor", do: () => G.go("club") }
    ]
  };

  R.club_security = {
    district: "club", name: "Club Static — security room",
    text: (s) => s.flags.securityDone ? "The security room's screens show the club from eleven angles. Nothing here you have not already taken." : "A keycard reader guards the door. Through the glass you can see a bank of monitors, a kettle, and a Helix Security Badge hanging on a hook, left behind by someone who did not want to be seen wearing it here.",
    choices: (s) => [
      { label: "Swipe the Encrypted Keycard", when: G.has("keycard") && !s.flags.securityDone, do: () => { G.set("securityDone"); G.give("badge"); G.say("The reader thinks about it, then accepts. The badge is yours, along with a biscuit from beside the kettle."); } },
      { label: "Spoof the reader", hint: `Tech ${G.bonus("tech")}/4${G.has("data_spike") ? " · Data Spike" : ""}`, when: !s.flags.securityDone, do: () => {
          G.set("securityDone");
          if (G.check("tech", 4)) { G.give("badge"); G.note("Took a Helix Security Badge from Club Static's security room."); G.say("The reader clicks green. The badge is yours, along with a biscuit from beside the kettle."); }
          else { G.damage(2, "the door's deterrent"); G.heat(1); G.go("club", "The reader does not click green. It clicks something else, and your hand goes numb to the elbow. An alarm chirps once and stops. Time to be somewhere else."); }
        } },
      { label: "Back to the floor", do: () => G.go("club") }
    ]
  };

  /* --------------------------------------------------------------- Rooftops */
  R.roof_lift = {
    district: "rooftops", name: "Service lift to the Rooftops",
    text: "Behind the club, a service lift climbs the tower to the Rooftops. Its panel wants a keycard. Beside it, a maintenance ladder goes up into the rain and does not look inspected.",
    choices: () => [
      { label: "Use the Encrypted Keycard", when: G.has("keycard"), do: () => { G.set("roofAccess"); G.go("rooftops", "The lift accepts the card and rises. Verge City drops away in neon strips."); } },
      { label: "Hack the lift panel", hint: `Tech ${G.bonus("tech")}/4${G.has("data_spike") ? " · Data Spike" : ""}`, do: () => {
          if (G.check("tech", 4)) { G.set("roofAccess"); G.go("rooftops", "The lift panel is a cousin of the alley camera. You talk to it in the family dialect and it takes you up."); }
          else { G.heat(1); G.go("club", "The panel flashes DENIED and a Watch tone. You leave before anyone comes to ask why."); }
        } },
      { label: "Climb the ladder", hint: `Muscle ${G.bonus("muscle")}/3`, do: () => {
          if (G.check("muscle", 3)) { G.set("roofAccess"); G.go("rooftops", "Forty metres of wet rungs. Your arms are on fire by the top, but the top is where you are."); }
          else { G.damage(3, "a fall from the ladder"); G.go("club", "A rung gives. You fall a storey onto a fire escape and lie there listening to the bass through the wall until you can stand."); }
        } }
    ]
  };

  R.rooftops = {
    district: "rooftops", hub: true, name: "The Rooftops",
    text: "Up here the rain is cleaner and the city is a circuit board. Someone has strung lights between the water tanks and grown a garden in a disused helipad. An old broadcast antenna leans against the sky. In a loft of corrugated steel and cable, screens glow: the Collective.",
    choices: () => [
      { label: "The Collective's loft", do: () => G.go("roof_loft") },
      { label: "The sky garden", do: () => G.go("roof_garden") },
      { label: "The old antenna", do: () => G.go("roof_antenna") }
    ]
  };

  R.roof_loft = {
    district: "rooftops", name: "The Rooftops — the Collective's loft",
    text: (s) => {
      let t = "Sable runs the Collective from a dentist's chair surrounded by salvaged screens. Half their face is a mirrored visor. \"A runner. On my roof. Either very good or very lost.\"";
      if (s.flags.knowsTruth) t += " They know what you are carrying now, and they are watching the case the way other people watch a fire.";
      return t;
    },
    choices: (s) => [
      { label: "Hand over Static's data chip", when: G.has("data_chip") && !s.flags.chipDecoded, do: () => {
          G.take("data_chip"); G.set("chipDecoded"); G.set("knowsTruth"); G.credits(20); G.rep("collective", 2);
          G.note("The Collective decoded the chip: the lockbox holds a Helix cognition core, a copied human mind. Helix wants it back; the Syndicate wants to sell it.");
          G.say("Sable reads the chip in silence. Then: \"It's Mara's ledger. And the case your courier died for isn't a weapon. It's a cognition core. Helix copied someone's mind, start to finish, without asking. The Syndicate stole it to sell back to them.\" They pay you twenty credits for the chip and look at you for a long moment. \"If you've got that case, you've got a person in a box.\"");
        } },
      { label: "Buy a Data Spike (12 credits)", when: G.canPay(12) && !G.has("data_spike"), do: () => { G.credits(-12); G.give("data_spike"); G.say("\"Collective-made. Do not plug it into anything you like.\""); } },
      { label: "Give the lockbox to the Collective", hint: "an ending", when: G.has("lockbox"), do: () => G.end("collective") },
      { label: "Ask what the Collective wants", when: !s.flags.sableAsked, do: () => { G.set("sableAsked"); G.learnDistrict("bunker"); G.say("\"The same thing we always want. Information where everyone can see it. There's an old civil-defence bunker north west of here with a broadcast uplink still live. If you ever had something the whole city needed to hear, that's where you'd say it.\" Your map updates."); } },
      { label: "Back to the roof", do: () => G.go("rooftops") }
    ]
  };

  R.roof_garden = {
    district: "rooftops", name: "The Rooftops — sky garden",
    text: (s) => s.flags.gardenRested ? "The garden is quiet. Tomato plants, a bench, the hum of the city a long way down." : "Someone has grown tomatoes in a helipad. There is a bench, a cold bottle of Synth Ale sweating in a planter, and nobody around.",
    choices: (s) => [
      { label: "Sit and rest", hint: "+4 HP", when: !s.flags.gardenRested, do: () => { G.set("gardenRested"); G.heal(4); G.say("You sit for ten minutes with your eyes shut and the rain on your face. It helps more than it should."); } },
      { label: "Take the Synth Ale", when: !s.flags.gardenAle, do: () => { G.set("gardenAle"); G.give("synth_ale"); G.say("Still cold. Someone will be annoyed."); } },
      { label: "Back to the roof", do: () => G.go("rooftops") }
    ]
  };

  R.roof_antenna = {
    district: "rooftops", name: "The Rooftops — old antenna",
    text: (s) => s.flags.antennaDone ? "The antenna leans into the rain. You have already got what you can from it." : "The antenna is pre-Collapse steel, still wired to a weatherproof junction box. The Watch's patrol band leaks through it as a faint crackle.",
    choices: (s) => [
      { label: "Tune into the Watch band", hint: `Tech ${G.bonus("tech")}/2`, when: !s.flags.antennaDone, do: () => {
          G.set("antennaDone");
          if (G.check("tech", 2)) { G.s.heat = 0; G.set("knowsPatrols"); G.note("Listened to the Watch band from the antenna and learned their patrol timings."); G.say("You find the Watch band and listen for a while. You learn where the patrols are, where they are not, and that the incident report with your face on it has been filed under 'low priority'. Your heat drops to nothing."); }
          else { G.say("Static. Weather. A sermon from a man who believes the rain is talking to him. Nothing useful."); }
        } },
      { label: "Back to the roof", do: () => G.go("rooftops") }
    ]
  };

  /* -------------------------------------------------------------- Cybercafé */
  R.cybercafe = {
    district: "cybercafe", hub: true, name: "Cybercafé Lumen",
    text: "Lumen is twenty VR booths, a snack bar, and a server closet that hums like a hive. The regulars do not look up. The owner, Priya, looks up at everyone.",
    choices: () => [
      { label: "A VR booth", do: () => G.go("cafe_vr") },
      { label: "The server closet", do: () => G.go("cafe_server") },
      { label: "The snack bar", do: () => G.go("cafe_snack") }
    ]
  };

  R.cafe_vr = {
    district: "cybercafe", name: "Cybercafé Lumen — VR booth",
    text: (s) => s.flags.vrTrained ? "The booth remembers you. The training sim offers a rerun, but you have learned what it had to teach." : "The booth offers a dozen sims. One is unlisted: INTRUSION DRILL (HELIX INTERNAL). Three credits to run it. The booth warns, in small print, that failure is 'mildly uncomfortable'.",
    choices: (s) => [
      { label: "Run the intrusion drill (3 credits)", hint: `Tech ${G.bonus("tech")}/2`, when: G.canPay(3) && !s.flags.vrTrained, do: () => {
          G.credits(-3); G.set("vrTrained");
          if (G.check("tech", 2)) { G.s.player.stats.tech += 1; G.note("Completed a Helix intrusion drill in VR. Tech +1."); G.say("The drill is a Helix building, and you learn its locks from the inside. When the visor comes off you are thinking a little faster. Tech +1."); }
          else { G.damage(1, "biofeedback"); G.say("The drill eats you alive and the booth's biofeedback makes sure you feel it. 'Mildly uncomfortable' was generous."); }
        } },
      { label: "Back to the café", do: () => G.go("cybercafe") }
    ]
  };

  R.cafe_server = {
    district: "cybercafe", name: "Cybercafé Lumen — server closet",
    text: (s) => s.flags.serverDone ? "The server closet hums. Priya has changed the lock." : "The closet door is propped open an inch by a cable. Inside, among Lumen's own racks, one unit wears a Helix asset tag and an Encrypted Drive sits in its bay, blinking.",
    choices: (s) => [
      { label: "Pull the Encrypted Drive", hint: `Reflex ${G.bonus("reflex")}/2`, when: !s.flags.serverDone, do: () => {
          G.set("serverDone");
          if (G.check("reflex", 2)) { G.give("drive"); G.note("Pulled a Helix Encrypted Drive from a server in Cybercafé Lumen."); G.say("You have the drive out and the door closed before the rack finishes complaining. Priya's eyes follow you back to your seat and say nothing."); }
          else { G.heat(1); G.rep("citizens", -1); G.go("cybercafe", "The rack screams. Priya is in the doorway before you are. \"Out.\" You go, and the drive stays."); }
        } },
      { label: "Back to the café", do: () => G.go("cybercafe") }
    ]
  };

  R.cafe_snack = {
    district: "cybercafe", name: "Cybercafé Lumen — snack bar",
    text: "Priya sells coffee, Stim Patches, and the kind of silence that costs extra.",
    choices: (s) => [
      { label: "Buy Stim Patch (7 credits)", when: G.canPay(7), do: () => { G.credits(-7); G.give("stim"); G.say("\"Don't use it in here.\""); } },
      { label: "Ask about the Bunker", when: !s.flags.priyaBunker, do: () => { G.set("priyaBunker"); G.learnDistrict("bunker"); G.set("knowsBunkerPower"); G.note("Priya: the Bunker's blast door runs off the Underground power node. Someone cut it years ago."); G.say("\"Old civil-defence bunker, north west. Door's been sealed since the power node under the city got cut. You'd need to bring the node back up, or something that makes a door forget it's locked.\" Your map updates."); } },
      { label: "Back to the café", do: () => G.go("cybercafe") }
    ]
  };

  /* ----------------------------------------------------------- Helix Showroom */
  R.helix_door = {
    district: "luxury_store", name: "Helix Showroom — entrance",
    text: "The Helix Showroom is glass and white light, a cathedral to cyberware. Two guards in tailored armour flank a door that does not have a handle. A badge reader glows a patient blue.",
    choices: () => [
      { label: "Present the Helix Security Badge", when: G.has("badge"), do: () => { G.set("helixAccess"); G.go("luxury_store", "The reader turns green and the guards' attention slides off you like you were never there."); } },
      { label: "Walk in like you belong", hint: `Charm ${G.bonus("charm")}/4`, do: () => {
          if (G.check("charm", 4)) { G.set("helixAccess"); G.go("luxury_store", "You complain about the rain to the nearer guard and he holds the door for you. Confidence is the oldest exploit."); }
          else { G.heat(1); G.go("club", "\"Appointment?\" You do not have one. The guard's hand does not quite reach his sidearm. You leave."); }
        } },
      { label: "Slip in behind a customer", hint: `Reflex ${G.bonus("reflex")}/4${G.has("holo_cloak") ? " · Holo Cloak" : ""}`, do: () => {
          if (G.check("reflex", 4)) { G.set("helixAccess"); G.go("luxury_store", "A couple in matching chrome step up to the door. You are their shadow for exactly as long as it takes."); }
          else { G.damage(2, "a guard's rifle butt"); G.heat(1); G.go("club", "The guard sees the shimmer. The rifle butt is efficient and impersonal. You are back on the street with a new bruise."); }
        } }
    ]
  };

  R.luxury_store = {
    district: "luxury_store", hub: true, name: "Helix Showroom",
    text: "Inside, cyberware floats in illuminated cases: eyes, hands, a spine. A woman in a suit the colour of wet slate waits at the back, and she has clearly been waiting for you. Beyond her, a lift to the manager's suite and a door marked STORAGE VAULT.",
    choices: () => [
      { label: "The woman in the slate suit", do: () => G.go("helix_agent") },
      { label: "The storage vault", do: () => G.go("helix_vault") },
      { label: "The manager's suite", do: () => G.go("helix_suite") }
    ]
  };

  R.helix_agent = {
    district: "luxury_store", name: "Helix Showroom — Agent Voss",
    text: (s) => {
      let t = "\"Voss. Asset recovery.\" She does not offer a hand. \"You have something that belongs to Helix Biotech. I would like it back, and I would like you to be rich enough afterwards not to mention it.\"";
      if (!G.has("lockbox")) t += " Her eyes go to your empty hands. \"Or you had.\"";
      return t;
    },
    choices: (s) => [
      { label: "Sell her the lockbox (120 credits)", hint: "an ending", when: G.has("lockbox"), do: () => G.end("corp") },
      { label: "Show her the Encrypted Drive", hint: "leverage", when: G.has("drive") && !s.flags.vossLeveraged, do: () => {
          G.set("vossLeveraged"); G.credits(60); G.rep("helix", -1);
          G.note("Blackmailed Agent Voss with the Helix drive for 60 credits. Helix will remember.");
          G.say("You let her read the drive's index. Her face does not move, but her hands do. \"Sixty credits,\" she says, \"for your silence, and you keep the case. For now. Helix does not forget, runner.\" You keep the drive too.");
        } },
      { label: "Ask what is in the case", when: !s.flags.vossTold, do: () => { G.set("vossTold"); G.set("knowsContents"); G.note("Voss admitted the case holds a Helix 'cognition core': a copied mind."); G.say("\"A cognition core. A prototype.\" She chooses the next words carefully. \"A record of a person. Legally, property. Ethically, I am not paid to have an opinion.\""); } },
      { label: "Back to the showroom", do: () => G.go("luxury_store") }
    ]
  };

  R.helix_vault = {
    district: "luxury_store", name: "Helix Showroom — storage vault",
    text: (s) => s.flags.vaultDone ? "The vault stands open and empty of anything you want." : "The vault door is a slab of layered polymer with a badge reader and, lower down, a maintenance keypad. Through the window, a single case on a pedestal: PROTOTYPE CYBERWARE, DO NOT INSTALL.",
    choices: (s) => [
      { label: "Badge in", when: G.has("badge") && !s.flags.vaultDone, do: () => { G.set("vaultDone"); G.give("proto"); G.note("Took prototype cyberware from the Helix vault."); G.say("The badge opens the vault without complaint. The prototype is lighter than it looks."); } },
      { label: "Hack the keypad", hint: `Tech ${G.bonus("tech")}/4${G.has("data_spike") ? " · Data Spike" : ""}`, when: !s.flags.vaultDone, do: () => {
          G.set("vaultDone");
          if (G.check("tech", 4)) { G.give("proto"); G.note("Hacked the Helix vault and took prototype cyberware."); G.say("Helix's keypad is better than the city's, but it was built by people who went home at six. The prototype is yours."); }
          else { G.damage(3, "a vault countermeasure"); G.heat(2); G.rep("helix", -1); G.go("luxury_store", "The keypad flashes and the floor under you delivers a lesson in current. Alarms. You stagger back into the showroom with your teeth still buzzing."); }
        } },
      { label: "Back to the showroom", do: () => G.go("luxury_store") }
    ]
  };

  R.helix_suite = {
    district: "luxury_store", name: "Helix Showroom — manager's suite",
    text: (s) => s.flags.suiteDone ? "The suite is tidy again. The manager has not returned." : "The manager is out. His suite is glass on three sides, a desk, a coat stand. On the stand hangs a Nano-weave Vest, the kind that costs more than you have ever had at once. The suite camera sweeps slowly.",
    choices: (s) => [
      { label: "Take the vest between sweeps", hint: `Reflex ${G.bonus("reflex")}/3${G.has("holo_cloak") ? " · Holo Cloak" : ""}`, when: !s.flags.suiteDone, do: () => {
          G.set("suiteDone");
          if (G.check("reflex", 3)) { G.give("vest"); G.note("Took a Nano-weave Vest from the Helix manager's suite."); G.say("You count the sweep, step, lift, step. The vest is under your jacket before the lens comes back."); }
          else { G.heat(1); G.rep("helix", -1); G.say("The camera catches you with your hand on the coat stand. You leave the vest and the suite with as much dignity as you can manage."); }
        } },
      { label: "Back to the showroom", do: () => G.go("luxury_store") }
    ]
  };

  /* ------------------------------------------------------------------ Docks */
  R.docks = {
    district: "docks", hub: true, name: "The Docks",
    text: (s) => `Cranes, containers, the slap of black water against concrete. Cargo Hold Three has two Syndicate soldiers outside it and a light on inside. A smuggler's skiff idles at the pier, its pilot smoking under a tarp. Further along, a cargo hold stands unguarded, its door ajar.${s.flags.lockboxLost ? " You are very aware of your empty hands." : ""}`,
    choices: () => [
      { label: "Cargo Hold Three", hint: "Kestrel", do: () => G.go("docks_kestrel") },
      { label: "The unguarded hold", do: () => G.go("docks_cargo") },
      { label: "The smuggler's skiff", do: () => G.go("docks_smuggler") }
    ]
  };

  R.docks_kestrel = {
    district: "docks", name: "Cargo Hold Three — Kestrel",
    text: (s) => {
      if (s.flags.lockboxLost) return "Kestrel sits on a crate with a cup of tea and a pistol beside it. \"The Watch has my case,\" she says. It is not a question. \"And you have my attention. That is not a good thing to have.\"";
      if (!G.has("lockbox")) return "Kestrel sits on a crate with a cup of tea and a pistol beside it. \"You're not my courier. My courier's dead. So either you know where my case is, or you're wasting the last few minutes of a perfectly good evening.\"";
      return "Kestrel sits on a crate with a cup of tea and a pistol beside it. She is older than you expected and much calmer. \"That's mine. You did well not to open it. Sixty credits, as agreed with the man who was supposed to bring it.\"";
    },
    choices: (s) => {
      if (s.flags.lockboxLost) {
        return [
          { label: "Offer to make it right", hint: `Charm ${G.bonus("charm")}/4`, do: () => {
              if (G.check("charm", 4)) { G.rep("syndicate", 1); G.go("docks", "She studies you over the tea. \"Get out of my city before the Watch decides to look at that case too closely. If I see you again, I'll want a favour.\" You leave with your pulse in your ears."); }
              else { G.damage(5, "Kestrel's pistol"); G.rep("syndicate", -2); G.go("docks", "The pistol is in her hand and firing before you finish the sentence. You go out the door with a hole in your shoulder and the soldiers laughing."); }
            } },
          { label: "Leave quickly", do: () => G.go("docks") }
        ];
      }
      if (!G.has("lockbox")) {
        return [
          { label: "Tell her where the courier died", do: () => { G.rep("syndicate", 1); G.set("knowsBuyer"); G.go("docks", "\"Rain Alley.\" She nods slowly. \"Then it's with the Watch, or with someone cleverer than you. Go away.\" You go."); } },
          { label: "Leave quickly", do: () => G.go("docks") }
        ];
      }
      return [
        { label: "Hand over the lockbox (60 credits)", hint: "an ending", do: () => G.end("syndicate") },
        { label: "Negotiate a better price", hint: `Charm ${G.bonus("charm")}/4`, when: !s.flags.kestrelHaggled, do: () => {
            G.set("kestrelHaggled");
            if (G.check("charm", 4)) { G.set("kestrelBonus"); G.rep("syndicate", 1); G.say("You mention the courier, the Watch drones, the Chrome Dogs, and what Helix would pay. Kestrel laughs, once. \"Ninety. Because you made me laugh. Don't push it.\""); }
            else { G.rep("syndicate", -1); G.say("\"Sixty,\" she says, \"was before you tried to be clever.\" The soldiers at the door have turned round."); }
          } },
        { label: "Take Kestrel's money by force", hint: `Muscle ${G.bonus("muscle")}/5${G.has("neon_blade") ? " · Neon Blade" : ""}`, do: () => {
            if (G.check("muscle", 5)) { G.give("credstick"); G.rep("syndicate", -3); G.heat(1); G.note("Robbed Kestrel at the Docks. The Syndicate will want you dead."); G.go("docks", "The tea goes over. The pistol goes across the floor. The soldiers hesitate for exactly as long as it takes you to lift her credstick and leave through the back of the hold. You have made a very dangerous enemy and kept the case."); }
            else { G.damage(5, "Kestrel's pistol"); G.rep("syndicate", -2); G.go("docks", "She is faster than her tea suggested. You are back outside with a bullet in your side and the case still, somehow, in your hand. The soldiers let you go. Kestrel wants you to think about it."); }
          } },
        { label: "Change your mind and leave", do: () => G.go("docks") }
      ];
    }
  };

  R.docks_cargo = {
    district: "docks", name: "The Docks — unguarded hold",
    text: (s) => s.flags.cargoDone ? "The hold has been picked over, mostly by you." : "Crates stacked to the ceiling, half of them stencilled with Helix logos. Somewhere in the dark, a loader drone idles with its lamps off. There will be something worth having in here. There will also be a reason it is unguarded.",
    choices: (s) => [
      { label: "Search the crates", hint: `Reflex ${G.bonus("reflex")}/3${G.has("holo_cloak") ? " · Holo Cloak" : ""}`, when: !s.flags.cargoDone, do: () => {
          G.set("cargoDone");
          if (G.check("reflex", 3)) { G.give("rare_chip"); G.give("credstick"); G.note("Found a Rare Chip and a Credstick in an unguarded cargo hold."); G.say("You move between the lamps' dead arcs. In a crate marked SALVAGE, pre-Collapse silicon in anti-static foam: a Rare Chip. In another, somebody's forgotten credstick. The drone never wakes."); }
          else {
            if (G.has("emp")) { G.take("emp"); G.give("rare_chip"); G.say("The loader drone wakes with a snarl of servos. You pull the EMP and the whole hold goes dark and quiet. In the silence you find a Rare Chip in a crate marked SALVAGE, and nothing else worth the risk."); }
            else { G.damage(3, "a loader drone"); G.go("docks", "The loader drone wakes with a snarl of servos and comes for you with its forks down. You get out, but not before it has taught you about momentum."); }
          }
        } },
      { label: "Back to the docks", do: () => G.go("docks") }
    ]
  };

  R.docks_smuggler = {
    district: "docks", name: "The Docks — smuggler's skiff",
    text: "The pilot calls herself Wren and does not ask questions, which is her whole business model. \"Outskirts, eight credits. Checkpoint-free. Mostly.\"",
    choices: (s) => [
      { label: "Buy a crossing (8 credits)", when: G.canPay(8) && !G.has("boat_pass"), do: () => { G.credits(-8); G.give("boat_pass"); G.learnDistrict("outskirts"); G.say("She tears a ticket off a roll that was once for a cinema. \"Whenever you're ready.\""); } },
      { label: "Take the boat now", when: G.has("boat_pass"), do: () => { G.take("boat_pass"); G.travelTo("outskirts", "The skiff slides out under the cranes and across the black water. Wren cuts the engine for the last hundred metres and you drift in to the Outskirts in silence."); } },
      { label: "Back to the docks", do: () => G.go("docks") }
    ]
  };

  /* -------------------------------------------------------------- Outskirts */
  R.outskirts = {
    district: "outskirts", hub: true, name: "The Outskirts",
    text: "The city thins out into scrubland and the bones of old suburbs. A Watch checkpoint straddles the only road. Under a dead billboard, a camp of people the city has stopped counting. A car rusts in a ditch, its bonnet up.",
    choices: () => [
      { label: "The checkpoint", do: () => G.go("out_checkpoint") },
      { label: "The camp under the billboard", do: () => G.go("out_camp") },
      { label: "The abandoned car", do: () => G.go("out_car") }
    ]
  };

  R.out_checkpoint = {
    district: "outskirts", name: "The Outskirts — Watch checkpoint",
    text: (s) => `A bored officer in a booth, a scanner arch, and a sign about compliance. ${s.heat === 0 ? "Your record is clean; the arch barely blinks." : `Your heat is ${s.heat}. The arch is going to notice.`}`,
    choices: (s) => [
      { label: "Walk through the scanner", do: () => {
          if (s.heat === 0) { G.rep("watch", 1); G.go("outskirts", "The arch chirps green. The officer does not look up from his tea."); }
          else if (s.heat >= 4 && G.has("lockbox")) { G.take("lockbox"); G.set("lockboxLost"); G.s.heat = 0; G.note("The checkpoint confiscated the lockbox."); G.go("outskirts", "The arch screams. Three officers, one case, no discussion. 'Evidence.' You are allowed to leave without it."); }
          else { const fine = Math.min(s.player.credits, s.heat * 3); G.credits(-fine); G.s.heat = 0; G.go("outskirts", `The arch flags you. A fine of ${fine} credits and a lecture clear your record.`); }
        } },
      { label: "Slip the officer 6 credits", when: G.canPay(6) && s.heat > 0, do: () => { G.credits(-6); G.s.heat = Math.max(0, s.heat - 2); G.rep("watch", -1); G.go("outskirts", "The arch develops a fault for the six seconds it takes you to walk through it."); } },
      { label: "Back", do: () => G.go("outskirts") }
    ]
  };

  R.out_camp = {
    district: "outskirts", name: "The Outskirts — the camp",
    text: (s) => s.flags.campHelped ? "The camp knows you now. A kid with a soldering iron waves." : "Tents and tarpaulins, a fire in an oil drum. A kid of about twelve is repairing a drone with a soldering iron and a lot of swearing. The adults watch you with the specific patience of people who have been moved on before.",
    choices: (s) => [
      { label: "Give the camp 10 credits", when: G.canPay(10) && !s.flags.campHelped, do: () => {
          G.credits(-10); G.set("campHelped"); G.rep("citizens", 2); G.give("stim"); G.set("knowsCode");
          G.note("The camp kid used to live in the Bunker. The power node breakers go: RED, BLUE, then GREEN.");
          G.say("Nobody thanks you, which is its own kind of thanks. The kid presses a Stim Patch into your hand and says, without looking up, \"You going to the Bunker? Me and Mum lived there till the power went. Node breakers go red, blue, green. Everyone does green first. Don't.\"");
        } },
      { label: "Ask the kid about the drone", when: !s.flags.campDrone, do: () => { G.set("campDrone"); G.say("\"Watch drone. Fell out the sky when someone EMP'd the Plaza last month. I'm making it mine.\" They have reprogrammed the eye to blink in a heart shape."); } },
      { label: "Back", do: () => G.go("outskirts") }
    ]
  };

  R.out_car = {
    district: "outskirts", name: "The Outskirts — the abandoned car",
    text: (s) => s.flags.carDone ? "The car has nothing left to give." : "A ground car from before the ban, bonnet up, wheels gone. The battery pack is still in the bay and the capacitor bank beside it is intact, which is a surprise, and suggests nobody else has had the muscle to shift it.",
    choices: (s) => [
      { label: "Pull the capacitor bank", hint: `Muscle ${G.bonus("muscle")}/2`, when: !s.flags.carDone, do: () => {
          G.set("carDone");
          if (G.check("muscle", 2)) {
            if (!G.has("emp")) { G.give("emp"); G.note("Built an EMP Grenade from an abandoned car's capacitor bank."); G.say("The bank comes free with a shriek of old bolts. Twenty minutes with a strip of wire and a timer from the dash and you have something that will make electronics very unhappy, once."); }
            else { G.credits(10); G.say("The bank comes free. You already have an EMP; you sell the capacitors to the camp for ten credits instead."); }
          } else { G.damage(1, "a sheared bolt"); G.say("The bolts have other ideas. You lose a knuckle's worth of skin and the bank stays where it is."); }
        } },
      { label: "Back", do: () => G.go("outskirts") }
    ]
  };

  /* ------------------------------------------------------------ Underground */
  R.underground = {
    district: "underground", hub: true, name: "The Underground",
    text: "Below the alley, the old subway runs dark. Water drips in time. A scavenger has made a shop out of a ticket office. Deeper in, a power node the size of a house sits dead behind a chain-link fence, and past it a flooded chamber glitters with things people have dropped.",
    choices: () => [
      { label: "Rook's ticket office", do: () => G.go("under_rook") },
      { label: "The power node", do: () => G.go("under_power") },
      { label: "The flooded chamber", do: () => G.go("under_flooded") }
    ]
  };

  R.under_rook = {
    district: "underground", name: "The Underground — Rook's",
    text: "Rook is mostly scar tissue and goodwill. \"Runner. Trade, or talk. Talk's free, trade's not.\"",
    choices: (s) => [
      { label: "Trade the Rare Chip for a Helix Security Badge", when: G.has("rare_chip") && !G.has("badge") && !s.flags.rookBadge, do: () => { G.take("rare_chip"); G.give("badge"); G.set("rookBadge"); G.note("Rook traded a Helix badge for the Rare Chip."); G.say("Rook holds the chip up to the light like a jeweller. \"Pre-Collapse. Fair's fair.\" The badge is clean, cloned, and warm from his pocket."); } },
      { label: "Buy a Nano-weave Vest (20 credits)", when: G.canPay(20) && !G.has("vest"), do: () => { G.credits(-20); G.give("vest"); G.say("\"Previous owner didn't need it any more. Not because of the vest.\""); } },
      { label: "Sell the Encrypted Drive (30 credits)", when: G.has("drive"), do: () => { G.take("drive"); G.credits(30); G.say("Rook does not ask what is on it. That is why Rook is still alive."); } },
      { label: "Ask about the power node", when: !s.flags.rookNode, do: () => { G.set("rookNode"); G.set("knowsBunkerPower"); G.learnDistrict("bunker"); G.say("\"Three breakers. Throw them in the wrong order and the node bites. Throw them right and the Bunker door up north wakes up. Nobody's got it right in six years. The kids who lived up there might know.\" Your map updates."); } },
      { label: "Back", do: () => G.go("underground") }
    ]
  };

  R.under_power = {
    district: "underground", name: "The Underground — power node",
    text: (s) => {
      if (s.flags.bunkerOpen) return "The power node hums contentedly. Far to the north, a door you have never seen has just unlocked.";
      let t = "Three breakers the size of your arm, painted red, blue and green under the grime. A faded diagram has been scratched out by someone with a grievance.";
      if (s.flags.knowsCode) t += " The kid said: red, blue, then green.";
      else if (G.bonus("tech") >= 3) t += " The wiring is readable, if you take your time: the green breaker is the load, so it has to go last. Red carries the primary, which puts it first.";
      return t;
    },
    choices: (s) => {
      if (s.flags.bunkerOpen) return [{ label: "Back", do: () => G.go("underground") }];
      const correct = () => { G.set("bunkerOpen"); G.learnDistrict("bunker"); G.rep("citizens", 1); G.note("Brought the power node back up. The Bunker's blast door is live."); G.go("underground", "Red. Blue. Green. The node takes a breath you feel in your chest and lights come on down the tunnel one after another, all the way north. Somewhere up there, a blast door remembers how to open."); };
      const wrong = (order) => { G.damage(2, "the power node"); G.say(`${order}. The node bites: an arc jumps the gap and puts you on your back. The breakers reset themselves with a sulky clunk.`); };
      return [
        { label: "Throw green, red, blue", do: () => wrong("Green, red, blue") },
        { label: "Throw red, blue, green", do: correct },
        { label: "Throw blue, green, red", do: () => wrong("Blue, green, red") },
        { label: "Throw green, blue, red", do: () => wrong("Green, blue, red") },
        { label: "Back", do: () => G.go("underground") }
      ];
    }
  };

  R.under_flooded = {
    district: "underground", name: "The Underground — flooded chamber",
    text: (s) => s.flags.floodDone ? "The water is still. You have already waded it." : "Knee-deep black water over a mosaic floor. Things glint under the surface: coins, chips, a credstick wedged in a drain grate. The water hums faintly, which is never good.",
    choices: (s) => [
      { label: "Wade in for the credstick", hint: `Reflex ${G.bonus("reflex")}/3`, when: !s.flags.floodDone, do: () => {
          G.set("floodDone");
          if (G.check("reflex", 3)) { G.give("credstick"); G.say("You pick your way along the mosaic's dry ridges and hook the credstick out of the grate without touching the water where it hums."); }
          else { G.damage(2, "live water"); G.say("Your foot finds the hum. You get out faster than you went in, with nothing but a cramp in every muscle."); }
        } },
      { label: "Back", do: () => G.go("underground") }
    ]
  };

  /* ----------------------------------------------------------------- Bunker */
  R.bunker_door = {
    district: "bunker", name: "The Bunker — blast door",
    text: "A civil-defence blast door set into a hillside, three metres of steel and faded stencils. The control panel is dead. Without power the door is a wall. Something that killed its electronics might make it forget it is locked; the manual release is on the other side.",
    choices: () => [
      { label: "Use the EMP Grenade on the lock", when: G.has("emp"), do: () => { G.take("emp"); G.set("bunkerOpen"); G.note("Blew the Bunker lock with an EMP."); G.go("bunker", "The grenade cooks off against the panel and the lock, in dying, defaults open. The door swings a hand's width. You put your shoulder to the rest."); } },
      { label: "Force the door", hint: "Muscle 6", do: () => { G.damage(1, "three metres of steel"); G.say("You push until your boots slide. The door does not notice."); } },
      { label: "Go back", do: () => G.travelTo(G.s.lastDistrict || "underground") }
    ]
  };

  R.bunker = {
    district: "bunker", hub: true, name: "The Bunker",
    text: "Inside, the Bunker is cold and strangely tidy. Emergency lights throw long shadows down a corridor to a control room where screens are waking one by one. An armoury door stands open. A mess hall still has cups on the tables.",
    choices: () => [
      { label: "The control room", do: () => G.go("bunker_control") },
      { label: "The armoury", do: () => G.go("bunker_armoury") },
      { label: "The mess hall", do: () => G.go("bunker_mess") }
    ]
  };

  R.bunker_control = {
    district: "bunker", name: "The Bunker — control room",
    text: (s) => {
      let t = "The control room was built to talk to the whole city at once: a broadcast uplink, still live, patched into every public screen from the Plaza to the Docks. A diagnostic cradle in the centre of the room is exactly the size of the case.";
      if (G.has("lockbox")) t += " The lockbox is warm against your side.";
      if (s.flags.knowsTruth) t += " You know what is in it: a person, copied without consent.";
      else if (s.flags.knowsContents) t += " You know what Helix says is in it: a cognition core. A mind.";
      return t;
    },
    choices: (s) => [
      { label: "Seat the lockbox in the cradle and broadcast it", hint: "an ending", when: G.has("lockbox") && (s.flags.knowsTruth || s.flags.knowsContents || G.has("drive")), do: () => G.end("broadcast") },
      { label: "Seat the lockbox in the cradle and destroy it", hint: "an ending", when: G.has("lockbox"), do: () => G.end("ghost") },
      { label: "Broadcast the Encrypted Drive", hint: "an ending", when: G.has("drive") && !G.has("lockbox"), do: () => G.end("whistle") },
      { label: "Read the uplink logs", when: !s.flags.bunkerLogs, do: () => { G.set("bunkerLogs"); G.set("knowsContents"); G.say("The last broadcast from this room was six years ago, a civil-defence test. The last inbound message is from tonight: a Helix recovery ticket for 'one cognition core (prototype), cradle-compatible'. Whoever sealed the Bunker knew exactly what would be brought here one day."); } },
      { label: "Back", do: () => G.go("bunker") }
    ]
  };

  R.bunker_armoury = {
    district: "bunker", name: "The Bunker — armoury",
    text: (s) => s.flags.armouryDone ? "Empty racks. You took the only thing worth taking." : "Most of the racks are empty. One case, locked with a mechanical hasp, still holds something long and faintly glowing through its seams.",
    choices: (s) => [
      { label: "Break the hasp", hint: `Muscle ${G.bonus("muscle")}/2`, when: !s.flags.armouryDone, do: () => {
          G.set("armouryDone");
          if (G.check("muscle", 2)) {
            if (!G.has("neon_blade")) { G.give("neon_blade"); G.say("The hasp gives. Inside, a Neon Blade, cyan-edged, in a foam cut-out made for it."); }
            else { G.give("vest"); G.say("The hasp gives. A Nano-weave Vest, folded like a flag."); }
          } else { G.damage(1, "the hasp"); G.say("The hasp holds and takes a piece of your palm for the attempt."); }
        } },
      { label: "Back", do: () => G.go("bunker") }
    ]
  };

  R.bunker_mess = {
    district: "bunker", name: "The Bunker — mess hall",
    text: (s) => s.flags.messRested ? "Cups on the tables. Quiet." : "Cups on the tables, a kettle that still works, and nobody has been here in six years. It is the safest place you have stood all night.",
    choices: (s) => [
      { label: "Make tea and rest", hint: "full heal", when: !s.flags.messRested, do: () => { G.set("messRested"); G.heal(99); G.say("The kettle boils. You sit in a dead man's canteen with a living man's tea and let your hands stop shaking."); } },
      { label: "Back", do: () => G.go("bunker") }
    ]
  };

  /* --------------------------------------------------------------- Terminal */
  R.terminal = {
    district: "terminal", hub: true, name: "Rail Terminal",
    text: "The Rail Terminal is the only way out of Verge City that does not involve swimming. A ticket counter, a Lost & Found, a security desk, and a platform where the night train is already breathing.",
    choices: () => [
      { label: "Ticket counter", do: () => G.go("term_ticket") },
      { label: "Lost & Found", do: () => G.go("term_lost") },
      { label: "Security desk", do: () => G.go("term_security") },
      { label: "The platform", do: () => G.go("term_board") }
    ]
  };

  R.term_ticket = {
    district: "terminal", name: "Rail Terminal — ticket counter",
    text: "A machine, a slot, and a price that has gone up since you last looked. ONE WAY, NIGHT TRAIN: 25 CREDITS.",
    choices: () => [
      { label: "Buy a Rail Ticket (25 credits)", when: G.canPay(25) && !G.has("rail_ticket"), do: () => { G.credits(-25); G.give("rail_ticket"); G.say("The ticket prints on real paper. Someone, somewhere, thought that mattered."); } },
      { label: "Back", do: () => G.go("terminal") }
    ]
  };

  R.term_lost = {
    district: "terminal", name: "Rail Terminal — Lost & Found",
    text: (s) => s.flags.lostDone ? "The clerk has nothing else for you." : "A bored clerk behind a grille. Behind her, shelves of umbrellas and, in a tray marked UNCLAIMED, a VIP Pass for Club Static.",
    choices: (s) => [
      { label: "Claim the VIP Pass as yours", hint: `Charm ${G.bonus("charm")}/2`, when: !s.flags.lostDone, do: () => {
          G.set("lostDone");
          if (G.check("charm", 2)) { G.give("vip_pass"); G.say("\"Describe it.\" You do, having just looked at it. She hands it over without a flicker."); }
          else { G.say("\"Describe it.\" You describe it wrong. She puts it in a drawer."); }
        } },
      { label: "Back", do: () => G.go("terminal") }
    ]
  };

  R.term_security = {
    district: "terminal", name: "Rail Terminal — security desk",
    text: (s) => s.heat > 0 ? `A Watch sergeant with a terminal and a reasonable manner. "Outstanding infractions can be settled here. Yours come to ${s.heat * 5} credits."` : "A Watch sergeant with a terminal. Your record is clean; she waves you past.",
    choices: (s) => [
      { label: `Settle your record (${s.heat * 5} credits)`, when: s.heat > 0 && G.canPay(s.heat * 5), do: () => { G.credits(-s.heat * 5); G.s.heat = 0; G.rep("watch", 1); G.say("Paid, stamped, forgotten. The sergeant almost smiles."); } },
      { label: "Back", do: () => G.go("terminal") }
    ]
  };

  R.term_board = {
    district: "terminal", name: "Rail Terminal — the platform",
    text: (s) => `The night train hums at the platform. ${G.has("rail_ticket") ? "Your ticket is in your hand." : "A guard checks tickets at the door. You do not have one."} ${G.has("lockbox") ? "The case is heavy. Wherever this train goes, it goes with you." : ""}`,
    choices: () => [
      { label: "Board the train", hint: "an ending", when: G.has("rail_ticket"), do: () => G.end("runner") },
      { label: "Back", do: () => G.go("terminal") }
    ]
  };

  /* ---------------------------------------------------------------- Endings */
  const ENDINGS = {
    syndicate: {
      title: "COURIER",
      text: (s) => `Kestrel counts out ${s.flags.kestrelBonus ? "ninety" : "sixty"} credits onto the crate and takes the case without ceremony. "You'll do," she says, which from her is a reference.

By morning the cognition core is back in a Helix lab, bought at a price that makes the Syndicate's year. Nobody asks the mind inside what it wanted. In Verge City, that is what finishing the job looks like.

You walk back along the Docks with money in your pocket and the rain on your face, and you try not to think about how warm the case was.`,
      apply: (s) => { G.take("lockbox"); G.credits(s.flags.kestrelBonus ? 90 : 60); G.rep("syndicate", 3); }
    },
    corp: {
      title: "ASSET RECOVERED",
      text: () => `Voss signs for the case the way you would sign for a parcel. One hundred and twenty credits land in your account before she has finished the signature. "Helix thanks you for your discretion."

A Helix car takes you anywhere you like. The Syndicate hears about it within the hour, and your name goes on a list. The mind in the box goes back to the lab that made it.

You are, for a while, the richest runner in Rain Alley. It does not feel like you expected.`,
      apply: () => { G.take("lockbox"); G.credits(120); G.rep("helix", 3); G.rep("syndicate", -3); }
    },
    collective: {
      title: "FREE SIGNAL",
      text: () => `Sable takes the case in both hands as though it might wake. The Collective works through the night, and by dawn the mind inside it has a voice, a name, and the choice of what to do with both.

It chooses to speak. Every screen in Verge City carries the story: who was copied, who ordered it, and what Helix calls people when it thinks nobody is listening.

You do not get paid. You get a seat in the loft, a view of the circuit-board city, and the knowledge that for one night the signal was free.`,
      apply: () => { G.take("lockbox"); G.rep("collective", 4); G.rep("helix", -3); G.rep("citizens", 2); }
    },
    broadcast: {
      title: "OPEN CHANNEL",
      text: () => `You seat the case in the cradle. The uplink wakes. For eleven minutes, every public screen in Verge City shows what Helix built and whose mind it took to build it, in that mind's own words.

The Watch arrive at the blast door in eight. By then it is already everywhere. There is no version of tonight that Helix can buy back.

You leave through the maintenance tunnel while the city argues with itself above you, carrying nothing, owed nothing, and for the first time all night not being followed.`,
      apply: () => { G.take("lockbox"); G.rep("collective", 3); G.rep("citizens", 3); G.rep("helix", -4); G.rep("watch", -1); }
    },
    ghost: {
      title: "GHOST",
      text: () => `The cradle offers DIAGNOSE, UPLOAD, PURGE. You choose the last. The case cools under your hand over about a minute, and then it is just a case.

Nobody will own that mind now: not Helix, not the Syndicate, not the Collective with its good intentions. Whether that was mercy or murder is a question you will be asking for a long time.

You walk out of the Bunker into clean rain. The city has forgotten you already. That was the point.`,
      apply: () => { G.take("lockbox"); G.rep("helix", -2); G.rep("syndicate", -2); }
    },
    whistle: {
      title: "WHISTLEBLOWER",
      text: () => `Without the case there is no mind to broadcast, but the drive is enough. Helix's internal files roll across every public screen for eleven minutes: project names, budgets, the memo that calls the test subjects 'donors'.

It is not the whole story. It is enough of it. Helix stock opens down forty per cent and Agent Voss is reassigned to somewhere with no rain at all.

You leave the Bunker with an empty bag and a city that owes you a drink.`,
      apply: () => { G.take("drive"); G.rep("citizens", 2); G.rep("helix", -3); }
    },
    runner: {
      title: "NIGHT TRAIN",
      text: () => G.has("lockbox")
        ? `The guard checks your ticket and not your luggage. The train pulls out of Verge City with you and a stolen mind in a warm black case, and every faction in the city looking the wrong way.

Somewhere down the line you will have to decide what it is and what you owe it. Not tonight. Tonight the rain streaks the window and the city turns to light behind you.`
        : `The guard checks your ticket. The train pulls out of Verge City with you in a window seat and nothing in your hands that anyone wants to kill you for.

The courier's job is somebody else's problem. The rain streaks the window and the city turns to light behind you, and you let it.`,
      apply: () => {}
    },
    dead: {
      title: "SIGNAL LOST",
      text: (s) => `You go down in ${s.lastDamage || "the dark"}, and the rain does what the rain does in Verge City: it keeps falling.

The case, if you had it, is somebody else's job now. The Watch log your face as 'unidentified'. The Chrome Dogs will tell the story differently every time.

Runners do not get monuments. They get a line in a ledger, and the line is: lost.`,
      apply: () => {}
    }
  };

  window.CONTENT = { STATS, ITEMS, FACTIONS, DISTRICTS, START_KNOWN, ROOMS: R, ENDINGS, START_ROOM: "intro" };
})();
