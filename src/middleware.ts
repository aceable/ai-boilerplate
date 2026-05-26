import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { USER_AUTH_ENABLED } from '@/lib/auth-config';

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/health',
]);

const clerkMiddlewareInstance = clerkMiddleware(async (auth, request) => {
  if (
    process.env.NODE_ENV === 'development' &&
    process.env['PLAYWRIGHT_TESTING'] === 'true'
  ) {
    return;
  }

  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

// When ENABLE_USER_AUTH=0, skip Clerk entirely — no middleware-level protection,
// no Clerk runtime imports executed at the edge. Useful for public sites.
export default USER_AUTH_ENABLED ? clerkMiddlewareInstance : () => NextResponse.next();

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
