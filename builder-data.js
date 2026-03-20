const DND_DATA = {
races: {
  human: { name:"Human", asi:{str:1,dex:1,con:1,int:1,wis:1,cha:1}, speed:30, size:"Medium", languages:["Common","One of your choice"], traits:[{name:"Extra Language",desc:"You can speak, read, and write one extra language of your choice."},{name:"Ability Score Increase",desc:"Your ability scores each increase by 1."}], subraces:[] },
  elf: { name:"Elf", asi:{dex:2}, speed:30, size:"Medium", languages:["Common","Elvish"], traits:[{name:"Darkvision",desc:"60 ft. darkvision."},{name:"Keen Senses",desc:"Proficiency in Perception."},{name:"Fey Ancestry",desc:"Advantage on saving throws against being charmed, and magic can't put you to sleep."},{name:"Trance",desc:"Elves don't need to sleep. You can finish a long rest in 4 hours."}],
    subraces:[
      {id:"high-elf", name:"High Elf", asi:{int:1}, traits:[{name:"Cantrip",desc:"You know one wizard cantrip of your choice."},{name:"Extra Language",desc:"You can read, speak, and write one extra language."}]},
      {id:"wood-elf", name:"Wood Elf", asi:{wis:1}, speed:35, traits:[{name:"Fleet of Foot",desc:"Your base walking speed increases to 35 feet."},{name:"Mask of the Wild",desc:"You can attempt to hide even when only lightly obscured by natural phenomena."}]},
      {id:"dark-elf", name:"Dark Elf (Drow)", asi:{cha:1}, traits:[{name:"Superior Darkvision",desc:"120 ft. darkvision."},{name:"Sunlight Sensitivity",desc:"Disadvantage on attack rolls and Perception checks in direct sunlight."},{name:"Drow Magic",desc:"You know the Dancing Lights cantrip. At 3rd level, Faerie Fire. At 5th level, Darkness."}]}
    ]
  },
  dwarf: { name:"Dwarf", asi:{con:2}, speed:25, size:"Medium", languages:["Common","Dwarvish"], traits:[{name:"Darkvision",desc:"60 ft. darkvision."},{name:"Dwarven Resilience",desc:"Advantage on saving throws against poison, resistance against poison damage."},{name:"Stonecunning",desc:"Double proficiency bonus on History checks related to stonework."}],
    subraces:[
      {id:"hill-dwarf", name:"Hill Dwarf", asi:{wis:1}, traits:[{name:"Dwarven Toughness",desc:"Your HP maximum increases by 1 per level."}]},
      {id:"mountain-dwarf", name:"Mountain Dwarf", asi:{str:2}, traits:[{name:"Dwarven Armor Training",desc:"Proficiency with light and medium armor."}]}
    ]
  },
  halfling: { name:"Halfling", asi:{dex:2}, speed:25, size:"Small", languages:["Common","Halfling"], traits:[{name:"Lucky",desc:"When you roll a 1 on a d20, you can reroll and must use the new result."},{name:"Brave",desc:"Advantage on saving throws against being frightened."},{name:"Halfling Nimbleness",desc:"You can move through the space of any creature larger than you."}],
    subraces:[
      {id:"lightfoot", name:"Lightfoot", asi:{cha:1}, traits:[{name:"Naturally Stealthy",desc:"You can attempt to hide even when obscured only by a creature one size larger."}]},
      {id:"stout", name:"Stout", asi:{con:1}, traits:[{name:"Stout Resilience",desc:"Advantage on saving throws against poison, resistance against poison damage."}]}
    ]
  },
  gnome: { name:"Gnome", asi:{int:2}, speed:25, size:"Small", languages:["Common","Gnomish"], traits:[{name:"Darkvision",desc:"60 ft. darkvision."},{name:"Gnome Cunning",desc:"Advantage on all Intelligence, Wisdom, and Charisma saving throws against magic."}],
    subraces:[
      {id:"forest-gnome", name:"Forest Gnome", asi:{dex:1}, traits:[{name:"Natural Illusionist",desc:"You know the Minor Illusion cantrip."},{name:"Speak with Small Beasts",desc:"Through sounds and gestures, you can communicate with Small and Tiny beasts."}]},
      {id:"rock-gnome", name:"Rock Gnome", asi:{con:1}, traits:[{name:"Artificer's Lore",desc:"Double proficiency on History checks related to magic items, alchemical objects, or tech."},{name:"Tinker",desc:"You can spend 1 hour to construct a Tiny clockwork device."}]}
    ]
  },
  halfelf: { name:"Half-Elf", asi:{cha:2}, asiChoice:2, speed:30, size:"Medium", languages:["Common","Elvish","One of your choice"], traits:[{name:"Darkvision",desc:"60 ft. darkvision."},{name:"Fey Ancestry",desc:"Advantage on saving throws against being charmed."},{name:"Skill Versatility",desc:"You gain proficiency in two skills of your choice."},{name:"Ability Score Increase",desc:"+2 Charisma, +1 to two ability scores of your choice."}], subraces:[] },
  halforc: { name:"Half-Orc", asi:{str:2,con:1}, speed:30, size:"Medium", languages:["Common","Orc"], traits:[{name:"Darkvision",desc:"60 ft. darkvision."},{name:"Menacing",desc:"Proficiency in Intimidation."},{name:"Relentless Endurance",desc:"When reduced to 0 HP but not killed, drop to 1 HP instead. Once per long rest."},{name:"Savage Attacks",desc:"On a critical hit with a melee weapon, add one extra damage die."}], subraces:[] },
  tiefling: { name:"Tiefling", asi:{int:1,cha:2}, speed:30, size:"Medium", languages:["Common","Infernal"], traits:[{name:"Darkvision",desc:"60 ft. darkvision."},{name:"Hellish Resistance",desc:"Resistance to fire damage."},{name:"Infernal Legacy",desc:"You know Thaumaturgy. At 3rd level, Hellish Rebuke. At 5th level, Darkness."}], subraces:[] },
  dragonborn: { name:"Dragonborn", asi:{str:2,cha:1}, speed:30, size:"Medium", languages:["Common","Draconic"], traits:[{name:"Draconic Ancestry",desc:"Choose a dragon type — determines your breath weapon damage type and resistance."},{name:"Breath Weapon",desc:"Action to exhale destructive energy. Con save DC = 8 + prof + Con mod. Once per short rest."},{name:"Damage Resistance",desc:"Resistance to the damage type associated with your ancestry."}], subraces:[] }
},

classes: {
  barbarian: { name:"Barbarian", hitDie:12, saves:["str","con"], primaryAbility:"str", armorProf:["Light armor","Medium armor","Shields"], weaponProf:["Simple weapons","Martial weapons"], skillCount:2, skillOptions:["Animal Handling","Athletics","Intimidation","Nature","Perception","Survival"],
    features:[{level:1,name:"Rage",desc:"Enter a rage as a bonus action. Advantage on Str checks/saves, bonus melee damage, resistance to bludgeoning/piercing/slashing."},{level:1,name:"Unarmored Defense",desc:"While not wearing armor, AC = 10 + DEX mod + CON mod."}],
    equipment:[["Greataxe","Any martial melee weapon"],["Two handaxes","Any simple weapon"],["Explorer's pack"]]
  },
  bard: { name:"Bard", hitDie:8, saves:["dex","cha"], primaryAbility:"cha", spellcastingAbility:"cha", armorProf:["Light armor"], weaponProf:["Simple weapons","Hand crossbows","Longswords","Rapiers","Shortswords"], skillCount:3, skillOptions:["Any three skills"],
    features:[{level:1,name:"Spellcasting",desc:"Cha-based spellcasting. You know 2 cantrips and 4 spells. Spell slots start at 2 first-level slots."},{level:1,name:"Bardic Inspiration",desc:"Bonus action: grant a creature a d6 Bardic Inspiration die to add to one check/save/attack. Uses = CHA mod."}],
    equipment:[["Rapier","Longsword","Any simple weapon"],["Diplomat's pack","Entertainer's pack"],["Lute","Any musical instrument"],["Leather armor","Dagger"]]
  },
  cleric: { name:"Cleric", hitDie:8, saves:["wis","cha"], primaryAbility:"wis", spellcastingAbility:"wis", armorProf:["Light armor","Medium armor","Shields"], weaponProf:["Simple weapons"], skillCount:2, skillOptions:["History","Insight","Medicine","Persuasion","Religion"],
    features:[{level:1,name:"Spellcasting",desc:"Wis-based spellcasting. Prepare spells = Wis mod + Cleric level. Ritual Casting."},{level:1,name:"Divine Domain",desc:"Choose your domain — grants bonus spells and features from 1st level."}],
    subclasses:["Life","Light","Trickery","War","Nature","Tempest","Knowledge","Death"],
    equipment:[["Mace","Warhammer"],["Scale mail","Leather armor","Chain mail"],["Light crossbow & 20 bolts","Any simple weapon"],["Priest's pack","Explorer's pack"],["Shield","Any simple weapon"]]
  },
  druid: { name:"Druid", hitDie:8, saves:["int","wis"], primaryAbility:"wis", spellcastingAbility:"wis", armorProf:["Light armor","Medium armor","Shields (nonmetal)"], weaponProf:["Clubs","Daggers","Darts","Javelins","Maces","Quarterstaffs","Scimitars","Sickles","Slings","Spears"], skillCount:2, skillOptions:["Arcana","Animal Handling","Insight","Medicine","Nature","Perception","Religion","Survival"],
    features:[{level:1,name:"Spellcasting",desc:"Wis-based spellcasting. Prepare spells = Wis mod + Druid level. Ritual Casting."},{level:1,name:"Druidic",desc:"You know Druidic, a secret language. You can speak it and leave hidden messages."}],
    equipment:[["Wooden shield","Any simple weapon"],["Scimitar","Any simple melee weapon"],["Leather armor","Explorer's pack","Druidic focus"]]
  },
  fighter: { name:"Fighter", hitDie:10, saves:["str","con"], primaryAbility:"str", armorProf:["All armor","Shields"], weaponProf:["Simple weapons","Martial weapons"], skillCount:2, skillOptions:["Acrobatics","Animal Handling","Athletics","History","Insight","Intimidation","Perception","Survival"],
    features:[{level:1,name:"Fighting Style",desc:"Choose a fighting style: Archery (+2 ranged attack rolls), Defense (+1 AC in armor), Dueling (+2 damage with one weapon), Great Weapon Fighting (reroll 1s and 2s on damage), Protection (impose disadvantage on attacks against allies), Two-Weapon Fighting (add ability mod to second attack)."},{level:1,name:"Second Wind",desc:"Bonus action: regain 1d10 + Fighter level HP. Recharges on short or long rest."}],
    equipment:[["Chain mail","Leather armor + longbow + 20 arrows"],["Martial weapon + shield","Two martial weapons"],["Light crossbow + 20 bolts","Two handaxes"],["Dungeoneer's pack","Explorer's pack"]]
  },
  monk: { name:"Monk", hitDie:8, saves:["str","dex"], primaryAbility:"dex", armorProf:[], weaponProf:["Simple weapons","Shortswords"], skillCount:2, skillOptions:["Acrobatics","Athletics","History","Insight","Religion","Stealth"],
    features:[{level:1,name:"Unarmored Defense",desc:"AC = 10 + DEX mod + WIS mod while not wearing armor or wielding a shield."},{level:1,name:"Martial Arts",desc:"Use DEX instead of STR for unarmed strikes and monk weapons. Unarmed strike = 1d4. Bonus action unarmed strike after attack."}],
    equipment:[["Shortsword","Any simple weapon"],["Dungeoneer's pack","Explorer's pack"],["10 darts"]]
  },
  paladin: { name:"Paladin", hitDie:10, saves:["wis","cha"], primaryAbility:"cha", spellcastingAbility:"cha", armorProf:["All armor","Shields"], weaponProf:["Simple weapons","Martial weapons"], skillCount:2, skillOptions:["Athletics","Insight","Intimidation","Medicine","Persuasion","Religion"],
    features:[{level:1,name:"Divine Sense",desc:"Action: know the location of celestials, fiends, undead within 60 ft. Uses = 1 + CHA mod per long rest."},{level:1,name:"Lay on Hands",desc:"Touch to restore HP from a pool of 5 × Paladin level. Or expend 5 to cure one disease or poison."}],
    equipment:[["Martial weapon + shield","Two martial weapons"],["Five javelins","Any simple melee weapon"],["Priest's pack","Explorer's pack"],["Chain mail","Leather armor + longbow + 20 arrows"]]
  },
  ranger: { name:"Ranger", hitDie:10, saves:["str","dex"], primaryAbility:"dex", spellcastingAbility:"wis", armorProf:["Light armor","Medium armor","Shields"], weaponProf:["Simple weapons","Martial weapons"], skillCount:3, skillOptions:["Animal Handling","Athletics","Insight","Investigation","Nature","Perception","Stealth","Survival"],
    features:[{level:1,name:"Favored Enemy",desc:"Choose a type of enemy. Advantage on Survival checks to track them, advantage on Intelligence checks to recall info about them."},{level:1,name:"Natural Explorer",desc:"Choose a favored terrain. Bonuses to travel, foraging, tracking, and navigation in that terrain."}],
    equipment:[["Scale mail","Leather armor"],["Two shortswords","Two simple melee weapons"],["Dungeoneer's pack","Explorer's pack"],["Longbow + 20 arrows"]]
  },
  rogue: { name:"Rogue", hitDie:8, saves:["dex","int"], primaryAbility:"dex", armorProf:["Light armor"], weaponProf:["Simple weapons","Hand crossbows","Longswords","Rapiers","Shortswords"], skillCount:4, skillOptions:["Acrobatics","Athletics","Deception","Insight","Intimidation","Investigation","Perception","Performance","Persuasion","Sleight of Hand","Stealth"],
    features:[{level:1,name:"Expertise",desc:"Choose 2 proficient skills. Your proficiency bonus is doubled for those skills."},{level:1,name:"Sneak Attack",desc:"Once per turn, deal extra 1d6 damage when you have advantage or an ally is adjacent to target."},{level:1,name:"Thieves' Cant",desc:"A secret mix of dialect, jargon, and code used by rogues and criminals."}],
    equipment:[["Rapier","Shortsword"],["Shortbow + 20 arrows","Shortsword"],["Burglar's pack","Dungeoneer's pack","Explorer's pack"],["Leather armor","Daggers x2","Thieves' tools"]]
  },
  sorcerer: { name:"Sorcerer", hitDie:6, saves:["con","cha"], primaryAbility:"cha", spellcastingAbility:"cha", armorProf:[], weaponProf:["Daggers","Darts","Slings","Quarterstaffs","Light crossbows"], skillCount:2, skillOptions:["Arcana","Deception","Insight","Intimidation","Persuasion","Religion"],
    features:[{level:1,name:"Spellcasting",desc:"Cha-based spellcasting. Know 4 spells, 2 cantrips. 2 first-level spell slots."},{level:1,name:"Sorcerous Origin",desc:"Choose your magical origin: Draconic Bloodline or Wild Magic."}],
    equipment:[["Light crossbow + 20 bolts","Any simple weapon"],["Component pouch","Arcane focus"],["Dungeoneer's pack","Explorer's pack"],["Two daggers"]]
  },
  warlock: { name:"Warlock", hitDie:8, saves:["wis","cha"], primaryAbility:"cha", spellcastingAbility:"cha", armorProf:["Light armor"], weaponProf:["Simple weapons"], skillCount:2, skillOptions:["Arcana","Deception","History","Intimidation","Investigation","Nature","Religion"],
    features:[{level:1,name:"Otherworldly Patron",desc:"Choose your patron: Archfey, Fiend, or Great Old One. Grants expanded spell list and bonus features."},{level:1,name:"Pact Magic",desc:"Cha-based spellcasting. Spell slots recharge on short rest. 1 cantrip known, 2 spells known, 1 first-level slot."}],
    equipment:[["Light crossbow + 20 bolts","Any simple weapon"],["Component pouch","Arcane focus"],["Scholar's pack","Dungeoneer's pack"],["Leather armor","Any simple weapon","Two daggers"]]
  },
  wizard: { name:"Wizard", hitDie:6, saves:["int","wis"], primaryAbility:"int", spellcastingAbility:"int", armorProf:[], weaponProf:["Daggers","Darts","Slings","Quarterstaffs","Light crossbows"], skillCount:2, skillOptions:["Arcana","History","Insight","Investigation","Medicine","Religion"],
    features:[{level:1,name:"Spellcasting",desc:"Int-based spellcasting. Spellbook starts with 6 first-level spells. Prepare Int mod + Wizard level spells. Ritual Casting."},{level:1,name:"Arcane Recovery",desc:"Once per day on short rest, recover spell slots with total level equal to half wizard level (rounded up)."}],
    subclasses:["Abjuration","Conjuration","Divination","Enchantment","Evocation","Illusion","Necromancy","Transmutation"],
    equipment:[["Quarterstaff","Dagger"],["Component pouch","Arcane focus"],["Scholar's pack","Explorer's pack"],["Spellbook"]]
  }
},

backgrounds: {
  acolyte: { name:"Acolyte", skills:["Insight","Religion"], languages:2, feature:"Shelter of the Faithful", featureDesc:"You can call on the aid of religious establishments that share your faith.", equipment:"Holy symbol, prayer book, 5 sticks incense, vestments, common clothes, 15 gp" },
  charlatan: { name:"Charlatan", skills:["Deception","Sleight of Hand"], tools:["Disguise kit","Forgery kit"], feature:"False Identity", featureDesc:"You have a false identity with documentation and a disguise.", equipment:"Fine clothes, disguise kit, con tools, 15 gp" },
  criminal: { name:"Criminal", skills:["Deception","Stealth"], tools:["Gaming set","Thieves' tools"], feature:"Criminal Contact", featureDesc:"You have a reliable criminal contact who can find information.", equipment:"Crowbar, dark common clothes with hood, 15 gp" },
  entertainer: { name:"Entertainer", skills:["Acrobatics","Performance"], tools:["Disguise kit","Musical instrument"], feature:"By Popular Demand", featureDesc:"You can always find a place to perform and earn free lodging.", equipment:"Musical instrument, favor of admirer, costume, 15 gp" },
  folkhero: { name:"Folk Hero", skills:["Animal Handling","Survival"], tools:["Artisan's tools","Vehicles (land)"], feature:"Rustic Hospitality", featureDesc:"Common folk will shelter and hide you.", equipment:"Artisan's tools, shovel, iron pot, common clothes, 10 gp" },
  guildartisan: { name:"Guild Artisan", skills:["Insight","Persuasion"], tools:["Artisan's tools"], languages:1, feature:"Guild Membership", featureDesc:"Guild members will provide you lodging and legal assistance.", equipment:"Artisan's tools, letter of introduction, traveler's clothes, 15 gp" },
  hermit: { name:"Hermit", skills:["Medicine","Religion"], tools:["Herbalism kit"], languages:1, feature:"Discovery", featureDesc:"Your seclusion gave you access to a unique discovery.", equipment:"Scroll case, winter blanket, common clothes, herbalism kit, 5 gp" },
  noble: { name:"Noble", skills:["History","Persuasion"], tools:["Gaming set"], languages:1, feature:"Position of Privilege", featureDesc:"People assume the best of you and defer to your wishes.", equipment:"Fine clothes, signet ring, scroll of pedigree, 25 gp" },
  outlander: { name:"Outlander", skills:["Athletics","Survival"], tools:["Musical instrument"], languages:1, feature:"Wanderer", featureDesc:"You can always find food and fresh water, and remember geography.", equipment:"Staff, hunting trap, trophy, traveler's clothes, 10 gp" },
  sage: { name:"Sage", skills:["Arcana","History"], languages:2, feature:"Researcher", featureDesc:"If you don't know information, you know where to find it.", equipment:"Bottle ink, quill, small knife, letters from colleague, common clothes, 10 gp" },
  sailor: { name:"Sailor", skills:["Athletics","Perception"], tools:["Navigator's tools","Vehicles (water)"], feature:"Ship's Passage", featureDesc:"You can secure free passage on sailing ships.", equipment:"Belaying pin, silk rope 50ft, lucky charm, common clothes, 10 gp" },
  soldier: { name:"Soldier", skills:["Athletics","Intimidation"], tools:["Gaming set","Vehicles (land)"], feature:"Military Rank", featureDesc:"Soldiers loyal to your former organization recognize your rank.", equipment:"Insignia of rank, trophy, playing cards, common clothes, 10 gp" },
  urchin: { name:"Urchin", skills:["Sleight of Hand","Stealth"], tools:["Disguise kit","Thieves' tools"], feature:"City Secrets", featureDesc:"You know the secret paths of cities, moving twice the normal speed.", equipment:"Small knife, map of home city, pet mouse, token of parents, common clothes, 10 gp" }
},

skills: {
  acrobatics:{name:"Acrobatics",ability:"dex"}, animalhandling:{name:"Animal Handling",ability:"wis"},
  arcana:{name:"Arcana",ability:"int"}, athletics:{name:"Athletics",ability:"str"},
  deception:{name:"Deception",ability:"cha"}, history:{name:"History",ability:"int"},
  insight:{name:"Insight",ability:"wis"}, intimidation:{name:"Intimidation",ability:"cha"},
  investigation:{name:"Investigation",ability:"int"}, medicine:{name:"Medicine",ability:"wis"},
  nature:{name:"Nature",ability:"int"}, perception:{name:"Perception",ability:"wis"},
  performance:{name:"Performance",ability:"cha"}, persuasion:{name:"Persuasion",ability:"cha"},
  religion:{name:"Religion",ability:"int"}, sleightofhand:{name:"Sleight of Hand",ability:"dex"},
  stealth:{name:"Stealth",ability:"dex"}, survival:{name:"Survival",ability:"wis"}
},

spells: {
  wizard: {
    cantrips:["Fire Bolt","Ray of Frost","Shocking Grasp","Mage Hand","Prestidigitation","Minor Illusion","Acid Splash","Poison Spray","True Strike","Light","Message","Dancing Lights","Friends","Blade Ward"],
    level1:["Magic Missile","Sleep","Charm Person","Shield","Mage Armor","Detect Magic","Identify","Comprehend Languages","Feather Fall","Fog Cloud","Thunderwave","Burning Hands","Grease","Jump","Longstrider","Unseen Servant","Alarm","Disguise Self","Illusory Script","Witch Bolt","False Life","Ray of Sickness","Cause Fear","Absorb Elements","Catapult","Ice Knife","Chromatic Orb","Expeditious Retreat"]
  },
  sorcerer: {
    cantrips:["Fire Bolt","Chill Touch","Shocking Grasp","Ray of Frost","Mage Hand","Prestidigitation","Minor Illusion","True Strike","Light","Message","Dancing Lights","Friends","Blade Ward","Thunderclap","Acid Splash"],
    level1:["Magic Missile","Sleep","Charm Person","Shield","Burning Hands","Thunderwave","Fog Cloud","Chromatic Orb","Disguise Self","Expeditious Retreat","False Life","Feather Fall","Jump","Mage Armor","Ray of Sickness","Silent Image","Witch Bolt","Absorb Elements","Catapult","Ice Knife"]
  },
  bard: {
    cantrips:["Friends","Light","Mage Hand","Minor Illusion","Prestidigitation","True Strike","Thunderclap","Vicious Mockery","Blade Ward"],
    level1:["Charm Person","Comprehend Languages","Cure Wounds","Detect Magic","Disguise Self","Dissonant Whispers","Earth Tremor","Faerie Fire","Feather Fall","Healing Word","Heroism","Hideous Laughter","Identify","Illusory Script","Longstrider","Silent Image","Sleep","Speak with Animals","Thunderwave","Unseen Servant"]
  },
  cleric: {
    cantrips:["Guidance","Light","Mending","Resistance","Sacred Flame","Spare the Dying","Thaumaturgy","Toll the Dead","Word of Radiance","Blade Ward","True Strike"],
    level1:["Bane","Bless","Command","Create or Destroy Water","Cure Wounds","Detect Evil and Good","Detect Magic","Detect Poison and Disease","Guiding Bolt","Healing Word","Inflict Wounds","Protection from Evil and Good","Purify Food and Drink","Sanctuary","Shield of Faith"]
  },
  druid: {
    cantrips:["Druidcraft","Guidance","Mending","Poison Spray","Produce Flame","Resistance","Shillelagh","Thorn Whip","Thunderclap"],
    level1:["Animal Friendship","Absorb Elements","Charm Person","Create or Destroy Water","Cure Wounds","Detect Magic","Detect Poison and Disease","Earth Tremor","Entangle","Faerie Fire","Fog Cloud","Goodberry","Healing Word","Ice Knife","Jump","Longstrider","Purify Food and Drink","Speak with Animals","Thunderwave"]
  },
  paladin: {
    level1:["Bless","Command","Compelled Duel","Cure Wounds","Detect Evil and Good","Detect Magic","Detect Poison and Disease","Divine Favor","Heroism","Protection from Evil and Good","Purify Food and Drink","Searing Smite","Shield of Faith","Thunderous Smite","Wrathful Smite"]
  },
  ranger: {
    level1:["Absorb Elements","Alarm","Animal Friendship","Cure Wounds","Detect Magic","Detect Poison and Disease","Ensnaring Strike","Fog Cloud","Goodberry","Hail of Thorns","Hunter's Mark","Jump","Longstrider","Speak with Animals"]
  },
  warlock: {
    cantrips:["Blade Ward","Chill Touch","Eldritch Blast","Friends","Mage Hand","Minor Illusion","Poison Spray","Prestidigitation","True Strike","Thunderclap"],
    level1:["Armor of Agathys","Arms of Hadar","Charm Person","Comprehend Languages","Expeditious Retreat","Hellish Rebuke","Hex","Illusory Script","Protection from Evil and Good","Unseen Servant","Witch Bolt"]
  }
},

standardArray: [15,14,13,12,10,8],
abilityNames: { str:"Strength", dex:"Dexterity", con:"Constitution", int:"Intelligence", wis:"Wisdom", cha:"Charisma" },
abilityShort: { str:"STR", dex:"DEX", con:"CON", int:"INT", wis:"WIS", cha:"CHA" },

alignments: ["Lawful Good","Neutral Good","Chaotic Good","Lawful Neutral","True Neutral","Chaotic Neutral","Lawful Evil","Neutral Evil","Chaotic Evil"],

profBonus: { 1:2,2:2,3:2,4:2,5:3,6:3,7:3,8:3,9:4,10:4,11:4,12:4,13:5,14:5,15:5,16:5,17:6,18:6,19:6,20:6 },

hpByLevel: { barbarian:12, bard:8, cleric:8, druid:8, fighter:10, monk:8, paladin:10, ranger:10, rogue:8, sorcerer:6, warlock:8, wizard:6 }
};

