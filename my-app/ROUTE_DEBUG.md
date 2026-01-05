# Route Debugging

## Expected Routes:
- `/` → `src/app/page.tsx`
- `/login` → `src/app/(auth)/login/page.tsx`
- `/register` → `src/app/(auth)/register/page.tsx`
- `/onboarding` → `src/app/onboarding/page.tsx`
- `/dashboard` → `src/app/(dashboard)/page.tsx` ✅
- `/dashboard/cv-editor` → `src/app/(dashboard)/cv-editor/page.tsx` ✅
- `/dashboard/roadmap` → `src/app/(dashboard)/roadmap/page.tsx` ✅

## API Routes:
- `/api/dashboard` → `src/app/api/dashboard/route.ts`
- `/api/cv-sections` → `src/app/api/cv-sections/route.ts`
- `/api/roadmap` → `src/app/api/roadmap/route.ts`
- `/api/auth/login` → `src/app/api/auth/login/route.ts`
- `/api/auth/register` → `src/app/api/auth/register/route.ts`

## Troubleshooting:
1. Clear `.next` folder: `rm -rf .next` or `Remove-Item -Recurse -Force .next`
2. Restart dev server: `npm run dev`
3. Check browser console for errors
4. Verify Next.js version supports route groups (Next.js 13+)

