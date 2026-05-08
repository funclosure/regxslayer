---
name: release
description: Bump the regxslayer version, build the standalone binary, tag, push, and publish a GitHub release. Use when the user says "release", "publish", "ship", "bump and release", "tag a release", or "cut a release".
---

# regxslayer release

Walks the user through a release of regxslayer end-to-end: pre-flight checks, version bump, build, tag, push, GitHub release. Honors project conventions (Bun runtime, `bun run build:full`, `gh` CLI for releases, annotated tags, `dist/regxslayer` artifact).

## When to use

Invoke when the user asks to release, ship, or tag a new version. Common phrases: "release", "cut a release", "bump and release", "ship it", "tag and release", "publish v0.X".

## Pre-flight (always run first)

Run these checks **before any state-changing action**. Stop and surface the problem if any fails.

1. **Working tree clean.** `git status --short` must be empty. If dirty: ask the user whether to stash, commit, or abort.
2. **On `main`.** `git rev-parse --abbrev-ref HEAD` should be `main`. If on a feature branch: ask whether to merge first or release from the branch directly.
3. **Tests + typecheck pass.** Run `bun run typecheck && bun test`. Tail the output. If anything fails, stop — don't release a broken build.
4. **Origin reachable.** `git remote -v` must show `origin` pointing at GitHub. If absent, ask the user.
5. **`gh` available + authed.** `gh auth status` must report logged-in. If not, instruct the user to run `gh auth login` from the prompt with `! gh auth login`.
6. **No tag collision.** After picking the version (next step), verify `git tag --list v<version>` is empty. If the tag already exists: roll forward to the next free version (and update package.json to match) — that's what we did in v0.3.0 because v0.2.0 was already taken.

## Version selection

1. Read the current version from `package.json` (the `version` field).
2. Default bump: **minor** (0.x.0 → 0.(x+1).0). User-visible behavior changes typically warrant minor; pure bug fixes warrant patch.
3. If the user named a specific version (e.g. "release 0.4.0"), honor it.
4. **Always check the new version's tag is free** before committing. Tags from earlier in the project's history may shadow the natural next version — bump past them.
5. Edit `package.json` to the chosen version. Stage and commit with message `chore: roll version to <version>` (or, if no roll-past was needed, `chore: bump to <version>`).

## Build

Use `build:full`, not `build` — content validation must run before the binary is shipped.

```bash
rm -rf dist && bun run build:full
```

Confirm:
- `✓ N monster(s) validated, 0 warning(s).` appears in stdout (content validator).
- `dist/regxslayer` exists and is an executable (`file dist/regxslayer` shows Mach-O 64-bit executable on macOS, ELF on Linux).
- Size is in the 50–80 MB range (Bun-compiled binary including the runtime).

If validation reports warnings, stop and surface to the user.

## Tag

Annotated tag at the commit being released:

```bash
git tag -a v<version> -m "<release message>" <commit-sha>
```

The release message should be a short summary + bulleted highlights + spec/plan paths. Pattern:

```
v<version> — <one-line headline>

<2-3 sentence summary>

Highlights
- bullet
- bullet
- bullet

Specs:
- docs/superpowers/specs/<spec>.md
- docs/superpowers/plans/<plan>.md
```

Pass the message via heredoc to preserve formatting. Tag the explicit commit SHA — don't rely on `HEAD`, which can drift if anything else commits between steps.

## Push

```bash
git push origin main
git push origin v<version>
```

If the user is on a non-main branch and explicitly authorized branch release, push that branch instead and add `--force-with-lease` only if the user confirmed.

## GitHub release

Use `gh release create` with the binary attached:

```bash
gh release create v<version> dist/regxslayer \
  --title "v<version> — <headline>" \
  --notes "$(cat <<'EOF'
<release notes>
EOF
)"
```

### Release notes structure

Keep notes user-facing — readers come from the GitHub releases page, not the commit log. Use sections in this order:

1. **Lead paragraph**: one paragraph describing what changed for the player or the developer reading this.
2. **Highlights** (`##`): bulleted list of concrete changes.
3. **Verification** (`##`): test count + typecheck status + any manual smoke notes (e.g. "validated at terminal sizes 80×20, 110×28, 160×42").
4. **Spec / plan** (`##`): paths to the design + plan docs that drove the release, when applicable.
5. **Asset** (`##`): one-line description of `dist/regxslayer` (standalone macOS arm64, run directly).
6. **Known follow-ups** (`##`): bulleted list of latent bugs, deliberate scope reductions, or stale assets (e.g. README screenshot). Be honest — readers appreciate it.

Pass notes via heredoc with `EOF` quoted (`<<'EOF'`) so backticks and `$` don't interpolate.

## Verification + summary

After `gh release create` returns the release URL:

1. Print the release URL to the user.
2. Summarize: tag created, commits pushed, binary asset attached, release notes in place.
3. List any deferred follow-ups carried over from the release notes.

## Common gotchas

- **Tag already exists.** Don't `git tag -f` to move it — that breaks downstream consumers who pinned the old tag. Roll forward to the next free version.
- **Forgetting `--no-pager`**: not relevant for the commands here, but if you find yourself piping `git log` into something, prefer `--no-pager` to avoid hangs.
- **`bun run build` vs `bun run build:full`**: always use `build:full` for releases. The plain `build` skips content validation.
- **`docs/menu.png` is often stale.** If the release introduced visible UI changes, mention the screenshot is stale in the **Known follow-ups** section. Don't try to refresh it inside the skill — that needs the user to actually run the app and capture a fresh image.
- **Versions in `package.json` and the tag may have historically diverged.** Before this skill landed, prior tags (v0.1.0, v0.2.0) pointed to commits where `package.json` still said `0.1.0`. Going forward, every release must keep them in sync — if the tag is `v0.X.Y`, `package.json` says `0.X.Y` at that commit.
