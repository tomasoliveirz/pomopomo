# ITER-010 — Production Preparation
Date: 2026-01-16 | Branch: main | Status: planned

## Goal
Prepare application for safe, secure, and robust production deployment on Ubuntu VPS.
Ensure code and configuration follow "Secure by Design" principles.

## Tasks
- [x] **Internationalization**: Convert all Portuguese strings to English. <!-- id: 100 -->
- [x] **Config**: Configure `next.config.mjs` with Security Headers (CSP, HSTS, etc). <!-- id: 101 -->
- [x] **Environment**: Ensure WS URL is strictly env-var driven in production. <!-- id: 102 -->
- [x] **Docker**: Create `docker-compose.prod.yml` (secure networking, restarts). <!-- id: 103 -->
- [x] **Nginx**: Create server block templates for `pomopomo` and `pomopomo-ws`. <!-- id: 104 -->
- [x] **Scripts**: Create `scripts/deploy-prod.sh` for easy updates. <!-- id: 105 -->
- [x] **Docs**: Save the Runbook to `docs/ops/DEPLOY_RUNBOOK.md`. <!-- id: 106 -->

## Verification
- Code review of `UserMenuClient` for hardcoded strings.
- Local test of `docker-compose.prod.yml` (build check).
- Lint check.
