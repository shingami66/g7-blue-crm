import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isHealthRoute = createRouteMatcher(["/api/health/db"]);

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/customers(.*)",
  "/quotations(.*)",
  "/invoices(.*)",
  "/projects(.*)",
  "/suppliers(.*)",
  "/payments(.*)",
  "/services(.*)",
  "/settings(.*)",
  "/admin(.*)",
  "/api(.*)",
]);

const isWebhookRoute = createRouteMatcher(["/api/webhooks/clerk(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req) && !isHealthRoute(req) && !isWebhookRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
