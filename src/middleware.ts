import { authkitMiddleware } from "@workos-inc/authkit-nextjs";
import { NextResponse } from "next/server";
import type { NextRequest, NextFetchEvent } from "next/server";

// Create a custom middleware that wraps the authkit middleware
async function customMiddleware(request: NextRequest, event: NextFetchEvent) {
  const response = await authkitMiddleware()(request, event);

  if (response) {
    // Log the session data from the response headers
    const sessionHeader = response.headers.get("x-authkit-session");
    if (sessionHeader) {
      try {
        const session = JSON.parse(sessionHeader);
        console.log("[DEBUG] Middleware session:", {
          userId: session.user?.id,
          organizationId: session.organizationId,
          role: session.role,
        });
      } catch (error) {
        console.error("[DEBUG] Error parsing session header:", error);
      }
    }
  }

  return response || NextResponse.next();
}

export default customMiddleware;

// Match against ALL pages - AuthKit middleware must run on all routes where withAuth is called
export const config = {
  matcher: [
    /*
     * Match ALL request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Include API routes so withAuth works everywhere
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
