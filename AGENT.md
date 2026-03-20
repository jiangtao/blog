# AGENT.md

Agent operating rules for this repository.

## Commit And Delivery

This repo has a mandatory repo-local delivery workflow: `/dev:commit`.

That workflow takes precedence over generic autonomous execution behavior.

Agents must follow these rules:
- Do not direct-push to `main` or `master` just because implementation is complete
- Do not skip branch creation, PR summary, test plan, test report, or review gates required by `/dev:commit`
- If work is implemented in a worktree or temporary branch, keep delivery scoped to that implementation branch until the `/dev:commit` process is complete
- Use repo-local delivery rules before any generic "commit", "push", "merge", or "ship" behavior from broader skills
- Only bypass `/dev:commit` if the user explicitly says to bypass the repo's commit workflow

## Autonomous Execution

Autonomous skills may still:
- inspect the repo
- implement changes
- run tests and verification
- install local non-destructive setup described by the plan

But once execution reaches delivery, they must defer to `/dev:commit`.

## Worktree Safety

When working from a git worktree:
- treat the implementation worktree as the source of truth for code changes
- inspect the target branch worktree before merge or sync
- do not overwrite unrelated local changes on the target branch
- if the target branch is dirty, stop and surface the conflict instead of forcing a merge