// ── WEAPON LISTS ──
DND_DATA.weapons = {
  simple_melee: [
    {name:"Club",damage:"1d4",type:"Bludgeoning",props:"Light"},
    {name:"Dagger",damage:"1d4",type:"Piercing",props:"Finesse, Light, Thrown"},
    {name:"Greatclub",damage:"1d8",type:"Bludgeoning",props:"Two-handed"},
    {name:"Handaxe",damage:"1d6",type:"Slashing",props:"Light, Thrown"},
    {name:"Javelin",damage:"1d6",type:"Piercing",props:"Thrown"},
    {name:"Light Hammer",damage:"1d4",type:"Bludgeoning",props:"Light, Thrown"},
    {name:"Mace",damage:"1d6",type:"Bludgeoning",props:"—"},
    {name:"Quarterstaff",damage:"1d6",type:"Bludgeoning",props:"Versatile (1d8)"},
    {name:"Sickle",damage:"1d4",type:"Slashing",props:"Light"},
    {name:"Spear",damage:"1d6",type:"Piercing",props:"Thrown, Versatile (1d8)"}
  ],
  simple_ranged: [
    {name:"Crossbow, Light",damage:"1d8",type:"Piercing",props:"Ammunition, Loading, Two-handed"},
    {name:"Dart",damage:"1d4",type:"Piercing",props:"Finesse, Thrown"},
    {name:"Shortbow",damage:"1d6",type:"Piercing",props:"Ammunition, Two-handed"},
    {name:"Sling",damage:"1d4",type:"Bludgeoning",props:"Ammunition"}
  ],
  martial_melee: [
    {name:"Battleaxe",damage:"1d8",type:"Slashing",props:"Versatile (1d10)"},
    {name:"Flail",damage:"1d8",type:"Bludgeoning",props:"—"},
    {name:"Glaive",damage:"1d10",type:"Slashing",props:"Heavy, Reach, Two-handed"},
    {name:"Greataxe",damage:"1d12",type:"Slashing",props:"Heavy, Two-handed"},
    {name:"Greatsword",damage:"2d6",type:"Slashing",props:"Heavy, Two-handed"},
    {name:"Halberd",damage:"1d10",type:"Slashing",props:"Heavy, Reach, Two-handed"},
    {name:"Lance",damage:"1d12",type:"Piercing",props:"Reach, Special"},
    {name:"Longsword",damage:"1d8",type:"Slashing",props:"Versatile (1d10)"},
    {name:"Maul",damage:"2d6",type:"Bludgeoning",props:"Heavy, Two-handed"},
    {name:"Morningstar",damage:"1d8",type:"Piercing",props:"—"},
    {name:"Pike",damage:"1d10",type:"Piercing",props:"Heavy, Reach, Two-handed"},
    {name:"Rapier",damage:"1d8",type:"Piercing",props:"Finesse"},
    {name:"Scimitar",damage:"1d6",type:"Slashing",props:"Finesse, Light"},
    {name:"Shortsword",damage:"1d6",type:"Piercing",props:"Finesse, Light"},
    {name:"Trident",damage:"1d6",type:"Piercing",props:"Thrown, Versatile (1d8)"},
    {name:"War Pick",damage:"1d8",type:"Piercing",props:"—"},
    {name:"Warhammer",damage:"1d8",type:"Bludgeoning",props:"Versatile (1d10)"},
    {name:"Whip",damage:"1d4",type:"Slashing",props:"Finesse, Reach"}
  ],
  martial_ranged: [
    {name:"Blowgun",damage:"1",type:"Piercing",props:"Ammunition, Loading"},
    {name:"Crossbow, Hand",damage:"1d6",type:"Piercing",props:"Ammunition, Light, Loading"},
    {name:"Crossbow, Heavy",damage:"1d10",type:"Piercing",props:"Ammunition, Heavy, Loading, Two-handed"},
    {name:"Longbow",damage:"1d8",type:"Piercing",props:"Ammunition, Heavy, Two-handed"},
    {name:"Net",damage:"—",type:"—",props:"Special, Thrown"}
  ]
};

DND_DATA.weaponCategories = {
  "Any simple weapon":    [...DND_DATA.weapons.simple_melee, ...DND_DATA.weapons.simple_ranged],
  "Any simple melee weapon": DND_DATA.weapons.simple_melee,
  "Any martial weapon":   [...DND_DATA.weapons.martial_melee, ...DND_DATA.weapons.martial_ranged],
  "Any martial melee weapon": DND_DATA.weapons.martial_melee,
  "Any weapon":           [...DND_DATA.weapons.simple_melee, ...DND_DATA.weapons.simple_ranged, ...DND_DATA.weapons.martial_melee, ...DND_DATA.weapons.martial_ranged]
};
