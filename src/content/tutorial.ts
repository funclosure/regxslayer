import type { Monster } from "@/game/types";

export const tutorialMonsters: Monster[] = [
  {
    id: "tut-lump",
    name: "Lump (the Literal Lump)",
    portrait: "lump",
    pool: "tutorial",
    flavor: "Hi! I'm Lump. I exist to teach you the very basics.",
    coaching: "Type a regex into the input. Highlights update on every keystroke. When your regex matches *only* the marked (♦) lines, the layer breaks. Press [?] for the cheatsheet, [esc] to flee.",
    traits: ["LITERAL", "ANCHOR_START", "ANCHOR_END"],
    layers: [
      {
        topic: "exact words",
        traits: ["LITERAL"],
        coaching: "Try typing: hello — your regex must match only the ♦ line.",
        // Each filler line shares a different substring with "hello" so naive
        // shortcuts over-match:
        //   helmet → blocks "he", "hel", "el"
        //   shell  → blocks "hell", "ell", "ll"
        //   bellow → blocks "ello", "llo", "lo"
        // The full word "hello" is the only literal substring unique to the vital.
        lines: [
          { text: "hello",   vital: true  },
          { text: "helmet",  vital: false },
          { text: "shell",   vital: false },
          { text: "bellow",  vital: false },
          { text: "say hi",  vital: false },
        ],
      },
      {
        topic: "anchored line",
        traits: ["ANCHOR_START", "ANCHOR_END", "LITERAL"],
        coaching: "Now try: ^cat$  — the ^ pins the start of the line, $ pins the end.",
        lines: [
          { text: "cat",       vital: true  },
          { text: "scattered", vital: false },
          { text: "cataract",  vital: false },
        ],
      },
    ],
    heart: { text: "TUT_LUMP_HEART" },
  },
  {
    id: "tut-pip",
    name: "Pip (the Class Sprite)",
    portrait: "pip",
    pool: "tutorial",
    flavor: "I'll teach you character classes — \\d, \\w, \\s.",
    coaching: "Character classes match a TYPE of character: \\d = digit, \\w = word char (letters/digits/underscore), \\s = whitespace.",
    traits: ["CHAR_CLASS_DIGIT", "CHAR_CLASS_WORD", "CHAR_CLASS_SPACE"],
    layers: [
      {
        topic: "digits",
        traits: ["CHAR_CLASS_DIGIT"],
        coaching: "Try: ^\\d+$  — match lines that are nothing but digits.",
        lines: [
          { text: "42",     vital: true  },
          { text: "1024",   vital: true  },
          { text: "v3",     vital: false },
          { text: "ab",     vital: false },
        ],
      },
      {
        topic: "word chars",
        traits: ["CHAR_CLASS_WORD"],
        coaching: "Try: ^\\w+$  — letters, digits, underscore. No dashes or spaces.",
        lines: [
          { text: "snake_case", vital: true  },
          { text: "ABC123",     vital: true  },
          { text: "kebab-case", vital: false },
          { text: "spaces here", vital: false },
        ],
      },
      {
        topic: "whitespace",
        traits: ["CHAR_CLASS_SPACE"],
        coaching: "Try: ^\\s  — lines that START with whitespace.",
        lines: [
          { text: "  indented", vital: true  },
          { text: "\ttabbed",    vital: true  },
          { text: "flush",      vital: false },
          { text: "x   ",       vital: false },
        ],
      },
    ],
    heart: { text: "TUT_PIP_HEART" },
  },
  {
    id: "tut-bop",
    name: "Bop (the Repeater)",
    portrait: "bop",
    pool: "tutorial",
    flavor: "Let's count. Quantifiers say how many.",
    coaching: "Quantifiers attach to the previous thing: x* = 0+, x+ = 1+, x? = 0 or 1.",
    traits: ["QUANT_STAR", "QUANT_PLUS", "QUANT_OPTIONAL"],
    layers: [
      {
        topic: "zero-or-more",
        traits: ["QUANT_STAR"],
        coaching: "Try: ^a*b$  — any number of a's (including zero), then b.",
        lines: [
          { text: "b",    vital: true  },
          { text: "ab",   vital: true  },
          { text: "aab",  vital: true  },
          { text: "abc",  vital: false },
        ],
      },
      {
        topic: "one-or-more",
        traits: ["QUANT_PLUS"],
        coaching: "Try: ^a+$  — at least one a, nothing else.",
        lines: [
          { text: "a",    vital: true  },
          { text: "aaa",  vital: true  },
          { text: "",     vital: false },
          { text: "ab",   vital: false },
        ],
      },
      {
        topic: "zero-or-one",
        traits: ["QUANT_OPTIONAL"],
        coaching: "Try: ^colou?r$  — the u is optional. Both spellings match.",
        lines: [
          { text: "color",     vital: true  },
          { text: "colour",    vital: true  },
          { text: "colours",   vital: false },
          { text: "colorful",  vital: false },
        ],
      },
    ],
    heart: { text: "TUT_BOP_HEART" },
  },
];
