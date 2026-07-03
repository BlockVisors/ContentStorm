import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Public surfaces: the Clerk provisioning webhook (verified by signature, not
// session), the LTI 1.3 handshake (external LMS identity, no Clerk session),
// and the auth pages themselves. Everything else requires a session.
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks/(.*)",   // covers both /api/webhooks/clerk and /api/webhooks/stripe
  "/api/lti/login",
  "/api/lti/launch",
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next internals and static files unless found in search params.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run on API routes.
    "/(api|trpc)(.*)",
  ],
};
