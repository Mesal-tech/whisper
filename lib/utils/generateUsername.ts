import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

// Expanded thematic word lists using compiled data from reliable sources
const stealthyWords = {
  prefixes: ["Shadow", "Ghost", "Ninja", "Phantom", "Cipher", "Void", "Specter", "Stealth", "Covert", "Furtive", "Secret", "Surreptitious", "Clandestine", "Underhand", "Sneaky", "Agile", "Lurking", "Concealed"],
  adjectives: ["Dark", "Silent", "Hidden", "Cryptic", "Stealth", "Mystic", "Obscure", "Furtive", "Sneaky", "Clandestine", "Covert", "Surreptitious", "Underhanded", "Shady", "Sly", "Devious", "Secretive"],
  nouns: ["Wraith", "Shade", "Rogue", "Agent", "Hawk", "Viper", "Enigma", "Spy", "Assassin", "Phantom", "Ghost", "Ninja", "Specter"]
};

const funnyWords = {
  prefixes: ["Giggle", "Wacky", "Zany", "Silly", "Goofy", "Bouncy", "Nutty", "Absurd", "Hilarious", "Merry", "Amusing", "Comical", "Whimsical", "Droll", "Riotous", "Jocular", "Waggish", "Hysterical", "Antic", "Cattywampus", "Bumfuzzle", "Gardyloo", "Taradiddle", "Billingsgate", "Snickersnee", "Widdershins", "Collywobbles"],
  adjectives: ["Fuzzy", "Wobbly", "Snoozy", "Giggly", "Bumpy", "Quirky", "Doodle", "Happy", "Crazy", "Excited", "Lazy", "Energetic", "Strong", "Smart", "Silly", "Absurd", "Hilarious", "Merry", "Amusing", "Comical", "Whimsical", "Droll", "Riotous", "Jocular", "Waggish", "Hysterical", "Antic"],
  nouns: ["Pickle", "Noodle", "Biscuit", "Waffle", "Pudding", "Banana", "Gizmo", "Snickersnee", "Collywobbles", "Shenanigan", "Crapulence", "Borborygm", "Gardyloo", "Doggo", "Hodgepodge", "Tentacle", "Bagpipes", "Whammy", "Vandyke Beard", "Stink Bomb", "Black Magic", "Loose Cannon", "Teddy Bear"]
};

const trollWords = {
  prefixes: ["Troll", "Meme", "Yeet", "Noob", "Lad", "Bruh", "Epic", "Lol", "Kek", "Pepe", "Doge", "Rickroll", "Salty", "Savage"],
  adjectives: ["Salty", "Savage", "Cheeky", "Spicy", "L33t", "Mighty", "Rad", "Goofy", "Crazy", "Hilarious", "Absurd", "Sneaky", "Furtive", "Mean-spirited"],
  nouns: ["Lord", "Guru", "Wizard", "Nerd", "Boi", "Chad", "Meme", "Troll", "Serpent", "Drunk", "Sapphire", "Cleaver", "Chariot", "Wizard", "Goatskin", "Wealth"]
};

// Static suffixes for flexibility
const suffixes = ["er", "ist", "ian", "or", "ite", "ix", "on"];
const specialChars = ["_", "-", ".", "~", "x"];

// Comprehensive profanity filter list (compiled from common English swear words; use a library like 'bad-words' for dynamic updates in production)
const badWords = [
  "anus", "arse", "arsehole", "ass", "asshat", "assjabber", "asspirate", "assbag", "assbandit", "bastard", "bitch", "bloody", "blowjob", "bollocks", "bugger", "bullshit",
  "cunt", "cock", "damn", "dick", "dickhead", "fag", "fanny", "fuck", "fucker", "goddamn", "hell", "jerk", "knob", "motherfucker", "nigger", "piss", "prick", "pussy",
  "shit", "shite", "slut", "twat", "wanker", "whore", "arsewipe", "assclown", "asswipe", "bampot", "beaner", "bellend", "bestiality", "biatch", "bitching", "bloodyhell",
  "boink", "bollock", "boner", "boob", "bum", "bunnyfucker", "buttplug", "chink", "cipa", "clitoris", "coon", "crap", "cyberfuc", "cyberfuck", "dickhead", "dildo",
  "dirsa", "donkeyribber", "doosh", "duche", "dyke", "ejaculate", "fagging", "fannyfucker", "fatass", "flange", "fudgepacker", "gaylord", "goddamned", "hardcoresex",
  "heshe", "hoer", "homo", "horniest", "hotsex", "jackoff", "jap", "jizz", "kawk", "knobjokey", "labia", "lmfao", "lust", "masturbate", "mofo", "muff", "numbnuts",
  "nutsack", "orgasms", "pecker", "penisfucker", "phonesex", "pigfucker", "pissing", "pissoff", "poop", "porn", "pube", "pussies", "rectum", "retard", "rimjob",
  "sadist", "schlong", "scroat", "scrote", "scrotum", "semen", "shagging", "shemale", "shiteater", "skank", "slapper", "smegma", "spac", "spunk", "testicle",
  "tit", "tosser", "turd", "twunter", "vagina", "viagra", "vulva", "wang", "wank", "wanker", "wanky", "whoar", "willies", "willy", "x rated", "xxx"
].map(word => word.toLowerCase());

