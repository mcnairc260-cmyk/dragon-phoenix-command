# PROJECT ASCENSION — full script
# Chapter 1 = the user's existing panels (captions are baked into the art).
# Chapters 2–3 = new. Each "img" gets generated; captions/balloons are overlaid in the reader.
#
# Caption kinds:  cap = narration box (cream)   bal = speech balloon (white)   title = chapter title box
# pos = corner: tl tr bl br tc bc (top/bottom + left/right/center)

STYLE = (
    "Mature dark graphic novel panel art. Painterly semi-realistic digital illustration, cinematic film-still framing, "
    "dramatic lighting, deep shadows, high contrast, desaturated teal and amber palette with selective red accents, "
    "gritty textures, detailed backgrounds. Absolutely no text, no captions, no speech bubbles, no lettering, "
    "no logos with words, no watermark, no panel borders. "
)

# Character sheets (kept short and repeated verbatim so the model stays consistent)
REYES = "Jonah Reyes: late-30s Latino man, short dark beard, tired eyes, dark trench coat over a grey hoodie"
SILAS = "Silas Trent: very large 40s man, shaved head laced with surgical scars, burn scars at the temples, faint white glow in his eyes, worn olive military jacket"
KELL = "Director Ambrose Kell: mid-60s man, silver hair combed back, black eyepatch over his left eye, black suit and tie"
PARAGON = "Paragon: square-jawed 30s man, short brown hair, white-and-silver armored hero suit with a stylized silver letter F emblem on the chest"
OKAFOR = "Dr. Imani Okafor: 40s Black woman, long locs tied back, white lab coat, sharp focused expression"
MARA = "Mara: elderly woman, long white braid, weathered face, eyes that shine silver like a cat's in the light, plain dark wool coat"
HOLLOW = "Hollow: gaunt chalk-white man in a tattered black first-generation hero uniform, eyes fully black, faint pale light glowing under his skin, head tilted"
HALE = "Victor Hale: 60s CEO, silver temples, immaculate charcoal suit, cold thin smile"
VEIL = "Veil: 40s woman with long dark red hair, black armored suit, deep red cape"
PALE = "the Pale: tall thin grey aliens with large black almond eyes, long fingers"
SHIP = "a colossal dark alien mothership, flat and layered like stacked plates, hanging silently over the city with smaller triangular craft in formation"

CHAPTERS = [
    {"num": 1, "title": "THE QUIET SKY"},
    {"num": 2, "title": "THE SEED"},
    {"num": 3, "title": "ASCENSION"},
]

# ---------- CHAPTER 1 (existing art; captions baked in) ----------
CH1_PAGES = [
    {"rows": [["p01"], ["p02", "p03"], ["p04", "p05"]]},
    {"rows": [["p06", "p07"], ["p08", "p09"], ["p10", "p11", "p12"]]},
    {"rows": [["p13"]]},
]

