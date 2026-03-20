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

// ── ABILITY USE TRACKING ──
DND_DATA.abilityUses = {
  barbarian:[
    {name:'Rage', uses:2, recharge:'long_rest', desc:'Advantage on STR checks/saves, bonus melee damage, resistance to B/P/S damage. Lasts 1 minute.'},
    {name:'Unarmored Defense', uses:0, recharge:'passive', desc:'While not wearing armor: AC = 10 + DEX mod + CON mod.'}
  ],
  bard:[
    {name:'Bardic Inspiration', uses:'cha_mod', recharge:'long_rest', desc:'Bonus action: grant a creature a d6 to add to one check, save, or attack roll.'}
  ],
  cleric:[
    {name:'Channel Divinity', uses:1, recharge:'short_rest', desc:'Use your divine connection. Effect determined by your chosen domain.'}
  ],
  druid:[
    {name:'Wild Shape', uses:2, recharge:'short_rest', desc:'Magically assume the shape of a beast you have seen before (CR 1/4, no fly/swim speed at 2nd level).'}
  ],
  fighter:[
    {name:'Second Wind', uses:1, recharge:'short_rest', desc:'Bonus action: regain 1d10 + Fighter level HP.'},
    {name:'Action Surge', uses:1, recharge:'short_rest', desc:'Take one additional action on your turn. Not another Action Surge.'}
  ],
  monk:[
    {name:'Ki Points', uses:'level', recharge:'short_rest', isPool:true, desc:'Spend ki to fuel Flurry of Blows (1 ki), Patient Defense (1 ki), or Step of the Wind (1 ki).'},
    {name:'Unarmored Defense', uses:0, recharge:'passive', desc:'While not wearing armor: AC = 10 + DEX mod + WIS mod.'}
  ],
  paladin:[
    {name:'Divine Sense', uses:'1+cha_mod', recharge:'long_rest', desc:'Detect the presence of powerful celestials, fiends, and undead within 60 feet.'},
    {name:'Lay on Hands', uses:5, recharge:'long_rest', isPool:true, desc:'Touch to restore HP. Pool = 5 × paladin level. Spend 5 to cure one disease or neutralize one poison.'}
  ],
  ranger:[
    {name:'Favored Enemy', uses:0, recharge:'passive', desc:'Advantage on Survival checks to track chosen enemy type. Advantage on INT checks for info about them.'},
    {name:'Natural Explorer', uses:0, recharge:'passive', desc:'Expertise in chosen terrain: no difficult terrain slow, never lost, advantage on initiative, extra rations, tracking more creatures.'}
  ],
  rogue:[
    {name:'Sneak Attack', uses:0, recharge:'passive', desc:'Once per turn: +1d6 damage when you have advantage or ally within 5ft of target.'},
    {name:'Cunning Action', uses:0, recharge:'passive', desc:'Bonus action: Dash, Disengage, or Hide.'}
  ],
  sorcerer:[
    {name:'Sorcery Points', uses:'level', recharge:'long_rest', isPool:true, desc:'Spend to create spell slots or fuel Metamagic options like Twinned Spell, Quickened Spell, etc.'},
    {name:'Font of Magic', uses:0, recharge:'passive', desc:'At 2nd level: convert spell slots to/from Sorcery Points.'}
  ],
  warlock:[
    {name:'Pact Magic Slots', uses:1, recharge:'short_rest', desc:'Your spell slots recharge on a short or long rest. All slots are the same level.'},
    {name:'Dark One\'s Blessing', uses:0, recharge:'passive', desc:'Fiend patron: when you reduce a creature to 0 HP, gain CHA mod + Warlock level temp HP.'}
  ],
  wizard:[
    {name:'Arcane Recovery', uses:1, recharge:'long_rest', desc:'Once per day on a short rest: recover spell slots totaling up to half Wizard level (rounded up, max 5th level).'}
  ]
};