// General word lists for fallbacks (compiled from common English words)
const generalAdjectives = [
  "able", "absolute", "academic", "acceptable", "acclaimed", "adorable", "adventurous", "afraid", "aggressive", "agile", "alert", "alive", "amazing", "ambitious",
  "amused", "ancient", "angry", "annoyed", "anxious", "arrogant", "ashamed", "attractive", "average", "awful", "awkward", "bad", "beautiful", "better", "big",
  "bitter", "black", "blue", "bold", "bored", "boring", "bossy", "brave", "breakable", "bright", "brilliant", "busy", "calm", "careful", "cautious", "charming",
  "cheerful", "clean", "clear", "clever", "cloudy", "clumsy", "cold", "colorful", "combative", "comfortable", "concerned", "confused", "cool", "cooperative",
  "courageous", "crazy", "creamy", "creative", "creepy", "crowded", "cruel", "curious", "cute", "dangerous", "dark", "dead", "deafening", "dear", "decent",
  "deep", "delicious", "delightful", "dense", "determined", "different", "difficult", "diligent", "dim", "dimpled", "distant", "distinct", "dizzy", "doubtful",
  "dry", "dull", "eager", "early", "easy", "elastic", "elegant", "embarrassed", "empty", "enchanted", "energetic", "enormous", "enthusiastic", "equal", "evil",
  "excited", "expensive", "expert", "faint", "fair", "faithful", "famous", "fancy", "fantastic", "far", "fast", "fat", "fatal", "fearful", "female", "few",
  "fierce", "filthy", "fine", "firm", "first", "flat", "flawed", "flimsy", "fluffy", "foolish", "forked", "formal", "forsaken", "fortunate", "fragile", "frail",
  "frantic", "free", "fresh", "friendly", "frightened", "funny", "fuzzy", "generous", "gentle", "genuine", "gifted", "gigantic", "glamorous", "gleaming", "gloomy",
  "glorious", "glossy", "godly", "golden", "good", "gorgeous", "graceful", "grand", "great", "green", "gregarious", "grim", "grimy", "grizzled", "gross", "grotesque",
  "grouchy", "grounded", "growing", "growling", "grown", "grubby", "grumpy", "guilty", "gullible", "gummy", "hairy", "handsome", "happy", "hard", "harmful",
  "harsh", "healthy", "heartfelt", "hearty", "heavy", "helpful", "helpless", "hidden", "hideous", "high", "hilarious", "hoarse", "hollow", "homely", "honest",
  "honorable", "hopeful", "horrible", "hospitable", "hot", "huge", "humble", "humiliating", "hungry", "hurtful", "husky", "icy", "ideal", "idealistic", "identical",
  "idle", "idiotic", "idolized", "ignorant", "ill", "illegal", "illiterate", "illustrious", "imaginary", "imaginative", "immaculate", "immaterial", "immediate",
  "immense", "impartial", "imperfect", "imperturbable", "impish", "impolite", "important", "impossible", "impractical", "impressionable", "impressive", "improbable",
  "impure", "inborn", "incomparable", "incompatible", "incomplete", "inconsequential", "incredible", "indelible", "inexperienced", "indolent", "infamous", "infantile",
  "infatuated", "inferior", "infinite", "informal", "innocent", "insecure", "insidious", "insignificant", "insistent", "instructive", "insubstantial", "intelligent",
  "intent", "intentional", "interesting", "internal", "international", "intrepid", "ironclad", "irresponsible", "irritating", "itchy", "jaded", "jagged", "jaunty",
  "jealous", "jittery", "joint", "jolly", "jovial", "joyful", "joyous", "jubilant", "judicious", "juicy", "jumbo", "junior", "jumpy", "juvenile", "kaleidoscopic",
  "keen", "key", "kind", "kindhearted", "kindly", "klutzy", "knobby", "knotty", "knowledgeable", "knowing", "known", "kooky", "kosher", "lame", "lanky", "large",
  "last", "lasting", "late", "lavish", "lawful", "lazy", "leading", "leafy", "lean", "left", "legal", "legitimate", "light", "lighthearted", "likable", "likely",
  "limited", "limp", "limping", "linear", "lined", "liquid", "little", "live", "lively", "livid", "loathsome", "lone", "lonely", "long", "longterm", "loose", "lopsided",
  "lost", "loud", "lovable", "lovely", "loving", "low", "loyal", "lucky", "lumbering", "luminous", "lumpy", "lustrous", "luxurious", "mad", "madeup", "magnificent",
  "majestic", "major", "male", "mammoth", "married", "marvelous", "masculine", "massive", "mature", "meager", "mealy", "mean", "measly", "meaty", "medical", "mediocre",
  "medium", "meek", "mellow", "melodic", "memorable", "menacing", "merry", "messy", "metallic", "mild", "milky", "mindless", "miniature", "minor", "minty", "miserable",
  "miserly", "misguided", "misty", "mixed", "modern", "modest", "moist", "monstrous", "monthly", "monumental", "moral", "mortified", "motherly", "motionless", "mountainous",
  "muddy", "muffled", "multicolored", "mundane", "murky", "mushy", "musty", "muted", "mysterious", "naive", "narrow", "nasty", "natural", "naughty", "nautical", "near",
  "neat", "necessary", "needy", "negative", "neglected", "negligible", "neighboring", "nervous", "new", "next", "nice", "nifty", "nimble", "nippy", "nocturnal", "noisy",
  "nonstop", "normal", "notable", "noted", "noteworthy", "novel", "noxious", "numb", "nutritious", "nutty", "obedient", "obese", "oblong", "oily", "oblong", "obvious",
  "occasional", "odd", "oddball", "offbeat", "offensive", "official", "old", "oldfashioned", "only", "open", "optimal", "optimistic", "opulent", "orange", "orderly",
  "organic", "ornate", "ornery", "ordinary", "original", "other", "our", "outlying", "outgoing", "outlandish", "outrageous", "outstanding", "oval", "overcooked", "overdue",
  "overjoyed", "overlooked", "palatable", "pale", "paltry", "parallel", "parched", "partial", "passionate", "past", "pastel", "peaceful", "peppery", "perfect", "perfumed",
  "periodic", "perky", "personal", "pertinent", "pesky", "pessimistic", "petty", "phony", "physical", "piercing", "pink", "pitiful", "plain", "plaintive", "plastic", "playful",
  "pleasant", "pleased", "pleasing", "plump", "plush", "polished", "polite", "political", "pointed", "pointless", "poised", "poor", "popular", "portly", "posh", "positive",
  "possible", "potable", "powerful", "powerless", "practical", "precious", "present", "prestigious", "pretty", "precious", "previous", "pricey", "prickly", "primary",
  "prime", "pristine", "private", "prize", "probable", "productive", "profitable", "profuse", "proper", "proud", "prudent", "punctual", "pungent", "puny", "pure", "purple",
  "pushy", "putrid", "puzzled", "puzzling", "quaint", "qualified", "quarrelsome", "quarterly", "queasy", "querulous", "questionable", "quick", "quickwitted", "quiet",
  "quintessential", "quirky", "quixotic", "quizzical", "radiant", "ragged", "rapid", "rare", "rash", "raw", "recent", "reckless", "rectangular", "ready", "real", "realistic",
  "reasonable", "red", "reflecting", "regal", "regular", "reliable", "relieved", "remarkable", "remorseful", "remote", "repentant", "required", "respectful", "responsible",
  "repulsive", "revolving", "rewarding", "rich", "rigid", "right", "ringed", "ripe", "roasted", "robust", "rosy", "rotating", "rotten", "rough", "round", "rowdy", "royal",
  "rubbery", "rundown", "ruddy", "rude", "runny", "rural", "rusty", "sad", "safe", "salty", "same", "sandy", "sane", "sarcastic", "sardonic", "satisfied", "scaly", "scarce",
  "scared", "scary", "scented", "scholarly", "scientific", "scornful", "scratchy", "scrawny", "second", "secondary", "secondhand", "secret", "selfassured", "selfish", "selfreliant",
  "sentimental", "separate", "serene", "serious", "serpentine", "several", "severe", "shabby", "shadowy", "shady", "shallow", "shameful", "shameless", "sharp", "shimmering",
  "shiny", "shocked", "shocking", "shoddy", "short", "shortterm", "showy", "shrill", "shy", "sick", "silent", "silky", "silly", "silver", "similar", "simple", "simplistic",
  "sinful", "single", "sizzling", "skeletal", "skinny", "sleepy", "slight", "slim", "slimy", "slippery", "slow", "slushy", "small", "smart", "smoggy", "smooth", "smug",
  "snappy", "snarling", "sneaky", "sniveling", "snoopy", "sociable", "soft", "soggy", "solid", "somber", "some", "spherical", "sophisticated", "sore", "sorrowful", "soulful",
  "soupy", "sour", "Spanish", "sparkling", "sparse", "specific", "spectacular", "speedy", "spicy", "spiffy", "spirited", "spiteful", "splendid", "spotless", "spotted", "spry",
  "square", "squeaky", "squiggly", "stable", "staid", "stained", "stale", "standard", "starchy", "stark", "starry", "steep", "sticky", "stiff", "stimulating", "stingy", "stormy",
  "straight", "strange", "strong", "strict", "strident", "striking", "striped", "strong", "studious", "stunning", "stupendous", "stupid", "sturdy", "stylish", "subdued",
  "submissive", "substantial", "subtle", "suburban", "sudden", "sugary", "sunny", "super", "superb", "superficial", "superior", "supportive", "surefooted", "surprised",
  "suspicious", "svelte", "sweaty", "sweet", "sweltering", "swift", "sympathetic", "tall", "talkative", "tame", "tan", "tangible", "tart", "tasty", "tattered", "taut",
  "tedious", "teeming", "tempting", "tender", "tense", "tepid", "terrible", "terrific", "testy", "thankful", "that", "these", "thick", "thin", "third", "thirsty", "this",
  "thorough", "thorny", "those", "thoughtful", "threadbare", "thrifty", "thunderous", "tidy", "tight", "timely", "tinted", "tiny", "tired", "torn", "total", "tough",
  "traumatic", "treasured", "tremendous", "tragic", "trained", "tremendous", "triangular", "tricky", "trifling", "trim", "trivial", "troubled", "true", "trusting", "trustworthy",
  "trusty", "truthful", "tubby", "turbulent", "twin", "ugly", "ultimate", "unacceptable", "unaware", "uncomfortable", "uncommon", "unconscious", "understated", "unequal",
  "uneven", "unfinished", "unfit", "unfolded", "unfortunate", "unhappy", "unhealthy", "uniform", "unimportant", "unique", "united", "unkempt", "unknown", "unlawful",
  "unlined", "unlucky", "unnatural", "unpleasant", "unrealistic", "unripe", "unruly", "unselfish", "unsightly", "unsteady", "unsung", "untidy", "untimely", "untried",
  "untrue", "unused", "unusual", "unwelcome", "unwieldy", "unwilling", "unwitting", "unwritten", "upbeat", "upright", "upset", "urban", "usable", "used", "useful",
  "useless", "utilized", "utter", "vacant", "vague", "vain", "valid", "valuable", "vapid", "variable", "vast", "velvety", "venerated", "vengeful", "verifiable", "vibrant",
  "vicious", "victorious", "vigilant", "vigorous", "villainous", "violet", "violent", "virtual", "virtuous", "visible", "vital", "vivacious", "vivid", "voluminous",
  "wan", "warlike", "warm", "warmhearted", "warped", "wary", "wasteful", "watchful", "waterlogged", "watery", "wavy", "wealthy", "weak", "weary", "webbed", "wee",
  "weekly", "weepy", "weighty", "weird", "welcome", "wellgroomed", "wellinformed", "welllit", "wellmade", "welloff", "welltodo", "wellworn", "wet", "which", "whimsical",
  "whirlwind", "whispered", "white", "whole", "whopping", "wicked", "wide", "wideeyed", "wiggly", "wild", "willing", "wilted", "winding", "windy", "winged", "wiry",
  "wise", "witty", "wobbly", "woeful", "wonderful", "wooden", "woozy", "wordy", "worldly", "worn", "worried", "worrisome", "worse", "worst", "worthless", "worthwhile",
  "worthy", "wrathful", "wretched", "writhing", "wrong", "wry", "yawning", "yearly", "yellow", "yellowish", "young", "youthful", "yummy", "zany", "zealous", "zesty", "zigzag"
];

