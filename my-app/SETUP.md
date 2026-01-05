# Next.js Project Setup

## Structure Overview

The project follows a component-based architecture with the following structure:

```
my-app/
├── public/                 # Static assets (images, fonts, favicons)
├── src/
│   ├── app/                # (1) ROUTING & LAYOUT LAYER
│   │   ├── (auth)/         # Route Group: Auth pages
│   │   │   ├── login/      # /login
│   │   │   └── register/   # /register
│   │   ├── (dashboard)/    # Route Group: Dashboard with shared layout
│   │   │   ├── layout.tsx  # Persistent Sidebar/Nav
│   │   │   ├── page.tsx    # /dashboard (Home)
│   │   │   ├── cv-editor/  # /dashboard/cv-editor
│   │   │   └── roadmap/   # /dashboard/roadmap
│   │   ├── onboarding/     # /onboarding
│   │   ├── api/            # (2) ROUTE HANDLERS (REST)
│   │   │   ├── tickets/    # API endpoints
│   │   │   └── webhooks/   # Webhook handlers
│   │   ├── globals.css     # Global styles
│   │   └── layout.tsx      # Root configuration
│   ├── components/         # (3) GLOBAL UI COMPONENTS
│   │   ├── ui/             # Atomic components (shadcn/ui style)
│   │   └── layout/         # Header, Footer, Sidebar
│   ├── features/           # (4) DOMAIN-DRIVEN MODULES
│   │   ├── tickets/        # Everything related to 'Tickets'
│   │   │   ├── actions.ts  # SERVER ACTIONS
│   │   │   ├── components/ # Ticket-specific components
│   │   │   ├── hooks/      # Custom hooks
│   │   │   ├── types.ts    # Domain-specific interfaces
│   │   │   └── schemas.ts  # Zod validation schemas
│   │   └── billing/        # Everything related to 'Billing'
│   ├── lib/                # (5) INFRASTRUCTURE SDKS
│   │   ├── prisma.ts       # Database client (placeholder)
│   │   ├── stripe.ts       # Stripe initialization (placeholder)
│   │   └── utils.ts        # Shared utilities
│   ├── services/           # (6) THE API LOGIC LAYER
│   │   ├── ticket-service.ts # Business logic / DB queries
│   │   └── user-service.ts   # CRUD operations for users
│   └── types/              # Global shared TypeScript types
├── .env.example            # Environment variables template
├── next.config.ts          # Next.js configuration
└── tsconfig.json           # Path aliases (@/*)
```

## Routes

- `/` - Landing page
- `/login` - Login page (auth group)
- `/register` - Register page (auth group)
- `/onboarding` - Onboarding flow
- `/dashboard` - Dashboard home (dashboard group)
- `/dashboard/cv-editor` - CV Editor (dashboard group)
- `/dashboard/roadmap` - Roadmap (dashboard group)

## Getting Started

1. Install dependencies:
```bash
cd my-app
npm install
```

2. Create environment file:
```bash
cp .env.example .env.local
```

3. Run development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000)

## Features Implemented

✅ Next.js 14 App Router
✅ TypeScript configuration
✅ Tailwind CSS with custom theme
✅ Component-based architecture
✅ Route groups for organization
✅ Skeleton pages for all routes
✅ UI components (Button, Card, Input, Skeleton)
✅ Layout components (Sidebar)
✅ Feature modules structure (tickets, billing)
✅ Service layer placeholders
✅ API route handlers structure

## Next Steps

1. Install dependencies: `npm install`
2. Set up database (Prisma)
3. Implement authentication
4. Add business logic to services
5. Implement feature components
6. Add API integrations

