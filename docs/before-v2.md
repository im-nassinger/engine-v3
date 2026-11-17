# Before v2

## TL;DR

Changes the owner asked for that must be built **after v1's 18 stages and before v2 starts**. Each is written into the requirements, the architecture and a stage of [plan.md](plan.md) when it is planned. Until then, the plan's stages and the requirements stay as they are. This is the one place these changes are listed.

## The list

| # | Change | Asked | State |
|---|---|---|---|
| 1 | **Resizing changes the scale**, not the shape's values. Polygons and lines lose Width and Height | owner, 2026-11-16 | Outlines still open |
| 2 | **Z and X rotate the selection**, Shift+Z and Shift+X by 10° | owner, 2026-11-16 | Settled, with Claude's picks for the owner to change |
| 3 | **Ctrl+Shift while resizing resizes from the centre** | owner, 2026-11-16 | Two questions open |
| 4 | **The Joint tool says why an entity can't take a joint** | owner, 2026-11-16 | Settled, to plan |
| 5 | **Unstyled joints are invisible in play**, joint icons included | owner, 2026-11-17 | Settled, to plan |
| 6 | **+ zooms in without Shift**, as - zooms out | owner, 2026-11-17 | Settled, to plan |
| 7 | **T plays and stops** | owner, 2026-11-17 | Settled, with Claude's picks for the owner to change, one question open |

## 1. Resizing changes the scale

The owner decided:

- Polygons and lines have no Width or Height, only their points.
- Resizing any shape with the handles changes its TransformComponent (its scale), never its shape values (width, height, radius, points).
- The code must be changed to match before v2 starts.

Still open: outlines. With resizing changing the scale, an uneven resize stretches the outline unevenly. The owner asked whether this can be a setting on the StyleComponent. Claude's answer: yes, a checkbox such as "Scale outline" that, when off, keeps the outline's width whatever the scale. Its name, its default, and whether it also ignores a parent group's scale still need the owner's answer.

To update once that's settled: `requirements/drawing.md` ("Width and height, not scale"), `requirements/editor/selection.md`, `architecture/core-model/components-and-fields.md`, `architecture/editor/selection-and-tools.md` (`EntityResize`, the readout), `architecture/core-model/geometry.md` (outline bounds), `glossary.md`, `scope.md`, `decisions.md`, and a stage before v2 in `plan.md`. The World keeps resizing its rectangle, because its TransformComponent is fixed.

## 2. Rotating with Z and X

The owner's words: Z and X rotate the entities; Shift+Z or Shift+X rotate them 10°.

To build, matching the arrow keys' nudges (*proposal*, Claude's picks, for the owner to change):

- **Z turns counter-clockwise, X clockwise**, as Z sits left of X.
- **Z or X alone turns 1°**, as an arrow moves 1 px and Shift+arrow 10 px.
- A run of presses within 1 s is one step in the undo history, like a run of arrows. The step reads `Rotate <name>`.
- Each selected entity turns around its own bounds' centre, as the Select tool's rotate drag does, until v3 turns several entities around the selection box's centre. Locked entities, the World and the camera are skipped with the skip rule's status text.
- Ctrl+Z and Ctrl+X stay Undo and Cut.

To update when planned: `requirements/editor/selection.md` (Handles and arrow keys), `scope.md` (SE2), `architecture/editor/selection-and-tools.md` and `clipboard-and-shortcuts.md`, and the main menu's command list.

## 3. Ctrl+Shift resizes from the centre

The owner's words: holding Ctrl and Shift while resizing resizes from the centre.

Today Shift keeps proportions, Alt resizes from the centre and Ctrl turns snapping off. *Why it matters: on Linux with GNOME, Alt+drag moves the window, so Alt can't reach the page there.*

Open for the owner:

- Does Ctrl+Shift also keep proportions, as Shift alone does, and turn snapping off, as Ctrl alone does?
- Does Alt stay as a second way to resize from the centre, for the Shape tool's drawing too?

To update when planned: the resizing row of the keys table in `requirements/editor/selection.md`, the v3 "Several entities together" rule there, `architecture/editor/selection-and-tools.md` (`ResizeState`), and the Shape tool's keys if drawing follows.

## 4. The Joint tool says why an entity can't take a joint

The problem the owner found: clicking an entity with no physics with the Joint tool seems to do nothing. The click shows "Nothing with physics here" as the status text, but it is small, far from the mouse, and doesn't say which entity or why.

To build:

- **The preview's label gives the reason before the click**, when the mouse is over an entity the tool skips: "Platform has no BodyComponent", "Platform is hidden", "Platform is locked". The click still does nothing, and the status text repeats the same reason.
- **A Rope or Spring's second click on an entity the tool skips is refused** with the same reason. Today it counts as empty space and pins that end to the background, making a joint the user didn't mean.
- No fix button in the preview: the preview can't be clicked, and a fix button belongs in an editor message on the card.

To update when planned: "The Joint tool" in `requirements/physics/joints.md` (the skip and hint rules), `architecture/editor/selection-and-tools.md` if it describes the Joint tool's preview, and `JointTool.ts` with its tests.

## 5. Unstyled joints are invisible in play

The problem the owner found: during test play, joints are drawn even when they have no StyleComponent.

The requirement already says this ("Joints have no special drawing in play. An unstyled joint is invisible, like any entity", `requirements/physics/joints.md`), so this is the build not matching it. The likely cause: `JointIconOverlay` checks only the Joint icons switch, not whether the level is playing.

To build:

- **During play, no joint icon or ring is drawn.** A Rope or Spring with a StyleComponent shows through its path, as JO5 says; every other joint shows nothing.
- After Stop, the joint icons come back as the Joint icons switch says.
- A Playwright test plays a level with an unstyled Hinge and a styled Rope, and checks only the Rope is drawn.

To update when planned: `JointIconOverlay.ts` and `PixiLevelView.ts` with their tests, and `architecture/adapters.md` if it says what the overlays draw in play.

## 6. + zooms in without Shift

The problem the owner found: - zooms out, but + zooms in only with Shift held.

Why: `ZoomInCommand` listens for the typed character `+` and for Ctrl+=. On most keyboards, US and ABNT2 included, + is Shift on the = key, so the key alone types `=`, which nothing listens for.

To build:

- **The = key alone zooms in**, as - alone zooms out, so the key that holds + works with or without Shift. The numpad's + and - keep working.
- Ctrl+= and Ctrl+- stay.

To update when planned: the zoom row of `requirements/editor/shortcuts.md`, `ZoomInCommand.ts` and its tests, and `architecture/editor/clipboard-and-shortcuts.md` if it lists the zoom keys.

## 7. T plays and stops

The owner's words: to play or stop a level, the T key should be used.

To build (*proposal*, Claude's picks, for the owner to change):

- **T plays, and stops while playing**, wherever the editor's single-letter keys work. In a text field or the code editor, T types a T.
- **Ctrl+Enter stays** as the second way, since it is the one that works from inside a field or the code editor.
- The Play button's tooltip and the main menu show T.

Open for the owner: from v2 the game reads keys, so a level could use T as one of its inputs. Should T then still stop the run, taking the key from the game, or should only Ctrl+Enter and the Stop button stop it while the game reads keys?

To update when planned: the Play row of `requirements/editor/shortcuts.md`, "Ctrl+Enter starts and stops" in `requirements/play-and-save/test-play.md`, `architecture/editor/clipboard-and-shortcuts.md` (the Play row), the Play command's shortcuts and its tests.