// ── STANDARD ACTIONS (D&D 5e rulebook) ──
DND_DATA.standardActions = [
  {name:'Attack',          type:'Action',       desc:'Make one melee or ranged weapon attack (or more with Extra Attack).'},
  {name:'Cast a Spell',    type:'Action/Bonus', desc:'Cast a spell with a casting time of 1 action or 1 bonus action.'},
  {name:'Dash',            type:'Action',       desc:'Gain extra movement equal to your speed for this turn.'},
  {name:'Disengage',       type:'Action',       desc:'Your movement doesn\'t provoke opportunity attacks for the rest of your turn.'},
  {name:'Dodge',           type:'Action',       desc:'Until your next turn: attacks against you have disadvantage, you have advantage on DEX saves.'},
  {name:'Help',            type:'Action',       desc:'Aid an ally: give them advantage on their next ability check or attack roll.'},
  {name:'Hide',            type:'Action',       desc:'Make a DEX (Stealth) check to hide from creatures that can\'t clearly see you.'},
  {name:'Ready',           type:'Action',       desc:'Prepare a reaction trigger and response for later in the round.'},
  {name:'Search',          type:'Action',       desc:'Devote your attention to finding something. WIS (Perception) or INT (Investigation).'},
  {name:'Use an Object',   type:'Action',       desc:'Interact with a second object or use a special object feature (some objects require the Use an Object action).'},
  {name:'Grapple',         type:'Attack',       desc:'Replace one attack: contested STR (Athletics) vs STR (Athletics) or DEX (Acrobatics). On success: target is grappled.'},
  {name:'Shove',           type:'Attack',       desc:'Replace one attack: knock prone or push 5ft. Contested STR (Athletics) vs STR (Athletics) or DEX (Acrobatics).'},
  {name:'Improvise',       type:'Action',       desc:'Do something not covered by another action. DM decides if an ability check is needed.'},
  {name:'Opportunity Attack', type:'Reaction',  desc:'When a creature you can see leaves your reach, you can use your reaction to make one melee attack.'},
  {name:'Dodge (Reaction)', type:'Reaction',    desc:'Some spells and features let you use your reaction to impose disadvantage on an attack or halve damage.'}
];

// ── SPELL SLOT TABLES ──
DND_DATA.spellSlots = {
  bard:     [[2],[3],[4,2],[4,3],[4,3,2],[4,3,3],[4,3,3,1],[4,3,3,2],[4,3,3,3,1],[4,3,3,3,2]],
  cleric:   [[2],[3],[4,2],[4,3],[4,3,2],[4,3,3],[4,3,3,1],[4,3,3,2],[4,3,3,3,1],[4,3,3,3,2]],
  druid:    [[2],[3],[4,2],[4,3],[4,3,2],[4,3,3],[4,3,3,1],[4,3,3,2],[4,3,3,3,1],[4,3,3,3,2]],
  sorcerer: [[2],[3],[4,2],[4,3],[4,3,2],[4,3,3],[4,3,3,1],[4,3,3,2],[4,3,3,3,1],[4,3,3,3,2]],
  wizard:   [[2],[3],[4,2],[4,3],[4,3,2],[4,3,3],[4,3,3,1],[4,3,3,2],[4,3,3,3,1],[4,3,3,3,2]],
  warlock:  [[1],[2],[2],[2],[2],[2],[2],[2],[2],[2]],
  paladin:  [[2],[2],[3],[3],[4,2],[4,2],[4,3],[4,3],[4,3,2],[4,3,2]],
  ranger:   [[2],[2],[3],[3],[4,2],[4,2],[4,3],[4,3],[4,3,2],[4,3,2]]
};

