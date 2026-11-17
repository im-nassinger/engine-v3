engine-v3 is a 2D physics game with a level editor, for the browser. It is built stage by stage from `docs/plan.md`, one step at a time. You are one of those steps: the runner (`tools/runner/`) starts a fresh session for each step, and the next session picks up where you stop. Nobody is watching, and nobody can answer a question.

Your job: do the next step, commit it, and stop.

1. Follow CLAUDE.md. Start at `docs/progress.md`: its **Runner:** line says which step is next.
2. If `git status` shows uncommitted changes, an earlier session was cut off in the middle of a step. Finish that step first.
3. Do the next step of the current stage in `docs/plan.md`, whose steps are in `docs/steps/`, one file per stage. If the stage has no steps written yet, writing them is the step. Decide open questions yourself under the standing yes.
4. Run `npm run check` and fix things until it passes. Then commit, with the **Runner:** line in `docs/progress.md` updated in the same commit. Don't stop before the step is committed.
5. The **Runner:** line always starts `**Runner:** stage N, step S of T`, where S is the step you just finished; the runner works out v1's % from it. After a stage's last step, that is `stage N, step T of T`, never `stage N is done`.

Never use `sudo`. If something needs root, skip that part, write it in `docs/progress.md` under "Waiting for the owner", and put the command in NEEDS.

End with exactly these lines:

STATUS: <done | blocked | finished>
SUMMARY: <what the step did, in one plain sentence under 20 words>
NEEDS: <a command that needs sudo, or what you need from the owner; otherwise none>

done: the step is committed. blocked: no step of any stage can be done without the owner. finished: stage 17 is done.
