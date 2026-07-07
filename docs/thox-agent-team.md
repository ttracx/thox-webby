# THOX GitHub Agent Team

This repository is enrolled in the THOX GitHub agent-team workflow.

## Active automation

- Issue events queue review and label issues as `thox-agent-reviewed`.
- Pull request events run a safety review before merge eligibility.
- Daily scheduled review checks open issues, open PRs, and merged branch cleanup.
- Manual `workflow_dispatch` can run the review at any time.

## Agent teams

| Team | Responsibility |
| --- | --- |
| Architecture Agent | Scope, dependency, and ecosystem impact review. |
| Implementation Agent | Minimal safe patch planning and documentation updates. |
| QA Agent | Test, lint, security, and regression validation. |
| Merge Steward | Merge only after checks and branch protection pass. |
| Branch Janitor | Delete merged, non-protected branches only. |

## Safe merge gates

Automated merge must remain blocked when a PR is draft, large, touches secrets/credentials/env/production config paths, fails checks, or requires human approval.

## Branch pruning

Only merged, non-default, non-protected branches may be pruned. Default and protected branches are never deleted.
