# PathForge - Next.js Application

A Next.js application with component-based architecture for career acceleration platform.

## Project Structure

```
my-app/
├── public/                 # Static assets
├── src/
│   ├── app/               # Routing & Layout Layer
│   │   ├── (auth)/        # Auth route group
│   │   │   ├── login/     # /login
│   │   │   └── register/  # /register
│   │   ├── (dashboard)/   # Dashboard route group
│   │   │   ├── layout.tsx # Shared layout with sidebar
│   │   │   ├── page.tsx   # /dashboard
│   │   │   ├── cv-editor/ # /dashboard/cv-editor
│   │   │   └── roadmap/   # /dashboard/roadmap
│   │   ├── onboarding/    # /onboarding
│   │   ├── api/           # API Route Handlers
│   │   ├── globals.css    # Global styles
│   │   └── layout.tsx     # Root layout
│   ├── components/        # Global UI Components
│   │   ├── ui/            # Atomic components (shadcn/ui)
│   │   └── layout/        # Layout components
│   ├── features/          # Domain-Driven Modules
│   │   ├── tickets/       # Tickets feature
│   │   └── billing/       # Billing feature
│   ├── lib/                # Infrastructure SDKs
│   ├── services/           # API Logic Layer
│   └── types/              # Global TypeScript types
├── .env                    # Environment variables
├── next.config.ts          # Next.js configuration
└── tsconfig.json           # TypeScript configuration
```

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Features

- ✅ Next.js 14 with App Router
- ✅ TypeScript
- ✅ Tailwind CSS
- ✅ Component-based architecture
- ✅ Route groups for organization
- ✅ Skeleton pages for all routes
- ✅ shadcn/ui style components

## Environment Variables

Create a `.env.local` file:

```
# Add your environment variables here
```