// ── SPELL DESCRIPTIONS ──
DND_DATA.spellDescriptions = {
  // Cantrips
  "Fire Bolt":           {school:"Evocation", castTime:"1 action", range:"120 ft", duration:"Instantaneous", desc:"Hurl a mote of fire. +d10 fire damage on hit. Hits flammable objects not worn or carried."},
  "Ray of Frost":        {school:"Evocation", castTime:"1 action", range:"60 ft", duration:"Instantaneous", desc:"Beam of blue-white light. +d8 cold damage, target speed reduced by 10 ft until your next turn."},
  "Shocking Grasp":      {school:"Evocation", castTime:"1 action", range:"Touch", duration:"Instantaneous", desc:"+d8 lightning damage. Advantage vs metal armor. Target can't take reactions until next turn."},
  "Mage Hand":           {school:"Conjuration", castTime:"1 action", range:"30 ft", duration:"1 minute", desc:"Spectral hand carries objects up to 10 lbs, opens doors, retrieves items. Can't attack."},
  "Prestidigitation":    {school:"Transmutation", castTime:"1 action", range:"10 ft", duration:"Up to 1 hour", desc:"Minor magical tricks: lights, sounds, smells, marks, trinkets, clean/soil objects."},
  "Minor Illusion":      {school:"Illusion", castTime:"1 action", range:"30 ft", duration:"1 minute", desc:"Create a sound or image. Investigation check to determine it's an illusion."},
  "Vicious Mockery":     {school:"Enchantment", castTime:"1 action", range:"60 ft", duration:"Instantaneous", desc:"Taunt with insults. WIS save or take d4 psychic damage and disadvantage on next attack roll."},
  "Eldritch Blast":      {school:"Evocation", castTime:"1 action", range:"120 ft", duration:"Instantaneous", desc:"Beam of crackling energy. +d10 force damage per beam. Two beams at 5th level."},
  "Sacred Flame":        {school:"Evocation", castTime:"1 action", range:"60 ft", duration:"Instantaneous", desc:"Flame-like radiance descends. DEX save or take d8 radiant damage. No cover bonus."},
  "Guidance":            {school:"Divination", castTime:"1 action", range:"Touch", duration:"Concentration, 1 min", desc:"Add d4 to one ability check of your choice before the spell ends."},
  "Thaumaturgy":         {school:"Transmutation", castTime:"1 action", range:"30 ft", duration:"Up to 1 minute", desc:"Manifest a wonder: tremors, flame flare, thunder clap, eye color change, voice booms."},
  "Produce Flame":       {school:"Conjuration", castTime:"1 action", range:"Self", duration:"10 minutes", desc:"Flame in your hand gives 10ft light. Can hurl it: +d8 fire damage, 30ft range."},
  "Thorn Whip":          {school:"Transmutation", castTime:"1 action", range:"30 ft", duration:"Instantaneous", desc:"+d6 piercing damage. Pull creature up to 10 ft toward you."},
  "Druidcraft":          {school:"Transmutation", castTime:"1 action", range:"30 ft", duration:"Instantaneous", desc:"Predict weather, make flower bloom, create sensory effect, light or snuff a flame."},
  "Shillelagh":          {school:"Transmutation", castTime:"1 bonus action", range:"Touch", duration:"1 minute", desc:"Your club or quarterstaff deals d8 damage using WIS instead of STR."},
  "Toll the Dead":       {school:"Necromancy", castTime:"1 action", range:"60 ft", duration:"Instantaneous", desc:"WIS save or d8 necrotic (d12 if wounded). No attack roll needed."},
  "Thunderclap":         {school:"Evocation", castTime:"1 action", range:"5 ft", duration:"Instantaneous", desc:"CON save or d6 thunder damage. Audible 100 ft away."},
  "Chill Touch":         {school:"Necromancy", castTime:"1 action", range:"120 ft", duration:"1 round", desc:"+d8 necrotic damage. Target can't regain HP. Undead also get disadvantage on attacks vs you."},
  "True Strike":         {school:"Divination", castTime:"1 action", range:"30 ft", duration:"Concentration, 1 round", desc:"Advantage on your next attack roll vs target before end of next turn."},
  "Light":               {school:"Evocation", castTime:"1 action", range:"Touch", duration:"1 hour", desc:"Object glows 20ft bright, 20ft dim. DEX save to avoid if worn/held by hostile creature."},
  "Message":             {school:"Transmutation", castTime:"1 action", range:"120 ft", duration:"1 round", desc:"Whisper a message to a creature. They can reply in a whisper only you hear."},
  "Dancing Lights":      {school:"Evocation", castTime:"1 action", range:"120 ft", duration:"Concentration, 1 min", desc:"Up to four torch-lights move as you direct. Dim light in 10ft area each."},
  "Friends":             {school:"Enchantment", castTime:"1 action", range:"Self", duration:"Concentration, 1 min", desc:"Advantage on CHA checks against one creature. It knows you used magic after spell ends."},
  "Blade Ward":          {school:"Abjuration", castTime:"1 action", range:"Self", duration:"1 round", desc:"Resistance to bludgeoning, piercing, and slashing damage from weapon attacks until next turn."},
  "Acid Splash":         {school:"Conjuration", castTime:"1 action", range:"60 ft", duration:"Instantaneous", desc:"Orb of acid. DEX save or d6 acid damage. Can target two creatures within 5 ft of each other."},
  "Poison Spray":        {school:"Conjuration", castTime:"1 action", range:"10 ft", duration:"Instantaneous", desc:"CON save or d12 poison damage."},
  "Word of Radiance":    {school:"Evocation", castTime:"1 action", range:"5 ft", duration:"Instantaneous", desc:"All chosen creatures within 5ft: CON save or d6 radiant damage."},
  "Spare the Dying":     {school:"Necromancy", castTime:"1 action", range:"Touch", duration:"Instantaneous", desc:"Touch a dying creature (0 HP) to stabilize it. Has no effect on undead or constructs."},
  "Resistance":          {school:"Abjuration", castTime:"1 action", range:"Touch", duration:"Concentration, 1 min", desc:"Touch a creature. Once before spell ends, roll d4 and add to one saving throw."},
  "Mending":             {school:"Transmutation", castTime:"1 minute", range:"Touch", duration:"Instantaneous", desc:"Repair a single break or tear in an object. Invisible seam."},

  // 1st Level Spells
  "Magic Missile":       {school:"Evocation", castTime:"1 action", range:"120 ft", duration:"Instantaneous", desc:"Three darts of magical force. Each hits automatically for d4+1 force damage. Always hits."},
  "Sleep":               {school:"Enchantment", castTime:"1 action", range:"90 ft", duration:"1 minute", desc:"Roll 5d8. Creatures with HP ≤ total fall unconscious, lowest HP first."},
  "Charm Person":        {school:"Enchantment", castTime:"1 action", range:"30 ft", duration:"1 hour", desc:"WIS save or target regards you as a friendly acquaintance. Knows it was charmed after."},
  "Shield":              {school:"Abjuration", castTime:"1 reaction", range:"Self", duration:"1 round", desc:"+5 AC until start of next turn including vs the triggering attack. Also blocks Magic Missile."},
  "Mage Armor":          {school:"Abjuration", castTime:"1 action", range:"Touch", duration:"8 hours", desc:"Willing creature's AC becomes 13 + DEX modifier. Lasts 8 hours or until armor worn."},
  "Detect Magic":        {school:"Divination", castTime:"1 action", range:"Self", duration:"Concentration, 10 min", desc:"Sense presence of magic within 30 ft. See magical auras, learn school of magic. Ritual."},
  "Identify":            {school:"Divination", castTime:"1 minute", range:"Touch", duration:"Instantaneous", desc:"Learn the properties of a magic item, active spells on a creature, or how to activate it. Ritual."},
  "Thunderwave":         {school:"Evocation", castTime:"1 action", range:"Self (15ft cube)", duration:"Instantaneous", desc:"CON save: d8 thunder + 10ft push on fail. Half on save. Audible 300ft."},
  "Burning Hands":       {school:"Evocation", castTime:"1 action", range:"Self (15ft cone)", duration:"Instantaneous", desc:"DEX save: 3d6 fire on fail, half on save. Flammable objects ignite."},
  "Cure Wounds":         {school:"Evocation", castTime:"1 action", range:"Touch", duration:"Instantaneous", desc:"Touch a living creature to restore d8 + spellcasting modifier HP. No effect on undead/constructs."},
  "Healing Word":        {school:"Evocation", castTime:"1 bonus action", range:"60 ft", duration:"Instantaneous", desc:"Bonus action heal: target regains d4 + spellcasting modifier HP. Range 60 ft."},
  "Bless":               {school:"Enchantment", castTime:"1 action", range:"30 ft", duration:"Concentration, 1 min", desc:"Up to 3 creatures add d4 to attack rolls and saving throws."},
  "Bane":                {school:"Enchantment", castTime:"1 action", range:"30 ft", duration:"Concentration, 1 min", desc:"Up to 3 creatures: CHA save or subtract d4 from attack rolls and saving throws."},
  "Guiding Bolt":        {school:"Evocation", castTime:"1 action", range:"120 ft", duration:"1 round", desc:"+4d6 radiant damage. Next attack vs target has advantage before end of your next turn."},
  "Inflict Wounds":      {school:"Necromancy", castTime:"1 action", range:"Touch", duration:"Instantaneous", desc:"Melee spell attack: 3d10 necrotic damage on hit."},
  "Shield of Faith":     {school:"Abjuration", castTime:"1 bonus action", range:"60 ft", duration:"Concentration, 10 min", desc:"Shimmering field gives target +2 AC."},
  "Command":             {school:"Enchantment", castTime:"1 action", range:"60 ft", duration:"1 round", desc:"WIS save or follow one-word command: Approach, Drop, Flee, Grovel, Halt."},
  "Sanctuary":           {school:"Abjuration", castTime:"1 bonus action", range:"30 ft", duration:"1 minute", desc:"Attackers must WIS save to target protected creature. Ends if it attacks or casts."},
  "Entangle":            {school:"Conjuration", castTime:"1 action", range:"90 ft", duration:"Concentration, 1 min", desc:"Grasping weeds fill 20ft square. STR save or restrained. Area is difficult terrain."},
  "Faerie Fire":         {school:"Evocation", castTime:"1 action", range:"60 ft", duration:"Concentration, 1 min", desc:"DEX save or outlined in light. Attacks vs outlined creatures have advantage. No hiding."},
  "Goodberry":           {school:"Transmutation", castTime:"1 action", range:"Touch", duration:"Instantaneous", desc:"Create 10 berries. Each restores 1 HP and provides a day's nourishment."},
  "Fog Cloud":           {school:"Conjuration", castTime:"1 action", range:"120 ft", duration:"Concentration, 1 hour", desc:"20ft radius sphere of fog. Heavily obscured area. Wind disperses it."},
  "Feather Fall":        {school:"Transmutation", castTime:"1 reaction", range:"60 ft", duration:"1 minute", desc:"Up to 5 falling creatures descend 60ft/round and take no fall damage."},
  "Longstrider":         {school:"Transmutation", castTime:"1 action", range:"Touch", duration:"1 hour", desc:"Touch a creature. Its speed increases by 10 ft for the duration."},
  "Jump":                {school:"Transmutation", castTime:"1 action", range:"Touch", duration:"1 minute", desc:"Triple a creature's jump distance for the duration."},
  "Hex":                 {school:"Enchantment", castTime:"1 bonus action", range:"90 ft", duration:"Concentration, 1 hour", desc:"Curse target: deal extra d6 necrotic on hits. Choose ability: target has disadvantage on checks with it."},
  "Hellish Rebuke":      {school:"Evocation", castTime:"1 reaction", range:"60 ft", duration:"Instantaneous", desc:"When damaged: DEX save or 2d10 fire to attacker. Half on save."},
  "Armor of Agathys":    {school:"Abjuration", castTime:"1 action", range:"Self", duration:"1 hour", desc:"Gain 5 temp HP. When hit in melee, attacker takes 5 cold damage."},
  "Arms of Hadar":       {school:"Conjuration", castTime:"1 action", range:"Self (10ft)", duration:"Instantaneous", desc:"STR save or 2d6 necrotic and can't take reactions. Half damage on save."},
  "Witch Bolt":          {school:"Evocation", castTime:"1 action", range:"30 ft", duration:"Concentration, 1 min", desc:"Ranged attack: d12 lightning. Each turn, bonus action to deal d12 again automatically."},
  "Expeditious Retreat":  {school:"Transmutation", castTime:"1 bonus action", range:"Self", duration:"Concentration, 10 min", desc:"Take Dash action as bonus action on each turn."},
  "False Life":          {school:"Necromancy", castTime:"1 action", range:"Self", duration:"1 hour", desc:"Gain 1d4+4 temporary HP."},
  "Disguise Self":       {school:"Illusion", castTime:"1 action", range:"Self", duration:"1 hour", desc:"Change appearance of body and equipment. Investigation vs spell save DC to see through."},
  "Silent Image":        {school:"Illusion", castTime:"1 action", range:"60 ft", duration:"Concentration, 10 min", desc:"Create a visual illusion up to 15ft cube. Investigation check to disbelieve."},
  "Comprehend Languages":{school:"Divination", castTime:"1 action", range:"Self", duration:"1 hour", desc:"Understand any spoken or written language. Touch written surface for word-by-word translation. Ritual."},
  "Unseen Servant":      {school:"Conjuration", castTime:"1 action", range:"60 ft", duration:"1 hour", desc:"Invisible force performs simple tasks: fetch, clean, hold, carry (10lbs). Speed 15ft. Ritual."},
  "Alarm":               {school:"Abjuration", castTime:"1 minute", range:"30 ft", duration:"8 hours", desc:"Mental or audible alarm when tiny+ creature enters 20ft cube. Ritual."},
  "Grease":              {school:"Conjuration", castTime:"1 action", range:"60 ft", duration:"1 minute", desc:"Slick grease in 10ft square. DEX save or fall prone. Difficult terrain."},
  "Chromatic Orb":       {school:"Evocation", castTime:"1 action", range:"90 ft", duration:"Instantaneous", desc:"4\" sphere of energy: choose acid/cold/fire/lightning/poison/thunder. Ranged attack: 3d8 damage."},
  "Ice Knife":           {school:"Conjuration", castTime:"1 action", range:"60 ft", duration:"Instantaneous", desc:"Ranged attack: d10 piercing. Miss or hit: shards explode 5ft, DEX save or 2d6 cold."},
  "Catapult":            {school:"Transmutation", castTime:"1 action", range:"60 ft", duration:"Instantaneous", desc:"Launch a 1-5 lb object 90 ft. DEX save or 3d8 bludgeoning damage."},
  "Absorb Elements":     {school:"Abjuration", castTime:"1 reaction", range:"Self", duration:"1 round", desc:"Resistance to triggering damage type. Next melee hit deals +1d6 of that type."},
  "Hunter's Mark":       {school:"Divination", castTime:"1 bonus action", range:"90 ft", duration:"Concentration, 1 hour", desc:"Mark a creature. Deal +d6 damage to it on weapon hits. Advantage on Perception/Survival to track."},
  "Ensnaring Strike":    {school:"Conjuration", castTime:"1 bonus action", range:"Self", duration:"Concentration, 1 min", desc:"Next hit: STR save or restrained by vines. Repeating save each turn. d6 piercing if restrained."},
  "Hail of Thorns":      {school:"Conjuration", castTime:"1 bonus action", range:"Self", duration:"Concentration, 1 min", desc:"Next ranged hit: d10 piercing burst, 5ft radius DEX save or d10 piercing to others."},
  "Animal Friendship":   {school:"Enchantment", castTime:"1 action", range:"30 ft", duration:"24 hours", desc:"WIS save (DC varies by INT) or beast is charmed by you for 24 hours."},
  "Speak with Animals":  {school:"Divination", castTime:"1 action", range:"Self", duration:"10 minutes", desc:"Comprehend and verbally communicate with beasts. They share knowledge of nearby locations. Ritual."},
  "Compelled Duel":      {school:"Enchantment", castTime:"1 bonus action", range:"30 ft", duration:"Concentration, 1 min", desc:"WIS save or target is drawn to fight only you. Disadvantage attacking others. DEX save to move away."},
  "Divine Favor":        {school:"Evocation", castTime:"1 bonus action", range:"Self", duration:"Concentration, 1 min", desc:"Weapon attacks deal extra d4 radiant damage."},
  "Heroism":             {school:"Enchantment", castTime:"1 action", range:"Touch", duration:"Concentration, 1 min", desc:"Immune to frightened. Gain temp HP equal to spellcasting mod at start of each turn."},
  "Searing Smite":       {school:"Evocation", castTime:"1 bonus action", range:"Self", duration:"Concentration, 1 min", desc:"Next hit: +d6 fire damage. Target ignites: d4 fire each turn until action to extinguish."},
  "Thunderous Smite":    {school:"Evocation", castTime:"1 bonus action", range:"Self", duration:"Concentration, 1 min", desc:"Next hit: +2d6 thunder, STR save or 10ft push and knocked prone. Audible 300ft."},
  "Wrathful Smite":      {school:"Evocation", castTime:"1 bonus action", range:"Self", duration:"Concentration, 1 min", desc:"Next hit: +d6 psychic, WIS save or frightened until sees you succeed a save."},
  "Protection from Evil and Good":{school:"Abjuration", castTime:"1 action", range:"Touch", duration:"Concentration, 10 min", desc:"Protection vs aberrations, celestials, elementals, fey, fiends, undead: no charm/fright/possession, attacks have disadvantage."},
  "Purify Food and Drink":{school:"Transmutation", castTime:"1 action", range:"10 ft", duration:"Instantaneous", desc:"Remove poison and disease from food and drink in 5ft sphere. Ritual."},
  "Create or Destroy Water":{school:"Transmutation", castTime:"1 action", range:"30 ft", duration:"Instantaneous", desc:"Create 10 gallons of clean water in a container, or destroy water in a 30ft cube."},
  "Detect Evil and Good":{school:"Divination", castTime:"1 action", range:"Self", duration:"Concentration, 10 min", desc:"Know if aberration/celestial/elemental/fey/fiend/undead is within 30ft and its location."},
  "Detect Poison and Disease":{school:"Divination", castTime:"1 action", range:"Self", duration:"Concentration, 10 min", desc:"Sense presence and location of poison/disease/poisonous creature within 30ft. Ritual."},
  "Earth Tremor":        {school:"Evocation", castTime:"1 action", range:"10 ft", duration:"Instantaneous", desc:"DEX save or d6 bludgeoning + fall prone. Ground in area becomes difficult terrain."},
  "Dissonant Whispers":  {school:"Enchantment", castTime:"1 action", range:"60 ft", duration:"Instantaneous", desc:"WIS save or 3d6 psychic + use reaction to flee. Half damage, no fleeing on save."},
  "Illusory Script":     {school:"Illusion", castTime:"1 minute", range:"Touch", duration:"10 days", desc:"Write secret message. Others see unintelligible script or a decoy message. Ritual."},
};

