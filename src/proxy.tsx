import { NextFetchEvent, NextRequest, NextResponse } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/app(.*)",
  "/profile(.*)",
  "/plans(.*)",
  "/dashboard/:path*",
]);
const isAdminRoute = createRouteMatcher(["/dashboard/:path*"]);

const clerkProxy = clerkMiddleware(async (auth, req: NextRequest) => {
  try {
    const { userId, sessionClaims } = await auth();
    const isAdmin = sessionClaims?.metadata?.role === "admin";

    // Redirect to sign-in only for known protected routes.
    if (!userId && isProtectedRoute(req)) {
      return NextResponse.redirect(new URL("/sign-in", req.url));
    }

    // Allow access to admin-only routes only for admin users.
    if (userId && !isAdmin && isAdminRoute(req)) {
      const forbiddenUrl = new URL("/403", req.url);
      return NextResponse.redirect(forbiddenUrl);
    }
  } catch (error) {
    console.error("Error in proxy:", error);
    if (error instanceof Error && "digest" in error) {
      console.error("Error digest:", error.digest);
    }
  }
});

export function proxy(request: NextRequest, event: NextFetchEvent) {
  return clerkProxy(request, event);
}

/** @public Framework convention export consumed by Next.js */
export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};

/** Resources: https://clerk.com/docs/references/nextjs/add-onboarding-flow */
