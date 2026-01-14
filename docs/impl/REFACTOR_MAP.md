# Frontend Modernization & Refactor Map (Release-0)

Below is the precise execution plan to align with the **"Kawaii Clean"** design system and **Hybrid Identity** architecture.

## 1. Directory Structure (`src/app`)

We will adopt the Route Group pattern to separate concerns.

```bash
src/app/
├── (marketing)/           # [NEW] Marketing Layout (Cozy/Playful)
│   ├── layout.tsx         # Shared layout for landing pages
│   └── page.tsx           # [MOVE] Existing landing page content
├── (auth)/                # [NEW] Auth Layout (Clean/Focused)
│   ├── layout.tsx
│   ├── signin/page.tsx    # [NEW] Custom Sign-in (Google + Credentials)
│   ├── signup/page.tsx    # [NEW] Register Page (Credentials)
│   └── error/page.tsx     # [NEW] Auth Error handling
├── (app)/                 # [NEW] App Layout (Real-time/Functional)
│   ├── layout.tsx
│   ├── room/[code]/page.tsx # [EXISTING] The Room SPA
│   └── onboarding/page.tsx  # [REFACTOR] Consistent styling
└── layout.tsx             # [KEEP] Root layout (Providers only)
```

## 2. Design System (`src/components/ui`)

Create atomic "Kawaii" components to replace ad-hoc Tailwind.

### `Card.tsx`
```tsx
// Surface: Glassmorphism + rounded-2xl + soft shadow
<div className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-2xl shadow-lg ...">
```

### `Button.tsx` (Variants)
- **Primary**: `bg-gray-900 text-white shadow-lg hover:scale-105 active:scale-95`
- **Secondary**: `bg-white/50 text-gray-800 border border-white/40 hover:bg-white`
- **Ghost**: `text-gray-500 hover:text-gray-800 hover:bg-black/5`

## 3. Auth Refactor (`src/lib/auth.ts`)

**Goal**: Enable real "Credentials" login alongside Google + Dev.

- [ ] **Add `Credentials` provider** for production usage (backed by DB `users` table + bcrypt).
- [ ] **Keep "Dev Login"** strictly gated behind `NODE_ENV=development`.
- [ ] **Pages Config**: Point `pages: { signIn: '/signin' }` to the new custom page.

## 4. Component Refactor Map

### A. `src/components/UserMenu.tsx`
- **Current**: Basic Tailwind, inline logic.
- **New**: 
  - Use `Popover` or custom `Dropdown` component.
  - Show "Guest" badge clearly vs "User".
  - Use `Avatar` component (with fallback).
  - Clear "Kawaii" styling (rounded-xl, soft borders).

### B. `src/app/onboarding/page.tsx`
- **Current**: Solarized/Retro theme (inconsistent).
- **New**: 
  - Move to `(app)/onboarding/page.tsx`.
  - Use `Card` component.
  - Matches Room modal styling (consistency).

### C. `RoomPage` Hooks
Split `src/app/room/[code]/page.tsx` into:
1.  `useRoomBootstrap(code)`: Handles the API call and Identity Resolution logic.
2.  `useRoomSocket(token)`: Handles connection and event subscriptions.
3.  `useRoomStore()`: Central state management.

## 5. Execution Steps

1.  **Design Foundation**: Create `src/components/ui/` (Card, Button, Input).
2.  **Auth Pages**: Create `(auth)/signin` and `(auth)/signup` using the new design.
3.  **Route Migration**: Move `page.tsx` to `(marketing)/page.tsx`.
4.  **Auth Config**: Update `auth.ts` to support the new flows.
5.  **Room Refactor**: Extract logic into hooks (files in `src/hooks/room/`).

---

**Next Action**: If approved, I will begin with **Step 1: Design Foundation**.
