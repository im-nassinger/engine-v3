# Later: not designed yet

## TL;DR

Features that come after v2 and were left out of both reviews on purpose: a main menu with a list of levels, level ids, thumbnails, component presets, accounts and publishing (planned as v3), public uploads and moderation, replays, sprite sheets and animations. **Nothing here is decided.** The notes are what the old draft said, kept so the thinking isn't lost. Each needs its own review before it is planned. The principle: don't plan for what is certainly later.

Other Later features are described where they belong: parallax and more than one camera in [camera.md](camera.md), trimming a sound in [assets](assets/files-and-sound.md), touch controls in [variables and inputs](triggers/variables-and-inputs.md).

## In the editor

### A main menu and a list of levels · Later

- The project will have a main menu. Until then the app opens straight on the editor, with one level. *Why: the owner's rule for v1.*
- The old draft had a home screen called My Levels: a card per level with Open, Rename, Duplicate, Export and Delete, sorting and search, and a Recently deleted list kept for 30 days.
- It also had starting levels to copy (Empty, Platformer, Vehicle, Physics sandbox, Key and door, Scripted example) and three tutorial levels built from ordinary features.
- With several levels come the old draft's storage tools: a list of what each level takes, and one backup file of all levels.
- With a list, Import adds a level instead of replacing the open one. The old draft compared level ids to offer Keep both or Replace.

Source: round 3: 01 2.12; round 11: 12 A1, 12 A11; old: SV-01 to SV-09, SV-12, SV-42 to SV-45, SV-70, SV-71, SV-75 to SV-81

### Level ids and other version numbers · Later

- v1 has no permanent level id. Its only version numbers are the file format version and the physics version, see [saving](play-and-save/saving.md).
- **v1 only records the physics version.** What to do with it is decided later: the old draft let old levels keep their old physics after a game update, until the creator chose to move on. *Why record it from v1: Claude's call, after the owner said "you decide". Without it, the first update of the physics engine changes how old levels play with no way back.*
- The other numbers are still to be decided with publishing. The old draft also stored a permanent id, the game version and the Lua API version in every level.

Source: round 1: D8; round 11: 12 A2; owner: 2026-11-13; old: SV-13, SV-15, SV-92

### Level thumbnails · Later

- Not in v1. Later, probably a view you choose.
- The old draft drew the thumbnail from the level at rest, showing what the camera sees, with no script or physics running.

Source: round 11: 12 A9; old: SV-56 to SV-60

### Component presets · Later

- A component preset is a saved set of values for one component. Picking one from the card's menu sets those values, like pasting them in.
- **It works the same on every component.** A ScriptComponent preset just sets its file list, and a TriggerComponent preset its triggers. *Why: the owner's rule that the script case isn't special.*
- Presets replace three older ideas: trigger templates, script templates and material presets (Wood, Ice, Rubber). *Why later: presets would be a real feature to ship, with a way to browse and save them.*
- Until then, the builtin `.lua` files serve as examples.

Source: round 6: 05 2.5; round 9: 09 2.14, 10 2.14; round 10: CP1; round 11: CP2

### Sprite sheets and animations · Later

- Not in v1 and not decided. The old draft had a sprite sheet editor that cut an image into a grid of frames and named animations, with modes Loop, Once and Ping-pong and a "when finished" animation.
- With images now being a fill on a shape, this needs a fresh design.

Source: round 1: D28; round 5: 04 2.9–2.11; decisions: D29

## Online

### Accounts and publishing · Later

Planned as v3: v1 covers building and local play, v2 adds polish, v3 adds accounts and publishing. Notes from the old draft:

- **Accounts** are needed to publish, rate, comment and follow, never to play or to report. The editor stays fully usable with no account.
- **Publishing** uploads a copy of a local level and gives it a permanent link. Checks run first: the level is valid, within the published limits, and runs. A level declares whether it has a goal. If it does, its creator must win it first, which is why a run records won and lost apart.
- A published level is a frozen copy. **Publish update** replaces it and keeps its link, ratings and play counts. A creator can unpublish at any time.
- **A level's page** shows its name, creator, description, instructions, rating and plays. Browsing has Featured, Popular, Top rated and New, with search. A low rating never deletes a level.
- **Playing** needs no account. Kept variables stay in the browser when anonymous and move to the account when signed in.
- **Community:** comments, following creators, and remixing where the creator allows it, with credit that can't be removed. No direct messages.
- **Reporting and takedowns ship together with publishing**, not only with uploads. *Why: text and drawings can break rules with no upload involved.*
- Published levels carry a content rating, and players are asked their age before playing rated levels. The old draft proposed a 13+ site, no sexual content, and two labels, Everyone and Teen, with legal advice before launch.
- Remixing: the old draft asked each creator on their first publish, with no preselected answer.
- **The website's address** must be chosen before any public release. *Why: levels saved in the browser are tied to the address, so they wouldn't show at a new one.*
- A permissions system for what a level's scripts may do also comes after v1.

Source: round 2: O3; round 3: D78, D79, D80, D81, D82; old: SV-100 to SV-149

### Public image and sound uploads · Later

They ship only together with reporting, moderation and takedown tools. Notes from the old draft, which also said to get legal advice:

- Uploading needs an account with a verified email, and agreeing to "I own this or have permission".
- Raster images only. Published sounds were to be clips of up to 30 seconds, with music from the builtin library. Published levels about 20 MB of files.
- Every upload has a visible state: In review, Approved, Rejected, Removed. A level can't go public until its uploads are approved.
- A content policy, reports by any signed-in player, a copyright takedown form with a counter notice, and loss of upload rights for repeat offenders.
- A removed file can't be uploaded again. A level that used it stays up and shows it as missing.
- Rule warnings never block publishing.

Source: round 1: D33, D34, D65; round 3: D78, D79, D81, D82; old: AS-131 to AS-139

### Replays and leaderboards · Later

- **v1 has no replay feature.** Study Box2D v3's determinism and replay support before designing one.
- Box2D v3 makes physics give the same result on every computer, but it doesn't record inputs. The game still has to record keys and clicks to replay a run.
- Box2D v3 also has its own built-in recording and replay support. The owner said to look at it later and decide then whether it helps. Not now.
- Cheap tools a recorded run would give, to look at after the first release: run the last test again exactly, run to a chosen tick and pause, copy a run report for a bug, and draw the path of the last run in the editor.
- Leaderboards: whether a wider window is fair is decided when publishing is built. Runs would have to be played again on a server, or scores can be faked.

Source: round 1: D57; round 3: R54, D77; old: SV-150
