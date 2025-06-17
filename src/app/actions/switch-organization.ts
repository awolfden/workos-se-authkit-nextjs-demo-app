"use server";

import { refreshSession } from "@workos-inc/authkit-nextjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { workos } from "../workos";

export async function switchOrganization({
  organizationId,
  pathname,
}: {
  organizationId: string;
  pathname: string;
}) {
  try {
    const session = await refreshSession({
      organizationId,
      ensureSignedIn: true,
    });
    console.log("[DEBUG] Session after refresh:", {
      userId: session.user.id,
      organizationId: session.organizationId,
      role: session.role,
    });
  } catch (err: any) {
    // Check for authkit redirect URL in both the error and its cause
    if (
      err.rawData?.authkit_redirect_url ||
      err.cause?.rawData?.authkit_redirect_url
    ) {
      console.log("[DEBUG] Redirecting to AuthKit URL");
      redirect(
        err.rawData?.authkit_redirect_url ||
          err.cause.rawData.authkit_redirect_url
      );
    }
    // Check for SSO required in both the error and its cause
    else if (
      err.error === "sso_required" ||
      err.cause?.error === "sso_required" ||
      err.error === "mfa_enrollment" ||
      err.cause?.error === "mfa_enrollment"
    ) {
      console.log("[DEBUG] SSO required for org:", organizationId);
      const url = workos.userManagement.getAuthorizationUrl({
        organizationId,
        clientId: process.env.WORKOS_CLIENT_ID!,
        provider: "authkit",
        redirectUri: "http://localhost:3000/callback",
      });
      redirect(url);
    } else {
      console.error("[DEBUG] Unexpected error during org switch:", err);
      throw err;
    }
  }

  revalidatePath(pathname);
  redirect(pathname);
}