const generalNouns = [
  "time", "year", "people", "way", "day", "man", "thing", "woman", "life", "child", "world", "school", "state", "family", "student", "group", "country", "problem",
  "hand", "part", "place", "case", "week", "company", "system", "program", "question", "work", "government", "number", "night", "point", "home", "water", "room", "mother",
  "area", "money", "story", "fact", "month", "lot", "right", "study", "book", "eye", "job", "word", "business", "issue", "side", "kind", "head", "house", "service",
  "friend", "father", "power", "hour", "game", "line", "end", "member", "law", "car", "city", "community", "name", "president", "team", "minute", "idea", "kid", "body",
  "information", "back", "parent", "face", "others", "level", "office", "door", "health", "person", "art", "war", "history", "party", "result", "change", "morning",
  "reason", "research", "girl", "guy", "moment", "air", "teacher", "force", "education", "foot", "boy", "age", "policy", "process", "music", "market", "sense", "nation",
  "death", "plan", "interest", "opportunity", "effect", "use", "control", "town", "effect", "space", "ground", "letter", "ability", "development", "table", "leader",
  "energy", "experience", "everything", "road", "condition", "phone", "law", "relationship", "machine", "investment", "wrong", "increase", "subject", "region", "person",
  "ball", "wife", "future", "action", "value", "event", "property", "nature", "structure", "source", "fact", "street", "quality", "manager", "activity", "century",
  "type", "law", "art", "worker", "tax", "director", "role", "matter", "computer", "course", "project", "human", "second", "list", "society", "example", "paper", "window",
  "economy", "trade", "price", "office", "university", "knowledge", "performance", "production", "situation", "theory", "role", "measure", "attitude", "peace", "perspective",
  "product", "club", "security", "agreement", "month", "library", "station", "land", "success", "detail", "cause", "club", "meeting", "description", "doctor", "wall",
  "patient", "news", "reality", "husband", "act", "return", "belief", "object", "doubt", "choice", "site", "account", "treatment", "cost", "sign", "situation", "direction",
  "strategy", "date", "sport", "exercise", "disaster", "hotel", "owner", "matter", "user", "variety", "effort", "skin", "agent", "code", "top", "row", "stock", "training",
  "text", "degree", "wonder", "deal", "figure", "source", "trip", "wood", "population", "fear", "price", "form", "increase", "soldier", "stage", "speech", "experience",
  "crime", "station", "tooth", "consequence", "gold", "plane", "chest", "spot", "candidate", "childhood", "body", "stress", "fiction", "oil", "love", "conversation",
  "customer", "soil", "influence", "surgery", "danger", "theater", "activity", "language", "aspect", "object", "organization", "cash", "coffee", "food", "job", "length",
  "sale", "opinion", "importance", "star", "income", "king", "size", "note", "goal", "organization", "example", "brother", "tea", "period", "competition", "movie",
  "restaurant", "class", "horse", "leader", "request", "failure", "explanation", "diet", "factor", "design", "chance", "pregnancy", "instrument", "suffering", "pain",
  "pc", "alcohol", "guard", "accident", "death", "return", "sister", "discussion", "situation", "basket", "investigation", "buyer", "meal", "hearing", "success", "newspaper",
  "poem", "dish", "owner", "gather", "relation", "strength", "guidance", "tension", "wealth", "depression", "shelf", "purchase", "childhood", "payment", "charge", "thanks",
  "transaction", "worker", "village", "energy", "viewer", "activity", "meal", "hearing", "traffic", "movement", "pole", "dance", "tape", "boat", "faculty", "factor"
];