# ---------- CHAPTER 2 — THE SEED ----------
CH2_PAGES = [
    {   # 2.1
        "layout": "S",
        "images": [{"id": "c2_01", "ar": "2:3", "anchor": ["reyes"],
                    "prompt": f"{REYES}, standing alone in a rain-slick city alley at night, face lit from below by the cold glow of the phone in his hand, wet asphalt reflecting neon, fire escapes, steam; high above the rooftops the faint silhouette of {SHIP}. Low angle, moody, tense."}],
        "text": [
            {"k": "title", "pos": "tl", "t": "CHAPTER 2\nTHE SEED"},
            {"k": "cap", "pos": "tr", "t": "Jonah Reyes used to keep the government's secrets.\nNow he keeps a list."},
            {"k": "cap", "pos": "ml", "t": "Every name on it is dead, missing, or lying."},
            {"k": "cap", "pos": "bl", "t": "Tonight, the list wrote back."},
            {"k": "cap", "pos": "br", "t": "UNKNOWN: You read my file.\nCome read the rest.\n— 9"},
        ],
    },
    {   # 2.2
        "layout": "W2",
        "images": [
            {"id": "c2_02a", "ar": "4:3", "anchor": [],
             "prompt": "A storm-drain tunnel deep under a city: wet concrete, dripping pipes, a single flashlight beam cutting the dark. Dozens of small red triangle symbols painted on the walls, some fresh, some faded, arranged like a map. Eerie, claustrophobic."},
            {"id": "c2_02b", "ar": "4:3", "anchor": ["silas"],
             "prompt": f"{SILAS}, stepping out of the darkness of a storm-drain tunnel toward the viewer, flashlight glare on one side of his face, red triangle symbols painted on the wet concrete behind him. Imposing, weary, dangerous but not hostile."},
        ],
        "text": [
            {"img": 0, "k": "cap", "pos": "tl", "t": "Under the city, someone has been keeping\na different kind of archive."},
            {"img": 1, "k": "bal", "pos": "tl", "who": "SILAS", "t": "You're the archivist."},
            {"img": 1, "k": "bal", "pos": "tr", "who": "REYES", "t": "I was."},
            {"img": 1, "k": "bal", "pos": "ml", "who": "SILAS", "t": "Then you know my name.\nSubject Nine."},
            {"img": 1, "k": "cap", "pos": "br", "t": "Some people died.\nHe didn't. The file says otherwise."},
        ],
    },
    {   # 2.3
        "layout": "W2",
        "images": [
            {"id": "c2_03a", "ar": "4:3", "anchor": [],
             "prompt": "Flashback, cold blue-white color grade: a 1990s military laboratory, a restrained muscular man in a steel chair with cables to his skull, a gloved doctor in white pressing a syringe of faintly glowing pale fluid into his neck, other doctors watching behind glass. Clinical, cruel."},
            {"id": "c2_03b", "ar": "4:3", "anchor": ["silas"],
             "prompt": f"{SILAS}, sitting on a wooden crate in a storm-drain tunnel, elbows on knees, hands clasped, scars lit hard from one side by a flashlight, red triangle symbols on the wall behind him. Quiet, confessional close-up."},
        ],
        "text": [
            {"img": 0, "k": "cap", "pos": "tl", "t": "They called it the Ascension serum.\nIt wasn't a serum."},
            {"img": 0, "k": "cap", "pos": "br", "t": "It was alive."},
            {"img": 1, "k": "bal", "pos": "tl", "who": "SILAS", "t": "They didn't give us powers.\nThey planted something.\nIt grows. It listens."},
            {"img": 1, "k": "bal", "pos": "mr", "who": "SILAS", "t": "And it is not ours."},
            {"img": 1, "k": "cap", "pos": "bl", "t": "The biology wasn't a gift.\nIt was a seed."},
        ],
    },
    {   # 2.4
        "layout": "WT",
        "images": [
            {"id": "c2_04a", "ar": "16:9", "anchor": [],
             "prompt": "Foundry Tower: a black glass corporate skyscraper at dusk, taller than everything around it, crowned by a glowing white ring of alien alloy, a plain silver letter F shape on its face, city lights below, storm clouds above. Ominous corporate grandeur."},
            {"id": "c2_04b", "ar": "1:1", "anchor": ["okafor", "kell"],
             "prompt": f"{OKAFOR} standing before a wall of tall glass tanks in a dim vault laboratory, each tank holding a thin grey alien body suspended in pale fluid, blue monitor light on her face; behind her {KELL} watches with his hands in his pockets. Tense, secretive."},
        ],
        "text": [
            {"img": 0, "k": "cap", "pos": "tl", "t": "Foundry Global.\nThe company that sells tomorrow."},
            {"img": 0, "k": "cap", "pos": "br", "t": "It also owns the ship."},
            {"img": 1, "k": "bal", "pos": "tr", "who": "KELL", "t": "How many are awake?"},
            {"img": 1, "k": "bal", "pos": "ml", "who": "OKAFOR", "t": "All of them, Director.\nThey've been awake for a year."},
            {"img": 1, "k": "cap", "pos": "br", "t": "Foundry calls them specimens.\nThey are not asleep.\nThey are waiting."},
        ],
    },
    {   # 2.5
        "layout": "S",
        "images": [{"id": "c2_05", "ar": "2:3", "anchor": ["paragon"],
                    "prompt": f"{PARAGON}, smiling and waving on a stage at a corporate press event, American flags, camera flashes, cheering crowd, banners with a plain silver letter F shape; at the edge of the stage a grey-suited handler holds up a tablet toward him. Bright, polished, slightly hollow."}],
        "text": [
            {"k": "cap", "pos": "tl", "t": "Paragon smiles because he has to."},
            {"k": "bal", "pos": "mr", "who": "HANDLER", "t": "Smile, Grant.\nThe vote is Tuesday."},
            {"k": "cap", "pos": "bl", "t": "The Ascension Act: seed screening for every first responder in America.\nTwo million people. Ninety days."},
            {"k": "cap", "pos": "br", "t": "Foundry wrote it. Paragon sells it.\nNobody asked who owns the seed."},
        ],
    },
    {   # 2.6
        "layout": "W2",
        "images": [
            {"id": "c2_06a", "ar": "4:3", "anchor": ["kell", "reyes"],
             "prompt": f"Night under a concrete highway overpass in the rain: {KELL} leaning against a black SUV with its headlights on, facing {REYES} who stands a few steps away with his hands in his coat pockets. Wet ground, long shadows, standoff energy."},
            {"id": "c2_06b", "ar": "4:3", "anchor": [],
             "prompt": f"{SHIP} hanging over the United States Capitol dome at twilight, thunderheads lit from within, tiny helicopters below for scale. Awe and dread."},
        ],
        "text": [
            {"img": 0, "k": "bal", "pos": "tl", "who": "KELL", "t": "You think I'm the villain."},
            {"img": 0, "k": "bal", "pos": "tr", "who": "KELL", "t": "I'm the only one who's been\nholding the door shut."},
            {"img": 0, "k": "cap", "pos": "bl", "t": "Reyes has been followed for a week.\nHe wasn't followed here. He was brought."},
            {"img": 1, "k": "bal", "pos": "tl", "who": "KELL", "t": "That thing isn't an invasion.\nIt's a warning.\nFrom the ones who were here first."},
            {"img": 1, "k": "cap", "pos": "br", "t": "Two kinds of visitors.\nOne that knocks. One that never left."},
        ],
    },
    {   # 2.7
        "layout": "S",
        "images": [{"id": "c2_07", "ar": "2:3", "anchor": ["mara"],
                    "prompt": f"A stone church basement lit by dozens of candles; a circle of a dozen ordinary-looking people of every age seated on folding chairs, all of their eyes catching the candlelight with an uncanny silver shine. At the center stands {MARA}. In the doorway, silhouetted, two men in dark coats watch. Sacred, unsettling."}],
        "text": [
            {"k": "cap", "pos": "tl", "t": "They have no ships.\nThey have memory."},
            {"k": "bal", "pos": "mr", "who": "MARA", "t": "We have watched the Pale\nseed twelve worlds."},
            {"k": "bal", "pos": "ml", "who": "MARA", "t": "Every one of them\ncalled it progress."},
            {"k": "cap", "pos": "bl", "t": "They call themselves Residents.\nThey have called this planet home for four thousand years."},
        ],
    },
    {   # 2.8
        "layout": "S",
        "images": [{"id": "c2_08", "ar": "2:3", "anchor": [],
                    "prompt": f"Apocalyptic vision: a wide city avenue where hundreds of costumed superhumans stand motionless in perfect ranks, every one of their eyes solid black; above them the sky is torn open with cracks of pale white light, filled with dark alien craft, and {PALE} descend slowly on beams of light. Silent, wrong, overwhelming."}],
        "text": [
            {"k": "cap", "pos": "tl", "t": "The seed does not make gods."},
            {"k": "bal", "pos": "tr", "who": "MARA", "t": "It makes doors.\nWhen enough are open,\nthey come through."},
            {"k": "bal", "pos": "ml", "who": "MARA", "t": "And they wear you."},
            {"k": "cap", "pos": "br", "t": "The Ascension was never ours."},
        ],
    },
    {   # 2.9
        "layout": "W2",
        "images": [
            {"id": "c2_09a", "ar": "4:3", "anchor": ["okafor"],
             "prompt": f"{OKAFOR} alone at a terminal in a dark laboratory at night, copying files to a small drive, her face lit by the monitor, a red alarm light beginning to strobe on the wall, glass specimen tanks glowing faintly behind her. Urgent, afraid."},
            {"id": "c2_09b", "ar": "4:3", "anchor": ["hollow"],
             "prompt": f"{HOLLOW}, standing silently in a dark laboratory doorway just behind a seated woman's shoulder, red alarm light strobing across his chalk-white face. Horror-movie stillness."},
        ],
        "text": [
            {"img": 0, "k": "cap", "pos": "tl", "t": "The Act's fine print: two million seeds in ninety days.\nThreshold reached on day sixty-one."},
            {"img": 0, "k": "cap", "pos": "br", "t": "Okafor did the math.\nThen she did the wrong thing,\nwhich was the right thing."},
            {"img": 1, "k": "bal", "pos": "tr", "who": "HOLLOW", "t": "Doctor.\nYou were told to stop looking."},
            {"img": 1, "k": "cap", "pos": "bl", "t": "Some of the first generation didn't die.\nThey just stopped being home."},
        ],
    },
    {   # 2.10
        "layout": "W2",
        "images": [
            {"id": "c2_10a", "ar": "4:3", "anchor": ["hale", "paragon"],
             "prompt": f"A Foundry boardroom at night, floor-to-ceiling windows over the city: {HALE} seated at the head of a long black table sliding a photograph across it toward {PARAGON}, who stands in his suit with his fists clenched. Cold blue light, power imbalance."},
            {"id": "c2_10b", "ar": "4:3", "anchor": [],
             "prompt": f"Four costumed superhumans on a city rooftop at night, all frozen mid-motion, all turned to look up at the same point in the sky where {SHIP} pulses with a ring of pale light. Seen from behind and below. Eerie synchrony."},
        ],
        "text": [
            {"img": 0, "k": "bal", "pos": "tl", "who": "HALE", "t": "Subject Nine is the only door\nwe can't open.\nBring him to the tower."},
            {"img": 0, "k": "bal", "pos": "tr", "who": "PARAGON", "t": "Alive?"},
            {"img": 0, "k": "bal", "pos": "br", "who": "HALE", "t": "Bring him."},
            {"img": 1, "k": "cap", "pos": "tl", "t": "At 11:52 PM, every hero in the city\nlooked up at the same moment."},
            {"img": 1, "k": "cap", "pos": "bl", "t": "Same direction. Same sky."},
            {"img": 1, "k": "end", "pos": "br", "t": "END CHAPTER 2"},
        ],
    },
]

