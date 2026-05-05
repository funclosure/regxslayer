# Level Review — Kickstart Prompt

Use this prompt to start a session that audits regxslayer puzzle content for
**design integrity**: does each layer's coaching point at the technique you
actually need to solve it, or do shortcuts let the player win without learning
the topic?

Paste the **Prompt** section into a fresh session (or a subagent). Customize
the **Targets** list to scope which monsters to review.

---

## Prompt

You are reviewing puzzle content for **regxslayer** — a TUI regex-practice
game where each monster is a stack of "layers" (string sets) terminated by a
"heart" (a single string). The player types a regex; on every keystroke,
matches highlight live. A layer auto-strips when the regex matches **all**
the layer's vital lines and **none** of its filler lines, no locked-layer
lines, and the heart not at all. The heart kills the monster only when the
regex **fully matches** the heart text (full-line, not substring).

The complete game rules and matcher semantics are documented at:

- Spec: `docs/superpowers/specs/2026-05-04-regxslayer-design.md` (v1)
- Spec: `docs/superpowers/specs/2026-05-04-regxslayer-v2-encounter-stats-design.md` (v2)
- Matcher: `src/game/matcher.ts`

Content lives in `src/content/`:

- `chapter-1-literals.ts` — Literals & Anchors
- `chapter-2-charclasses.ts` — Character Classes
- `chapter-3-quantifiers.ts` — Quantifiers
- `tutorial.ts` — Lump, Pip, Bop (tutorial monsters with `coaching` text)
- `wild.ts` — Dotgrim (wild-pool monster)

The trait vocabulary is in `src/game/traits.ts`. The structural validator
(`scripts/validate-content.ts`) catches missing fields and a small set of
trivial-killer regex (`.*`, `.+`, `\w+`, `\S+`) against active layer lines for
non-tutorial monsters. It does **not** catch locked-layer leaks, heart
contamination, tutorial prefix leaks, or broader design-integrity issues —
that's what you're doing.

### What to audit, per layer

For each layer in scope, compute:

1. **Intended technique.** From the layer's `topic` and the monster's
   chapter / coaching, what regex feature is this layer supposed to teach?
   (e.g. "anchors", "character classes", "quantifiers", "escaping").

2. **Canonical solution.** The regex that *uses the intended technique* and
   strips the layer cleanly (all vitals matched, no collateral including
   locked layers and heart). Often this is what the coaching string suggests.
   Verify it actually works — run it mentally against every line of the
   monster (active layer + locked layers + heart), and confirm:

   - matches every vital ✓
   - misses every filler ✓
   - misses every line in locked layers ✓
   - misses the heart ✓

3. **Shortcut vulnerability.** Try these as substitutes:

   - **Single-character regexes:** every distinct character that appears in
     a vital. If any single char matches all vitals and no other lines, the
     layer is single-char vulnerable.
   - **Short literal substrings of vitals:** every 2- and 3-character
     substring shared by all vitals. If any is unique to the vitals, that's
     a shortcut.
   - **Naive shorthands:** `\w+`, `\d+`, `\s+`, `[a-z]+`, `[A-Z]+`, `.+`,
     `.*`. The validator already catches some of these; confirm.
   - **Topic-adjacent shortcuts** (e.g. for a "quantifiers" layer, does a
     bare `\w+` win without using a quantifier the topic demands?).

   Any of these that strip the layer despite NOT using the intended technique
   is a design leak.

4. **Heart contamination.** Does the canonical solution accidentally match
   the heart text as a substring? In layer phase, heart matches count as
   collateral — so if the canonical regex matches the heart, the layer
   doesn't strip even though everything else is right. Common offenders:
   `^\w+$` matching pure-word-char hearts, `\d+` matching numeric hearts.

5. **Suggested-regex prefix safety** (tutorial layers only). Tutorial coaching
   is typed live, so every prefix of the suggested regex matters. For each
   coaching string that says "Try ...", test every typed prefix before the
   complete suggested regex. No prefix should clean-strip the layer. If an
   early prefix strips, the tutorial can auto-advance before the player types
   the feature being taught (for example, before a final `$`, `+`, or escaped
   character).

### What to audit, per heart

The heart is killed by a regex that **fully matches** the heart text (the
match range must cover `[0, heart.text.length)`). For each monster:

1. **Canonical kill regex.** Usually `^<heart>$` works, but verify nothing
   in the body (stripped or not) matches the same regex at all, even as a
   substring. In heart phase, the heart must be fully matched, but any body
   line match still counts as collateral.