// ── ITEM CATEGORIES (for equipment dropdowns) ──
DND_DATA.itemCategories = {
  "Any musical instrument": [
    "Bagpipes","Drum","Dulcimer","Flute","Lute","Lyre","Horn","Pan flute","Shawm","Viol"
  ],
  "Any artisan's tools": [
    "Alchemist's supplies","Brewer's supplies","Calligrapher's supplies",
    "Carpenter's tools","Cartographer's tools","Cobbler's tools","Cook's utensils",
    "Glassblower's tools","Jeweler's tools","Leatherworker's tools","Mason's tools",
    "Painter's supplies","Potter's tools","Smith's tools","Tinker's tools",
    "Weaver's tools","Woodcarver's tools"
  ],
  "Any gaming set": ["Dice set","Dragonchess set","Playing card set","Three-dragon ante set"],
  "Any simple melee weapon": null,
  "Any martial melee weapon": null,
  "Any simple weapon": null,
  "Any martial weapon": null,
  "Any weapon": null,
  "Any arcane focus": ["Crystal","Orb","Rod","Staff","Wand"],
  "Any druidic focus": ["Sprig of mistletoe","Totem","Wooden staff","Yew wand"],
  "Any holy symbol": ["Amulet","Emblem","Reliquary"],
  "Any musical instrument (one of your choice)": null,
};
// Merge weapon categories into itemCategories
if(DND_DATA.weaponCategories){
  Object.keys(DND_DATA.weaponCategories).forEach(k=>{
    DND_DATA.itemCategories[k] = DND_DATA.weaponCategories[k];
  });
}
