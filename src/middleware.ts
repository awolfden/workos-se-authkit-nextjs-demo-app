import { authkitMiddleware } from "@workos-inc/authkit-nextjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Create a custom middleware that wraps the authkit middleware
async function customMiddleware(request: NextRequest) {
  const response = await authkitMiddleware()(request, NextResponse.next());

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

// Match against the pages
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
};