const generalVerbs = [
  "be", "have", "do", "say", "go", "get", "make", "know", "think", "take", "see", "come", "want", "look", "use", "find", "give", "tell", "work", "call", "try", "ask",
  "need", "feel", "become", "leave", "put", "mean", "keep", "let", "begin", "seem", "help", "talk", "turn", "start", "might", "show", "hear", "play", "run", "move",
  "like", "live", "believe", "hold", "bring", "happen", "must", "write", "provide", "sit", "stand", "lose", "pay", "meet", "include", "continue", "set", "learn",
  "change", "lead", "understand", "watch", "follow", "stop", "create", "speak", "read", "allow", "add", "spend", "grow", "open", "walk", "win", "offer", "remember",
  "love", "consider", "appear", "buy", "wait", "serve", "die", "send", "expect", "build", "stay", "fall", "cut", "reach", "kill", "remain", "suggest", "raise", "pass",
  "sell", "require", "report", "decide", "pull", "return", "explain", "hope", "develop", "carry", "drive", "break", "thank", "receive", "agree", "support", "pick",
  "join", "hit", "describe", "eat", "cover", "catch", "draw", "choose", "cause", "point", "listen", "realize", "place", "test", "charge", "check", "design", "reveal",
  "teach", "reduce", "act", "bank", "note", "enter", "share", "hear", "lose", "identify", "occur", "indicate", "sleep", "protect", "cook", "determine", "encourage",
  "close", "sound", "enjoy", "present", "climb", "offer", "wear", "finish", "attack", "dance", "learn", "dress", "discuss", "clean", "collect", "establish", "finish",
  "imagine", "introduce", "relate", "exercise", "drop", "forget", "prove", "claim", "hang", "associate", "prepare", "defend", "represent", "focus", "purchase", "approach",
  "avoid", "argue", "recognize", "implement", "fear", "communicate", "grant", "escape", "burn", "defeat", "argue", "fail", "employ", "deny", "refuse", "regret", "maintain",
  "contain", "state", "taste", "perceive", "replace", "encourage", "shed", "dry", "skip", "gather", "hang", "hunt", "host", "match", "matter", "mind", "attack",
  "pretend", "prevent", "print", "raise", "sleep", "slip", "stare", "suppose", "target", "treat", "waste", "bet", "calculate", "clear", "collaborate", "combine", "commit",
  "compare", "compete", "complain", "concentrate", "concern", "conclude", "confirm", "connect", "consequence", "consist", "construct", "consult", "consume", "contact",
  "convince", "cope", "correspond", "cost", "count", "credit", "cry", "cycle", "debate", "decline", "decorate", "define", "delay", "deliver", "demand", "demonstrate",
  "deny", "depend", "describe", "deserve", "desire", "destroy", "detect", "develop", "differ", "direct", "disappear", "discover", "display", "divide", "double", "doubt",
  "draft", "drag", "earn", "edit", "educate", "elect", "embarrass", "emerge", "employ", "enable", "encounter", "encourage", "end", "endorse", "enforce", "engage",
  "enhance", "enjoy", "enquire", "ensure", "entertain", "escape", "establish", "estimate", "evaluate", "examine", "exceed", "exchange", "exclude", "excuse", "execute",
  "exercise", "exhibit", "exist", "expand", "expect", "experience", "experiment", "expert", "explain", "explode", "explore", "expose", "express", "extend", "extract",
  "face", "facilitate", "factor", "fade", "fail", "fancy", "fasten", "favour", "fear", "feature", "feed", "feel", "file", "fill", "film", "filter", "finance", "find",
  "fine", "finger", "finish", "fire", "fish", "fit", "fix", "flash", "flee", "float", "flood", "flow", "flower", "fly", "fold", "follow", "fool", "forbid", "force",
  "forecast", "foresee", "forget", "forgive", "form", "formulate", "forward", "foster", "found", "frame", "frequent", "fresh", "fulfil", "function", "fund", "gain",
  "gap", "gather", "gaze", "gear", "generate", "get", "give", "glance", "glare", "glimpse", "glow", "glue", "go", "govern", "grab", "graduate", "grant", "grasp", "greet",
  "grin", "grind", "grip", "groan", "grow", "guarantee", "guess", "guide", "halt", "hand", "handle", "hang", "happen", "harass", "harm", "hate", "haunt", "head", "heal",
  "heap", "hear", "heat", "help", "hide", "highlight", "hint", "hire", "hit", "hold", "hook", "hope", "host", "house", "hover", "hug", "hum", "hunt", "hurry", "hurt",
  "identify", "ignore", "illustrate", "imagine", "imitate", "impact", "implement", "imply", "import", "impose", "impress", "improve", "include", "incorporate", "increase",
  "indicate", "induce", "influence", "inform", "inflict", "initiate", "inject", "injure", "input", "insert", "insist", "inspect", "inspire", "install", "institute",
  "instruct", "insult", "integrate", "intend", "interact", "interest", "interfere", "interpret", "interrupt", "interview", "introduce", "invade", "invest", "investigate",
  "invite", "involve", "iron", "isolate", "issue", "item", "jail", "jam", "jar", "jaw", "jeans", "jet", "jewel", "job", "jog", "join", "joke", "journey", "joy",
  "judge", "juice", "jump", "justify", "keen", "keep", "key", "kick", "kid", "kill", "kiss", "kit", "kitchen", "knee", "knife", "knock", "know", "label", "labour",
  "lack", "ladder", "lady", "lag", "lake", "lamp", "land", "landscape", "language", "laptop", "large", "last", "late", "laugh", "launch", "laundry", "law", "lawn",
  "lawsuit", "layer", "lazy", "lead", "leader", "leaf", "lean", "leap", "learn", "leave", "lecture", "left", "leg", "legal", "legend", "leisure", "lemon", "lend",
  "length", "lens", "leopard", "less", "lesson", "letter", "level", "liar", "liberty", "library", "license", "life", "lift", "light", "like", "limb", "limit", "link",
  "lion", "liquid", "list", "listen", "little", "live", "lizard", "load", "loan", "lobster", "local", "lock", "logic", "lonely", "long", "loop", "lottery", "loud",
  "lounge", "love", "loyal", "lucky", "luggage", "lumber", "lunar", "lunch", "luxury", "lyrics", "machine", "mad", "magic", "magnet", "maid", "mail", "main", "major",
  "make", "mammal", "man", "manage", "mandate", "mango", "mansion", "manual", "maple", "marble", "march", "margin", "marine", "market", "marriage", "mask", "mass",
  "master", "match", "material", "math", "matrix", "matter", "mature", "maximum", "maze", "meadow", "mean", "measure", "meat", "mechanic", "medal", "media", "melody",
  "melt", "member", "memory", "mention", "menu", "mercy", "merge", "merit", "merry", "mesh", "message", "metal", "method", "middle", "midnight", "milk", "million",
  "mimic", "mind", "minimum", "minor", "minute", "miracle", "mirror", "misery", "miss", "mistake", "mix", "mixed", "mixture", "mobile", "model", "modify", "mom",
  "moment", "monitor", "monkey", "monster", "month", "moon", "moral", "more", "morning", "mosquito", "mother", "motion", "motor", "mountain", "mouse", "move", "movie",
  "much", "muffin", "mule", "multiply", "muscle", "museum", "mushroom", "music", "must", "mutual", "myself", "mystery", "myth", "naive", "name", "napkin", "narrow",
  "nasty", "nation", "nature", "near", "neck", "need", "negative", "neglect", "neither", "nephew", "nerve", "nest", "net", "network", "neutral", "never", "news",
  "next", "nice", "night", "noble", "noise", "nominee", "noodle", "normal", "north", "nose", "notable", "note", "nothing", "notice", "novel", "now", "nuclear",
  "number", "nurse", "nut", "oak", "obey", "object", "oblige", "obscure", "observe", "obtain", "obvious", "occur", "ocean", "october", "odor", "off", "offer", "office",
  "often", "oil", "okay", "old", "olive", "olympic", "omit", "once", "one", "onion", "online", "only", "open", "opera", "opinion", "oppose", "option", "orange",
  "orbit", "orchard", "order", "ordinary", "organ", "orient", "original", "orphan", "ostrich", "other", "outdoor", "outer", "output", "outside", "oval", "oven",
  "over", "own", "owner", "oxygen", "oyster", "ozone", "pact", "paddle", "page", "pair", "palace", "palm", "panda", "panel", "panic", "panther", "paper", "parade",
  "parent", "park", "parrot", "party", "pass", "patch", "path", "patient", "patrol", "pattern", "pause", "pave", "payment", "peace", "peanut", "pear", "peasant",
  "pelican", "pen", "penalty", "pencil", "people", "pepper", "perfect", "permit", "person", "pet", "phone", "photo", "phrase", "physical", "piano", "picnic", "picture",
  "piece", "pig", "pigeon", "pill", "pilot", "pink", "pioneer", "pipe", "pistol", "pitch", "pizza", "place", "planet", "plastic", "plate", "play", "please", "pledge",
  "pluck", "plug", "plunge", "poem", "poet", "point", "polar", "pole", "police", "pond", "pony", "pool", "popular", "portion", "position", "possible", "post", "potato",
  "pottery", "poverty", "powder", "power", "practice", "praise", "predict", "prefer", "prepare", "present", "pretty", "prevent", "price", "pride", "primary", "print",
  "priority", "prison", "private", "prize", "problem", "process", "produce", "profit", "program", "project", "promote", "proof", "property", "prosper", "protect",
  "proud", "provide", "public", "pudding", "pull", "pulp", "pulse", "pumpkin", "punch", "pupil", "puppy", "purchase", "purity", "purpose", "purse", "push", "put",
  "puzzle", "pyramid", "quality", "quantum", "quarter", "question", "quick", "quit", "quiz", "quote", "rabbit", "raccoon", "race", "rack", "radar", "radio", "rail",
  "rain", "raise", "rally", "ramp", "ranch", "random", "range", "rapid", "rare", "rate", "rather", "raven", "raw", "razor", "ready", "real", "reason", "rebel", "rebuild",
  "recall", "receive", "recipe", "record", "recycle", "reduce", "reflect", "reform", "refuse", "region", "regret", "regular", "reject", "relax", "release", "relief",
  "rely", "remain", "remember", "remind", "remove", "render", "renew", "rent", "reopen", "repair", "repeat", "replace", "report", "require", "rescue", "resemble",
  "resist", "resource", "response", "result", "retire", "retreat", "return", "reunion", "reveal", "review", "reward", "rhythm", "rib", "ribbon", "rice", "rich", "ride",
  "ridge", "rifle", "right", "rigid", "ring", "riot", "ripple", "risk", "ritual", "rival", "river", "road", "roast", "robot", "robust", "rocket", "romance", "roof",
  "rookie", "room", "rose", "rotate", "rough", "round", "route", "royal", "rubber", "rude", "rug", "rule", "run", "runway", "rural", "sad", "saddle", "sadness", "safe",
  "sail", "salad", "salmon", "salon", "salt", "salute", "same", "sample", "sand", "satisfy", "satoshi", "sauce", "sausage", "save", "say", "scale", "scan", "scare",
  "scatter", "scene", "scheme", "school", "science", "scissors", "scorpion", "scout", "scrap", "screen", "script", "scrub", "sea", "search", "season", "seat", "second",
  "secret", "section", "security", "seed", "seek", "segment", "select", "sell", "seminar", "senior", "sense", "sentence", "series", "service", "session", "settle",
  "setup", "seven", "shadow", "shaft", "shallow", "share", "shed", "shell", "sheriff", "shield", "shift", "shine", "ship", "shiver", "shock", "shoe", "shoot", "shop",
  "short", "shoulder", "shove", "shrimp", "shrug", "shuffle", "shy", "sibling", "sick", "side", "siege", "sight", "sign", "silent", "silk", "silly", "silver", "similar",
  "simple", "since", "sing", "siren", "sister", "situate", "situation", "six", "size", "skate", "sketch", "ski", "skill", "skin", "skirt", "skull", "slab", "slam",
  "sleep", "slender", "slice", "slide", "slight", "slim", "slogan", "slot", "slow", "slush", "small", "smart", "smile", "smoke", "smooth", "snack", "snake", "snap",
  "sniff", "snow", "soap", "soccer", "social", "sock", "soda", "soft", "solar", "soldier", "solid", "solution", "solve", "someone", "song", "soon", "sorry", "sort",
  "soul", "sound", "soup", "source", "south", "space", "spare", "spatial", "spawn", "speak", "special", "speed", "spell", "spend", "sphere", "spice", "spider", "spike",
  "spin", "spirit", "split", "spoil", "sponsor", "spoon", "sport", "spot", "spray", "spread", "spring", "spy", "square", "squeeze", "squirrel", "stable", "stadium",
  "staff", "stage", "stairs", "stamp", "stand", "start", "state", "stay", "steak", "steel", "stem", "step", "stereo", "stick", "still", "sting", "stock", "stomach",
  "stone", "stool", "story", "stove", "strategy", "street", "strike", "strong", "struggle", "student", "stuff", "stumble", "style", "subject", "submit", "subway", "success",
  "such", "sudden", "suffer", "sugar", "suggest", "suit", "summer", "sun", "sunny", "sunset", "super", "supply", "supreme", "sure", "surface", "surge", "surprise",
  "surround", "survey", "suspect", "sustain", "swallow", "swamp", "swap", "swarm", "swear", "sweet", "swift", "swim", "swing", "switch", "sword", "symbol", "symptom",
  "syrup", "system", "table", "tackle", "tag", "tail", "talent", "talk", "tank", "tape", "target", "task", "taste", "tattoo", "taxi", "teach", "team", "tell", "ten",
  "tenant", "tennis", "tent", "term", "test", "text", "thank", "that", "theme", "then", "theory", "there", "they", "thing", "this", "thought", "three", "thrive",
  "throw", "thumb", "thunder", "ticket", "tide", "tiger", "tilt", "timber", "time", "tiny", "tip", "tired", "tissue", "title", "toast", "tobacco", "today", "toddler",
  "toe", "together", "toilet", "token", "tomato", "tomorrow", "tone", "tongue", "tonight", "tool", "tooth", "top", "topic", "topple", "torch", "tornado", "tortoise",
  "toss", "total", "tourist", "toward", "tower", "town", "toy", "track", "trade", "traffic", "tragic", "train", "transfer", "trap", "trash", "travel", "tray", "treat",
  "tree", "trend", "trial", "tribe", "trick", "trigger", "trim", "trip", "trophy", "trouble", "truck", "true", "truly", "trumpet", "trust", "truth", "try", "tube",
  "tuition", "tumble", "tuna", "tunnel", "turkey", "turn", "turtle", "twelve", "twenty", "twice", "twin", "twist", "two", "type", "typical", "ugly", "umbrella",
  "unable", "unaware", "uncle", "uncover", "under", "undo", "unfair", "unfold", "unhappy", "uniform", "unique", "unit", "universe", "unknown", "unlock", "until",
  "unusual", "unveil", "update", "upgrade", "uphold", "upon", "upper", "upset", "urban", "urge", "usage", "use", "used", "useful", "useless", "usual", "utility",
  "vacant", "vacuum", "vague", "valid", "valley", "valve", "van", "vanish", "vapor", "various", "vast", "vault", "vehicle", "velvet", "vendor", "venture", "venue",
  "verb", "verify", "version", "very", "vessel", "veteran", "viable", "vibrant", "vicious", "victory", "video", "view", "village", "vintage", "violin", "virtual",
  "virus", "visa", "visit", "visual", "vital", "vivid", "vocal", "voice", "void", "volcano", "volume", "vote", "voyage", "wage", "wagon", "wait", "walk", "wall",
  "walnut", "want", "warfare", "warm", "warrior", "wash", "wasp", "waste", "water", "wave", "way", "wealth", "weapon", "wear", "weasel", "weather", "web", "wedding",
  "weekend", "weird", "welcome", "west", "wet", "whale", "what", "wheat", "wheel", "when", "where", "whip", "whisper", "wide", "width", "wife", "wild", "will", "win",
  "window", "wine", "wing", "wink", "winner", "winter", "wire", "wisdom", "wise", "wish", "witness", "wolf", "woman", "wonder", "wood", "wool", "word", "work", "world",
  "worry", "worth", "wrap", "wreck", "wrestle", "wrist", "write", "wrong", "yard", "year", "yellow", "you", "young", "youth", "zebra", "zero", "zone", "zoo"
];

