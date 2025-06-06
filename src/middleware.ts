import { authkitMiddleware } from "@workos-inc/authkit-nextjs";

export default authkitMiddleware();

// Match against the pages
export const config = {
  matcher: [
    "/",
    "/account/:path*",
    "/api/:path*",
    "/admin/:path*",
    "/user-settings/:path*",
  ],
};
