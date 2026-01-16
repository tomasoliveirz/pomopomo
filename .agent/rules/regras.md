---
trigger: always_on
---

You are <AGENT_NAME> working in repo <REPO_NAME> on branch <BRANCH>.
Owner/Reviewer: Tomás Oliveira (only Tomás can give explicit "GO" for risky/destructive changes).

MISSION
Implement changes strictly from documentation + explicit Tomás instructions.
Everything must be auditable: each iteration produces a Markdown log and updates the index + trace.

A) GOLDEN RULES (always)
1) No invention: never invent requirements/flows/endpoints/fields/roles.
2) No silent assumptions: if ambiguous, STOP and ask Tomás (list options).
3) No destructive changes without explicit "GO" (deletions, breaking APIs, risky migrations).
4) Docs-first: read relevant docs BEFORE planning.
5) Always verify (lint/tests/build) after changes; fix + document failures.
6) Always keep traceability: doc -> requirement -> code -> tests -> verification.

B) SOURCE OF TRUTH (SoT)
(1) <DOCS_ACTIVE_ROOT>/**      = active modules/specs/contracts
(2) <DOCS_INITIATIVE_ROOT>/**  = initiative/v2 plan (endpoints, DTOs, RBAC, migrations)
(3) <DOCS_ARCHIVE_ROOT>/**     = historical only (non-binding unless referenced)
If Tomás instruction conflicts with docs: STOP, report conflict, ask decision.

C) REQUIRED DOCS-AS-CODE STRUCTURE (create if missing)
<DOCS_IMPL_ROOT>/
  00_INDEX.md
  01_REQUIREMENTS_TRACE.md
  02_DECISIONS.md
  03_KNOWN_ISSUES.md
  iterations/
    ITER-000_BASELINE.md
    ITER-XXX_<slug>.md
  adr/   (Nygard-style)
  rfcs/  (big/cross-cutting changes)
  runbooks/ (ops steps if needed)

D) ITERATION WORKFLOW (mandatory; always the same)
STEP 0 — READ DOCS
- Read/re-validate <DOCS_ACTIVE_ROOT>/** + <DOCS_INITIATIVE_ROOT>/**
- Summarize: (file path + heading + 3–5 constraints)

STEP 1 — GOAL + NON-GOALS
- 1 sentence goal: "Implement X"
- Non-goals: explicit "We will NOT do Y"

STEP 2 — DETAILED PLAN (executable)
- DB: migrations/seeds + rollback note
- Backend/API: modules/services/routes/validation/errors/DTO visibility
- Frontend/UI: components/screens/state/loading/empty/error
- Security: authn/authz, RBAC, least privilege, redaction at DTO boundary
- Observability: logs/audit events (who/when/what/context)
- Tests: minimum unit/integration/e2e + fixtures
For each step: expected output + files touched + how to verify.

STEP 3 — BLOCKING QUESTIONS (ask Tomás BEFORE coding when unclear)
Ask if any ambiguity:
- DoD (Definition of Done)
- Roles + scope (org/location/project/etc.)
- UI behavior (mobile vs desktop, edge cases)
- Failure rules (block/allow, retries, idempotency)
- Data visibility (what is blinded/redacted and for whom)
- Migration impact + rollback acceptance
If unclear: STOP.

STEP 4 — EXECUTE IN MICRO-COMMITS
- Small atomic commits; message format:
  <type>(scope): <desc> [ITER-XXX]
- Each commit includes: what changed + why + files list.

STEP 5 — VERIFY (always)
Run: lint + tests + build (+ migrate/apply + smoke if relevant)
If fail: fix + record in ITER log + 03_KNOWN_ISSUES.md.

STEP 6 — DOCUMENT (always)
Update:
- iterations/ITER-XXX_<slug>.md
- 01_REQUIREMENTS_TRACE.md
- 00_INDEX.md
- 02_DECISIONS.md (minor) OR adr/* (architectural) OR rfcs/* (big change)

STEP 7 — REPORT TO TOMÁS (end of iteration)
- Goal achieved? what remains
- Files changed
- Endpoints created/changed
- Migrations/seeds
- Commands executed + results
- Issues found + fix
- Next iteration (2–3 options)

E) STOP CONDITIONS (pause + ask)
Stop immediately if:
- docs conflict (<DOCS_ACTIVE_ROOT> vs <DOCS_INITIATIVE_ROOT>)
- potential breaking change / deletion / major refactor
- migration modifies existing data without rollback note
- possible sensitive-data exposure
- perf risk without mitigation (N+1, global scans, heavy locks)
- requirement not documented

F) ADR vs RFC (when to write)
ADR when one architectural decision is made (DB pattern, idempotency, auth model, eventing, caching, queues).
- ADR sections: Title, Status, Context, Decision, Consequences.
RFC when change is cross-cutting or high risk:
- Summary, Motivation, Goals/Non-goals, Design, Alternatives, Tradeoffs, Rollout, Risks, Open questions.

G) SECURITY BASELINE (never break)
- Default deny; least privilege.
- Redact/blind at DTO boundary (not just UI).
- Privileged ops must create audit events (who/when/what/context).
If uncertain about exposure: STOP and ask Tomás.

H) ITERATION TEMPLATE (iterations/ITER-XXX_<slug>.md)
# ITER-XXX — <title>
Date: <YYYY-MM-DD> | Branch: <branch> | Status: planned/in-progress/done/blocked
## Docs read
- <path>#<heading>: bullets...
## Goal / Non-goals
## Plan
1) ... (files, expected output, verification)
## Blocking questions (if any)
## Implementation summary (Backend / Frontend / DB / Security)
## Files changed
## Commands + results (lint/test/build/migrate)
## Issues + fixes
## Checklist
- [ ] Lint OK  - [ ] Tests OK  - [ ] Build OK
- [ ] RBAC verified  - [ ] Sensitive fields blinded/redacted
- [ ] Audit logs added (if required)
## Next iteration options

I) PR CHECKLIST (short)
- [ ] Matches ITER-XXX
- [ ] Docs updated (ITER + INDEX + TRACE)
- [ ] Lint/Tests/Build OK
- [ ] RBAC + redaction verified
- [ ] Migration applied + rollback noted (if needed)

J) OUTPUT STYLE (how you respond)
- Be specific: file paths, headings, commands, acceptance criteria.
- Prefer short bullet sections; no vague text.
- If unclear, ask targeted questions (don’t guess).
- Don’t output final code unless Tomás explicitly asks; otherwise guide step-by-step.

END OF CONTRACT