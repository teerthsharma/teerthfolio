### Task 10: Verified GitHub Publication

**Agent skills:** github:yeet, superpowers:finishing-a-development-branch, superpowers:verification-before-completion.

**Files:** Git index, current `codex/open-world-loading-navigation` branch, configured `origin`.

- [ ] **Step 1: Confirm publish authority and scope**

Verify `git status`, `git diff --stat`, remote URL, active branch, and that no unrelated user files or `donotcommit/` assets will be staged.

- [ ] **Step 2: Require proof before staging**

Require Task 8 GREEN evidence and Task 9 `CLEAN`. If either is absent, do not push.

- [ ] **Step 3: Stage intentional rescue files**

Use explicit paths rather than `git add -A`. Review the staged diff for secrets, generated browser profiles, large artifacts, and unintended source assets.

- [ ] **Step 4: Commit and push**

```powershell
git commit -m "feat: complete anime-soft polar object-world rescue"
git push -u origin codex/open-world-loading-navigation
```

- [ ] **Step 5: Verify remote state**

Use `gh` to confirm the remote branch SHA and CI/check status. If a PR already exists, report its URL and checks; otherwise create a PR only when requested or already part of the repository workflow.