# ---------- CHAPTER 3 — ASCENSION ----------
CH3_PAGES = [
    {   # 3.1
        "layout": "S",
        "images": [{"id": "c3_01", "ar": "2:3", "anchor": [],
                    "prompt": f"The steps of the United States Capitol on a grey afternoon, a huge crowd with blank protest placards, a rigid line of costumed superhumans in matching white-and-silver suits standing guard on the steps, news drones hovering, and {SHIP} above the dome. Epic, tense."}],
        "text": [
            {"k": "title", "pos": "tl", "t": "CHAPTER 3\nASCENSION"},
            {"k": "cap", "pos": "tr", "t": "Every empire has a launch date."},
            {"k": "cap", "pos": "bl", "t": "Tuesday. 4:00 PM.\nThe Senate votes on the Ascension Act."},
            {"k": "cap", "pos": "br", "t": "Foundry expects it to pass.\nFoundry wrote the count."},
        ],
    },
    {   # 3.2
        "layout": "S",
        "images": [{"id": "c3_02", "ar": "2:3", "anchor": ["kell", "silas", "reyes", "mara", "veil"],
                    "prompt": f"A cramped stone safe-room lit by a single lantern; five people around a wooden table covered with blueprints of a skyscraper crowned by a ring: {KELL}, {SILAS}, {REYES}, {MARA}, and {VEIL}. War-council mood, faces half-lit, breath visible."}],
        "text": [
            {"k": "bal", "pos": "tl", "who": "KELL", "t": "The seeds sync through the Beacon on the tower.\nCut it, and the doors close."},
            {"k": "bal", "pos": "tr", "who": "MARA", "t": "Cutting isn't enough.\nThe seeds are inside them.\nSomething has to burn."},
            {"k": "bal", "pos": "ml", "who": "SILAS", "t": "I can burn one."},
            {"k": "bal", "pos": "mr", "who": "KELL", "t": "Through the Beacon, you'd be\nburning through all of them."},
            {"k": "bal", "pos": "bl", "who": "SILAS", "t": "I was already dead in that chair.\nThis is paperwork."},
            {"k": "cap", "pos": "br", "t": "Nobody argued.\nThat was the worst part."},
        ],
    },
    {   # 3.3
        "layout": "W2",
        "images": [
            {"id": "c3_03a", "ar": "4:3", "anchor": ["paragon", "silas"],
             "prompt": f"Violent fight in a storm-drain tunnel: {PARAGON} smashing through a concrete wall with a fist wreathed in white energy, {SILAS} bracing against the blow with both arms, debris and sparks flying, a man in a dark coat thrown backward in the background. Explosive motion."},
            {"id": "c3_03b", "ar": "4:3", "anchor": ["silas", "paragon"],
             "prompt": f"{SILAS} pressing a glowing white-hot palm to the forehead of {PARAGON}, who is on his knees, white light bleeding from his eyes and open mouth, tears on his face; Silas's own face grey and strained. Tunnel dark around them. Painful, intimate."},
        ],
        "text": [
            {"img": 0, "k": "cap", "pos": "tl", "t": "Paragon came alone.\nFoundry told him it would be easy."},
            {"img": 0, "k": "bal", "pos": "tr", "who": "PARAGON", "t": "Don't make me do this, Nine."},
            {"img": 0, "k": "bal", "pos": "br", "who": "SILAS", "t": "You're not doing anything, Grant.\nIt is."},
            {"img": 1, "k": "cap", "pos": "tl", "t": "The burn takes seconds.\nIt costs years."},
            {"img": 1, "k": "cap", "pos": "bl", "t": "For the first time since he was twenty-two,\nGrant Ellery heard silence."},
            {"img": 1, "k": "bal", "pos": "br", "who": "PARAGON", "t": "...it's quiet."},
        ],
    },
    {   # 3.4
        "layout": "S",
        "images": [{"id": "c3_04", "ar": "2:3", "anchor": ["hale", "okafor", "hollow"],
                    "prompt": f"A penthouse office at night with floor-to-ceiling windows, {SHIP} visible in the sky behind: {HALE} standing with his back to the glass, {OKAFOR} tied to a chair in front of him, and {HOLLOW} standing in the shadows at the side. Cold luxury, menace."}],
        "text": [
            {"k": "bal", "pos": "tl", "who": "HALE", "t": "Of course I know what the seed is, Doctor."},
            {"k": "bal", "pos": "tr", "who": "HALE", "t": "Do you know what they offered?\nWhen they come through,\nsomeone has to hold the leash."},
            {"k": "bal", "pos": "ml", "who": "OKAFOR", "t": "They don't offer, Victor.\nThey farm."},
            {"k": "cap", "pos": "br", "t": "Every cover-up has a man\nwho thinks he's the exception."},
        ],
    },
    {   # 3.5
        "layout": "S",
        "images": [{"id": "c3_05", "ar": "2:3", "anchor": [],
                    "prompt": f"The moment of activation: the white ring atop a black glass skyscraper ignites, a shockwave of pale light rolling out across the whole city, the sky above tearing open in luminous cracks as {SHIP} descends lower; far below, a line of costumed superhumans on marble steps all turn their heads at once, eyes solid black. Cataclysmic scale."}],
        "text": [
            {"k": "cap", "pos": "tl", "t": "It passed, 71 to 29."},
            {"k": "cap", "pos": "tr", "t": "The doors opened at 4:15 PM."},
            {"k": "cap", "pos": "bl", "t": "Ten thousand heroes stopped moving.\nThen they all turned toward the tower."},
        ],
    },
    {   # 3.6
        "layout": "W2",
        "images": [
            {"id": "c3_06a", "ar": "4:3", "anchor": ["paragon", "silas", "reyes"],
             "prompt": f"{PARAGON} flying straight up the black glass face of a skyscraper at night, carrying {SILAS} under one arm and {REYES} under the other, pale electric light crawling over the glass, wind tearing at their clothes, the city far below. Vertical rush, danger."},
            {"id": "c3_06b", "ar": "4:3", "anchor": ["veil", "hollow", "kell"],
             "prompt": f"A corporate lobby atrium turned battlefield: {VEIL} locked in close combat with {HOLLOW}, black-eyed costumed superhumans swarming down a grand staircase behind them, {KELL} crouched with a rifle covering a doorway, glass and marble shattering. Desperate last stand."},
        ],
        "text": [
            {"img": 0, "k": "cap", "pos": "tl", "t": "The first generation finally fought for something."},
            {"img": 0, "k": "bal", "pos": "br", "who": "PARAGON", "t": "Hold on. Both of you.\nI'm not great at gentle."},
            {"img": 1, "k": "bal", "pos": "tl", "who": "VEIL", "t": "Go! I've been dying since '09.\nI'm good at it."},
            {"img": 1, "k": "cap", "pos": "br", "t": "Veil held the stairs for four minutes.\nIt was enough."},
        ],
    },
    {   # 3.7
        "layout": "S",
        "images": [{"id": "c3_07", "ar": "2:3", "anchor": ["hale", "hollow", "kell", "pale"],
                    "prompt": f"Skyscraper rooftop at night: a great ring of pulsing white alien alloy, and stepping half-formed out of its light, several of {PALE}, translucent and flickering; {HALE} at a console beside the ring with {HOLLOW} at his shoulder; opposite them {KELL} raising a pistol, storm wind, {SHIP} filling the sky above. Climactic confrontation."}],
        "text": [
            {"k": "bal", "pos": "tl", "who": "HALE", "t": "You can't stop a harvest\nby killing the farmer."},
            {"k": "bal", "pos": "tr", "who": "HOLLOW", "t": "WE HAVE WAITED.\nYOU ARE READY."},
            {"k": "cap", "pos": "bl", "t": "Kell didn't answer him.\nKell had answered him in 1998,\nin a room with no windows."},
            {"k": "cap", "pos": "br", "t": "Two rounds. The exception fell."},
        ],
    },
    {   # 3.8
        "layout": "S",
        "images": [{"id": "c3_08", "ar": "2:3", "anchor": ["silas", "reyes"],
                    "prompt": f"{SILAS} with both hands gripping a great ring of white alien alloy on a skyscraper rooftop, white fire erupting up through his body and outward in an immense wave over the entire city, tall grey alien figures dissolving into ash in the blast, {REYES} shielding his face nearby. Blinding, sacrificial, beautiful."}],
        "text": [
            {"k": "cap", "pos": "tl", "t": "One man. Ten thousand doors."},
            {"k": "cap", "pos": "tr", "t": "Every one of them slammed shut."},
            {"k": "bal", "pos": "bl", "who": "SILAS", "t": "Tell them what it was, Reyes.\nAll of it.\nEven the parts they'll hate."},
        ],
    },
    {   # 3.9
        "layout": "W2",
        "images": [
            {"id": "c3_09a", "ar": "4:3", "anchor": ["reyes", "paragon", "kell"],
             "prompt": f"Dawn on a skyscraper rooftop: the alien ring dark and cracked; {REYES} kneeling beside a human-shaped scorch mark burned into the metal floor; {PARAGON} standing with his head bowed; {KELL} sitting wounded against a console. Quiet grief, golden light."},
            {"id": "c3_09b", "ar": "4:3", "anchor": ["mara"],
             "prompt": f"{MARA} standing on a rooftop at sunrise looking up: small dark alien craft retreating into the distance and fading, while {SHIP} still hangs calmly over the city, catching the gold light. Peaceful, watchful."},
        ],
        "text": [
            {"img": 0, "k": "cap", "pos": "tl", "t": "There wasn't a body.\nThere was a shape, burned into the alloy.\nIt was standing up."},
            {"img": 1, "k": "bal", "pos": "tl", "who": "MARA", "t": "They will try again.\nThey always try again."},
            {"img": 1, "k": "bal", "pos": "mr", "who": "MARA", "t": "But now you know what you are."},
            {"img": 1, "k": "cap", "pos": "bl", "t": "The powers stayed. The doors didn't.\nFor the first time, the heroes were only theirs."},
        ],
    },
    {   # 3.10
        "layout": "W2",
        "images": [
            {"id": "c3_10a", "ar": "4:3", "anchor": [],
             "prompt": "A city square at night packed with people holding up glowing phones, a huge document projected onto the side of a building, workers on a crane tearing down a giant billboard showing a smiling hero, blank protest signs raised. Reckoning, catharsis."},
            {"id": "c3_10b", "ar": "4:3", "anchor": ["okafor", "kell", "paragon"],
             "prompt": f"A Senate hearing room: {OKAFOR} at the witness table speaking into a microphone, {KELL} seated beside her, and next to him Grant Ellery — the same square-jawed brown-haired man who was Paragon — in a plain grey suit with no emblem; cameras, senators on the dais. Sober, historic."},
        ],
        "text": [
            {"img": 0, "k": "cap", "pos": "tl", "t": "Reyes released everything. Forty-one thousand files.\nNames, dates, crash sites, the serum, the seed."},
            {"img": 0, "k": "cap", "pos": "br", "t": "It took the world four days to believe it,\nand one to stop pretending it hadn't."},
            {"img": 1, "k": "cap", "pos": "tl", "t": "Okafor testified for nine hours. Kell for six.\nGrant Ellery for two, and only one thing mattered:"},
            {"img": 1, "k": "bal", "pos": "br", "who": "GRANT", "t": "It was never a gift.\nIt was a lease.\nWe just paid it off."},
        ],
    },
    {   # 3.11
        "layout": "WT",
        "images": [
            {"id": "c3_11a", "ar": "16:9", "anchor": ["reyes"],
             "prompt": f"{REYES} standing at the railing of a city rooftop in the early morning holding a paper coffee cup, the city below waking up, a clear quiet sky with {SHIP} tiny and distant on the horizon. Calm, earned."},
            {"id": "c3_11b", "ar": "1:1", "anchor": [],
             "prompt": "Deep space beyond the Moon: a single vast dark alien craft, flat and layered, slowly turning; far behind it a small blue Earth. Cold stars. Ominous, patient."},
        ],
        "text": [
            {"img": 0, "k": "cap", "pos": "tl", "t": "The truth is out there."},
            {"img": 0, "k": "cap", "pos": "br", "t": "Now it's in here.\nAnd it didn't kill him. Not this time."},
            {"img": 1, "k": "cap", "pos": "tl", "t": "Roswell wasn't the end."},
            {"img": 1, "k": "cap", "pos": "bl", "t": "Neither was this."},
            {"img": 1, "k": "end", "pos": "br", "t": "END"},
        ],
    },
]

ALL_IMAGES = [im for pg in CH2_PAGES + CH3_PAGES for im in pg["images"]]

if __name__ == "__main__":
    print(len(CH2_PAGES), "ch2 pages,", len(CH3_PAGES), "ch3 pages,", len(ALL_IMAGES), "images")
    for im in ALL_IMAGES:
        print(im["id"], im["ar"], im["anchor"])
