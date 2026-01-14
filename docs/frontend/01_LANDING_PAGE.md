# Landing Page Documentation
**Path**: `src/app/page.tsx`

## Overview
The Landing Page serves as the entry point for unauthenticated and authenticated users. It is designed to be visually engaging ("cozy corner to focus") while effectively funneling users into creating or joining rooms.

## Components & Structure

### 1. Root Container
- **Styling**: Full view height (`min-h-screen`), centralized content, hidden overflow.
- **Interactions**: Uses `pointer-events-none` on background layers to prevent blocking clicks, restoring `pointer-events-auto` for interactive elements.

### 2. Header / Navigation
- **`UserMenu`** (`src/components/UserMenu`): positioned absolutely in the top-right.
  - Handles Login/Logout state.
  - Displays User Avatar if logged in.
  - Provides dropdown for Profile/Settings.

### 3. Visual Layer (Physics Engine)
- **`BackgroundPhysics`** (`src/components/BackgroundPhysics`): A specialized component rendering 2D physics objects (Matter.js or custom canvas) to create a playful, dynamic background.
- **Static Decor**: Fallback/Supplementary blurred gradients (purple/pink orbs) for depth.

### 4. Hero Section (`motion.div`)
- **Animations**: Entry animation (`opacity: 0 -> 1`, `y: 20 -> 0`).
- **Glassmorphism Card**:
  - `bg-white/60 backdrop-blur-xl`: Creates the frosted glass effect.
  - Contains:
    - **Logo**: Large variant.
    - **Value Prop**: "Your cozy corner to focus."

### 5. Action Buttons (The Core Flow)
- **Create Room** (`/create`):
  - Primary Action (Dark background).
  - Triggers navigation to Room Creation flow.
- **Join Room** (`/join`):
  - Secondary Action (Outline/Glass).
  - Triggers navigation to Room Code Entry page.

### 6. Footer Actions
- **Report Bug** (`/report`): Subtle link for feedback.

## Key States & Logic
- **Client Component** (`'use client'`): Required for `framer-motion` and `useRouter`.
- **Navigation**: Uses Next.js `useRouter` for programmatic navigation (vs `<Link>` for button-like divs).

## Edge Cases
- **Mobile Responsiveness**: Layout flex direction switches (`flex-col` -> `sm:flex-row`) for buttons.
- ** Reduced Motion**: While not explicitly disabled, `framer-motion` handles system preferences if configured globally.