2. **Length / specificity.** Hearts ≤ 3 chars or with all-same characters
   are blocked by the validator. But heart strings with very common shapes
   (e.g. `WORD_WORD_NUMBER`) admit broad full-match patterns like `^\w+$`
   that may not feel like a *kill* — they're indistinguishable from a layer
   solve. Note hearts where the kill feels generic.

### Output format

For each monster, produce:

```
### <monster.id> (<chapter or pool>)

**Layer 0 — "<topic>"** (traits: ...)
  - Intended technique: ...
  - Canonical solution: `<regex>` — verified clean against active+locked+heart
  - Shortcut leaks: <list, or "none">
  - Heart contamination: <list, or "none">

**Layer 1 — "<topic>"**
  ...

**Heart** ("<text>")
  - Canonical kill: `<regex>` — verified
  - Concerns: <list, or "none">

**Recommended fixes** (if any):
  - <one-line bullet per fix, citing file path + line number when known>
```

End the report with a **Summary** section: which monsters need content
changes, ordered by severity (critical = layer can't be solved with topic
technique; high = trivial shortcut; medium = aesthetic only).

### Constraints on fixes

- **Don't change `topic` strings or monster `traits`.** Those are
  load-bearing for the trait-stats system. Adjust line content instead.
- **Don't change the matcher rules** unless you can argue the spec is wrong.
- **Keep ≤ 8 lines per layer** (validator limit).
- **Hearts ≥ 3 chars and not all-one-character** (validator).
- **Tutorial monsters skip the trivial-killer check** but design integrity
  still applies.

### Targets

Review the following monsters. Adjust this list when invoking the prompt.

- [ ] `tut-lump` (tutorial)
- [ ] `tut-pip` (tutorial)
- [ ] `tut-bop` (tutorial)
- [ ] Chapter 1 — `scribblet`, `caretling`, `pinmeister`, `alternaut`
- [ ] Chapter 2 — `digiton`, `worderly`, `spaceblob`, `rangewolf`
- [ ] Chapter 3 — `starfist`, `pluson`, `questling`, `bracetron`
- [ ] Wild — `dotgrim`

### Working notes

- A spec was approved that the **heart phase requires full-line match** of
  the heart text. Substring matches in heart phase do not kill. This is
  important when reasoning about heart contamination during the layer phase
  (where partial heart matches still count as collateral) vs. heart phase
  (where they are feedback only).
- v1 plan is at `docs/superpowers/plans/2026-05-04-regxslayer-v1.md`,
  v2 at `docs/superpowers/plans/2026-05-04-regxslayer-v2.md`. The plans
  reference the spec but the spec is the source of truth.
- Known content issues already discovered during play (include them in the
  relevant monster report as "known", and still propose/check fixes):
  - `bracetron` layer 0 (`{3}` exact counts) leaks because layer 1 has
    `aaa` (3 chars) so `^[a-z]{3}$` over-matches the locked layer.
  - `spaceblob` layer 1 (`\S+` non-whitespace runs) leaks because the
    heart `VOID_TOKEN` is itself all non-whitespace.
  - `dotgrim` layer 0 (`\.` literal dots) is single-char vulnerable —
    `[1]` strips because the vitals share digit `1` and no other line has it.
  - `tut-pip` layer 0 (digits, coaching `^\d+$`) can strip at prefix `^\d`,
    before the player types `+` or `$`.
  - `tut-pip` layer 1 (word chars, coaching `^\w+$`) — `flush` filler is
    pure word chars and the heart `TUT_PIP_HEART` is also pure word chars,
    so `^\w+$` over-matches.

Begin the audit now. Be thorough. For each finding, propose the *minimal*
content tweak that closes the leak (typically one filler-line addition
or replacement).
```

---

## Notes on using this prompt

- Run as a fresh session if you want isolated focus; the audit is mostly
  reading + reasoning with no need for project history.
- The audit produces a report — you decide which fixes to land. Keep one
  fix per commit so the trait-stats migration story stays clean.
- After applying fixes, re-run `bun run validate-content` and play through
  the affected monsters in `bun run dev` to confirm.
- If you discover a new class of leak that this prompt doesn't cover (e.g.
  multibyte character interactions, lookaround interactions in chapter 4+),
  add it to the "What to audit" list and commit the prompt update.
