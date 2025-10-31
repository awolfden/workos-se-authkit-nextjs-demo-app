// Force Node runtime
export const runtime = "nodejs";

import { signOut } from "@workos-inc/authkit-nextjs";

export async function POST() {
  await signOut();
  return new Response(null, {
    status: 302,
    headers: { Location: "/" },
  });
}
