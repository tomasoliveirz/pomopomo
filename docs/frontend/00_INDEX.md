# Frontend Architecture & Documentation

This directory contains detailed technical documentation for the Frontend of POMOPOMO (built with Next.js 14 App Router, TypeScript, and Tailwind CSS).

## Directory Structure
- **`00_OVERVIEW.md`**: Global architecture, Routing, Providers, and Layouts.
- **`01_LANDING_PAGE.md`**: Analysis of the Home/Landing page (`src/app/page.tsx`).
- **`02_ROOM_PAGE.md`**: Deep dive into the Room experience (`src/app/room/[code]/page.tsx`), including WebSockets, State Management, and Modals.
- **`03_AUTH_FLOWS.md`**: Authentication, Onboarding, and Identity Management logic.

## Key Technologies
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS + Framer Motion (Animations)
- **State**: React `useState` + Context APIs
- **Realtime**: Socket.IO Client
- **Auth**: Auth.js (NextAuth) v5

## Quick Links
- [Root Layout](./00_OVERVIEW.md#root-layout)
- [Room Bootstrap Logic](./02_ROOM_PAGE.md#bootstrap-flow)
- [Progressive Onboarding](./03_AUTH_FLOWS.md#progressive-onboarding)
