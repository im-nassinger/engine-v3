# A new look for the trigger card

## TL;DR

The owner finds the trigger card "ugly and convoluted" (2026-11-24) and asked for a mockup of other ways to draw it. **Nothing is picked yet.** The mockup is [design/mockups/triggers.html](../design/mockups/triggers.html): 13 options, one card at a time, with two example triggers. The owner's favourites so far are **Branch** (11), **Scratch** (12) and **Blocky** (13), and before them **Tree** and **Flow**. Next: the owner picks one, then it is written into [design/controls.md](../design/controls.md) and built as a v4 fix.

## The options in the mockup

| # | Name | In one line |
|---|---|---|
| 1 | Now | Today's card, for comparison |
| 2 | Chips | A lane for When, If and Do; each changeable word is a chip coloured by its kind |
| 3 | Icon rows | Each part is an icon tile, a verb and its details; click a row to edit it in fields |
| 4 | Blocks | Soft coloured blocks, the event on top |
| 5 | Flow | A vertical line through the event, the check and the actions; a Wait is a dashed "2 s later" gap |
| 6 | Steps | Plain lines with a quiet When, If, Do label |
| 7 | Folded | One line per trigger, opened by a click |
| 8 | Sentence | The whole trigger as one sentence, changeable parts as grey pills |
| 9 | When / Then | One box for the event, one for the actions |
| 10 | Tree | The event is the root, everything else hangs under it like a file tree |
| 11 | Branch | Tree and Flow merged: one line per part with its own outline icon, thin tree lines, actions after a Wait hang under it |
| 12 | Scratch | Snap-together blocks: an event block on top, a C-shaped If wrapping the actions it guards, a box per changeable part (white ovals for amounts) |
| 13 | Blocky | Scratch with square corners and square notches, closer to the editor's flat look |

## What the owner said, so the next round doesn't repeat it

- **Too much at once is the worst fault.** The first mockup showed 11 variants with pros and cons side by side, and the owner "almost died". Show one card at a time, few words around it.
- **Spacing matters most.** Nothing may touch its container's edge: the mockup uses 12 px inside a trigger, 8 px between rows, 8 px around the card.
- **No underlines, no filled circle markers, no lines that wrap.** Branch's first look had all three and was "very ugly and convoluted". Keep each part on one line; shorten the words, or cut with "…", rather than wrap.
- **Each changeable part must look separate.** "other has tag player" in one colour read as one thing, though `other`, `has tag` and `player` are three choices. Branch tells them apart by colour alone (entity blue, value violet, amount green, choice white, fixed words grey); Scratch and Blocky give each its own box.
- **The event names who touches:** "When **other** starts touching this", not "something starts touching this" or "Other starts touching this". The sentence starts with When where no label says When, and `other` is blue like an entity, with no chip or menu, since it can't be changed.
- **Square blocks are fine.** The owner doesn't like the rounded Scratch look; Blocky is the square version.
- **The repeat is not a footer line** (Scratch and Blocky). Every time draws nothing. A cooldown is its own block snapped right under the event block: "cooldown 3 s", 3 a changeable amount (owner: call it a cooldown, the When block first and the cooldown after, 2026-11-24). *Rejected:* a C-shaped "every 3 seconds" block around the actions read like a timer firing every 3 s; "at most once every 3 s" was too hard to read; a second line "not again for 3 s" inside the event block was disliked. A Wait at the end can't replace it, since a firing during a Wait starts its own run.
- **Block colours: don't invent a palette.** Three invented ones were each worse (owner, 2026-11-24): the first clashed, with white text on mid colours; a muted one at one OKLCH lightness turned brown and dull; light pastel blocks with near-black text were "absolutely horrible". Now the blocks use the editor's own way: a dark surface tinted with the kind's colour, the editor's `--text` on it, the icon in the full colour, changeable parts as the editor's fields, and a 2 px gap tracing each block's outline.
- **Every block starts with one icon** saying what it does (the event's, If's split, each action's, Wait's hourglass, the cooldown's timer), in the block's full colour; the If's closing bar has none (Claude, asked to decide, 2026-11-24).
- **Only If holds other blocks.** A trigger is When, If, Do, with no nesting beyond that: one If, its checks joined by "and", wrapping the whole Do list since its checks guard every action. When is the top block, the cooldown a plain block under it, Wait and the actions plain blocks; a C-shape for Wait or the cooldown would suggest a scope that doesn't exist (Claude, asked to decide, 2026-11-24).
- **A time's unit is a menu**, "seconds", not a fixed "s", so ticks can be offered later (owner asked for "frames"; the glossary's word is tick) (owner, 2026-11-24).
- **No highlight stripe on the event block.** Blocky's lighter band on top was "ugly"; the event block is one flat colour.

## Open

- **Which option**, and whether parts of two are combined.
- **Cooldown above or inside the If?** It sits under the When, as asked, but a firing whose check fails doesn't start the cooldown (`architecture/triggers-in-play.md`), so a coin's cooldown above "if other has tag player" reads as if an enemy's touch started it. Inside the If, above the actions, would read true.
- **How once per run is drawn**, Repeat's third choice; the mockup has no example of it yet. The requirement and the real card still say "at most once every N seconds" for the cooldown, to change when a look is picked.
- **The game's own wording:** the real card and [requirements/triggers/triggers.md](../requirements/triggers/triggers.md) still say "When something starts touching this". Changing it to "other" means changing the requirement, the When menu and the tests. Asked, not answered yet (2026-11-24).
- Lines in the 300 px Entity inspector are tight: "set this Position to 0, -200" and "when other starts touching this" still wrap in Scratch and Blocky.
