**CI failed on the last push, so this session fixes CI instead of doing the next step.**

CI failed on commit {{COMMIT}} ({{URL}}), in: {{FAILED_STEPS}}. CI runs in a public copy of the code, `{{REPO}}`, holding no docs. The end of each failed step's log is below; `gh run view {{RUN_ID}} --log-failed --repo {{REPO}}` prints all of it. The commits after it may have changed things, so check the current code.

1. Run the failing script here (`npm run test:browser`, `npm run test:performance` or `npm run test:e2e`, whichever failed) and find the cause. CI's machines are slower than this computer and draw without a GPU.
2. Fix the cause. Change a test only when the test itself is wrong, and say why in the commit message.
3. Run `npm run check` and the failing script until both pass, then commit. Leave the **Runner:** line in `docs/progress.md` as it is: fixing CI isn't a step of the plan.
4. SUMMARY says what broke and how you fixed it.

Everything after the line below still applies, except that fixing CI replaces doing the next step.

```
{{LOG}}
```

---