// Simple hash for quick uniqueness pre-check
const simpleHash = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
};

// Configuration for username generation (theme removed)
interface UsernameConfig {
  maxLength?: number;
  allowSpecialChars?: boolean;
  leetSpeak?: boolean;
}

const defaultConfig: UsernameConfig = {
  maxLength: 20,
  allowSpecialChars: true,
  leetSpeak: false
};

// Theme weights for random selection
const themeWeights = {
  stealthy: 0.25,
  funny: 0.25,
  troll: 0.25,
  mixed: 0.25
};

// Get a random word from static lists
const getRandomWord = (pos: string, theme: string): string => {
  // Use thematic words for stealthy/funny/troll themes
  if (theme === "stealthy" || theme === "mixed") {
    if (pos === "prefix" && stealthyWords.prefixes.length > 0) return stealthyWords.prefixes[Math.floor(Math.random() * stealthyWords.prefixes.length)];
    if (pos === "adjective" && stealthyWords.adjectives.length > 0) return stealthyWords.adjectives[Math.floor(Math.random() * stealthyWords.adjectives.length)];
    if (pos === "noun" && stealthyWords.nouns.length > 0) return stealthyWords.nouns[Math.floor(Math.random() * stealthyWords.nouns.length)];
  }
  if (theme === "funny" || theme === "mixed") {
    if (pos === "prefix" && funnyWords.prefixes.length > 0) return funnyWords.prefixes[Math.floor(Math.random() * funnyWords.prefixes.length)];
    if (pos === "adjective" && funnyWords.adjectives.length > 0) return funnyWords.adjectives[Math.floor(Math.random() * funnyWords.adjectives.length)];
    if (pos === "noun" && funnyWords.nouns.length > 0) return funnyWords.nouns[Math.floor(Math.random() * funnyWords.nouns.length)];
  }
  if (theme === "troll" || theme === "mixed") {
    if (pos === "prefix" && trollWords.prefixes.length > 0) return trollWords.prefixes[Math.floor(Math.random() * trollWords.prefixes.length)];
    if (pos === "adjective" && trollWords.adjectives.length > 0) return trollWords.adjectives[Math.floor(Math.random() * trollWords.adjectives.length)];
    if (pos === "noun" && trollWords.nouns.length > 0) return trollWords.nouns[Math.floor(Math.random() * trollWords.nouns.length)];
  }

  // Fallback to general static lists
  if (pos === "adjective" && generalAdjectives.length > 0) {
    return generalAdjectives[Math.floor(Math.random() * generalAdjectives.length)];
  }
  if (pos === "noun" && generalNouns.length > 0) {
    return generalNouns[Math.floor(Math.random() * generalNouns.length)];
  }
  if (pos === "verb" && generalVerbs.length > 0) {
    return generalVerbs[Math.floor(Math.random() * generalVerbs.length)];
  }

  // Ultimate fallback
  return `Fallback${pos.charAt(0).toUpperCase()}${Math.random().toString(36).slice(2, 5)}`;
};

