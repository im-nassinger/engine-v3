# Docs

## TL;DR

Everything known about the project: a 2D physics game with a level editor, for the browser. The requirements, the scope and the architecture are approved, and the code is built stage by stage from [plan.md](plan.md). v1 is built: stages 0 to 19, including the changes before v2 and the redesign; nothing of v2 is planned yet. The owner gave a standing yes on 2026-11-14, so Claude decides the smaller questions and lists them in [decisions.md](decisions.md). **Start with [progress.md](progress.md)** to see where things stand, then [overview.md](overview.md) for the whole game in one page. Every file opens with a TL;DR, and the docs read from high level down to detail.

## Files

| File | What it's for |
|---|---|
| [overview.md](overview.md) | What the game is, its main ideas, the versions in short, how to read the docs |
| [progress.md](progress.md) | Where things stand, what's next, open questions for the owner |
| [stages-built.md](stages-built.md) | What each stage showed when it was built: modules, choices, CI failures, what it left for later |
| [glossary.md](glossary.md) | Every agreed word, the list of components, and the words we dropped |
| [principles.md](principles.md) | The rules every requirement follows, and the rules for proposing a change |
| [scope.md](scope.md) | Every feature in one line, with its version and why |
| [requirements/](requirements/README.md) | The exact rules, in eight topics, plus the features not designed yet |
| [architecture/](architecture/README.md) | How the game is built: the stack, the parts of the code, the classes, saving, test play, tests, the tooling and checks |
| [design/](design/README.md) | How the editor looks: the round 8 answers, the mockups, and later the design system |
| [plan.md](plan.md) | The v1 plan in 20 stages, 0 to 19, each with the docs it implements |
| [steps/](steps/README.md) | Each stage's steps, one file per stage, written when the stage starts |
| [deploying.md](deploying.md) | Publishing the editor on Netlify: the URL, the steps, and that the owner is already logged in |
| [review.html](review.html) | The review page where the owner answers questions in the browser. Earlier rounds are in git history |
| [before-v2.md](before-v2.md) | Changes the owner asked for that are built after v1's stages and before v2 |
| [proposals/](proposals/README.md) | Proposals waiting for the owner's answer. Empty now |
| [rejected.md](rejected.md) | What we decided against, and why. Check it before proposing something |
| [decisions.md](decisions.md) | Project-level choices: starting over, the reviews, how these docs are organised |
| [tech-notes.md](tech-notes.md) | Facts and warnings for the architecture work. Not requirements |
| [runner/](runner/README.md) | The runner, which builds v1 without the owner: how it works, its decisions and its own progress |

## Reading order

- **To catch up:** progress, overview, then scope.
- **To work on a feature:** its row in scope, then its topic in requirements. Check the words in the glossary.
- **To propose something:** principles, then rejected.
- **To write code:** [plan.md](plan.md) and the current stage's file in [steps/](steps/README.md), then [architecture/](architecture/README.md) and the requirement files the stage names.