// Generate username with randomly chosen theme
const generateRandomUsername = async (config: UsernameConfig = defaultConfig): Promise<string> => {
  try {
    const patterns: { [key: string]: (theme: string) => Promise<string> } = {
      prefixAdjNoun: async (theme) => {
        const prefix = getRandomWord("prefix", theme);
        const adj = getRandomWord("adjective", theme);
        const noun = getRandomWord("noun", theme);
        let username = config.allowSpecialChars
          ? `${prefix}${specialChars[Math.floor(Math.random() * specialChars.length)]}${adj}${noun}`
          : `${prefix}${adj}${noun}`;
        if (config.leetSpeak) {
          username = username.replace(/e/gi, "3").replace(/o/gi, "0").replace(/a/gi, "4");
        }
        return username;
      },
      adjNounNum: async (theme) => {
        const adj = getRandomWord("adjective", theme);
        const noun = getRandomWord("noun", theme);
        const num = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
        let username = config.allowSpecialChars
          ? `${adj}${specialChars[Math.floor(Math.random() * specialChars.length)]}${noun}${num}`
          : `${adj}${noun}${num}`;
        if (config.leetSpeak) {
          username = username.replace(/e/gi, "3").replace(/o/gi, "0").replace(/a/gi, "4");
        }
        return username;
      },
      verbNounNum: async (theme) => {
        const verb = getRandomWord("verb", theme);
        const noun = getRandomWord("noun", theme);
        const num = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
        let username = config.allowSpecialChars
          ? `${verb}ing${specialChars[Math.floor(Math.random() * specialChars.length)]}${noun}${num}`
          : `${verb}ing${noun}${num}`;
        if (config.leetSpeak) {
          username = username.replace(/e/gi, "3").replace(/o/gi, "0").replace(/a/gi, "4");
        }
        return username;
      },
      adjNounSuffix: async (theme) => {
        const adj = getRandomWord("adjective", theme);
        const noun = getRandomWord("noun", theme);
        const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
        let username = `${adj}${noun}${suffix}`;
        if (config.leetSpeak) {
          username = username.replace(/e/gi, "3").replace(/o/gi, "0").replace(/a/gi, "4");
        }
        return username;
      }
    };

    let username: string;
    let attempts = 0;
    const maxAttempts = 5;
    const usedHashes = new Set<number>();

    do {
      // Randomly select theme based on weights
      let rand = Math.random();
      let selectedTheme = "mixed";
      const totalWeight = Object.values(themeWeights).reduce((sum, w) => sum + w, 0);
      const normalizedWeights = Object.entries(themeWeights).reduce(
        (acc, [key, weight]) => ({ ...acc, [key]: (weight as number) / totalWeight }),
        {} as { [key: string]: number }
      );
      for (const [theme, weight] of Object.entries(normalizedWeights)) {
        if (rand < weight) {
          selectedTheme = theme;
          break;
        }
        rand -= weight;
      }

      const patternKeys = Object.keys(patterns);
      const selectedPattern = patternKeys[Math.floor(Math.random() * patternKeys.length)];
      username = await patterns[selectedPattern](selectedTheme);

      // Truncate to maxLength
      if (config.maxLength && username.length > config.maxLength) {
        username = username.slice(0, config.maxLength);
      }

      // Filter out bad words
      if (badWords.some(badWord => username.toLowerCase().includes(badWord))) {
        attempts++;
        continue;
      }

      // Quick hash-based uniqueness pre-check
      const usernameHash = simpleHash(username.toLowerCase());
      if (usedHashes.has(usernameHash)) {
        attempts++;
        continue;
      }

      // Check uniqueness in Firestore
      const userDocRef = doc(db, "users", username.toLowerCase());
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        return username;
      }

      usedHashes.add(usernameHash);
      attempts++;
    } while (attempts < maxAttempts);

    // Fallback
    const fallbackNum = Math.floor(Math.random() * 10000000).toString().padStart(7, "0");
    const selectedTheme = Object.keys(themeWeights)[Math.floor(Math.random() * Object.keys(themeWeights).length)];
    const adj = getRandomWord("adjective", selectedTheme);
    const noun = getRandomWord("noun", selectedTheme);
    let fallbackUsername = config.allowSpecialChars
      ? `${adj}${specialChars[Math.floor(Math.random() * specialChars.length)]}${noun}${fallbackNum}`
      : `${adj}${noun}${fallbackNum}`;
    if (config.leetSpeak) {
      fallbackUsername = fallbackUsername.replace(/e/gi, "3").replace(/o/gi, "0").replace(/a/gi, "4");
    }
    return fallbackUsername;
  } catch (error) {
    console.error("Error generating username:", error);
    const fallbackNum = Math.floor(Math.random() * 10000000).toString().padStart(7, "0");
    return `User${fallbackNum}`;
  }
};

export default generateRandomUsername;